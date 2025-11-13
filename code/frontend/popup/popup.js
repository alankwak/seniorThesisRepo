const sidebarButton = document.getElementById("openSidebar");
const createSessionButton = document.getElementById("create");
const joinSessionButton = document.getElementById("join");
const leaveSessionButton = document.getElementById("leave");

window.addEventListener("load", async () => {
  const initSessionStatus = await new Promise((resolve) => {
    chrome.runtime.sendMessage({action: "getSessionStatus"}, resolve);
  });
  createSessionButton.style.display = initSessionStatus ? "none" : "block";
  joinSessionButton.style.display = initSessionStatus ? "none" : "block";
  leaveSessionButton.style.display = initSessionStatus ? "block" : "none";
});

if(sidebarButton) {
  sidebarButton.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  });
}

if(createSessionButton) {
  createSessionButton.addEventListener("click", async () => {
    try {
      // const userId = await new Promise((resolve) => {
      //   chrome.runtime.sendMessage({ action: "getUserId" }, resolve);
      // });
      // const res = await fetch("http://localhost:53140/api/session/create", { 
      //   method: "POST", 
      //   body: JSON.stringify({
      //     creator: userId
      //   }),
      //   headers: { "Content-Type": "application/json" }
      // });
      // const data = await res.json();
      // codeDisplay.textContent = `Session created with code: ${data.code}`;
      chrome.runtime.sendMessage({action: "startSession"});
      createSessionButton.style.display = "none";
      joinSessionButton.style.display = "none";
      leaveSessionButton.style.display = "block";
    } catch (err) {
      console.error("Error creating session:", err);
    }
  });
}

if(leaveSessionButton) {
  leaveSessionButton.addEventListener("click", async () => {
    chrome.runtime.sendMessage({action: "leaveSession"});
    createSessionButton.style.display = "block";
    joinSessionButton.style.display = "block";
    leaveSessionButton.style.display = "none";
  });
}