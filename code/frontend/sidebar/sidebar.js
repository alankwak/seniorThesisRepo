const startGroupButton = document.getElementById("startGroup");
const confirmGroupButton = document.getElementById("confirmGroup");
const cancelGroupButton = document.getElementById("cancelGroup");
const tabTable = document.getElementById("tabSelection");
const localTable = document.getElementById("localTabs");

// document.getElementById("create").addEventListener("click", async () => {
//   try {
//     // const userId = await new Promise((resolve) => {
//     //   chrome.runtime.sendMessage({ action: "getUserId" }, resolve);
//     // });
//     // const res = await fetch("http://localhost:53140/api/session/create", { 
//     //   method: "POST", 
//     //   body: JSON.stringify({
//     //     creator: userId
//     //   }),
//     //   headers: { "Content-Type": "application/json" }
//     // });
//     // const data = await res.json();
//     chrome.tabs.create({ url: "https://www.google.com" }, (newTab) => {
//       chrome.tabs.group({tabIds: newTab.id}, (newGroup) => {
//         chrome.runtime.sendMessage({ action: "updateGroupId", message: newGroup});
//         chrome.tabGroups.update(newGroup, {color: "blue", title: "CoTab" });
//       });
//     });
//   } catch (err) {
//     console.error("Error creating session:", err);
//   }
// });

startGroupButton.addEventListener("click", async () => {
  updateTabTable();
  startGroupButton.style.display = "none";
  confirmGroupButton.style.display = "block";
  cancelGroupButton.style.display = "block";
  tabTable.toggle();
});

confirmGroupButton.addEventListener("click", async () => {
  confirmGroupButton.style.display = "none";
  cancelGroupButton.style.display = "none";

  let tabIds = tabTable.getSelectedIds().map(id => parseInt(id));
  const groupId = await chrome.runtime.sendMessage({action: "getGroupId"});
  tabTable.toggle();

  if(tabIds.length == 0) {
    const newTab = await chrome.tabs.create({ url: "https://www.google.com" });
    tabIds = [newTab.id];
  }
  chrome.tabs.group({tabIds: tabIds, groupId: groupId}, async (newGroup) => {
    await chrome.runtime.sendMessage({ action: "updateGroupId", message: newGroup});
    await chrome.tabGroups.update(newGroup, {color: "green", title: "CoTab" });
  });
  startGroupButton.style.display = "block";
});

cancelGroupButton.addEventListener("click", () => {
  confirmGroupButton.style.display = "none";
  cancelGroupButton.style.display = "none";
  tabTable.toggle();
  startGroupButton.style.display = "block";
});

chrome.tabs.onUpdated.addListener(() => {
  updateTabTable();
  updateLocalTable();
});

chrome.tabs.onRemoved.addListener(() => {
  updateTabTable();
  updateLocalTable();
});

chrome.tabGroups.onUpdated.addListener(() => {
  updateLocalTable();
});

chrome.tabGroups.onCreated.addListener(() => {
  updateLocalTable();
});

document.addEventListener("DOMContentLoaded", updateLocalTable);

async function updateTabTable() {
  const currentTabs = await chrome.tabs.query({groupId: chrome.tabGroups.TAB_GROUP_ID_NONE});
  tabTable.data = currentTabs.map((tab) => [tab.id, tab.favIconUrl || "", tab.title, tab.url]);
}

async function updateLocalTable() {
  const groupId = await chrome.runtime.sendMessage({action: "getGroupId"});
  const tabsInGroup = groupId ? await chrome.tabs.query({groupId: groupId}) : [];
  localTable.data = tabsInGroup.map((tab) => [tab.id, tab.favIconUrl || "", tab.title, tab.url]);
}