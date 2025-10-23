const sidebarButton = document.getElementById("openSidebar");
if(sidebarButton) {
  sidebarButton.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  });
}