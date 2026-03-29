class UserInteractionPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  async connectedCallback() {
    this.render();
    this.initResizer();
    const chatHistory = await chrome.runtime.sendMessage({ action: "getChatHistory" });
    chatHistory.forEach((message) => this.addMessage(message));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        html, body {
          height: 100%;
          margin: 0;
        }

        .resizer {
          width: 100%;
          height: 8px;
          cursor: ns-resize;
          background: transparent;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 10;
        }

        .panel {
          position: relative;
          height: 15vh;
          min-height: 150px;
          max-height: 40vh;
          max-width: 700px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
        }

        .content {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin: 0;
          padding: 10px;
          border-radius: 8px 8px 8px 0;
          border: 1px solid #a7a7a7;
          border-bottom: none;
          background: #444444;
          overflow: hidden;
          min-height: 0;
        }

        .tab {
          display: none;
          flex: 1;
        }

        .tab.active {
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .chat-box {
          display: flex;
          flex-direction: column;  
          flex: 1;
          min-height: 0;
          background: #bbb;
          border: 1px solid #a7a7a7;
          border-radius: 8px;
          padding: 0;
          overflow-y: auto;
        }

        .chat-list {
          list-style: none;
          padding: 0;
          margin: 0;
          margin-top: auto;
        }

        .chat-list li {
          padding: 4px;
          border-top: 2px solid gray;
        }

        .chat-input {
          display: flex;
          margin-top: 8px;
          gap: 6px;
        }

        .chat-input input {
          flex: 1;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #a7a7a7;
          outline: none;
        }

        .chat-input input:focus {
          border-color: #4a90e2;
        }

        .chat-input button {
          padding: 8px 12px;
          border: 1px solid #222;
          border-radius: 8px;
          background: #4a90e2;
          color: white;
          cursor: pointer;
        }

        .chat-input button:hover {
          background: #357abd;
        }

        .user-list-wrapper {
          flex: 1;
          background: #bbb;
          border: 1px solid #a7a7a7;
          border-radius: 8px;
          padding: 8px;
          overflow-y: auto;
        }

        .user-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .user-list li {
          display: flex;
          align-items: center;
          gap: 8px;  
          padding: 8px;
          border-radius: 8px;
          background: #f1f3f5;
          margin-bottom: 4px;
        }

        .kickButton {
          cursor: pointer;
          font-size: 11px;
          max-width: 25%;
          font-weight: 600;
          border: 1px solid #111;
          border-radius: 8px;
          background-color: red;
          color: white;
        }

        .tab-bar {
          display: flex;
          gap: 4px;
        }

        .tab-bar button {
          flex: 1;
          padding: 8px;
          border: none;
          border-radius: 0 0 8px 8px;
          background: transparent;
          cursor: pointer;
          font-weight: 500;
        }

        .tab-bar button.active {
          background: #444444;
          color: #bbbbbb;
          border: 1px solid #a7a7a7;
          border-top: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }

        .roleDropdownOption {
          font-size: 11px;
          font-weight: 600;
          color: #555;
        }
      </style>

      <div class="panel">
        <div class="resizer" id="resizer"></div> 
        <div class="content">
          
          <div id="chatTab" class="tab active">
            <div class="chat-box"> <ul class="chat-list" id="chatList"></ul> </div>
            <div class="chat-input">
              <input type="text" id="chatInput" placeholder="Type a message..." />
              <button id="sendChatButton">Send</button>
            </div>
          </div>

          <div id="userTab" class="tab">
            <div class="user-list-wrapper"> <ul id="userList" class="user-list"></ul> </div>
          </div>
        </div>

        <div class="tab-bar">
          <button class="active">Messages</button>
          <button>Users</button>
        </div>
      </div>
      `;

    const content = this.shadowRoot.querySelector(".content");
    const chatInput = this.shadowRoot.getElementById("chatInput");

    this.shadowRoot.getElementById("sendChatButton").addEventListener("click", (e) => {
      chrome.runtime.sendMessage({ action: "sendChat", text: chatInput.value });
      chatInput.value = "";
    });

    chatInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        chrome.runtime.sendMessage({ action: "sendChat", text: chatInput.value });
        chatInput.value = "";
      }
    });

    this.shadowRoot.querySelector(".tab-bar").addEventListener("click", (e) => {
      if(e.target.tagName === "BUTTON") {
        const buttons = this.shadowRoot.querySelectorAll(".tab-bar button");
        const tabs = this.shadowRoot.querySelectorAll(".tab");
        buttons.forEach((btn, index) => {
          if(btn === e.target) {
            btn.classList.add("active");
            tabs[index].classList.add("active");
            if(index === 0) content.style.borderRadius = "8px 8px 8px 0";
            else if(index === buttons.length - 1) content.style.borderRadius = "8px 8px 0 8px";
            else content.style.borderRadius = "8px";
          } else {
            btn.classList.remove("active");
            tabs[index].classList.remove("active");
          }
        });
      }
    });
  }

  initResizer() {
    const resizer = this.shadowRoot.getElementById('resizer');
    const panel = this.shadowRoot.querySelector('.panel');
    
    let startY, startHeight;

    const onMouseDown = (e) => {
      startY = e.clientY;
      
      startHeight = panel.getBoundingClientRect().height;
      
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      const dy = startY - e.clientY;
      
      const newHeight = startHeight + dy;

      // Apply constraints
      if(newHeight > 150 && newHeight < window.innerHeight * 0.4) {
        panel.style.height = `${newHeight}px`;
      }
    };

    const onMouseUp = () => {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    resizer.addEventListener('mousedown', onMouseDown);
  }

  async updateUsers() {
    const userList = this.shadowRoot.getElementById("userList");
    const personalRole = await chrome.runtime.sendMessage({ action: "getPersonalRole" });
    const roomState = await chrome.runtime.sendMessage({ action: "getRoomState" });
    userList.replaceChildren();
    
    const li = document.createElement("li");
    li.style.border = `green solid 1px`;

    const nicknameDiv = document.createElement("div");
    nicknameDiv.textContent = "You";
    nicknameDiv.style.color = "green";
    nicknameDiv.style.width = "100%";
    li.appendChild(nicknameDiv);

    const roleLabel = document.createElement("div");
    switch(personalRole) {
      case 0:
        roleLabel.textContent = "Leader";
        break;
      case 1:
        roleLabel.textContent = "Admin";
        break;
      case 2:
        roleLabel.textContent = "Collaborator";
        break;
      case 3:
        roleLabel.textContent = "View_Only";
        break;
    }
    roleLabel.style.fontSize = "11px";
    roleLabel.style.fontWeight = "600";
    roleLabel.style.color = "#555";
    li.appendChild(roleLabel);

    userList.appendChild(li);

    Object.entries(roomState).forEach(([userId, user]) => {
      const li = document.createElement("li");
      li.style.border = `${user.color} solid 1px`

      const nicknameDiv = document.createElement("div");
      nicknameDiv.textContent = user.nickname;
      nicknameDiv.style.color = user.color;
      nicknameDiv.style.width = "100%";
      li.appendChild(nicknameDiv);

      if((personalRole === 0 || personalRole === 1) && personalRole < user.role) { // leaders and admin
        const kickBtn = document.createElement("button");
        kickBtn.textContent = "KICK";
        kickBtn.classList.add("kickButton");
        kickBtn.addEventListener("click", () => {
          chrome.runtime.sendMessage({ action: "kickUser", userId: userId });
        });

        const roleDropdown = document.createElement("select");
        roleDropdown.classList.add("roleDropdownOption");

        if(personalRole === 0) {
          const leaderOption = document.createElement("option");
          leaderOption.classList.add("roleDropdownOption");
          leaderOption.textContent = "Leader";
          leaderOption.title = `Transfers leadership of the session to ${user.nickname}.`;
          leaderOption.value = 0;
          roleDropdown.appendChild(leaderOption);

          const adminOption = document.createElement("option");
          adminOption.classList.add("roleDropdownOption");
          adminOption.textContent = "Admin";
          adminOption.title = "Admin users can kick users and edit user roles.";
          adminOption.selected = user.role === 1;
          adminOption.value = 1;
          roleDropdown.appendChild(adminOption);
        }

        const collaboratorOption = document.createElement("option");
        collaboratorOption.classList.add("roleDropdownOption");
        collaboratorOption.textContent = "Collaborator";
        collaboratorOption.title = "Collaborators can share tabs.";
        collaboratorOption.selected = user.role === 2;
        collaboratorOption.value = 2;
        roleDropdown.appendChild(collaboratorOption);

        const viewOnlyOption = document.createElement("option");
        viewOnlyOption.classList.add("roleDropdownOption");
        viewOnlyOption.textContent = "View Only";
        viewOnlyOption.title = "Users with view-only permissions can view and open shared tabs, but cannot share their own.";
        viewOnlyOption.selected = user.role === 3;
        viewOnlyOption.value = 3;
        roleDropdown.appendChild(viewOnlyOption);

        roleDropdown.onchange = () => {
          const newRole = parseInt(roleDropdown.value, 10);
          console.log(user.role, newRole);
          if(newRole !== user.role) {
            chrome.runtime.sendMessage({ action: "assignRole", userId: userId, role: newRole});
          }
        };

        li.appendChild(roleDropdown);
        li.appendChild(kickBtn);
      } else {
        const roleLabel = document.createElement("div");
        switch(user.role) {
          case 0:
            roleLabel.textContent = "Leader";
            break;
          case 1:
            roleLabel.textContent = "Admin";
            break;
          case 2:
            roleLabel.textContent = "Collaborator";
            break;
          case 3:
            roleLabel.textContent = "View_Only";
            break;
        }
        roleLabel.style.fontSize = "11px";
        roleLabel.style.fontWeight = "600";
        roleLabel.style.color = "#555";
        li.appendChild(roleLabel);
      }

      userList.appendChild(li);
    });
  }

  async addMessage(message) {
    const personalUserId = await chrome.runtime.sendMessage({ action: "getUserId" });

    const chatList = this.shadowRoot.getElementById("chatList");
    const chatBox = chatList.parentElement;

    const li = document.createElement("li");

    const timestampSpan = document.createElement("span");
    timestampSpan.textContent = `${message.timestamp} | `;
    timestampSpan.style.fontWeight = 550;

    const nicknameSpan = document.createElement("span");
    nicknameSpan.textContent = `${message.system ? "SYSTEM" : message.fromUserNickname}${personalUserId === message.fromUser ? " (You)" : ""}: `;
    nicknameSpan.style.fontWeight = 550;
    if(message.system) {
      nicknameSpan.style.color = "#444"
      nicknameSpan.style.fontWeight = 800;
    } else if(personalUserId === message.fromUser) {
      nicknameSpan.style.color = "green";
    } else {
      nicknameSpan.style.color = message.color;
    }
    

    const messageSpan = document.createElement("span");
    messageSpan.textContent = message.text;

    li.appendChild(timestampSpan);
    li.appendChild(nicknameSpan);
    li.append(messageSpan);
    chatList.appendChild(li);

    const isAtBottom = chatBox.scrollHeight - chatBox.scrollTop <= chatBox.clientHeight + 50;
    if(isAtBottom || personalUserId === message.fromUser) {
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }

  clearChat() {
    const chatList = this.shadowRoot.getElementById("chatList");
    chatList.replaceChildren();
  }
}


customElements.define("user-interaction-panel", UserInteractionPanel);