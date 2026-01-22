const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./parking.db');

db.serialize(() => {
  // 1. Create the table
  db.run(`CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_time TEXT,
    plate_number TEXT,
    status TEXT,
    retry_log TEXT
  )`);

  // 2. Clear old data and add fresh starter data
  db.run("DELETE FROM reservations");
  const stmt = db.prepare("INSERT INTO reservations (date_time, plate_number, status, retry_log) VALUES (?, ?, ?, ?)");
  
  stmt.run("Jan 18, 2026 - 08:00 AM", "ABC-1234", "Reserved", "Direct success");
  stmt.run("Jan 18, 2026 - 10:30 AM", "XYZ-9876", "Retrying", "Attempt 3: Site timeout...");
  stmt.run("Jan 19, 2026 - 09:00 AM", "PRO-2026", "Pending", "Queued for orchestration");
  
  stmt.finalize();
  console.log("Database initialized successfully!");
});

db.close();