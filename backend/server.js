const path = require('path');
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const crypto = require('crypto');
const runningSnipers = {};
let nightlyAutomationInterval = null;


const app = express();

// 1. Add your static whitelist here
const WHITELIST = [
    'jakub.vadovsky@jci.com',
    'juraj.hnat@jci.com',
    'svetozar.synak@jci.com'
];


const COOKIE_SECRET = process.env.COOKIE_SECRET;
if (!COOKIE_SECRET) {
    throw new Error("COOKIE_SECRET env variable is required");
}


app.use(cors());


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
        encrypted_password TEXT,
        ticket_id TEXT,
        long_ticket_id TEXT,
        article_id TEXT,
        last_csrf TEXT,
        session_cookies TEXT
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

    db.run(`CREATE TABLE IF NOT EXISTS snipers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        date TEXT NOT NULL,
        plate TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        UNIQUE(email, date)
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

async function getSession(email) {
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

        userSessions[email] = {
            client,
            jar,
            isLogged: false,
            hydrated: false
        };
    }

    const session = userSessions[email];

    if (!session.hydrated) {
        const row = await new Promise((resolve, reject) => {
            db.get(
                "SELECT session_cookies FROM users WHERE email = ?",
                [email],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });

        if (row?.session_cookies) {
            try {
                const decrypted = decrypt(row.session_cookies);
                await restoreCookies(jar, decrypted);
                session.isLogged = true;
                console.log(`🔁 Cookies restored for ${email}`);
            } catch {
                console.warn(`⚠️ Failed to restore cookies for ${email}`);
            }
        }


        session.hydrated = true;
    }

    return session;
}





// SHARED LOGIC: The Robot calls this to act like a user
async function internalInstantReserve(email, date, plate, command = 'ADD') {

    const user = await new Promise(r => db.get("SELECT * FROM users WHERE email=?", [email], (err, row) => r(row)));
    if (!user) return { status: false, error_message: "User not found" };

    const session = await getSession(email);
    try {
        await ensureLoggedIn(email);
    } catch {
        return { status: false, error_message: "Session expired" };
    }


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
        return;
    }

    console.log(`🎯 Multi-Sniper engaged for ${email} on date: ${date}`);

    const sniperId = setInterval(async () => {
        db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
            if (!user || !user.last_csrf) return;

            try {
                const session = await getSession(email);
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

app.get('/api/logs', async (req, res) => {
    const { email } = req.query;

    if (!requireFields(res, { email })) return;
    if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email" });

    try {
        await ensureLoggedIn(email);
    } catch {
        return res.status(401).json({ error: "Session expired" });
    }

    db.all(
        "SELECT * FROM activity_logs WHERE email = ? ORDER BY timestamp DESC LIMIT 50",
        [email],
        (err, rows) => res.json(rows || [])
    );
});


app.post('/api/bulk/save', (req, res) => {
    const { email, days, months, plate, name, id } = req.body;

    if (!requireFields(res, { email, days, months, plate })) return;
    if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email" });
    if (!isValidPlate(plate)) return res.status(400).json({ error: "Invalid plate" });


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



app.get('/api/bulk/rules', async (req, res) => {
    const { email } = req.query;

    if (!requireFields(res, { email })) return;
    if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email" });

    try {
        await ensureLoggedIn(email);
    }
    catch {
        return res.status(401).json({ error: "Session expired" });
    }

    db.all(
        "SELECT * FROM bulk_rules WHERE email = ?",
        [email],
        (err, rows) => res.json(rows || [])
    );
});


// --- COOKIE ENCRYPTION HELPERS ---

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(COOKIE_SECRET).digest();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return iv.toString('base64') + ':' + encrypted;
}

function decrypt(encrypted) {
    const [ivPart, encryptedPart] = encrypted.split(':');
    const iv = Buffer.from(ivPart, 'base64');
    const key = crypto.createHash('sha256').update(COOKIE_SECRET).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encryptedPart, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

function serializeCookies(jar) {
    return JSON.stringify(jar.toJSON());
}

async function restoreCookies(jar, json) {
    const data = JSON.parse(json);
    jar.fromJSON(data);
}




// --- HELPERS ---
async function villaLogin(email, password) {
    const session = await getSession(email);
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
    const session = await getSession(email);
    const cookies = await session.jar.getCookies('https://clients.villapro.eu');

    if (session.isLogged && cookies.length > 0) {
        return;
    }

    console.log(`🔐 Re-authenticating ${email} using encrypted password`);

    const user = await new Promise(r =>
        db.get(
            "SELECT encrypted_password FROM users WHERE email = ?",
            [email],
            (_, row) => r(row)
        )
    );

    if (!user?.encrypted_password) {
        throw new Error("No stored credentials");
    }

    const password = decrypt(user.encrypted_password);
    await villaLogin(email, password);

    // refresh cookies after login
    const cookiesJson = await serializeCookies(session.jar);
    const encryptedCookies = encrypt(cookiesJson);

    db.run(
        "UPDATE users SET session_cookies = ? WHERE email = ?",
        [encryptedCookies, email]
    );

    session.isLogged = true;
}


async function resumeSnipersOnStartup() {
    console.log("🔄 Resuming active snipers...");

    db.all(
        "SELECT * FROM snipers WHERE status = 'active'",
        async (err, snipers) => {
            if (err) {
                console.error("❌ Failed to load snipers:", err);
                return;
            }

            for (const s of snipers) {
                try {
                    await ensureLoggedIn(s.email);
                    startSniperInternal(s.email, s.date, s.plate);
                    console.log(`▶️ Resumed sniper ${s.email} ${s.date}`);
                } catch (e) {
                    console.warn(
                        `⚠️ Could not resume sniper ${s.email} ${s.date}: ${e.message}`
                    );
                }
            }
        }
    );
}




// --- INPUT VALIDATION HELPERS ---

function isValidEmail(email) {
    return typeof email === 'string' &&
        email.length <= 255 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidISODate(date) {
    if (typeof date !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const d = new Date(date);
    return !isNaN(d.getTime());
}

function isValidPlate(plate) {
    return typeof plate === 'string' &&
        plate.length >= 3 &&
        plate.length <= 15 &&
        /^[A-Z0-9\-]+$/i.test(plate);
}

function requireFields(res, fields) {
    for (const [name, value] of Object.entries(fields)) {
        if (!value) {
            res.status(400).json({ error: `Missing field: ${name}` });
            return false;
        }
    }
    return true;
}



// --- API ENDPOINTS ---

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!requireFields(res, { email, password })) return;
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    if (!WHITELIST.includes(email.toLowerCase())) {
        console.warn(`Blocked login attempt from unauthorized email: ${email}`);
        return res.status(403).json({
            status: 'error',
            message: "You don't have access to this site. Please contact the administrator."
        });
    }

    try {
        const session = await getSession(email);
        await villaLogin(email, password);

        const resPage = await session.client.get('https://clients.villapro.eu/en/reserv_single/sk_ba_panoramacity2/');
        const html = resPage.data;
        const $ = cheerio.load(html);

        const urlId = (resPage.request.res.responseUrl.match(/sk_ba_panoramacity2\/(\d+)\//) || [])[1];
        const scriptText = $('script').text();
        const longId = (scriptText.match(/var ticket_id = "(\d+)";/) || [null, '1506424268'])[1];
        const artId = (scriptText.match(/var article_id = (\d+);/) || [null, "273"])[1];

        if (urlId) {
            const cookiesJson = await serializeCookies(session.jar);
            const encryptedCookies = encrypt(cookiesJson);

            const encryptedPassword = encrypt(password);

            db.run(
                `INSERT OR REPLACE INTO users 
                (email, encrypted_password, ticket_id, long_ticket_id, article_id, session_cookies)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [email, encryptedPassword, urlId, longId, artId, encryptedCookies]
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

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email" });
    }

    if (!email) return res.status(400).json({ error: "Email required" });

    if (month && (month < 1 || month > 12)) {
        return res.status(400).json({ error: "Invalid month" });
    }

    if (year && (year < 2000 || year > 2100)) {
        return res.status(400).json({ error: "Invalid year" });
    }

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (!user) return res.status(404).json({ success: false });

        try {
            const session = await getSession(email);

            try {
                await ensureLoggedIn(user.email);
            } catch (e) {
                return res.status(401).json({ error: "Session expired" });
            }

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

    if (!requireFields(res, { email, date, plate, command })) return;
    if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email" });
    if (!isValidISODate(date)) return res.status(400).json({ error: "Invalid date" });
    if (!isValidPlate(plate)) return res.status(400).json({ error: "Invalid plate" });

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (!user) return res.status(404).json({ success: false });

        try {
            const session = await getSession(email);

            try {
                await ensureLoggedIn(user.email);
            } catch {
                return res.status(401).json({ error: "Session expired" });
            }



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

    if (!requireFields(res, { email, date, plate })) return;
    if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email" });
    if (!isValidISODate(date)) return res.status(400).json({ error: "Invalid date" });
    if (!isValidPlate(plate)) return res.status(400).json({ error: "Invalid plate" });

    db.run(
        "INSERT OR IGNORE INTO snipers (email, date, plate, status) VALUES (?, ?, ?, 'active')",
        [email, date, plate],
        () => {
            db.run(
                "INSERT OR IGNORE INTO snipers (email, date, plate, status) VALUES (?, ?, ?, 'active')",
                [email, date, plate],
                function () {
                    if (this.changes === 0) {
                        return res.json({
                            success: true,
                            message: "Sniper already running for this date"
                        });
                    }

                    startSniperInternal(email, date, plate);
                    res.json({ success: true, message: `Sniper started for ${date}` });
                }
            );

        }
    );

});

app.post('/api/sniper/stop', (req, res) => {
    const { email, date } = req.body;

    // Stop in-memory sniper if running
    if (runningSnipers[email]?.[date]) {
        clearInterval(runningSnipers[email][date]);
        delete runningSnipers[email][date];
    }

    // Persist stop state
    db.run(
        "UPDATE snipers SET status = 'stopped' WHERE email = ? AND date = ?",
        [email, date],
        (err) => {
            if (err) {
                console.error("❌ Failed to stop sniper:", err);
                return res.status(500).json({ success: false });
            }

            return res.json({
                success: true,
                message: `Sniper stopped for ${date}`
            });
        }
    );
});


app.get('/api/sniper/active', async (req, res) => {
    const { email } = req.query;

    if (!requireFields(res, { email })) return;
    if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email" });

    try {
        await ensureLoggedIn(email);
    }
    catch {
        return res.status(401).json({ error: "Session expired" });
    }

    if (runningSnipers[email]) {
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


app.listen(5000, '0.0.0.0', async () => {
    console.log('✅ Multi-User Server running on port 5000');
    await resumeSnipersOnStartup();
});
