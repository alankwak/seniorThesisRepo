class UserInteractionPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.data = this.data || [];
    if(this.isConnected) this.render();
  }

  set data(rows) {
    this._data = rows;
    this.render();
  }

  get data() {
    return this._data;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .panel {
          max-width: 700px;
          max-height: 250px;
          display: flex;
          flex-direction: column;
          overflow:;
        }

        .content {
          flex: 1;
          margin: 0;
          padding: 10px;
          max-height: 12vh;
          border-radius: 8px 8px 8px 0;
          border: 1px solid #a7a7a7;
          border-bottom: none;
          background: #444444;
        }

        .tab {
          display: none;
          max-height: 11vh;
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
          background: #bbbbbb;
          border: 1px solid #a7a7a7;
          border-radius: 8px;
          padding: 10px;
          list-style: none;
          overflow-y: auto;
          max-height: 10%;
        }

        .user-list li {
          padding: 8px;
          border-radius: 8px;
          background: #f1f3f5;
          margin-bottom: 6px;
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
            <div class="user-list" id="userList">
              <li>Hello</li>
              <li>Hello</li>
              <li>Hello</li>
              <li>Hello</li>
            </div>
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
}


customElements.define("user-interaction-panel", UserInteractionPanel);