const path = require('path');
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const crypto = require('crypto');
const runningSnipers = {};
let lastNightlyRunDate = null;
const createAdminApi = require("./admin.api");





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
app.use(express.json());
app.use(cookieParser());


app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;

    // Allow non-browser clients (curl, server-side, PM2, cron)
    if (!origin) return next();

    if (origin === 'https://www.vadovsky-tech.com' || origin === 'http://localhost:5173' || origin === 'http://localhost:5174') {
        return next();
    }
    return res.status(403).json({ error: 'Forbidden origin' });
});

app.use("/api", async (req, res, next) => {
    const openPaths = [
        "/login",
        "/register",
        "/me"
    ];

    if (openPaths.includes(req.path)) {
        return next();
    }

    const email = req.cookies?.app_user;
    if (!email) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    try {
        const user = await new Promise((resolve, reject) => {
            db.get(
                `
                SELECT status, approved_at
                FROM users
                WHERE email = ?
                `,
                [email],
                (err, row) => (err ? reject(err) : resolve(row))
            );
        });

        if (!user) {
            return res.status(401).json({ error: "Invalid session" });
        }

        if (user.status === "disabled") {
            return res.status(403).json({ error: "Account disabled" });
        }

        // Block ONLY automation endpoints for pending users
        const restrictedPaths = [
            "/availability",
            "/reservations",
            "/sniper",
            "/bulk"
        ];

        if (!user.approved_at && restrictedPaths.some(p => req.path.startsWith(p))) {
            return res.status(403).json({ error: "Account pending approval" });
        }


        // ✅ Approved & active — update last_seen
        db.run(
            "UPDATE users SET last_seen = ? WHERE email = ?",
            [getVillaProTimestamp(), email]
        );

        next();


    } catch (err) {
        console.error("Approval middleware error:", err);
        res.status(500).json({ error: "Authorization failed" });
    }
});






// --- DATABASE INITIALIZATION ---
const dbPath = path.join(__dirname, 'parking.db');
const db = new sqlite3.Database(dbPath);


