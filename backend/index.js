const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose(); // Import the SQLite tool you just installed

const app = express();
const PORT = 5000;

// Connect to the database file we created in Step 1
const db = new sqlite3.Database('./parking.db', (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the SQLite database.");
    }
});

app.use(cors());
app.use(express.json());

// --- ROUTE 1: LOGIN ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt for: ${email}`);
  
  // We send 'status: success' so the frontend switches to the Dashboard
  res.json({ 
    status: 'success', 
    message: `Welcome, ${email}` 
  });
});

// --- ROUTE 2: GET RESERVATIONS ---
// This is the new part that your Dashboard calls to get the table data
app.get('/api/reservations', (req, res) => {
  const sql = "SELECT * FROM reservations ORDER BY id DESC";
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Database error:", err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    // Send the list of reservations back to the React app
    res.json(rows);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});


app.post('/api/reservations', (req, res) => {
  const { date, plate_number, status, retry_log } = req.body;
  // We store only the date (e.g., "2026-01-20")
  const sql = "INSERT INTO reservations (date_time, plate_number, status, retry_log) VALUES (?, ?, ?, ?)";
  
  db.run(sql, [date, plate_number, status, retry_log], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, message: "Day pass scheduled" });
  });
});