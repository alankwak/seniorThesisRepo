const shareTabsButton = document.getElementById("share");
const createGroupButton = document.getElementById("group");
const tabTable = document.getElementById("tabSelection");

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

shareTabsButton.addEventListener("click", async () => {
  updateTabTable();
  tabTable.toggle();
});

createGroupButton.addEventListener("click", async () => {
  let tabIds = tabTable.getSelectedIds().map(id => parseInt(id));
  const groupId = await chrome.runtime.sendMessage({action: "getGroupId"});
  tabTable.toggle();
  if(tabIds.length == 0) {
    const newTab = await chrome.tabs.create({ url: "https://www.google.com" });
    tabIds = [newTab.id];
  }
  chrome.tabs.group({tabIds: tabIds, groupId: groupId}, (newGroup) => {
    chrome.runtime.sendMessage({ action: "updateGroupId", message: newGroup});
    chrome.tabGroups.update(newGroup, {color: "blue", title: "CoTab" });
  });
});

chrome.tabs.onUpdated.addListener(() => {
  updateTabTable();
});

chrome.tabs.onRemoved.addListener(() => {
  updateTabTable();
});

async function updateTabTable() {
  const groupId = await chrome.runtime.sendMessage({action: "getGroupId"});
  let currentTabs = await chrome.tabs.query({groupId: chrome.tabGroups.TAB_GROUP_ID_NONE});
  tabTable.data = currentTabs.map((tab) => [tab.id, tab.index + 1, tab.title, tab.url]);
}