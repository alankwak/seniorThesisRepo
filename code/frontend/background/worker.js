import {io} from "socket.io-client"
import { processCommand, commands } from "../sidebar/helpers/commands";

// session-based state variables
let socket;
let activeSession = false;
let cachedActiveSessionCode = null;
let cachedGroupId = null;
let nickname = "Anonymous User";
let currentRole = null;

// room state from server
let updatedRoomState = {};
// room state corresponding to currently opened tabs, allows for calculating a "diff"
let localRoomState = {};
const followedUsers = new Set();
// roomState structure
// { 
// users: {
//     "user-uuid-1": {
//           nickname: "john",
//           color: "blue",
//           role: 0,
//           tabs: [{id, favIconUrl, title, url}, ...],
//         }
//     "user-uuid-2": {
//           nickname: "jane",
//           color: "red",
//           role: 2,
//           tabs: [{id, favIconUrl, title, url}, ...],
//         }
//     }
// }

// chat saving for when the sidebar is closed during a session
const chatStorage = [];
const maxMessages = 50;
function addMessage(message) {
  while(chatStorage.length >= maxMessages) {
    chatStorage.shift();
  }
  chatStorage.push(message);
}

function resetState() {
  cachedActiveSessionCode = null;
  activeSession = false;
  updatedRoomState = {};
  localRoomState = {};
  followedUsers.clear();
  currentRole = null;
  chrome.runtime.sendMessage({
    action: "personal-role-update", 
    role: null
  }).catch(() => {
    console.log("No elements received personal role update");
  });
  chatStorage.length = 0;
}

// sockets
async function connectSocket() {
  const userId = await getPersistentUserId();

  return new Promise((resolve, reject) => {
    if(socket && socket.connected) {
      return resolve(socket);
    }

    if(!socket) {
      socket = io(import.meta.env.VITE_WS_SERVER_URL, {
        reconnection: false,
        transports: ["websocket"]
      });

      socket.on("disconnect", (reason) => {
        chrome.storage.local.remove(["activeSessionCode"]);
        resetState();

        if (reason === "transport close" || reason === "ping timeout") {
          showStatusUI("Error connecting to server.");
        }
        else if (reason === "io server disconnect") {
          showStatusUI("You were kicked from the room.");
        }

        chrome.runtime.sendMessage({
          action: "room-update",
        }).catch(() => {
          console.log("No elements received room update");
        });
      });

      socket.on("room-update", (users) => {
        delete users[userId];
        if(!updatedRoomState) {
          updatedRoomState = users;
        }
        else {
          Object.keys(users).forEach((userId) => {
            updatedRoomState[userId] = users[userId];

            setTimeout(() => {
              if(followedUsers.has(userId) && localRoomState[userId]) {
                updateTabsForUser(userId);
              } else {
                followedUsers.delete(userId);
              }
            }, 100);
          });
        }
        chrome.runtime.sendMessage({
          action: "room-update",
        }).catch(() => {
          console.log("No elements received room update");
        });
      });

      socket.on("personal-role-update", (newRole) => {
        console.log("received role update request");
        currentRole = newRole;
        chrome.runtime.sendMessage({
          action: "personal-role-update", 
          role: newRole
        }).catch(() => {
          console.log("No elements received personal role update");
        });
      });

      socket.on("new-chat-message", (message) => {
        message.timestamp = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        addMessage(message);
        chrome.runtime.sendMessage({ 
          action: "new-chat-message", 
          message: message 
        }).catch(() => {
          console.log("No elements received new message");
        });
      });

      socket.on("user-disconnect", (userId) => {
        delete updatedRoomState[userId];
        delete localRoomState[userId];
        delete pendingUpdates[userId];
        delete running[userId];

        chrome.runtime.sendMessage({
          action: "room-update",
        }).catch(() => {
          console.log("No elements received room update");
        });
      });

      socket.on("connect_error", (error) => {
        showStatusUI("Error connecting to server.");
        disconnectSocket();
      });
    }

    socket.once("connect", () => {
      resolve(socket);
    });

    socket.once("connect_error", (error) => {
      reject(error);
    });

    socket.connect();
  });
}

