let cachedUserId = null;
let activeSession = false;
let cachedActiveSessionCode = null;
let cachedGroupId = null;

chrome.storage.local.get("activeSessionCode", data => {
  cachedActiveSessionCode = data.activeSessionCode || null;
});

chrome.storage.local.get("sharedGroupId", data => {
  cachedGroupId = data.sharedGroupId || null;
});

chrome.runtime.onStartup.addListener(initUserId);
chrome.runtime.onInstalled.addListener(initUserId);

function initUserId() {
  chrome.storage.local.get("userId", data => {
    if(data.userId) {
      cachedUserId = data.userId;
    } else {
      cachedUserId = crypto.randomUUID();
      chrome.storage.local.set({ userId: cachedUserId });
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

    if (activeSession) {
      sendResponse({ success: false, error: "Already in a session" });
      return true;
    }

    (async () => {
      try {
        const response = await fetch("http://localhost:53140/api/session/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creator: cachedUserId,
            password: message.password || null
          })
        });

        const data = await response.json();
        activeSession = true;
        chrome.storage.local.set({ activeSessionCode: data.code });
        cachedActiveSessionCode = data.code;
        sendResponse(data);

      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true;
  }
  if(message.action === "leaveSession") {
    if(!activeSession) return;
    cachedActiveSessionCode = null;
    chrome.storage.local.remove("activeSessionCode");
    activeSession = false;
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