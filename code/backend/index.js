// server.js - minimal TabShare backend (Quick path)
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const DBAbstraction = require('./DBAbstraction'); 

const db = new DBAbstraction(path.join(__dirname, 'data', 'CoTab.db')); 

// ----- Express REST API -----
const app = express();
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(cors());

let activeSessions = {};

// Helper to generate short code
function genCode() {
  return Math.random().toString(36).substring(2,9).toUpperCase();
}

// Create session
app.post('/api/session/create', (req, res)=>{
  const code = genCode();
  const creator = req.body.creator || 'anon';
  const createdAt = new Date().toISOString();
  const pwd = req.body.password || null;

  try {  
    let session = {
      code: code,
      leader: creator,
      createdAt: createdAt,
      tabs: {},
      members: [],
      password: pwd
    };

    activeSessions[code] = session;
  } catch(error) {
    console.error("Error creating session:", error);
    return res.status(500).json({ success: false, error: "Error creating session" });
  }
  res.status(201).json({ success: true, code: code });
});

// Join session by code (returns session id and tabs)
app.post('/api/session/join', (req, res)=>{
  const { code } = req.body;
});

const server = http.createServer(app);

// start server
const PORT = process.env.PORT || 53140;
server.listen(PORT, ()=> console.log(`Server listening on http://localhost:${PORT}`));
