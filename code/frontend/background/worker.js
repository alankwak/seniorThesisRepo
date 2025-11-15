let cachedUserId = null;
let activeSession = false;
let cachedGroupId = null;

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
  if(message.action === "updateGroupId") {
    cachedGroupId = message.message || null;
    chrome.storage.local.set({ sharedGroupId: cachedGroupId });
  }
  if(message.action === "getGroupId") {
    sendResponse(cachedGroupId);
  }
  if(message.action === "startSession") {
    activeSession = true;
  }
  if(message.action === "leaveSession") {
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