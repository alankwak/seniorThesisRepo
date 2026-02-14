import {io} from "socket.io-client"

let socket;
let activeSession = false;
let cachedActiveSessionCode = null;
let cachedGroupId = null;
let cachedRoomState = null;

// sockets

async function connectSocket() {
  const { userId } = await chrome.storage.local.get("userId");
  const { roomId } = await chrome.storage.local.get("activeSessionCode");

  return new Promise((resolve, reject) => {
    if(socket && socket.connected) {
      return resolve(socket);
    }

    if(!socket) {
      socket = io("http://localhost:3000", {
        reconnection: true,
        reconnectionDelay: 1000,
        transports: ["websocket"]
      });

      socket.on("disconnect", (reason) => {
        console.log("Disconnected from server:", reason);

        chrome.storage.local.remove(["activeSessionCode"]);
        cachedActiveSessionCode = null;
        activeSession = false;
        cachedRoomState = null;

        if (reason === "transport close" || reason === "ping timeout") {
          showStatusUI("Error connecting to server.");
        } else if (reason === "io client disconnect") {
          showStatusUI("You left the room.");
        }
      });

      socket.on("room-update", (users) => {
        delete users[userId];
        chrome.runtime.sendMessage({
          action: "room-update",
          data: users
        }).catch(() => {
          console.log("No elements received room update");
        });
        cachedRoomState = users;
      });

      socket.on("connect_error", (error) => {
        showStatusUI("Error connecting to server.");
        socket.disconnect();
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

async function createRoom(password) {
  const userId = await getPersistentUserId();

  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      return reject(new Error("Socket not connected. Please connect first."));
    }

    const timeout = setTimeout(() => {
      reject(new Error("Server timed out creating room."));
    }, 10000);

    socket.emit("create-room", { password: password || null, userId: userId }, (response) => {
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

    socket.emit("join-room", { joinCode: code || null, password: password || null, userId: userId }, (response) => {
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

  activeSession = false;
  cachedActiveSessionCode = null;
  await chrome.storage.local.remove(["activeSessionCode"]);
}

async function sendTabsToServer() {
  if(socket) {
    const tabsInGroup = cachedGroupId ? await chrome.tabs.query({groupId: cachedGroupId}) : [];
    const tabsInfo = tabsInGroup.map((tab) => [tab.id, tab.favIconUrl || "", tab.title, tab.url]);
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

chrome.storage.local.get("activeSessionCode", data => {
  cachedActiveSessionCode = data.activeSessionCode || null;
  activeSession = data.activeSessionCode ? true : false;
});

chrome.storage.local.get("sharedGroupId", data => {
  cachedGroupId = data.sharedGroupId || null;
});

// runtime listener

chrome.runtime.onMessage.addListener( (message, sender, sendResponse) => {
  // if (message.action === "getUserId") {
  //   if (cachedUserId) {
  //     sendResponse(cachedUserId);
  //   }
  //   return true; // keep message channel open for async sendResponse
  // }
  if(message.action === "getSessionStatus") {
    sendResponse(activeSession);
  }
  else if(message.action === "getSessionCode") {
    sendResponse(cachedActiveSessionCode);
  }
  else if(message.action === "getRoomState") {
    sendResponse(cachedRoomState);
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
  else if(message.action === "createSession") {

    if(activeSession) {
      sendResponse({ success: false, error: "Already in a session" });
    } else {
      (async () => {
        try {
          await connectSocket();
          const response = await createRoom(message.password);

          activeSession = true;
          cachedActiveSessionCode = response.joinCode;
          showStatusUI("Room created.");

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
          showStatusUI("Joined room.");

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

function showStatusUI(message) {
  chrome.runtime.sendMessage({
    action: "session_handler_status",
    text: message
  }).catch(() => {
    console.log("No elements received status message:", message);
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if((tab.groupId === cachedGroupId && (changeInfo.url || changeInfo.groupId)) || changeInfo.groupId === -1) {
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
});