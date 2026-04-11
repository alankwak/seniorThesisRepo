const { Server } = require('socket.io');

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
//                      role: 0,
//                      tabs: [{id, favIconUrl, title, url}, ...],
//                    },
//     "user-uuid-2": {
//                      nickname: "jane",
//                      color: "red",
//                      role: 2,
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
  room.users[newLeaderId].role = roles.LEADER;

  io.to(room.userSockets[newLeaderId].id).emit("personal-role-update", roles.LEADER);
  io.to(roomId).emit("new-chat-message", { text: `${room.users[newLeaderId].nickname} is the new session leader.`, system: true });
  io.to(roomId).emit("room-update", room.users);
  console.log(`New leader assigned: ${newLeaderId} in room ${roomId}`);
}

// Helper to generate a random 6-digit code
const generateJoinCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Colors to randomly assign each user
const colors = ["blue", "red", "purple", "orange", "cyan", "pink", "yellow"];

io.on("connection", (socket) => {
  console.log(`Connection established: ${socket.id}`);

  // CREATE/JOIN (initial connection)
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
      role: socket.role,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    roomState[joinCode].userSockets = {
      [userId]: socket
    };
    console.log(roomState);

    console.log(`Room Created: ${joinCode} by ${userId}`);

    socket.emit("personal-role-update", roles.LEADER);
    socket.emit("new-chat-message", { 
      text: `Session created successfully. Invite others to join using the code: ${joinCode}.`, 
      system: true
    })
    callback({ success: true, joinCode: joinCode });
  });

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
      role: socket.role,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    room.userSockets[userId] = socket;
    console.log(roomState);

    console.log(`User ${userId} joined room ${joinCode} with role ${socket.role}`);
    io.to(joinCode).emit("new-chat-message", { text: `${nickname} joined the session.`, system: true });

    io.to(joinCode).emit("room-update", room.users);
    socket.emit("personal-role-update", room.defaultRole);
    callback({ success: true, joinCode: joinCode });
  });

  // SHARE TABS
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

  // NICKNAME
  socket.on("update-nickname", (nickname) => {
    const { roomID, userId } = socket;
    if(roomID && roomState[roomID] && roomState[roomID].users[userId]) {
      const oldNickname = roomState[roomID].users[userId].nickname;
      roomState[roomID].users[userId].nickname = nickname;
      console.log(`nickname update by ${userId}: ${nickname}`);
      io.to(roomID).emit("room-update", roomState[roomID].users);
      io.to(roomID).emit("new-chat-message", { text: `${oldNickname} changed name to ${nickname}.`, system: true });
    } else {
      console.warn(`Nickname update failed for ${userId} - no room or user found.`);
    }
  });

  // ROLE-BASED ACTIONS
  socket.on("assign-role", ({ targetUserId, newRole }) => {
    const { roomID, userId, role } = socket;

    if(!checkAuthorized(role, roles.LEADER, roles.ADMIN)) {
      return;
    }

    const targetSocket = roomState[roomID]?.userSockets?.[targetUserId];

    if(targetSocket && socket.role < targetSocket.role) {
      targetSocket.role = newRole;
      roomState[roomID].users[targetUserId].role = newRole;
      if(newRole === 3) {
        roomState[roomID].users[targetUserId].tabs = [];
      }

      if(socket.role === 0 && newRole === 0) {
        socket.role = 1;
        roomState[roomID].users[userId].role = 1;

        socket.emit("personal-role-update", 1);
      }

      console.log(`Role of ${targetUserId} updated to ${newRole} by ${userId}`);

      io.to(targetSocket.id).emit("personal-role-update", newRole);

      const newRoleName = Object.keys(roles).find(key => roles[key] === newRole);
      io.to(targetSocket.id).emit("new-chat-message", { text: `Your role has been changed to ${newRoleName}.`, system: true });
      io.to(socket.id).emit("new-chat-message", { text: `You changed ${roomState[roomID].users[targetUserId].nickname}'s role to ${newRoleName}.`, system: true });

      io.to(roomID).emit("room-update", roomState[roomID].users);
    }
  });

  socket.on("kick-user", (targetUserId) => {
    const { roomID, userId, role } = socket;

    if(!checkAuthorized(role, roles.LEADER, roles.ADMIN)) {
      return;
    }

    const targetSocket = roomState[roomID]?.userSockets?.[targetUserId];
    if(targetSocket && socket.role < targetSocket.role) {
      targetSocket.disconnect();
    }
  });

  // CHAT
  socket.on("chat-message", (message) => {
    const { roomID, userId, role } = socket;

    const processedMessage = {
      fromUser: userId,
      fromUserNickname: roomState[roomID].users[userId].nickname,
      text: message.text,
      color: roomState[roomID].users[userId].color,
      system: false,
    }

    console.log(`Server received message ${processedMessage.text} from ${userId}`);

    if(message.toUser) {
      processedMessage.toUser = message.toUser;
      const targetSocket = room[roomID]?.userSockets?.[message.toUser];
      if(targetSocket) {
        targetSocket.emit("new-chat-message", processedMessage);
        socket.emit("new-chat-message", processedMessage);
      }
    } else {
      io.to(roomID).emit("new-chat-message", processedMessage);
    }
  });

  // DISCONNECT / CLEANUP
  socket.on("disconnect", (reason) => {
    const { roomID, userId, role } = socket;

    console.log(`Socket ${socket.id} disconnected. Reason: ${reason}`);

    if(!roomID) return;

    const nickname = roomState[roomID].users[userId].nickname;
    io.to(roomID).emit("new-chat-message", {
      text: `${nickname} left the session.`,
      system: true
    });

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