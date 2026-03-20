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
// users is the public info about each user that gets shared with everyone in the room
// const roomState = {
//   "482931": {
//   password: "xyz" || null,
//   defaultRole: "collaborator",
//   userSockets: {
//     "user-uuid-1": socket1,
//     "user-uuid-2": socket2
//   },
//   users: {
//     "user-uuid-1": {
//                      nickname: "john",
//                      color: "blue",
//                      tabs: [{id, favIconUrl, title, url}, ...],
//                    },
//     "user-uuid-2": {
//                      nickname: "jane",
//                      color: "red",
//                      tabs: [{id, favIconUrl, title, url}, ...],
//                    }
//     }
//   }
// };
const roomState = {};

// For blocking access to certain actions based on role
const roles = Object.freeze({
  LEADER: 0,
  ADMIN: 1,
  COLLABORATOR: 2,
  VIEW_ONLY: 3
});
const checkAuthorized = (userRole, ...authorizedRoles) => authorizedRoles.includes(userRole);
function assignNewLeader(roomId) {
  const room = roomState[roomId];
  if(!room) return;

  let newLeaderId = Object.keys(room.userSockets)[0];
  
  Object.entries(room.userSockets).forEach(([userId, socket]) => {
    if(socket.role < room.userSockets[newLeaderId].role) {
      newLeaderId = userId;
    }
  });

  room.userSockets[newLeaderId].role = roles.LEADER;
  io.to(room.userSockets[newLeaderId]).emit("role-update", "LEADER");
  console.log(`New leader assigned: ${newLeaderId} in room ${roomId}`);
}

// Helper to generate a random 6-digit code
const generateJoinCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Colors to randomly assign each user
const colors = ["blue", "red", "purple", "orange"];

io.on("connection", (socket) => {
  console.log(`Connection established: ${socket.id}`);

  // --- 1. CREATE ROOM ---
  socket.on("create-room", ({ password, userId, nickname, defaultRole }, callback) => {
    if(!userId || !nickname) {
      return callback({ success: false, error: "User ID and nickname are required." });
    }
    if(!defaultRole || !roles[defaultRole]) {
      return callback({ success: false, error: "Invalid default role." });
    }

    let joinCode = generateJoinCode();

    // Ensure code is unique
    while(roomState[joinCode]) {
      joinCode = generateJoinCode();
    }

    roomState[joinCode] = {
      password: password || null,
      defaultRole: roles[defaultRole],
      users: {}
    };

    socket.join(joinCode);
    socket.roomID = joinCode;
    socket.userId = userId;
    socket.role = roles.LEADER;

    roomState[joinCode].users[userId] = {
      nickname: nickname, 
      tabs: [], 
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    roomState[joinCode].userSockets = {
      [userId]: socket
    };
    console.log(roomState);

    console.log(`Room Created: ${joinCode} by ${userId}`);
    socket.emit("role-update", 0);
    callback({ success: true, joinCode: joinCode });
  });

  // --- 2. JOIN ROOM ---
  socket.on("join-room", ({ joinCode, password, userId, nickname }, callback) => {
    const room = roomState[joinCode];

    // Validation
    if(!room) {
      return callback({ success: false, error: "Room not found." });
    }
    if(room.password && !password) {
      return callback({ success: false, error: "Session requires a password." });
    }
    if(room.password && room.password !== password) { 
      return callback({ success: false, error: "Incorrect password." });
    }

    socket.join(joinCode);
    socket.roomID = joinCode;
    socket.userId = userId;
    socket.role = room.defaultRole;

    room.users[userId] = {
      nickname: nickname, 
      tabs: [], 
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    room.userSockets[userId] = socket;
    console.log(roomState);

    console.log(`User ${userId} joined room ${joinCode} with role ${socket.role}`);

    // Sync everyone in the room
    io.to(joinCode).emit("room-update", room.users);
    socket.emit("role-update", room.defaultRole);
    callback({ success: true, joinCode: joinCode });
  });

  // --- 3. SHARE TAB / UPDATE URL ---
  socket.on("share-tabs", (tabsInfo) => {
    const { roomID, userId, role } = socket;

    if(!checkAuthorized(role, roles.LEADER, roles.ADMIN, roles.COLLABORATOR)) {
      return;
    }

    console.log(`tabs shared by ${userId}`, tabsInfo);

    if(roomID && roomState[roomID]) {
      roomState[roomID].users[userId].tabs = tabsInfo;
      
      // Broadcast the fresh state to the whole room
      io.to(roomID).emit("room-update", roomState[roomID].users);
    }
  });

  socket.on("update-nickname", (nickname) => {
    const { roomID, userId } = socket;
    if(roomID && roomState[roomID] && roomState[roomID].users[userId]) {
      roomState[roomID].users[userId].nickname = nickname;
      console.log(`nickname update by ${userId}: ${nickname}`);
      io.to(roomID).emit("room-update", roomState[roomID].users);
    } else {
      console.warn(`Nickname update failed for ${userId} - no room or user found.`);
    }
  });

  socket.on("assign-role", ({ targetUserId, newRole }) => {
    const { roomID, userId, role } = socket;

    if(!checkAuthorized(role, roles.LEADER, roles.ADMIN)) {
      return;
    }

    const targetSocket = roomState[roomID]?.userSockets?.[targetUserId];

    if(roomID && roomState[roomID] && targetSocket) {
      targetSocket.role = roles[newRole];
      console.log(`Role of ${targetUserId} updated to ${newRole} by ${userId}`);
      io.to(targetSocket.id).emit("role-update", newRole);
    }
  });

  socket.on("kick-user", (targetUserId) => {
    const { roomID, userId, role } = socket;

    if(!checkAuthorized(role, roles.LEADER, roles.ADMIN)) {
      return;
    }

    const targetSocket = roomState[roomID]?.userSockets?.[targetUserId];
    if(targetSocket && targetSocket.role !== roles.LEADER) {
      targetSocket.disconnect();
    }
  });

  // --- 4. HEARTBEAT / CLEANUP ---
  socket.on("disconnect", (reason) => {
    const { roomID, userId, role } = socket;
    console.log(roomID, userId, role);

    console.log(`Socket ${socket.id} disconnected. Reason: ${reason}`);

    if(roomID && roomState[roomID]) {
      // Remove user from the state
      delete roomState[roomID].users[userId];
      delete roomState[roomID].userSockets[userId];

      const remainingUsers = Object.keys(roomState[roomID].users).length;
      
      if(remainingUsers === 0) {
        delete roomState[roomID];
        console.log(`Room ${roomID} cleared from memory.`);
      } else {
        if(role === roles.LEADER) assignNewLeader(roomID);
        io.to(roomID).emit("user-disconnect", userId);
      }
    }
  });
});

console.log("Tab-Share Server running on port 3000");