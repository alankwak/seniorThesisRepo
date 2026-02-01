const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const { Server } = require('socket.io');

const app = express();
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(cors());

const io = new Server(3000, {
  cors: { origin: "*" }
});


// State Structure:
// const roomState = {
//   "482931": {
//   password: "xyz" || null,
//   users: {
//     "user-uuid-1": ["https://google.com", ...],
//     "user-uuid-2": ["https://github.com", ...]
//     }
//   }
// };
const roomState = {};

// Helper to generate a random 6-digit code
const generateJoinCode = () => Math.floor(100000 + Math.random() * 900000).toString();

io.on("connection", (socket) => {
  console.log(`Connection established: ${socket.id}`);

  // --- 1. CREATE ROOM ---
  socket.on("create-room", ({ password, userId }, callback) => {
    let joinCode = generateJoinCode();

    console.log(userId);

    // Ensure code is unique
    while(roomState[joinCode]) {
      joinCode = generateJoinCode();
    }

    roomState[joinCode] = {
      password: password || null,
      users: {}
    };

    socket.join(joinCode);
    socket.roomID = joinCode;
    socket.userId = userId;
    roomState[joinCode].users[userId] = [];
    console.log(roomState);

    console.log(`Room Created: ${joinCode} by ${userId}`);
    callback({ success: true, joinCode: joinCode });
  });

  // --- 2. JOIN ROOM ---
  socket.on("join-room", ({ joinCode, password, userId }, callback) => {
    const room = roomState[joinCode];

    // Validation
    if(!room) {
      return callback({ success: false, error: "Room not found." });
    }
    if(room.password && room.password !== password) { 
      return callback({ success: false, error: "Incorrect password." });
    }

    // Success: Link socket to room metadata
    socket.join(joinCode);
    socket.roomID = joinCode;
    socket.userId = userId;
    room.users[userId] = [];
    console.log(roomState);

    console.log(`User ${userId} joined room ${joinCode}`);

    // Sync everyone in the room
    io.to(joinCode).emit("room-update", room.users);
    callback({ success: true, joinCode: joinCode });
  });

  // --- 3. SHARE TAB / UPDATE URL ---
  socket.on("share-tab", ({ url }) => {
    const { roomID, userId } = socket;

    if(roomID && roomState[roomID]) {
      roomState[roomID].users[userId] = url;
      
      // Broadcast the fresh state to the whole room
      io.to(roomID).emit("room-update", roomState[roomID].users);
    }
  });

  // --- 4. HEARTBEAT / CLEANUP ---
  socket.on("disconnect", (reason) => {
    const { roomID, userId } = socket;

    if(roomID && roomState[roomID]) {
      // Remove user from the state
      delete roomState[roomID].users[userId];

      const remainingUsers = Object.keys(roomState[roomID].users).length;
      
      if(remainingUsers === 0) {
        // Delete room after last user leaves
        delete roomState[roomID];
        console.log(`Room ${roomID} cleared from memory.`);
      } else {
        // Update remaining users
        io.to(roomID).emit("room-update", roomState[roomID].users);
      }
    }
    console.log(`Socket ${socket.id} disconnected. Reason: ${reason}`);
  });
});

console.log("Tab-Share Server running on port 3000");