async function createRoom(password, defaultRole) {
  const userId = await getPersistentUserId();

  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      return reject(new Error("Socket not connected. Please connect first."));
    }

    const timeout = setTimeout(() => {
      reject(new Error("Server timed out creating room."));
    }, 10000);

    socket.emit("create-room", { password: password || null, userId: userId, nickname: nickname, defaultRole: defaultRole }, (response) => {
      clearTimeout(timeout);

      if(response && response.success) {
        chrome.storage.local.set({ activeSessionCode: response.joinCode }, () => {
          resolve(response);
        });
      } else {
        reject(new Error(response.error || "Failed to create room"));
      }
    });
  });
}

async function joinRoom(code, password) {
  const userId = await getPersistentUserId();

  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      return reject(new Error("Socket not connected. Please connect first."));
    }

    const timeout = setTimeout(() => {
      reject(new Error("Server timed out joining room."));
    }, 10000);

    socket.emit("join-room", { joinCode: code || null, password: password || null, userId: userId, nickname: nickname }, (response) => {
      clearTimeout(timeout);

      if(response && response.success) {
        chrome.storage.local.set({ activeSessionCode: response.joinCode }, () => {
          resolve(response);
        });
      } else {
        reject(new Error(response.error || "Failed to join room"));
      }
    });
  });
}

async function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null; 
  }

  resetState();
  await chrome.storage.local.remove(["activeSessionCode"]);
  chrome.runtime.sendMessage({
    action: "room-update",
  }).catch(() => {
    console.log("No elements received room update");
  });
}

async function sendTabsToServer() {
  if(socket) {
    const tabsInGroup = cachedGroupId ? await chrome.tabs.query({groupId: cachedGroupId}) : [];
    const tabsInfo = tabsInGroup.map((tab) => ({id: tab.id, favIconUrl: tab.favIconUrl || "", title: tab.title, url: tab.url}));
    socket.emit("share-tabs", tabsInfo);
  }
}

// state
async function getPersistentUserId() {
  const data = await chrome.storage.local.get("userId");
  
  if (data.userId) {
    return data.userId;
  }

  const newId = self.crypto.randomUUID();

  await chrome.storage.local.set({ userId: newId });
  
  return newId;
}

function getDiff(oldState, newState, userId) {
  const additions = [];
  const removals = [];
  const updates = [];
  if(!oldState[userId] || !oldState[userId].tabs) {
    return { additions: newState[userId].tabs, removals, updates };
  }

  const tabIdMap = oldState[userId].serverToLocalTabIdMap;

  newState[userId].tabs.forEach((tab) => {
    const existing = oldState[userId].tabs.find(oldTab => oldTab.id === tabIdMap[tab.id]);

    if(!existing) {
      additions.push(tab);
    } else if(existing.url !== tab.url) {
      updates.push(tab);
    }
  });

  const newIds = new Set(newState[userId].tabs.map(tab => tabIdMap[tab.id]));

  for(const tab of oldState[userId].tabs) {
    if(!newIds.has(tab.id)) {
      removals.push(tab.id);
    }
  }

  return { additions, removals, updates };
}

