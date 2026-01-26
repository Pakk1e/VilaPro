const path = require('path');
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const bcrypt = require('bcrypt');
const runningSnipers = {};
let nightlyAutomationInterval = null;


const app = express();

// 1. Add your static whitelist here
const WHITELIST = [
    'jakub.vadovsky@jci.com',
    'juraj.hnat@jci.com',
    'svetozar.synak@jci.com'
];

const ALLOWED_ORIGINS = [
    'https://www.vadovsky-tech.com'
];


app.use(cors({
    origin: function (origin, callback) {
        // Allow server-to-server or curl (no origin)
        if (!origin) return callback(null, true);

        if (ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;

    // Allow non-browser clients (curl, server-side, PM2, cron)
    if (!origin) return next();

    if (origin === 'https://www.vadovsky-tech.com') {
        return next();
    }

    return res.status(403).json({ error: 'Forbidden origin' });
});



app.use(express.json());

// --- DATABASE INITIALIZATION ---
const dbPath = path.join(__dirname, 'parking.db');
const db = new sqlite3.Database(dbPath);


db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        password TEXT,
        ticket_id TEXT,
        long_ticket_id TEXT,
        article_id TEXT,
        last_csrf TEXT  -- ADDED THIS
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bulk_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        days_of_week TEXT,
        months TEXT,
        plate TEXT,
        name TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
        email TEXT,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log("Database initialized.");

    //One time db.run for initalization of new Columns
    db.run("ALTER TABLE bulk_rules ADD COLUMN name TEXT", (err) => {
        // It's okay if this fails because the column already exists
    });
});




// --- MULTI-USER SESSION CACHE ---
// This stores a unique client/jar for every logged-in email
const userSessions = {};

function getSession(email) {
    if (!userSessions[email]) {
        const jar = new CookieJar();
        const client = wrapper(axios.create({
            jar,
            withCredentials: true,
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            }
        }));
        userSessions[email] = { client, jar, isLogged: false };
    }
    return userSessions[email];
}

const browserHeaders = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest'
};

