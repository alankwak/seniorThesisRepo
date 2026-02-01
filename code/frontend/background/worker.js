import {io} from "socket.io-client"

let socket;
let activeSession = false;
let cachedActiveSessionCode = null;
let cachedGroupId = null;

async function connectSocket() {
  const { userId } = await chrome.storage.local.get("userId");
  const { lastRoomId } = await chrome.storage.local.get("activeSessionCode")

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

      // If we have a saved room, rejoin it automatically
      if(lastRoomId) {
        socket.emit("join-room", { joinCode: lastRoomId, userId });
      }

      socket.on("room-created", (message) => {
        cachedActiveSessionCode = message.joinCode;
        chrome.storage.local.set({ activeSessionCode: message.joinCode });
      });

      socket.on("disconnect", (reason) => {
        console.log("Disconnected from server:", reason);

        chrome.storage.local.remove(["activeSessionCode"]);
        cachedActiveSessionCode = null;
        activeSession = false;

        if (reason === "transport close" || reason === "ping timeout") {
          showStatusUI("Server is offline. Reconnecting...");
        } else if (reason === "io client disconnect") {
          showStatusUI("You left the room.");
        }
      });

      socket.on("connect_error", (error) => {
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

async function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null; 
  }

  activeSession = false;
  cachedActiveSessionCode = null;
  await chrome.storage.local.remove(["activeSessionCode"]);
}

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
  if(message.action === "getSessionCode") {
    sendResponse(cachedActiveSessionCode);
  }
  if(message.action === "updateGroupId") {
    cachedGroupId = message.message || null;
    chrome.storage.local.set({ sharedGroupId: cachedGroupId });
  }
  if(message.action === "getGroupId") {
    sendResponse(cachedGroupId);
  }
  if(message.action === "createSession") {

    if(activeSession) {
      sendResponse({ success: false, error: "Already in a session" });
    } else {
      (async () => {
        try {
          await connectSocket();
          const response = await createRoom(message.password);

          activeSession = true;
          cachedActiveSessionCode = response.joinCode;

          sendResponse({ success: true, code: response.joinCode });
        }
        catch (err) {
          sendResponse({ success: false, error: err.message || err});
        }
      })();
    }

    return true;
  }
  if(message.action === "leaveSession") {
    disconnectSocket();
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if(tab.groupId === cachedGroupId) {
    console.log("New tab in group");
    if(changeInfo.url) {
      console.log(`New URL: ${changeInfo.url}`);
    }
  }
});

chrome.tabGroups.onRemoved.addListener( async (tabGroup) => {
  if(tabGroup.id === cachedGroupId) {
    const stillExists = await chrome.tabs.query({groupId: cachedGroupId});
    if(stillExists.length == 0) {
      cachedGroupId = null;
      chrome.storage.local.remove("sharedGroupId");
    }
  }
});