async function applyDiffToOpenTabs(userId) {  
  const diff = getDiff(localRoomState, updatedRoomState, userId);

  const createdTabs = await Promise.all(
    diff.additions.map(tab => chrome.tabs.create({ url: tab.url, active: false }))
  );
  for(let i = 0; i < diff.additions.length; i++)  {
    localRoomState[userId].serverToLocalTabIdMap[diff.additions[i].id] = createdTabs[i].id;
    localRoomState[userId].localToServerTabIdMap[createdTabs[i].id] = diff.additions[i].id;
  }
  const tabIds = createdTabs.map(tab => tab.id);
  
  if(tabIds.length > 0) {
    const newGroupId = await chrome.tabs.group({tabIds: tabIds, groupId: localRoomState[userId].groupId});
    if(!localRoomState[userId].groupId) {
      await chrome.tabGroups.update(newGroupId, {color: updatedRoomState[userId].color, title: `CoTab - ${updatedRoomState[userId].nickname}`});
      localRoomState[userId].groupId = newGroupId;
    }
  }

  await chrome.tabs.remove(diff.removals);

  if(localRoomState[userId]) {
    diff.removals.forEach(localTabId => {
      Object.keys(localRoomState[userId].serverToLocalTabIdMap).forEach(serverTabId => {
        if(localRoomState[userId].serverToLocalTabIdMap[serverTabId] === localTabId) {
          delete localRoomState[userId].serverToLocalTabIdMap[serverTabId];
          delete localRoomState[userId].localToServerTabIdMap[localTabId];
        }
      });
    });
    diff.updates.forEach(tab => {
      const localTabId = localRoomState[userId].serverToLocalTabIdMap[tab.id];
      if(localTabId) {
        chrome.tabs.update(localTabId, { url: tab.url });
      }
    });
  }

  await updateLocalRoomState(userId);
}

async function updateLocalRoomState(userId) {
  const userState = localRoomState[userId];
  if(!userState) return;

  const groupId = userState.groupId;
  const localTabs = groupId ? await chrome.tabs.query({ groupId }) : [];

  if(localRoomState[userId] !== userState) return;

  userState.tabs = localTabs.map(tab => ({
    id: tab.id,
    favIconUrl: tab.favIconUrl || "",
    title: tab.title,
    url: tab.url
  }));
}

async function safeTabMutation(fn, retries = 15, delay = 80) {
  for(let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch(err) {
      if(!err?.message?.includes("Tabs cannot be edited right now")) {
        throw err;
      }

      if(i === retries - 1) {
        throw err;
      }

      await new Promise(r => setTimeout(r, delay * (1+i)));
    }
  }
}

// mutex, pain
const pendingUpdates = {};
const running = {};

function updateTabsForUser(userId) {
  if(!localRoomState[userId]) {
    localRoomState[userId] = { tabs: [], groupId: null, serverToLocalTabIdMap: {}, localToServerTabIdMap: {} };
  }

  pendingUpdates[userId] = true;
  processQueue(userId);
}

async function processQueue(userId) {
  if (running[userId]) return;
  running[userId] = true;

  try {
    while(pendingUpdates[userId]) {
      pendingUpdates[userId] = false;

      await safeTabMutation(() => applyDiffToOpenTabs(userId));
    }
  } finally {
    running[userId] = false;
  }
}

chrome.storage.local.get("nickname", data => {
  nickname = data.nickname || "Anonymous User";
});

