class UserInteractionPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        html, body {
          height: 100%;
          margin: 0;
        }

        .panel {
          height: 15vh;
          min-height: 150px;
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
        }

        .tab {
          display: none;
          flex: 1;
        }

        .tab.active {
          display: flex;
          flex-direction: column;
        }

        .chat-box {
          flex: 1;
          background: #bbbbbb;
          border: 1px solid #a7a7a7;
          border-radius: 8px;
          padding: 10px;
          overflow-y: auto;
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

        .user-list {
          flex: 1;
          background: #bbbbbb;
          border: 1px solid #a7a7a7;
          border-radius: 8px;
          padding: 8px;
          list-style: none;
          overflow-y: auto;
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
        <div class="content">
          
          <div id="chatTab" class="tab active">
            <div class="chat-box" id="chatBox"></div>
            <div class="chat-input">
              <input type="text" id="chatInput" placeholder="Type a message..." />
              <button>Send</button>
            </div>
          </div>

          <div id="userTab" class="tab">
            <div class="user-list" id="userList"></div>
          </div>
        </div>

        <div class="tab-bar">
          <button class="active">Messages</button>
          <button>Users</button>
        </div>
      </div>
      `;

    const content = this.shadowRoot.querySelector(".content");

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

  async updateUsers() {
    const userList = this.shadowRoot.getElementById("userList");
    const personalRole = await chrome.runtime.sendMessage({ action: "getPersonalRole" });
    const roomState = await chrome.runtime.sendMessage({ action: "getRoomState" });
    userList.replaceChildren();
    Object.entries(roomState).forEach(([userId, user]) => {
      const li = document.createElement("li");
      li.style.border = `${user.color} solid 1px`

      const nicknameDiv = document.createElement("div");
      nicknameDiv.textContent = user.nickname;
      nicknameDiv.style.color = user.color;
      nicknameDiv.style.width = "100%";
      li.appendChild(nicknameDiv)

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
            roleLabel.textContent = "View Only";
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
}


customElements.define("user-interaction-panel", UserInteractionPanel);