class SessionHandler extends HTMLElement {    
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.state = "default";
        this.statusMessage = "";
    }

    async connectedCallback() {
        await this.init();
        if(this.isConnected) this.render();
    }

    async init() {
        const currentCode = await chrome.runtime.sendMessage({ action: "getSessionCode" });
        if(currentCode) {
            this.sessionCode = currentCode;
            this.state = "connected";
        }
        chrome.storage.onChanged.addListener((changes, area) => {
            if(area === "local" && changes.activeSessionCode) {
                const newCode = changes.activeSessionCode.newValue;
                if(newCode) {
                    this.sessionCode = newCode;
                    this.state = "connected";
                } else {
                    this.state = "default";
                }
                this.render();
            }
        });
    }

    render() {
        const styles = `
            <style>
            button {
                cursor: pointer;
            }
            .wrapper {
                display: flex;
                flex-direction: column;
                width: 100%;
            }
            .promptButton {
                margin: 8px;
                padding: 8px;
                background: #e6361bff;
                color: #FFFFFF;
                border-radius: 8px;
                max-width: 40%;
            }
            .promptButton:hover {
                background: #ce3119ff;
            }
            .header {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 5px;
                text-decoration: underline;
            }
            .actionButton {
                margin: 8px;
                padding: 8px;
                min-width: 25%;
                max-width: 30%;
                border-radius: 5px;
                border-width: 2px;
            }
            .confirmButton {
                background: green; 
                color: #FFFFFF;
            }
            .confirmButton:hover {
                background: #296b27ff
            }
            .cancelButton {
                background: #e6361bff; 
                color: #FFFFFF;
            }
            .cancelButton:hover {
                background: #ce3119ff;
            }
            .codeDisplay {
                font-size: 28px;
                font-weight: bold;
                margin: 10px auto;
            }
            .center {
                display: flex;
                justify-content: center;
                flex-wrap: wrap;  
            }
            </style>
        `;

        if(this.state === "default") {
            this.shadowRoot.innerHTML = `
                ${styles}
                <div class="wrapper" id="wrapper">
                  <div class="center">
                    <button class="promptButton" id="promptCreate"> Create New Session </button>
                    <button class="promptButton" id="promptJoin"> Join Existing Session </button>
                  </div>
                </div>
            `;
            this.shadowRoot.getElementById("promptCreate").addEventListener("click", () => {
                this.state = "create";
                this.statusMessage = "";
                this.render();
            });
            this.shadowRoot.getElementById("promptJoin").addEventListener("click", () => {
                this.state = "join";
                this.statusMessage = "";
                this.render();
            });
        } else if(this.state === "create") {
            this.shadowRoot.innerHTML = `
                ${styles}
                <div class="wrapper" id="wrapper">
                  <div class="header"> New session: </div>
                  <div class="wrapper" style="gap: 5px; margin: 10px auto 10px auto;">
                    Password (optional):
                    <input type="text" id="pwd" placeholder="Password" maxlength="40"> </input>
                  </div>
                  <div class="center">
                    <button class="actionButton confirmButton" id="create"> Create </button>
                    <button class="actionButton cancelButton" id="cancel"> Cancel </button>
                  </div>
                </div>
            `;

            const createButton = this.shadowRoot.getElementById("create");
            this.shadowRoot.getElementById("cancel").addEventListener("click", () => {
                this.state = "default";
                this.render();
            });

            createButton.addEventListener("click", async () => {
                createButton.disabled = true;
                const password = this.shadowRoot.getElementById("pwd").value;
                const response = await chrome.runtime.sendMessage({ action: "createSession", password: password });
                if(response && response.success) {
                    this.sessionCode = response.code;
                    this.state = "connected";
                } else if(response && response.error) {
                    alert("Error creating session: " + response.error);
                    if(response.error === "Already in a session") {
                        this.state = "connected";
                    } else {
                        this.state = "default";
                    }
                } else {
                    alert("Error creating session");
                    this.state = "default";
                }
                this.render();
            });

        } else if(this.state === "join") {
            this.shadowRoot.innerHTML = `
                ${styles}
                <div class="wrapper" id="wrapper">
                  <div class="header"> Join an ongoing session: </div>
                  <div class="wrapper" id="code-div" style="gap: 5px; margin: 10px auto 10px auto;">
                    6-Digit Session Code: <input type="text" id="code" placeholder="Session Code" maxlength="6"> </input>
                  </div>
                  <div class="wrapper" id="pwd-div" style="gap: 5px; margin: 10px auto 10px auto; display: none">
                    Password: <input type="password" id="pwd" placeholder="Password" maxlength="40"> </input> 
                  </div>
                  <div class="center">
                    <button class="actionButton confirmButton" id="join"> Join </button>
                    <button class="actionButton cancelButton" id="cancel"> Cancel </button>
                  </div>
                </div>
            `;

            const joinButton = this.shadowRoot.getElementById("join");
            this.shadowRoot.getElementById("cancel").addEventListener("click", () => {
                this.state = "default";
                this.render();
            });

            joinButton.addEventListener("click", async () => {
                joinButton.disabled = true;
                const sessionCode = this.shadowRoot.getElementById("code").value;
                const password = this.shadowRoot.getElementById("pwd").value;
                const response = await chrome.runtime.sendMessage({ action: "joinSession", sessionCode: sessionCode, password: password });
                if(response && response.success) {
                    this.sessionCode = sessionCode;
                    this.state = "connected";
                    this.render();
                } else if(response && response.error) {
                    // alert("Error joining session: " + response.error);
                    if(response.error === "Session requires a password.") {
                        this.shadowRoot.getElementById("code-div").style.display = "none";
                        this.shadowRoot.getElementById("pwd-div").style.display = "block";
                        joinButton.disabled = false;
                    } else if(response.error === "Already in a session.") {
                        this.state = "connected";
                        this.render();
                    } else {
                        this.state = "default";
                        this.render();
                    }
                } else {
                    alert("Error joining session");
                    this.state = "default";
                    this.render();
                }
            });

        } else if(this.state === "connected") {
            this.shadowRoot.innerHTML = `
                ${styles}
                <div class="wrapper" id="wrapper">
                  <div class="codeDisplay center">
                    ${this.sessionCode || "_PH_CODE"}
                  </div>
                  <div class="center">
                    <button class="actionButton cancelButton" style="max-width: 50%" id="leave"> Leave Session </button>
                  </div>
                </div>
            `;
            this.shadowRoot.getElementById("leave").addEventListener("click", () => {
                chrome.runtime.sendMessage({ action: "leaveSession" });
                this.state = "default";
                this.render();
            });
        }
        
        this.shadowRoot.getElementById("wrapper").insertAdjacentHTML('beforeend', `<div id="status">${this.statusMessage}</div>`);

        chrome.runtime.onMessage.addListener((message) => {
            if(message.action === "session_handler_status") {
                this.statusMessage = message.text;
                this.render();
            }
        });
    }
}

customElements.define("session-handler", SessionHandler);