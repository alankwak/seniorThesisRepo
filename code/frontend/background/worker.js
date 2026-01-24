import {io} from "socket.io-client"

let socket;
let activeSession = false;
let cachedActiveSessionCode = null;
let cachedGroupId = null;

async function connectSocket() {
  if(socket && socket.connected) {
    return;
  }
  
  const { userId } = await chrome.storage.local.get("userId");
  const { lastRoomId } = await chrome.storage.local.get("activeSessionCode");

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

}

async function createRoom(password) {
  if(socket) {
    const userId = await getPersistentUserId();
    socket.emit("create-room", { password: password || null, userId: userId })
  }
}

async function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null; 
  }

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
    if(activeSession) {
      sendResponse(cachedActiveSessionCode);
    }
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
          await createRoom(null);
          activeSession = true;
          sendResponse({ success: true, code: "ph"});
        }
        catch (err) {
          sendResponse({ success: false, error: err});
        }
      })();
    }

    return true;
  }
  if(message.action === "leaveSession") {
    if(!activeSession) return;
    activeSession = false;
    if(!socket || !socket.connected) return;
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