// SHARED LOGIC: The Robot calls this to act like a user
async function internalInstantReserve(email, date, plate, command = 'ADD') {

    const user = await new Promise(r => db.get("SELECT * FROM users WHERE email=?", [email], (err, row) => r(row)));
    if (!user) return { status: false, error_message: "User not found" };

    const session = getSession(email);
    await ensureLoggedIn(email);


    const [year, month] = date.split('-');
    const pageUrl = `https://clients.villapro.eu/en/reserv_single/sk_ba_panoramacity2/${user.ticket_id}/${year}/${parseInt(month)}/`;
    const getPage = await session.client.get(pageUrl);
    const $ = cheerio.load(getPage.data);

    const realTicketId = (getPage.data.match(/var ticket_id\s*=\s*["'](\d+)["']/) || [])[1] || '1506424268';
    const csrfToken = $('input[name="csrfmiddlewaretoken"]').val();


    // We look for the date in the HTML to see if it's already "taken" by us.
    const isAlreadyReservedByUser = $(`.day-reserved-edit[data-date="${date}"]`).length > 0;

    if (isAlreadyReservedByUser) {
        console.log(`ℹ️ Date ${date} is already reserved by user. Skipping POST.`);
        return { status: true, message: "Already reserved" };
    }


    const response = await session.client.post("https://clients.villapro.eu/en/reserv_single/misc/sk_ba_panoramacity2/",
        new URLSearchParams({
            cmd: command,
            date: date,
            article_id: user.article_id,
            ticket_id: realTicketId,
            car_id: plate,
            csrfmiddlewaretoken: csrfToken
        }), { headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': pageUrl } }
    );

    return response.data;
}


async function executeRule(email, rule) {
    const days = JSON.parse(rule.days_of_week);
    const months = JSON.parse(rule.months);


    db.run("INSERT INTO activity_logs (email, message) VALUES (?, ?)", [email, `🤖 Robot: Starting scan for plate ${rule.plate}`]);

    for (let i = 0; i <= 14; i++) {
        const target = new Date();
        target.setDate(target.getDate() + i);

        // Manual string building to fix the "Monday Jump" timezone issue
        const y = target.getFullYear();
        const m = String(target.getMonth() + 1).padStart(2, '0');
        const d = String(target.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        if (days.includes(target.getDay()) && months.includes(target.getMonth() + 1)) {
            const result = await internalInstantReserve(email, dateStr, rule.plate, 'ADD');


            if (result.status === true) {
                db.run("INSERT INTO activity_logs (email, message) VALUES (?, ?)", [email, `✅ Auto-Reserved: ${dateStr}`], (err) => {
                    if (err) console.error("❌ DB Log Error:", err.message)
                });
            } else {
                // If Full, trigger your EXISTING Sniper logic
                // We reuse your /api/sniper/start logic by calling it directly
                db.run("INSERT INTO activity_logs (email, message) VALUES (?, ?)", [email, `🎯 Full: Sniper started for ${dateStr}`]);
                startSniperInternal(email, dateStr, rule.plate);
            }
        }
    }
}

// Helper to bridge the gap between Rule and your existing Sniper
function startSniperInternal(email, date, plate) {

    // Initialize user object if it doesn't exist
    if (!runningSnipers[email]) runningSnipers[email] = {};

    // If a sniper for THIS SPECIFIC DATE is already running, clear it first
    if (runningSnipers[email][date]) {
        console.log(`ℹ️ Sniper already running for ${email} on ${date}`);
        return true;
    }

    console.log(`🎯 Multi-Sniper engaged for ${email} on date: ${date}`);

    const sniperId = setInterval(async () => {
        db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
            if (!user || !user.last_csrf) return;

            try {
                const session = getSession(email);
                await ensureLoggedIn(user.email);


                const [year, month] = date.split('-');
                const pageUrl = `https://clients.villapro.eu/en/reserv_single/sk_ba_panoramacity2/${user.ticket_id}/${year}/${parseInt(month)}/`;
                const getPage = await session.client.get(pageUrl);
                const $ = cheerio.load(getPage.data);

                const realTicketId = (getPage.data.match(/var ticket_id\s*=\s*["'](\d+)["']/) || [])[1] || '1506424268';
                const csrfToken = $('input[name="csrfmiddlewaretoken"]').val();

                const response = await session.client.post("https://clients.villapro.eu/en/reserv_single/misc/sk_ba_panoramacity2/",
                    new URLSearchParams({
                        cmd: 'ADD',
                        date: date,
                        article_id: user.article_id,
                        ticket_id: realTicketId,
                        car_id: plate,
                        csrfmiddlewaretoken: csrfToken
                    }), { headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': pageUrl } }
                );

                if (response.data?.status === true || (response.data?.error_message || 'Still full').includes('Parking lot is already reserved by the user')) {
                    console.log(`✅ SNIPE SUCCESSFUL for ${email} on ${date}!`);
                    clearInterval(runningSnipers[email][date]);
                    delete runningSnipers[email][date];
                } else {
                    console.log(`... [${email}] sniping ${date}: ${response.data?.error_message || 'Still full'}`);
                }
            } catch (e) {
                console.error(`Sniper cycle error for ${date}:`, e.message);
            }
        });
    }, 5000);

    runningSnipers[email][date] = sniperId;
    //res.json({ success: true, message: `Sniper started for ${date}` });
}

app.get('/api/logs', (req, res) => {
    db.all("SELECT * FROM activity_logs WHERE email = ? ORDER BY timestamp DESC LIMIT 50", [req.query.email], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/bulk/save', (req, res) => {
    const { email, days, months, plate, name, id } = req.body;

    if (id) {
        // Handle Edit
        db.run("UPDATE bulk_rules SET days_of_week=?, months=?, plate=?, name=? WHERE id=?",
            [JSON.stringify(days), JSON.stringify(months), plate, name, id], () => {
                db.get("SELECT * FROM bulk_rules WHERE id = ?", [id], (err, rule) => {
                    if (rule) executeRule(email, rule);
                });
                res.json({ success: true });
            });
    } else {
        // Handle New
        db.run("INSERT INTO bulk_rules (email, days_of_week, months, plate, name) VALUES (?, ?, ?, ?, ?)",
            [email, JSON.stringify(days), JSON.stringify(months), plate, name], function (err) {
                if (!err) {
                    db.get("SELECT * FROM bulk_rules WHERE id = ?", [this.lastID], (err, rule) => {
                        if (rule) executeRule(email, rule);
                    });
                    res.json({ success: true });
                }
            });
    }
});

app.post('/api/bulk/delete', (req, res) => {
    const { id, email } = req.body;

    // 1. Delete the rule
    db.run("DELETE FROM bulk_rules WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ success: false });

        // 2. Re-validate active snipers for this user
        db.all("SELECT * FROM bulk_rules WHERE email = ?", [email], (err, remainingRules) => {
            if (err || !runningSnipers[email]) return res.json({ success: true });

            const activeSniperDates = Object.keys(runningSnipers[email]);

            activeSniperDates.forEach(dateStr => {
                const targetDate = new Date(dateStr);
                const dayOfWeek = targetDate.getDay();
                const month = targetDate.getMonth() + 1;

                // Check if any REMAINING rule still covers this date
                const isStillNeeded = remainingRules.some(rule => {
                    const days = JSON.parse(rule.days_of_week);
                    const months = JSON.parse(rule.months);
                    return days.includes(dayOfWeek) && months.includes(month);
                });

                // 3. If no rule covers it anymore, stop the sniper
                if (!isStillNeeded) {
                    console.log(`🛑 Stopping orphaned sniper for ${dateStr} (Rule Deleted)`);
                    clearInterval(runningSnipers[email][dateStr]);
                    delete runningSnipers[email][dateStr];
                }
            });

            res.json({ success: true });
        });
    });
});



app.get('/api/bulk/rules', (req, res) => {
    db.all("SELECT * FROM bulk_rules WHERE email = ?", [req.query.email], (err, rows) => res.json(rows || []));
});

// --- NIGHTLY AUTOMATION ---
if (!nightlyAutomationInterval) {
    nightlyAutomationInterval = setInterval(() => {
        console.log("🤖 Running Nightly Automation...");
        db.all("SELECT * FROM bulk_rules", [], (err, rules) => {
            if (rules) rules.forEach(rule => executeRule(rule.email, rule));
        });
    }, 1000 * 60 * 60 * 24);
}


// --- HELPERS ---
async function villaLogin(email, password) {
    const session = getSession(email);
    await session.jar.removeAllCookies();

    const getRes = await session.client.get('https://clients.villapro.eu/login/');
    const $ = cheerio.load(getRes.data);
    const csrfToken = $('input[name="csrfmiddlewaretoken"]').val();

    await session.client.post('https://clients.villapro.eu/login/', new URLSearchParams({
        csrfmiddlewaretoken: csrfToken,
        username: email,
        password: password,
        next: '/en/reserv_single/sk_ba_panoramacity2/'
    }), {
        headers: { 'Referer': 'https://clients.villapro.eu/login/' },
        maxRedirects: 5
    });
    session.isLogged = true;
}

async function ensureLoggedIn(email) {
    const session = getSession(email);
    const cookies = await session.jar.getCookies('https://clients.villapro.eu');
    if (!session.isLogged || cookies.length === 0) {
        throw new Error("Session expired — user must log in again");
    }
}


// --- API ENDPOINTS ---

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!WHITELIST.includes(email.toLowerCase())) {
        console.warn(`Blocked login attempt from unauthorized email: ${email}`);
        return res.status(403).json({
            status: 'error',
            message: "You don't have access to this site. Please contact the administrator."
        });
    }

    try {
        const session = getSession(email);
        await villaLogin(email, password);

        const resPage = await session.client.get('https://clients.villapro.eu/en/reserv_single/sk_ba_panoramacity2/');
        const html = resPage.data;
        const $ = cheerio.load(html);

        const urlId = (resPage.request.res.responseUrl.match(/sk_ba_panoramacity2\/(\d+)\//) || [])[1];
        const scriptText = $('script').text();
        const longId = (scriptText.match(/var ticket_id = "(\d+)";/) || [null, '1506424268'])[1];
        const artId = (scriptText.match(/var article_id = (\d+);/) || [null, "273"])[1];

        if (urlId) {
            const passwordHash = await bcrypt.hash(password, 12);

            db.run(
                `INSERT OR REPLACE INTO users (email, password, ticket_id, long_ticket_id, article_id) VALUES (?, ?, ?, ?, ?)`,
                [email, passwordHash, urlId, longId, artId]
            );

            res.json({ status: 'success', email });
        } else {
            throw new Error("VillaPro ID not found");
        }
    } catch (e) {
        res.status(401).json({ status: 'error', message: e.message });
    }
});

app.get('/api/availability', async (req, res) => {
    const { month, year, email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (!user) return res.status(404).json({ success: false });

        try {
            const session = getSession(email);
            await ensureLoggedIn(user.email);


            const targetMonth = month || (new Date().getMonth() + 1);
            const targetYear = year || new Date().getFullYear();
            const pageUrl = `https://clients.villapro.eu/en/reserv_single/sk_ba_panoramacity2/${user.ticket_id}/${targetYear}/${targetMonth}/`;

            const page = await session.client.get(pageUrl);
            const $ = cheerio.load(page.data);

            // Extract the plate from the <h6 id="caption-car-id"><a> element
            const activePlate = $('#caption-car-id a').text().trim().split('\n')[0].trim();


            const csrfToken = $('input[name="csrfmiddlewaretoken"]').val();

            // Save this token to the database for the sniper to use
            db.run("UPDATE users SET last_csrf = ? WHERE email = ?", [csrfToken, email]);

            const calendarData = { reserved: [], free: [], full: [], noedit: [] };
            const getDay = (el) => parseInt($(el).attr('data-date').split('-')[2]);

            $('.day-reserved-edit').each((i, el) => {
                const day = parseInt($(el).attr('data-date').split('-')[2]);
                // Scrape the text inside the div (e.g., "102") and clean it up
                const lotId = $(el).find('.box-id').text().trim();
                calendarData.reserved.push({ day, lot: lotId });
            });
            $('.day-free-edit').each((i, el) => calendarData.free.push(getDay(el)));
            $('.day-free-noedit').each((i, el) => calendarData.noedit.push(getDay(el)));

            const refreshRes = await session.client.post("https://clients.villapro.eu/en/reserv_single/misc/sk_ba_panoramacity2/",
                new URLSearchParams({
                    cmd: 'REFRESH',
                    article_id: user.article_id,
                    month: targetMonth,
                    year: targetYear,
                    csrfmiddlewaretoken: csrfToken
                }), { headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': pageUrl } }
            );

            if (refreshRes.data?.full_days) calendarData.full = refreshRes.data.full_days;
            res.json({ success: true, activePlate: activePlate, ...calendarData });

        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

app.post('/api/reservations/instant', async (req, res) => {
    const { email, date, plate, command } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (!user) return res.status(404).json({ success: false });

        try {
            const session = getSession(email);
            await ensureLoggedIn(user.email);


            const [year, month] = date.split('-');
            const pageUrl = `https://clients.villapro.eu/en/reserv_single/sk_ba_panoramacity2/${user.ticket_id}/${year}/${parseInt(month)}/`;
            const getPage = await session.client.get(pageUrl);
            const $ = cheerio.load(getPage.data);

            const realTicketId = (getPage.data.match(/var ticket_id\s*=\s*["'](\d+)["']/) || [])[1] || '1506424268';
            const csrfToken = $('input[name="csrfmiddlewaretoken"]').val();

            const response = await session.client.post("https://clients.villapro.eu/en/reserv_single/misc/sk_ba_panoramacity2/",
                new URLSearchParams({
                    cmd: command,
                    date: date,
                    article_id: user.article_id,
                    ticket_id: realTicketId,
                    car_id: plate,
                    csrfmiddlewaretoken: csrfToken
                }), { headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': pageUrl } }
            );
            res.json({ success: response.data?.status === true, lot_id: response.data?.lot_id, message: response.data?.error_message });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
});

// Static Files
app.use(express.static(frontendPath));
app.use((req, res, next) => {
    if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
        next();
    }
});

app.post('/api/sniper/start', (req, res) => {
    const { email, date, plate } = req.body;
    startSniperInternal(email, date, plate)
    res.json({ success: true, message: `Sniper active for ${date}` });
});

app.post('/api/sniper/stop', (req, res) => {
    const { email, date } = req.body; // Expecting date now
    if (runningSnipers[email] && runningSnipers[email][date]) {
        clearInterval(runningSnipers[email][date]);
        delete runningSnipers[email][date];
        res.json({ success: true, message: `Sniper stopped for ${date}` });
    } else {
        res.json({ success: false, message: "No active sniper for this date" });
    }
});

app.get('/api/sniper/active', (req, res) => {
    const { email } = req.query;
    if (runningSnipers[email]) {
        // Return an array of all date strings that have an active interval
        res.json(Object.keys(runningSnipers[email]));
    } else {
        res.json([]);
    }
});


app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'Origin not allowed' });
    }
    next(err);
});


app.listen(5000, '0.0.0.0', () => console.log('✅ Multi-User Server running on port 5000'));