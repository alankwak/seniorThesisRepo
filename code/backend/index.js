// server.js - minimal TabShare backend (Quick path)
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

// ----- DB setup (SQLite file: data.db) -----
const db = new sqlite3.Database('./data/data.db');
db.serialize(()=>{
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY, 
      code TEXT UNIQUE, 
      creator TEXT, 
      created_at TEXT, 
      is_active INTEGER DEFAULT 1
    )`
  );
  db.run(`
    CREATE TABLE IF NOT EXISTS tabs (
      id INTEGER PRIMARY KEY,
      session_id TEXT, 
      url TEXT, 
      title TEXT, 
      created_at TEXT
    )`
);
});

// ----- Express REST API -----
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Helper to generate short code
function genCode() {
  return Math.random().toString(36).substring(2,8).toUpperCase();
}

// Create session
app.post('/api/session/create', (req, res)=>{
  const code = genCode();
  const creator = req.body.creator || 'anon';
  const created_at = new Date().toISOString();
  db.run(`INSERT INTO sessions (code, creator, created_at) VALUES (?, ?, ?)`,
    [code, creator, created_at], (err) => {
      if (err) return res.status(500).json({error: err.message});
      res.json({code, creator, created_at});
    });
});

// Join session by code (returns session id and tabs)
app.post('/api/session/join', (req, res)=>{
  const { code } = req.body;
  db.get(`SELECT id, creator, created_at, is_active FROM sessions WHERE code = ?`, [code], (err,row)=>{
    if (err) return res.status(500).json({error: err.message});
    if (!row) return res.status(404).json({error:'session not found'});
    db.all(`SELECT id,url,title,created_at FROM tabs WHERE session_id = ? ORDER BY created_at`, [row.id], (err2, tabs)=>{
      if (err2) return res.status(500).json({error: err2.message});
      res.json({session: row, tabs});
    });
  });
});

const server = http.createServer(app);

// start server
const PORT = process.env.PORT || 53140;
server.listen(PORT, ()=> console.log(`Server listening on http://localhost:${PORT}`));
