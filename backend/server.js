const path = require('path');
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');


const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIG & CACHE ---
const db = new sqlite3.Database('./parking.db');
const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));
let isLoggedIntoVilla = false;

// FIX: Added missing sessionCache object to prevent "sessionCache is not defined" error
let sessionCache = {
    csrfToken: null
};

// --- DATABASE INITIALIZATION ---
db.serialize(() => {
    // 1. Create Users Table with new columns included
    db.run(`CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        password TEXT,
        ticket_id TEXT,
        long_ticket_id TEXT,
        article_id TEXT
    )`);

    // 2. Create Reservations Table
    db.run(`CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT,
        date TEXT,
        plate_number TEXT,
        status TEXT,
        UNIQUE(user_email, date)
    )`);

    // 3. Self-healing: Add columns if they were missing from an old DB version
    db.run(`ALTER TABLE users ADD COLUMN long_ticket_id TEXT`, (err) => {});
    db.run(`ALTER TABLE users ADD COLUMN article_id TEXT`, (err) => {});

    console.log("Database tables initialized.");
});

const browserHeaders = { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest'
};

// --- HELPER: VILLA PRO LOGIN ---
async function villaLogin(email, password) {
    await jar.removeAllCookies();
    const getRes = await client.get('https://clients.villapro.eu/login/', { headers: browserHeaders });
    const $ = cheerio.load(getRes.data);
    const csrfToken = $('input[name="csrfmiddlewaretoken"]').val();

    await client.post('https://clients.villapro.eu/login/', new URLSearchParams({
        csrfmiddlewaretoken: csrfToken,
        username: email,
        password: password,
        next: '/en/reserv_single/sk_ba_panoramacity2/'
    }), {
        headers: { ...browserHeaders, 'Referer': 'https://clients.villapro.eu/login/' },
        maxRedirects: 5
    });
}

async function ensureLoggedIn(email, password) {
    if (isLoggedIntoVilla) return;
    await villaLogin(email, password);
    isLoggedIntoVilla = true;
}

// --- API ENDPOINTS ---

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        await villaLogin(email, password);
        const resPage = await client.get('https://clients.villapro.eu/en/reserv_single/sk_ba_panoramacity2/');
        const html = resPage.data;
        const $ = cheerio.load(html);

        const urlId = (resPage.request.res.responseUrl.match(/sk_ba_panoramacity2\/(\d+)\//) || [])[1];
        const scriptText = $('script').text();
        const longTicketId = (scriptText.match(/var ticket_id = "(\d+)";/) || [null, urlId])[1];
        const articleId = (scriptText.match(/var article_id = (\d+);/) || [null, "273"])[1];

        if (urlId) {
            db.run(`INSERT OR REPLACE INTO users (email, password, ticket_id, long_ticket_id, article_id) VALUES (?, ?, ?, ?, ?)`, 
                [email, password, urlId, longTicketId, articleId]);
            
            sessionCache.csrfToken = $('input[name="csrfmiddlewaretoken"]').val();
            res.json({ status: 'success', email });
        } else { throw new Error("Could not find User ID"); }
    } catch (e) { res.status(401).json({ status: 'error', message: e.message }); }
});

app.post('/api/reservations/instant', async (req, res) => {
    const { email, date, plate, command } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (!user) return res.status(404).json({ success: false });
        try {
            await ensureLoggedIn(email, user.password);
            if (!sessionCache.csrfToken) {
                const p = await client.get(`https://clients.villapro.eu/en/reserv_single/sk_ba_panoramacity2/${user.ticket_id}/`);
                const $ = cheerio.load(p.data);
                sessionCache.csrfToken = $('input[name="csrfmiddlewaretoken"]').val();
            }
            const response = await client.post(
                "https://clients.villapro.eu/en/reserv_single/misc/sk_ba_panoramacity2/", 
                new URLSearchParams({
                    cmd: command,
                    date: date,
                    article_id: user.article_id,
                    ticket_id: user.long_ticket_id,
                    car_id: plate,
                    csrfmiddlewaretoken: sessionCache.csrfToken
                }), 
                { headers: { ...browserHeaders, 'X-CSRFToken': sessionCache.csrfToken } }
            );
            if (response.data.status === true) return res.json({ success: true });
            res.json({ success: false, message: response.data.error });
        } catch (e) { res.status(500).json({ success: false }); }
    });
});

app.get('/api/availability', async (req, res) => {
    db.get("SELECT email, password, ticket_id FROM users LIMIT 1", async (err, user) => {
        if (!user) return res.json({ success: false, days: {} });
        try {
            await ensureLoggedIn(user.email, user.password);
            
            const now = new Date();
            const url = `https://clients.villapro.eu/en/reserv_single/sk_ba_panoramacity2/${user.ticket_id}/${now.getFullYear()}/${now.getMonth() + 1}/`;
            const page = await client.get(url);
            const $ = cheerio.load(page.data);
            
            const calendarData = {
                reserved: [], // .day-reserved-edit (Already yours)
                free: [],     // .day-free-edit (Available)
                full: [],     // .day-full-edit (No space left)
                noedit: []    // .day-free-noedit (Out of range)
            };

            // Helper to extract day number from data-date="YYYY-MM-DD"
            const getDay = (el) => parseInt($(el).attr('data-date').split('-')[2]);

            $('.day-reserved-edit').each((i, el) => calendarData.reserved.push(getDay(el)));
            $('.day-free-edit').each((i, el) => calendarData.free.push(getDay(el)));
            $('.day-full-edit').each((i, el) => calendarData.full.push(getDay(el)));
            $('.day-free-noedit').each((i, el) => calendarData.noedit.push(getDay(el)));

            res.json({ success: true, ...calendarData });
        } catch (e) { 
            res.status(500).json({ error: e.message }); 
        }
    });
});

app.get('/api/reservations', (req, res) => {
    db.all("SELECT * FROM reservations", (err, rows) => res.json(rows || []));
});

// --- STATIC FILES & CATCH-ALL ---

// 1. Serve static files from the frontend/dist folder
// 1. Serve static files first
app.use(express.static(frontendPath));

// 2. Fallback middleware: If the request isn't an API call and 
// hasn't been caught by express.static, send index.html
app.use((req, res, next) => {
  if (!req.url.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    next();
  }
});

app.listen(5000, '0.0.0.0', () => console.log('✅ Server running on port 5000'));