db.serialize(() => {

    db.run(`CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,

        encrypted_password TEXT,
        villapro_encrypted_password TEXT,

        roles TEXT NOT NULL DEFAULT '["user"]',
        permissions TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'active',
        
        last_seen DATETIME,
        approved_at DATETIME NULL,
        created_at DATETIME NOT NULL,

        ticket_id TEXT,
        long_ticket_id TEXT,
        article_id TEXT,
        last_csrf TEXT,
        session_cookies TEXT
        )`
    );

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


    // approval gate
    db.run(`ALTER TABLE users ADD COLUMN approved_at DATETIME`, () => { });

    // access control
    db.run(`ALTER TABLE users ADD COLUMN roles TEXT DEFAULT '["user"]'`, () => { });
    db.run(`ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[]'`, () => { });
    db.run(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`, () => { });

    // audit
    db.run(`ALTER TABLE users ADD COLUMN created_at DATETIME`, () => { });

    console.log("Database initialized.");


});








app.use("/api/admin", createAdminApi(db, getVillaProTimestamp));

// --- NIGHTLY AUTOMATION ---







function getVillaProNow() {
    // Europe/Bratislava (VillaPro)
    return new Date(
        new Date().toLocaleString("en-US", { timeZone: "Europe/Bratislava" })
    );
}

function getVillaProTimestamp() {
    const now = getVillaProNow();
    return now.toISOString().replace('T', ' ').slice(0, 19);
}


async function runNightlyAutomation(force = false) {
    const now = getVillaProNow();


    const todayKey = now.toISOString().slice(0, 10);

    if (!force) {
        const hours = now.getHours();
        const minutes = now.getMinutes();

        if (hours !== 23 || minutes < 55) return;
        if (lastNightlyRunDate === todayKey) return;
    }

    lastNightlyRunDate = todayKey;

    console.log("🌙 Nightly automation started");

    db.all("SELECT * FROM bulk_rules", async (err, rules) => {
        if (err || !rules) return;

        for (const rule of rules) {
            const target = new Date(now);
            target.setDate(target.getDate() + 15);
            await applyRuleToDate(rule.email, rule, target);
        }
    });
}

db.run(
    `
  UPDATE users
  SET created_at = ?
  WHERE created_at IS NULL
  `,
    [getVillaProTimestamp()]
);



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


async function applyRuleToDate(email, rule, dateObj) {
    const days = JSON.parse(rule.days_of_week);
    const months = JSON.parse(rule.months);

    const dayOfWeek = dateObj.getDay();
    const month = dateObj.getMonth() + 1;

    if (!days.includes(dayOfWeek) || !months.includes(month)) {
        return;
    }

    const y = dateObj.getFullYear();
    const m = String(month).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const result = await internalInstantReserve(email, dateStr, rule.plate, 'ADD');

    if (result.status === true) {
        db.run(
            "INSERT INTO activity_logs (email, message, timestamp) VALUES (?, ?,?)",
            [email, `✅ Auto-Reserved: ${dateStr}`, getVillaProTimestamp()]
        );
    } else {
        db.run(
            "INSERT OR IGNORE INTO snipers (email, date, plate, status) VALUES (?, ?, ?, 'active')",
            [email, dateStr, rule.plate],
            function () {
                if (this.changes > 0) {
                    db.run(
                        "INSERT INTO activity_logs (email, message, timestamp) VALUES (?, ?,?)",
                        [email, `🎯 Full: Sniper started for ${dateStr}`, getVillaProTimestamp()]
                    );
                    startSniperInternal(email, dateStr, rule.plate);
                }
            }
        );
    }
}



async function executeRule(email, rule) {
    db.run(
        "INSERT INTO activity_logs (email, message, timestamp) VALUES (?, ?,?)",
        [email, `🤖 Robot: Starting scan for plate ${rule.plate}`, getVillaProTimestamp()]
    );

    for (let i = 0; i <= 14; i++) {
        const target = new Date();
        target.setDate(target.getDate() + i);

        await applyRuleToDate(email, rule, target);
    }
}



// Helper to bridge the gap between Rule and your existing Sniper
function startSniperInternal(email, date, plate) {

    if (!runningSnipers[email]) runningSnipers[email] = {};

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

                const realTicketId =
                    (getPage.data.match(/var ticket_id\s*=\s*["'](\d+)["']/) || [])[1] || '1506424268';

                const csrfToken = $('input[name="csrfmiddlewaretoken"]').val();

                const response = await session.client.post(
                    "https://clients.villapro.eu/en/reserv_single/misc/sk_ba_panoramacity2/",
                    new URLSearchParams({
                        cmd: 'ADD',
                        date: date,
                        article_id: user.article_id,
                        ticket_id: realTicketId,
                        car_id: plate,
                        csrfmiddlewaretoken: csrfToken
                    }),
                    { headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': pageUrl } }
                );

                // 🔍 CHECK IF WE ALREADY OWN THIS DATE
                const alreadyReservedByUs =
                    $(`.day-reserved-edit[data-date="${date}"]`).length > 0;

                if (response.data?.status === true || alreadyReservedByUs) {
                    console.log(
                        alreadyReservedByUs
                            ? `🛑 Sniper stopping — reservation already owned for ${email} on ${date}`
                            : `✅ SNIPE SUCCESSFUL for ${email} on ${date}!`
                    );

                    // ✅ STOP ONLY THIS INTERVAL
                    clearInterval(sniperId);

                    // ✅ DEFENSIVE MAP CLEANUP
                    if (runningSnipers[email]?.[date] === sniperId) {
                        delete runningSnipers[email][date];

                        if (Object.keys(runningSnipers[email]).length === 0) {
                            delete runningSnipers[email];
                        }
                    }

                    // ✅ DB IS AUTHORITY — REMOVE SNIPER INTENT
                    db.run(
                        "DELETE FROM snipers WHERE email = ? AND date = ?",
                        [email, date]
                    );
                } else {
                    console.log(
                        `... [${email}] sniping ${date}: ${response.data?.error_message || 'Still full'}`
                    );
                }


            } catch (e) {
                console.error(`Sniper cycle error for ${date}:`, e.message);
            }
        });
    }, 5000);

    // ✅ ASSIGN AFTER INTERVAL IS CREATED
    runningSnipers[email][date] = sniperId;
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

    db.run("DELETE FROM bulk_rules WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ success: false });

        db.all("SELECT * FROM bulk_rules WHERE email = ?", [email], (err, remainingRules) => {
            if (err) return res.json({ success: true });

            db.all(
                "SELECT date FROM snipers WHERE email = ? AND status = 'active'",
                [email],
                (err, sniperRows) => {
                    if (err) return res.json({ success: true });

                    sniperRows.forEach(({ date: dateStr }) => {
                        const targetDate = new Date(dateStr);
                        const dayOfWeek = targetDate.getDay();
                        const month = targetDate.getMonth() + 1;

                        const isStillNeeded = remainingRules.some(rule => {
                            const days = JSON.parse(rule.days_of_week);
                            const months = JSON.parse(rule.months);
                            return days.includes(dayOfWeek) && months.includes(month);
                        });

                        if (!isStillNeeded) {
                            console.log(`🛑 Removing orphan sniper for ${dateStr} (Rule Deleted)`);

                            // 🔐 DB first
                            db.run(
                                "DELETE FROM snipers WHERE email = ? AND date = ?",
                                [email, dateStr]
                            );

                            // 🧠 Memory derives from DB
                            if (runningSnipers[email]?.[dateStr]) {
                                clearInterval(runningSnipers[email][dateStr]);
                                delete runningSnipers[email][dateStr];
                            }
                        }
                    });

                    res.json({ success: true });
                }
            );
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
            "SELECT villapro_encrypted_password FROM users WHERE email = ?",
            [email],
            (_, row) => r(row)
        )
    );

    if (!user?.villapro_encrypted_password) {
        throw new Error("No stored credentials");
    }

    const password = decrypt(user.villapro_encrypted_password);
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

                    // Defensive guard: avoid duplicate resume attempts
                    if (!runningSnipers[s.email]?.[s.date]) {
                        startSniperInternal(s.email, s.date, s.plate);
                    }

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


app.get("/api/me", async (req, res) => {
    const email = req.cookies?.app_user;
    if (!email) {
        return res.status(401).json({ authenticated: false });
    }

    db.get(
        `
        SELECT
          roles,
          approved_at,
          ticket_id,
          villapro_encrypted_password,
          status
        FROM users
        WHERE email = ?
        `,
        [email],
        (err, user) => {
            if (err || !user) {
                return res.status(401).json({ authenticated: false });
            }

            if (user.status === "disabled") {
                return res.status(403).json({ authenticated: false });
            }

            res.json({
                authenticated: true,
                email,
                roles: JSON.parse(user.roles || '["user"]'),
                approved: !!user.approved_at,
                villaProConnected: !!user.ticket_id && !!user.villapro_encrypted_password
            });
        }
    );
});



app.post("/api/register", async (req, res) => {
    const { email, password } = req.body;

    if (!requireFields(res, { email, password })) return;

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    try {
        // check if user already exists
        const existing = await new Promise((resolve) => {
            db.get(
                "SELECT email FROM users WHERE email = ?",
                [email],
                (_, row) => resolve(row)
            );
        });

        if (existing) {
            return res.status(409).json({ error: "User already exists" });
        }

        const encryptedPassword = encrypt(password);
        const createdAt = getVillaProTimestamp();

        db.run(
            `
            INSERT INTO users (
              email,
              encrypted_password,
              roles,
              permissions,
              status,
              approved_at,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, NULL, ?)
            `,
            [
                email,
                encryptedPassword,
                JSON.stringify(["user"]),
                JSON.stringify([]),
                "active",
                createdAt
            ]
        );
        res.cookie("app_user", email, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });


        return res.json({
            success: true,
            status: "pending",
            email
        });
    } catch (err) {
        console.error("Register error:", err);
        return res.status(500).json({ error: "Registration failed" });
    }
});



app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!requireFields(res, { email, password })) return;
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    try {
        // 🔍 Load user state
        const userRow = await new Promise((resolve, reject) => {
            db.get(
                `
                SELECT
                    encrypted_password,
                    status,
                    approved_at
                FROM users
                WHERE email = ?
                `,
                [email],
                (err, row) => (err ? reject(err) : resolve(row))
            );
        });

        if (!userRow) {
            return res.status(401).json({
                status: "error",
                message: "Invalid credentials"
            });
        }

        if (userRow.status === "disabled") {
            return res.status(403).json({
                status: "error",
                message: "Your account has been disabled. Please contact the administrator."
            });
        }

        // 🔐 Password check (unchanged model)
        const decryptedPassword = decrypt(userRow.encrypted_password);
        if (password !== decryptedPassword) {
            return res.status(401).json({
                status: "error",
                message: "Invalid credentials"
            });
        }

        // 🚧 APPROVAL GATE (NEW)
        if (!userRow.approved_at) {
            res.cookie("app_user", email, {
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
            });

            return res.json({
                status: "pending",
                email
            });
        }


        /*
        // ✅ APPROVED — EXISTING FLOW UNTOUCHED
        const session = await getSession(email);
        await villaLogin(email, password);

        const resPage = await session.client.get(
            'https://clients.villapro.eu/en/reserv_single/sk_ba_panoramacity2/'
        );

        const html = resPage.data;
        const $ = cheerio.load(html);

        const urlId =
            (resPage.request.res.responseUrl.match(/sk_ba_panoramacity2\/(\d+)\//) || [])[1];

        const scriptText = $('script').text();
        const longId =
            (scriptText.match(/var ticket_id = "(\d+)";/) || [null, '1506424268'])[1];
        const artId =
            (scriptText.match(/var article_id = (\d+);/) || [null, "273"])[1];

        if (!urlId) {
            throw new Error("VillaPro ID not found");
        }

        const cookiesJson = await serializeCookies(session.jar);
        const encryptedCookies = encrypt(cookiesJson);


        db.run(`
            UPDATE users
            SET
                encrypted_password = ?,
                ticket_id = ?,
                long_ticket_id = ?,
                article_id = ?,
                session_cookies = ?
            WHERE email = ?
            `,
            [
                encryptedPassword,
                urlId,
                longId,
                artId,
                encryptedCookies,
                email
            ]
        );

        */
        res.cookie("app_user", email, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });

        return res.json({ status: "success", email });

    } catch (e) {
        console.error("Login error:", e);
        return res.status(401).json({
            status: "error",
            message: e.message
        });
    }
});

app.post("/api/villapro/connect", async (req, res) => {
    const email = req.cookies?.app_user;
    const { password } = req.body;

    if (!email) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    if (!password) {
        return res.status(400).json({ error: "Password required" });
    }

    const user = await new Promise(resolve =>
        db.get(
            "SELECT approved_at, status FROM users WHERE email = ?",
            [email],
            (_, row) => resolve(row)
        )
    );

    if (!user) {
        return res.status(401).json({ error: "Invalid session" });
    }

    if (!user.approved_at) {
        return res.status(403).json({ error: "Account not approved" });
    }

    if (user.status === "disabled") {
        return res.status(403).json({ error: "Account disabled" });
    }

    try {
        // 🔐 Try VillaPro login
        const session = await getSession(email);
        await villaLogin(email, password);

        const resPage = await session.client.get(
            "https://clients.villapro.eu/en/reserv_single/sk_ba_panoramacity2/"
        );

        const html = resPage.data;
        const $ = cheerio.load(html);

        const urlId =
            (resPage.request.res.responseUrl.match(/sk_ba_panoramacity2\/(\d+)\//) || [])[1];

        if (!urlId) {
            throw new Error("VillaPro account not detected");
        }

        const scriptText = $("script").text();
        const longId =
            (scriptText.match(/var ticket_id = "(\d+)";/) || [null, "1506424268"])[1];
        const artId =
            (scriptText.match(/var article_id = (\d+);/) || [null, "273"])[1];

        const cookiesJson = serializeCookies(session.jar);
        const encryptedCookies = encrypt(cookiesJson);
        const encryptedVillaProPassword = encrypt(password);

        db.run(
            `
            UPDATE users
            SET
              villapro_encrypted_password = ?,
              ticket_id = ?,
              long_ticket_id = ?,
              article_id = ?,
              session_cookies = ?
            WHERE email = ?
            `,
            [
                encryptedVillaProPassword,
                urlId,
                longId,
                artId,
                encryptedCookies,
                email
            ]
        );
        return res.json({ success: true });

    } catch (e) {
        console.error("VillaPro connect failed:", e.message);
        return res.status(401).json({
            error: "VillaPro authentication failed"
        });
    }
});




app.post("/api/logout", (req, res) => {
    res.clearCookie("app_user", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
    });

    res.json({ status: "ok" });
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
                if (e.message.includes("VillaPro")) {
                    return res.status(403).json({ error: "VillaPro not connected" });
                }
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
            } catch (e) {
                if (e.message.includes("VillaPro")) {
                    return res.status(403).json({ error: "VillaPro not connected" });
                }
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
        function () {
            if (this.changes === 0) {
                return res.json({
                    success: true,
                    message: "Sniper already running for this date"
                });
            }

            // Runtime derives from DB
            startSniperInternal(email, date, plate);
            res.json({ success: true, message: `Sniper started for ${date}` });
        }
    );
});


app.post('/api/sniper/stop', (req, res) => {
    const { email, date } = req.body;

    if (!requireFields(res, { email, date })) return;
    if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email" });
    if (!isValidISODate(date)) return res.status(400).json({ error: "Invalid date" });

    db.run(
        "DELETE FROM snipers WHERE email = ? AND date = ?",
        [email, date],
        (err) => {
            if (err) {
                console.error("❌ Failed to delete sniper:", err);
                return res.status(500).json({ success: false });
            }

            // Runtime cleanup derives from DB change
            if (runningSnipers[email]?.[date]) {
                clearInterval(runningSnipers[email][date]);
                delete runningSnipers[email][date];
            }

            res.json({
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
    } catch {
        return res.status(401).json({ error: "Session expired" });
    }

    db.all(
        "SELECT date FROM snipers WHERE email = ? AND status = 'active'",
        [email],
        (err, rows) => {
            if (err) {
                console.error("❌ Failed to fetch active snipers:", err);
                return res.status(500).json([]);
            }

            res.json(rows.map(r => r.date));
        }
    );
});






app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'Origin not allowed' });
    }
    next(err);
});


app.listen(5000, '0.0.0.0', async () => {
    await resumeSnipersOnStartup();

    // 🔁 Catch up if server restarted after 23:55
    const now = getVillaProNow();
    if (now.getHours() === 23 && now.getMinutes() >= 55) {
        await runNightlyAutomation(true);
    }

    setInterval(runNightlyAutomation, 60 * 1000);
});

