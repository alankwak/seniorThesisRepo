const sidebarButton = document.getElementById("openSidebar");

window.addEventListener("load", async () => {
  const initSessionStatus = await new Promise((resolve) => {
    chrome.runtime.sendMessage({action: "getSessionStatus"}, resolve);
  });
});

if(sidebarButton) {
  sidebarButton.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  });
}