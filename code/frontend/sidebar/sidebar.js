const startGroupButton = document.getElementById("startGroup");
const confirmGroupButton = document.getElementById("confirmGroup");
const cancelGroupButton = document.getElementById("cancelGroup");
const tabTable = document.getElementById("tabSelection");
const localTable = document.getElementById("localTabs");
const updateNicknameButton = document.getElementById("edit-nickname");
const saveNicknameButton = document.getElementById("save-nickname");

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

updateNicknameButton.addEventListener("click", async () => {
  const nicknameSpan = document.getElementById("nickname-display");
  const nicknameInput = document.getElementById("nickname-input");
  nicknameInput.value = nicknameSpan.textContent;
  nicknameSpan.style.display = "none";
  nicknameInput.style.display = "inline-block";
  updateNicknameButton.style.display = "none";
  saveNicknameButton.style.display = "inline-block";
});

saveNicknameButton.addEventListener("click", async () => {
  const nicknameSpan = document.getElementById("nickname-display");
  const nicknameInput = document.getElementById("nickname-input");
  const newNickname = nicknameInput.value.trim();
  if(newNickname.length > 0) {
    nicknameSpan.textContent = newNickname;
    chrome.runtime.sendMessage({ action: "setNickname", nickname: newNickname });
  }
  nicknameSpan.style.display = "inline-block";
  nicknameInput.style.display = "none";
  updateNicknameButton.style.display = "inline-block";
  saveNicknameButton.style.display = "none";
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
document.addEventListener("DOMContentLoaded", updateRoomState);
document.addEventListener("DOMContentLoaded", updateNickname);

chrome.runtime.onMessage.addListener( (message) => {
  if(message.action === "room-update") {
    updateRoomState();
  }
});

async function updateTabTable() {
  const currentTabs = await chrome.tabs.query({groupId: chrome.tabGroups.TAB_GROUP_ID_NONE});
  tabTable.data = currentTabs.map((tab) => [tab.id, tab.favIconUrl || "", tab.title, tab.url]);
}

async function updateLocalTable() {
  const groupId = await chrome.runtime.sendMessage({action: "getGroupId"});
  const tabsInGroup = groupId ? await chrome.tabs.query({groupId: groupId}) : [];
  localTable.data = tabsInGroup.map((tab) => [tab.id, tab.favIconUrl || "", tab.title, tab.url]);
}

async function updateRoomState() {
  const roomState = await chrome.runtime.sendMessage({action: "getRoomState"});
  const listContainer = document.getElementById("other-users");
  listContainer.replaceChildren();
  if(roomState) {
    Object.values(roomState).forEach(user => {
      if(user.tabs.length > 0) {
        const userSection = document.createElement('div');
        userSection.classList.add("user-section");
        const userLabel = document.createElement('div');
        userLabel.classList.add("user-label");
        userLabel.textContent = user.nickname;
        const tableSection = document.createElement('div');
        tableSection.classList.add("table-section");
        const tabTable = document.createElement('non-selectable-table');
        tabTable.data = user.tabs;
        tableSection.appendChild(tabTable);
        userSection.appendChild(userLabel);
        userSection.appendChild(tableSection);
        listContainer.appendChild(userSection);

        listContainer.appendChild(userSection);
      }
    });
  }
}

async function updateNickname() {
  const nickname = await chrome.runtime.sendMessage({ action: "getNickname" });
  const nicknameSpan = document.getElementById("nickname-display");
  if(nicknameSpan) nicknameSpan.textContent = nickname;
}