// runtime listener
chrome.runtime.onMessage.addListener( (message, _sender, sendResponse) => {
  if(message.action === "getSessionStatus") {
    sendResponse(activeSession);
  }
  else if(message.action === "getSessionCode") {
    sendResponse(cachedActiveSessionCode);
  }
  else if(message.action === "getUserId") {
    let userId = null;
    (async () => {
      userId = await getPersistentUserId();
      sendResponse(userId);
    })();
    return true;
  }
  else if(message.action === "getRoomState") {
    sendResponse(updatedRoomState);
  }
  else if(message.action === "updateTabsForUser") {
    const userId = message.userId;
    if(userId) {
      updateTabsForUser(userId);
    }
  }
  else if(message.action === "followUser") {
    const userId = message.userId;
    if(userId) {
      (async () => {
        await updateTabsForUser(userId);
        followedUsers.add(userId);
      })();
    }
  }
  else if(message.action === "stopFollowingUser") {
    const userId = message.userId;
    if(userId) {
      followedUsers.delete(userId);
    }
  }
  else if(message.action === "getFollowedUsers") {
    sendResponse(Array.from(followedUsers));
  }
  else if(message.action === "setNickname") {
    if(message.nickname && message.nickname !== nickname) {
      nickname = message.nickname;
      chrome.storage.local.set({ nickname: nickname });
      if(socket){
        socket.emit("update-nickname", nickname);
      }
    }
  }
  else if(message.action === "getNickname") {
    sendResponse(nickname);
  }
  else if(message.action === "updateGroupId") {
    cachedGroupId = message.message || null;
    chrome.storage.local.set({ sharedGroupId: cachedGroupId });
    if(socket) {
      sendTabsToServer();
    }
  }
  else if(message.action === "getGroupId") {
    sendResponse(cachedGroupId);
  }
  else if(message.action === "getPersonalRole") {
    sendResponse(currentRole);
  }
  else if(message.action === "assignRole") {
    socket.emit("assign-role", { targetUserId: message.userId, newRole: message.role });
  }
  else if(message.action === "kickUser") {
    const userId = message.userId;
    if(socket && userId) {
      socket.emit("kick-user", userId);
    }
  }
  else if(message.action === "sendChat") {
    const toSend = { text: message.text };
    if(socket && toSend.text) {
      if(processCommand(toSend.text, socket, chatStorage, commands)) {
        return;
      }
      socket.emit("chat-message", toSend);
    }
  }
  else if(message.action === "getChatHistory") {
    sendResponse(chatStorage);
  }
  else if(message.action === "createSession") {
    if(activeSession) {
      sendResponse({ success: false, error: "Already in a session" });
    } else {
      (async () => {
        try {
          await connectSocket();
          const response = await createRoom(message.password, message.defaultRole);

          activeSession = true;
          cachedActiveSessionCode = response.joinCode;

          sendResponse({ success: true, code: response.joinCode });
        } catch(err) {
          if(err.message) showStatusUI(err.message);
          sendResponse({ success: false, error: err.message || err});
        }
      })();
    }

    return true;
  }
  else if(message.action === "joinSession") {
    if(activeSession) {
      sendResponse({ success: false, error: "Already in a session" });
    } else {
      (async () => {
        try {
          await connectSocket(message.sessionCode);
          const response = await joinRoom(message.sessionCode, message.password);

          activeSession = true;
          cachedActiveSessionCode = response.joinCode;

          sendResponse({ success: true, code: response.joinCode });
        }
        catch (err) {
          if(err.message) showStatusUI(err.message);
          sendResponse({ success: false, error: err.message || err});
        }
      })();
    }

    return true;
  }
  else if(message.action === "leaveSession") {
    disconnectSocket();
  }
});

// sends messages to SessionHandler component to display to user
function showStatusUI(message) {
  chrome.runtime.sendMessage({
    action: "session_handler_status",
    text: message
  }).catch(() => {
    console.log("No elements received status message:", message);
  });
}

// tab listeners
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // keep local tab states for each followed user up to date so diff is accurate
  if(localRoomState && (changeInfo.url || changeInfo.groupId || changeInfo.title || changeInfo.favIconUrl)) {
    Object.keys(localRoomState).forEach((userId) => {
      updateLocalRoomState(userId);
    });
  }
  // if following a user, do not allow them to drag tabs into that user's group
  if(changeInfo.groupId && localRoomState) {
    Object.keys(localRoomState).forEach((userId) => {
      if(followedUsers.has(userId) && changeInfo.groupId === localRoomState[userId].groupId && !localRoomState[userId].localToServerTabIdMap[tabId]) {
        safeTabMutation(() => chrome.tabs.ungroup(tabId));
      }
    });
  }
  // update shared tabs (tabs user is sharing to others)
  if((tab.groupId === cachedGroupId && (changeInfo.url || changeInfo.title || changeInfo.favIconUrl || changeInfo.groupId)) || (changeInfo.groupId === -1)) {
    sendTabsToServer();
  }
});

chrome.tabGroups.onRemoved.addListener( async (tabGroup) => {
  if(tabGroup.id === cachedGroupId) {
    const stillExists = await chrome.tabs.query({groupId: cachedGroupId});
    if(stillExists.length === 0) {
      cachedGroupId = null;
      chrome.storage.local.remove("sharedGroupId");
    }
  }
  if(localRoomState) {
    Object.keys(localRoomState).forEach((userId) => {
      if(localRoomState[userId].groupId === tabGroup.id) {
        delete localRoomState[userId];
        followedUsers.delete(userId);
      }
    });
  }
});