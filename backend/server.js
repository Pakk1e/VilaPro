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
const runningBulkRules = {};
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

    if (
        origin === 'https://www.vadovsky-tech.com' ||
        origin === 'http://localhost:5173' ||
        origin === 'http://localhost:5174' ||
        origin === 'http://localhost:3001'
    ) {
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

    db.run(`CREATE TABLE IF NOT EXISTS automation_exceptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        dates TEXT,
        days_of_week TEXT,
        note TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);


    // approval gate
    db.run(`ALTER TABLE users ADD COLUMN approved_at DATETIME`, () => { });

    // access control
    db.run(`ALTER TABLE users ADD COLUMN roles TEXT DEFAULT '["user"]'`, () => { });
    db.run(`ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[]'`, () => { });
    db.run(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`, () => { });

    // audit
    db.run(`ALTER TABLE users ADD COLUMN created_at DATETIME`, () => { });


    db.run(`CREATE TABLE IF NOT EXISTS user_settings (
    email TEXT PRIMARY KEY,
    aqi_standard TEXT DEFAULT 'primary',
    units TEXT DEFAULT 'metric',
    glassmorphism INTEGER DEFAULT 50,
    auto_refresh INTEGER DEFAULT 1
    )`);


    db.run(`CREATE TABLE IF NOT EXISTS weather_cache (
    city_name TEXT PRIMARY KEY,
    lat REAL,
    lon REAL,
    data TEXT,
    last_updated DATETIME
    )`);

    console.log("Database initialized.");


});








app.use(
    "/api/admin",
    createAdminApi(db, getVillaProTimestamp, {
        stopUserSnipers,
        getRunningBulkRulesForUser,
    })
);





async function updateWeatherCache(cityName, lat, lon) {
    try {
        //console.log(`🌤️ Refreshing weather for ${cityName}...`);

        // Fetching 24h forecast for multiple layers at once
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m&forecast_days=1`;
        const response = await axios.get(url);

        const jsonData = JSON.stringify(response.data);
        const now = getVillaProTimestamp();

        db.run(
            `INSERT INTO weather_cache (city_name, lat, lon, data, last_updated) 
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(city_name) DO UPDATE SET data=excluded.data, last_updated=excluded.last_updated`,
            [cityName, lat, lon, jsonData, now]
        );
    } catch (err) {
        console.error("❌ Weather update failed:", err.message);
    }
}

// Start the 30-minute interval
setInterval(() => {
    // You can pull these coordinates from your settings or a hardcoded list
    updateWeatherCache("Bratislava", 48.1486, 17.1077);
}, 30 * 60 * 1000);




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

function stopUserSnipers(email) {
    const userSnipers = runningSnipers[email];

    if (!userSnipers) {
        return;
    }

    for (const [date, intervalId] of Object.entries(userSnipers)) {
        clearInterval(intervalId);
        console.log(
            `🛑 Admin stopped sniper for deleted user ${email} on ${date}`
        );
    }

    delete runningSnipers[email];
}

function getRunningBulkRulesForUser(email, callback) {
    db.all(
        `
        SELECT id
        FROM bulk_rules
        WHERE email = ?
        `,
        [email],
        (err, rows) => {
            if (err) {
                return callback(err);
            }

            const running = (rows || [])
                .map((row) => row.id)
                .filter((id) => !!runningBulkRules[id]);

            callback(null, running);
        }
    );
}

async function cleanupExpiredAutomationExceptions() {
    const today = getVillaProNow()
        .toISOString()
        .slice(0, 10);

    db.all(
        `
        SELECT
            id,
            email,
            name,
            type,
            start_date,
            end_date,
            dates,
            days_of_week
        FROM automation_exceptions
        `,
        [],
        (err, rows) => {
            if (err) {
                console.error(
                    "❌ Failed to load automation exceptions for cleanup:",
                    err
                );
                return;
            }

            for (const exception of rows || []) {
                try {
                    // DATE RANGE / RECURRING
                    if (
                        exception.type === "range" ||
                        exception.type === "recurring"
                    ) {
                        if (
                            exception.end_date &&
                            exception.end_date < today
                        ) {
                            db.run(
                                `
                                DELETE FROM automation_exceptions
                                WHERE id = ?
                                `,
                                [exception.id],
                                (deleteErr) => {
                                    if (deleteErr) {
                                        console.error(
                                            `❌ Failed to remove expired automation exception ${exception.id}:`,
                                            deleteErr
                                        );
                                    } else {
                                        console.log(
                                            `🧹 Removed expired automation exception ${exception.id} (${exception.name})`
                                        );
                                    }
                                }
                            );
                        }

                        continue;
                    }

                    // SPECIFIC DATES
                    if (exception.type === "specific") {
                        let dates;

                        try {
                            dates = JSON.parse(
                                exception.dates || "[]"
                            );
                        } catch {
                            console.warn(
                                `⚠️ Invalid dates JSON for automation exception ${exception.id}`
                            );
                            continue;
                        }

                        const futureDates = dates
                            .filter(
                                (date) =>
                                    typeof date === "string" &&
                                    date >= today
                            )
                            .sort();

                        if (futureDates.length === 0) {
                            db.run(
                                `
                                DELETE FROM automation_exceptions
                                WHERE id = ?
                                `,
                                [exception.id],
                                (deleteErr) => {
                                    if (deleteErr) {
                                        console.error(
                                            `❌ Failed to remove expired specific-date exception ${exception.id}:`,
                                            deleteErr
                                        );
                                    } else {
                                        console.log(
                                            `🧹 Removed expired automation exception ${exception.id} (${exception.name})`
                                        );
                                    }
                                }
                            );
                        } else if (
                            futureDates.length !== dates.length
                        ) {
                            db.run(
                                `
                                UPDATE automation_exceptions
                                SET dates = ?
                                WHERE id = ?
                                `,
                                [
                                    JSON.stringify(
                                        futureDates
                                    ),
                                    exception.id
                                ],
                                (updateErr) => {
                                    if (updateErr) {
                                        console.error(
                                            `❌ Failed to trim expired dates from automation exception ${exception.id}:`,
                                            updateErr
                                        );
                                    } else {
                                        console.log(
                                            `🧹 Trimmed past dates from automation exception ${exception.id}`
                                        );
                                    }
                                }
                            );
                        }
                    }
                } catch (cleanupErr) {
                    console.error(
                        `❌ Failed to clean automation exception ${exception.id}:`,
                        cleanupErr
                    );
                }
            }
        }
    );
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

    cleanupExpiredAutomationExceptions();

    db.all("SELECT * FROM bulk_rules", async (err, rules) => {
        if (err || !rules) return;

        for (const rule of rules) {
            const target = new Date(now);
            target.setDate(target.getDate() + 14);
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

        if (command === 'ADD') {
            db.run(
                `
            INSERT INTO reservations (
                user_email,
                date,
                plate_number,
                status
            )
            VALUES (?, ?, ?, 'active')
            ON CONFLICT(user_email, date)
            DO UPDATE SET
                plate_number = excluded.plate_number,
                status = 'active'
            `,
                [email, date, plate],
                (dbErr) => {
                    if (dbErr) {
                        console.error("❌ Failed to sync existing reservation:", dbErr);
                    }
                }
            );
        }

        return { status: true, message: "Already reserved" };
    }

    const response = await session.client.post(
        "https://clients.villapro.eu/en/reserv_single/misc/sk_ba_panoramacity2/",
        new URLSearchParams({
            cmd: command,
            date: date,
            article_id: user.article_id,
            ticket_id: realTicketId,
            car_id: plate,
            csrfmiddlewaretoken: csrfToken
        }),
        {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': pageUrl
            }
        }
    );

    const reservationSuccess = response.data?.status === true;

    if (reservationSuccess && command === 'ADD') {
        db.run(
            `
        INSERT INTO reservations (
            user_email,
            date,
            plate_number,
            status
        )
        VALUES (?, ?, ?, 'active')
        ON CONFLICT(user_email, date)
        DO UPDATE SET
            plate_number = excluded.plate_number,
            status = 'active'
        `,
            [email, date, plate],
            (dbErr) => {
                if (dbErr) {
                    console.error("❌ Failed to save bulk reservation:", dbErr);
                }
            }
        );
    }

    if (reservationSuccess && command === 'DEL') {
        db.run(
            `
        DELETE FROM reservations
        WHERE user_email = ? AND date = ?
        `,
            [email, date],
            (dbErr) => {
                if (dbErr) {
                    console.error("❌ Failed to delete reservation record:", dbErr);
                }
            }
        );
    }

    return response.data;
}

function dateMatchesAutomationException(exception, dateStr, dateObj) {
    if (exception.type === "specific") {
        let dates = [];

        try {
            dates = JSON.parse(exception.dates || "[]");
        } catch {
            return false;
        }

        return dates.includes(dateStr);
    }

    if (exception.type === "range") {
        if (!exception.start_date || !exception.end_date) {
            return false;
        }

        return (
            dateStr >= exception.start_date &&
            dateStr <= exception.end_date
        );
    }

    if (exception.type === "recurring") {
        if (!exception.start_date || !exception.end_date) {
            return false;
        }

        if (
            dateStr < exception.start_date ||
            dateStr > exception.end_date
        ) {
            return false;
        }

        let days = [];

        try {
            days = JSON.parse(
                exception.days_of_week || "[]"
            );
        } catch {
            return false;
        }

        return days.includes(dateObj.getDay());
    }

    return false;
}

async function hasGlobalAutomationException(email, dateStr, dateObj) {
    const exceptions = await new Promise((resolve, reject) => {
        db.all(
            `
            SELECT *
            FROM automation_exceptions
            WHERE email = ?
              AND (
                    type = 'specific'
                    OR type = 'range'
                    OR type = 'recurring'
              )
            `,
            [email],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            }
        );
    });

    return exceptions.some((exception) =>
        dateMatchesAutomationException(
            exception,
            dateStr,
            dateObj
        )
    );
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

    const globalException =
        await hasGlobalAutomationException(
            email,
            dateStr,
            dateObj
        );

    if (globalException) {
        console.log(
            `⏭️ Global automation exception: skipping ${dateStr} for ${email}`
        );
        return;
    }

    const legacyException = await new Promise(
        (resolve, reject) => {
            db.get(
                `
            SELECT id
            FROM bulk_exceptions
            WHERE rule_id = ?
              AND email = ?
              AND date = ?
            `,
                [rule.id, email, dateStr],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        }
    );

    if (legacyException) {
        console.log(
            `⏭️ Legacy automation exception: skipping ${dateStr} for ${email}`
        );
        return;
    }

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
    runningBulkRules[rule.id] = true;

    try {
        db.run(
            "INSERT INTO activity_logs (email, message, timestamp) VALUES (?, ?, ?)",
            [email, `🤖 Robot: Starting scan for plate ${rule.plate}`, getVillaProTimestamp()]
        );

        for (let i = 0; i < 14; i++) {
            const target = new Date();
            target.setDate(target.getDate() + i);

            await applyRuleToDate(email, rule, target);
        }
    } finally {
        delete runningBulkRules[rule.id];
        console.log(`✅ Bulk rule ${rule.id} execution finished`);
    }
}

app.get('/api/bulk/status/:id', (req, res) => {
    const email = req.cookies?.app_user;
    const ruleId = parseInt(req.params.id, 10);

    if (!email) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    if (!Number.isInteger(ruleId)) {
        return res.status(400).json({ error: "Invalid rule id" });
    }

    db.get(
        "SELECT id FROM bulk_rules WHERE id = ? AND email = ?",
        [ruleId, email],
        (err, rule) => {
            if (err) {
                console.error("❌ Failed to check bulk rule:", err);
                return res.status(500).json({ error: "Failed to check bulk rule" });
            }

            if (!rule) {
                return res.status(404).json({ error: "Rule not found" });
            }

            res.json({
                running: !!runningBulkRules[ruleId]
            });
        }
    );
});


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

                    // ✅ SAVE SUCCESSFUL RESERVATION
                    db.run(
                        `
                        INSERT INTO reservations (
                            user_email,
                            date,
                            plate_number,
                            status
                        )
                        VALUES (?, ?, ?, 'active')
                        ON CONFLICT(user_email, date)
                        DO UPDATE SET
                            plate_number = excluded.plate_number,
                            status = 'active'
                        `,
                        [email, date, plate],
                        (dbErr) => {
                            if (dbErr) {
                                console.error("❌ Failed to save sniper reservation:", dbErr);
                                return;
                            }

                            // ✅ DB IS AUTHORITY — REMOVE SNIPER INTENT
                            db.run(
                                "DELETE FROM snipers WHERE email = ? AND date = ?",
                                [email, date]
                            );
                        }
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
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email" });
    }
    if (!isValidPlate(plate)) {
        return res.status(400).json({ error: "Invalid plate" });
    }

    if (id) {
        // Handle Edit
        db.run(
            "UPDATE bulk_rules SET days_of_week=?, months=?, plate=?, name=? WHERE id=?",
            [JSON.stringify(days), JSON.stringify(months), plate, name, id],
            (updateErr) => {
                if (updateErr) {
                    console.error("❌ Failed to update bulk rule:", updateErr);
                    return res.status(500).json({
                        success: false,
                        error: "Failed to update rule"
                    });
                }

                db.get(
                    "SELECT * FROM bulk_rules WHERE id = ? AND email = ?",
                    [id, email],
                    (err, rule) => {
                        if (err) {
                            console.error("❌ Failed to load updated bulk rule:", err);
                            return res.status(500).json({
                                success: false,
                                error: "Failed to load rule"
                            });
                        }

                        if (!rule) {
                            return res.status(404).json({
                                success: false,
                                error: "Rule not found"
                            });
                        }

                        runningBulkRules[rule.id] = true;

                        executeRule(email, rule).catch((e) => {
                            console.error(`❌ Bulk rule ${rule.id} failed:`, e);
                        });

                        res.json({
                            success: true,
                            ruleId: rule.id
                        });
                    }
                );
            }
        );
    } else {
        // Handle New
        db.run(
            "INSERT INTO bulk_rules (email, days_of_week, months, plate, name) VALUES (?, ?, ?, ?, ?)",
            [email, JSON.stringify(days), JSON.stringify(months), plate, name],
            function (err) {
                if (err) {
                    console.error("❌ Failed to create bulk rule:", err);
                    return res.status(500).json({
                        success: false,
                        error: "Failed to create rule"
                    });
                }

                const ruleId = this.lastID;

                db.get(
                    "SELECT * FROM bulk_rules WHERE id = ? AND email = ?",
                    [ruleId, email],
                    (loadErr, rule) => {
                        if (loadErr) {
                            console.error("❌ Failed to load new bulk rule:", loadErr);
                            return res.status(500).json({
                                success: false,
                                error: "Failed to load rule"
                            });
                        }

                        if (!rule) {
                            return res.status(404).json({
                                success: false,
                                error: "Rule not found"
                            });
                        }

                        runningBulkRules[rule.id] = true;

                        executeRule(email, rule).catch((e) => {
                            console.error(`❌ Bulk rule ${rule.id} failed:`, e);
                        });

                        res.json({
                            success: true,
                            ruleId: rule.id
                        });
                    }
                );
            }
        );
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

app.get('/api/bulk/exceptions', (req, res) => {
    const email = req.cookies?.app_user;

    if (!email) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email" });
    }

    db.all(
        `
        SELECT id, rule_id, date
        FROM bulk_exceptions
        WHERE email = ?
        ORDER BY date
        `,
        [email],
        (err, rows) => {
            if (err) {
                console.error("❌ Failed to load bulk exceptions:", err);

                return res.status(500).json({
                    error: "Failed to load exceptions"
                });
            }

            res.json(rows || []);
        }
    );
});

app.get('/api/automation-exceptions', (req, res) => {
    const email = req.cookies?.app_user;

    if (!email) {
        return res.status(401).json({
            success: false,
            error: "Not authenticated"
        });
    }

    db.all(
        `
        SELECT
            id,
            email,
            name,
            type,
            start_date,
            end_date,
            dates,
            days_of_week,
            note,
            created_at
        FROM automation_exceptions
        WHERE email = ?
        ORDER BY
            COALESCE(start_date, '9999-12-31'),
            id
        `,
        [email],
        (err, rows) => {
            if (err) {
                console.error(
                    "❌ Failed to load automation exceptions:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    error: "Failed to load automation exceptions"
                });
            }

            res.json({
                success: true,
                exceptions: rows || []
            });
        }
    );
});


app.post('/api/automation-exceptions', (req, res) => {
    const email = req.cookies?.app_user;

    if (!email) {
        return res.status(401).json({
            success: false,
            error: "Not authenticated"
        });
    }

    const {
        name,
        type,
        start_date,
        end_date,
        dates,
        days_of_week,
        note
    } = req.body;

    if (!name || !type) {
        return res.status(400).json({
            success: false,
            error: "Name and type are required"
        });
    }

    const allowedTypes = [
        "range",
        "specific",
        "recurring"
    ];

    if (!allowedTypes.includes(type)) {
        return res.status(400).json({
            success: false,
            error: "Invalid exception type"
        });
    }

    db.run(
        `
        INSERT INTO automation_exceptions (
            email,
            name,
            type,
            start_date,
            end_date,
            dates,
            days_of_week,
            note
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            email,
            name.trim(),
            type,
            start_date || null,
            end_date || null,
            dates
                ? JSON.stringify(dates)
                : null,
            days_of_week
                ? JSON.stringify(days_of_week)
                : null,
            note?.trim() || null
        ],
        function (err) {
            if (err) {
                console.error(
                    "❌ Failed to create automation exception:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    error: "Failed to create automation exception"
                });
            }

            res.json({
                success: true,
                exceptionId: this.lastID
            });
        }
    );
});


app.delete('/api/automation-exceptions/:id', (req, res) => {
    const email = req.cookies?.app_user;
    const id = parseInt(req.params.id, 10);

    if (!email) {
        return res.status(401).json({
            success: false,
            error: "Not authenticated"
        });
    }

    if (!Number.isInteger(id)) {
        return res.status(400).json({
            success: false,
            error: "Invalid exception id"
        });
    }

    db.run(
        `
        DELETE FROM automation_exceptions
        WHERE id = ?
          AND email = ?
        `,
        [id, email],
        function (err) {
            if (err) {
                console.error(
                    "❌ Failed to delete automation exception:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    error: "Failed to delete automation exception"
                });
            }

            res.json({
                success: true,
                deleted: this.changes > 0
            });
        }
    );
});

app.delete('/api/bulk/exceptions/:ruleId/:date', (req, res) => {
    const email = req.cookies?.app_user;
    const ruleId = parseInt(req.params.ruleId, 10);
    const { date } = req.params;

    if (!email) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email" });
    }

    if (!Number.isInteger(ruleId)) {
        return res.status(400).json({ error: "Invalid rule id" });
    }

    if (!isValidISODate(date)) {
        return res.status(400).json({ error: "Invalid date" });
    }

    db.run(
        `
        DELETE FROM bulk_exceptions
        WHERE rule_id = ? AND email = ? AND date = ?
        `,
        [ruleId, email, date],
        function (err) {
            if (err) {
                console.error("❌ Failed to remove bulk exception:", err);

                return res.status(500).json({
                    error: "Failed to remove exception"
                });
            }

            res.json({
                success: true,
                removed: this.changes > 0
            });
        }
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
            const villaProPlate = $('#caption-car-id a').text().trim().split('\n')[0].trim();

            let activePlate = user.active_plate;

            if (!activePlate && villaProPlate) {
                activePlate = villaProPlate;

                db.run(
                    "UPDATE users SET active_plate = ? WHERE email = ?",
                    [villaProPlate, email],
                    (err) => {
                        if (err) {
                            console.error("❌ Failed to initialize active plate:", err);
                        }
                    }
                );
            }


            const csrfToken = $('input[name="csrfmiddlewaretoken"]').val();

            // Save this token to the database for the sniper to use
            db.run("UPDATE users SET last_csrf = ? WHERE email = ?", [csrfToken, email]);

            const calendarData = { reserved: [], free: [], full: [], noedit: [] };
            const getDay = (el) => parseInt($(el).attr('data-date').split('-')[2]);

            const reservationRows = await new Promise((resolve, reject) => {
                const prefix = `${targetYear}-${String(targetMonth).padStart(2, '0')}-`;

                db.all(
                    `SELECT date, plate_number
                    FROM reservations
                    WHERE user_email = ?
                    AND date LIKE ?
                    AND status = 'active'`,
                    [email, `${prefix}%`],
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    }
                );
            });

            const reservationPlateByDate = Object.fromEntries(
                reservationRows.map(row => [row.date, row.plate_number])
            );

            const liveReservationDates = [];

            $('.day-reserved-edit').each((i, el) => {
                const date = $(el).attr('data-date');
                const day = parseInt(date.split('-')[2], 10);
                const lotId = $(el).find('.box-id').text().trim();

                liveReservationDates.push({
                    date,
                    day,
                    lot: lotId,
                    plate: reservationPlateByDate[date] || activePlate || null,
                });
            });

            // Backfill reservations that exist in VillaPro but were not
            // recorded in the local reservations table yet.
            await Promise.all(
                liveReservationDates.map(
                    ({ date, plate }) =>
                        new Promise((resolve) => {
                            db.run(
                                `
                    INSERT OR IGNORE INTO reservations (
                        user_email,
                        date,
                        plate_number,
                        status
                    )
                    VALUES (?, ?, ?, 'active')
                    `,
                                [email, date, plate],
                                (err) => {
                                    if (err) {
                                        console.error(
                                            `❌ Failed to sync reservation ${date} for ${email}:`,
                                            err
                                        );
                                    }

                                    resolve();
                                }
                            );
                        })
                )
            );

            calendarData.reserved = liveReservationDates.map(
                ({ day, lot, plate }) => ({
                    day,
                    lot,
                    plate,
                })
            );
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


app.get('/api/plate', (req, res) => {
    const email = req.cookies?.app_user;

    if (!email) {
        return res.status(401).json({
            error: "Not authenticated"
        });
    }

    db.get(
        "SELECT active_plate FROM users WHERE email = ?",
        [email],
        (err, user) => {
            if (err) {
                console.error("❌ Failed to load active plate:", err);

                return res.status(500).json({
                    success: false,
                    error: "Failed to load plate"
                });
            }

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: "User not found"
                });
            }

            res.json({
                success: true,
                activePlate: user.active_plate || ""
            });
        }
    );
});

app.post('/api/plate', (req, res) => {
    const email = req.cookies?.app_user;
    const { plate } = req.body;

    if (!email) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    if (!isValidPlate(plate)) {
        return res.status(400).json({
            error: "Invalid plate"
        });
    }

    const normalizedPlate = plate.trim().toUpperCase();

    db.run(
        "UPDATE users SET active_plate = ? WHERE email = ?",
        [normalizedPlate, email],
        function (err) {
            if (err) {
                console.error("❌ Failed to save active plate:", err);

                return res.status(500).json({
                    success: false,
                    error: "Failed to save plate"
                });
            }

            console.log(
                `🚗 Active plate updated for ${email}: ${normalizedPlate}`
            );

            res.json({
                success: true,
                activePlate: normalizedPlate
            });
        }
    );
});

app.get('/api/reservations', (req, res) => {
    const email = req.cookies?.app_user;

    if (!email) {
        return res.status(401).json({
            success: false,
            error: "Not authenticated"
        });
    }

    db.all(
        `
        SELECT
            id,
            date,
            plate_number,
            status
        FROM reservations
        WHERE user_email = ?
          AND status = 'active'
        ORDER BY date ASC
        `,
        [email],
        (err, rows) => {
            if (err) {
                console.error("❌ Failed to load reservations:", err);

                return res.status(500).json({
                    success: false,
                    error: "Failed to load reservations"
                });
            }

            res.json({
                success: true,
                reservations: rows || []
            });
        }
    );
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
            const reservationSuccess = response.data?.status === true;
            const lotId = response.data?.lot_id || null;

            if (reservationSuccess && command === 'ADD') {
                db.run(
                    `
        INSERT INTO reservations (
            user_email,
            date,
            plate_number,
            status
        )
        VALUES (?, ?, ?, 'active')
        ON CONFLICT(user_email, date)
        DO UPDATE SET
            plate_number = excluded.plate_number,
            status = 'active'
        `,
                    [email, date, plate],
                    (dbErr) => {
                        if (dbErr) {
                            console.error("❌ Failed to save reservation:", dbErr);
                        }
                    }
                );
            }

            if (reservationSuccess && command === 'DEL') {
                db.run(
                    `
        DELETE FROM reservations
        WHERE user_email = ? AND date = ?
        `,
                    [email, date],
                    (dbErr) => {
                        if (dbErr) {
                            console.error("❌ Failed to delete reservation record:", dbErr);
                            return;
                        }

                        const targetDate = new Date(`${date}T00:00:00`);
                        const dayOfWeek = targetDate.getDay();
                        const month = targetDate.getMonth() + 1;

                        db.all(
                            "SELECT id, days_of_week, months FROM bulk_rules WHERE email = ?",
                            [email],
                            (ruleErr, rules) => {
                                if (ruleErr) {
                                    console.error("❌ Failed to find matching bulk rules:", ruleErr);
                                    return;
                                }

                                const matchingRules = (rules || []).filter(rule => {
                                    let days;
                                    let months;

                                    try {
                                        days = JSON.parse(rule.days_of_week);
                                        months = JSON.parse(rule.months);
                                    } catch {
                                        return false;
                                    }

                                    return days.includes(dayOfWeek) && months.includes(month);
                                });

                                // Create one GLOBAL specific-date exception for this date.
                                // This protects the date from every automation rule.
                                db.get(
                                    `
    SELECT id
    FROM automation_exceptions
    WHERE email = ?
      AND type = 'specific'
      AND EXISTS (
          SELECT 1
          FROM json_each(automation_exceptions.dates)
          WHERE json_each.value = ?
      )
    LIMIT 1
    `,
                                    [email, date],
                                    (lookupErr, existingException) => {
                                        if (lookupErr) {
                                            console.error(
                                                `❌ Failed to check global automation exception for ${date}:`,
                                                lookupErr
                                            );
                                            return;
                                        }

                                        if (existingException) {
                                            console.log(
                                                `ℹ️ Global automation exception already exists for ${date}`
                                            );
                                            return;
                                        }

                                        db.run(
                                            `
            INSERT INTO automation_exceptions (
                email,
                name,
                type,
                dates,
                note
            )
            VALUES (?, ?, 'specific', ?, ?)
            `,
                                            [
                                                email,
                                                "Automatic exclusion",
                                                JSON.stringify([date]),
                                                "Created automatically after removing an automation reservation."
                                            ],
                                            (insertErr) => {
                                                if (insertErr) {
                                                    console.error(
                                                        `❌ Failed to save global automation exception for ${date}:`,
                                                        insertErr
                                                    );
                                                } else {
                                                    console.log(
                                                        `⏭️ Global automation exception created for ${date}`
                                                    );
                                                }
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            }

            res.json({
                success: reservationSuccess,
                lot_id: lotId,
                message: response.data?.error_message
            });
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


// GET user settings
app.get('/api/settings', (req, res) => {
    const email = req.cookies?.app_user;
    if (!email) return res.status(401).json({ error: "Unauthorized" });

    db.get("SELECT * FROM user_settings WHERE email = ?", [email], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        // If no settings exist yet, return defaults
        res.json(row || { aqi_standard: 'primary', units: 'metric', glassmorphism: 50, auto_refresh: 1 });
    });
});

// UPDATE user settings (PATCH)
app.patch('/api/settings', (req, res) => {
    const email = req.cookies?.app_user;
    const { key, value } = req.body; // e.g., { key: 'aqi_standard', value: 'secondary' }

    if (!email) return res.status(401).json({ error: "Unauthorized" });

    // Use INSERT OR REPLACE (Upsert) to handle new users automatically
    const sql = `
        INSERT INTO user_settings (email, ${key}) 
        VALUES (?, ?) 
        ON CONFLICT(email) DO UPDATE SET ${key} = excluded.${key}
    `;

    db.run(sql, [email, value], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
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

