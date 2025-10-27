let cachedUserId = null;

chrome.runtime.onStartup.addListener(initUserId);
chrome.runtime.onInstalled.addListener(initUserId);

function initUserId() {
  chrome.storage.local.get("userId", data => {
    if (data.userId) {
      cachedUserId = data.userId;
    } else {
      cachedUserId = crypto.randomUUID();
      chrome.storage.local.set({ userId: cachedUserId });
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getUserId") {
    if (cachedUserId) {
      sendResponse(cachedUserId);
    }
    return true; // keep message channel open for async sendResponse
  }
});