class SessionHandler extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.state = "default";
        this.sessionCode = null;
    }

    connectedCallback() {
        if(this.isConnected) this.render();
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
                <div class="wrapper">
                  <div class="center">
                    <button class="promptButton" id="promptCreate"> Create New Session </button>
                    <button class="promptButton" id="promptJoin"> Join Existing Session </button>
                  </div>
                </div>
            `;
            this.shadowRoot.getElementById("promptCreate").addEventListener("click", () => {
                this.state = "create";
                this.render();
            });
            this.shadowRoot.getElementById("promptJoin").addEventListener("click", () => {
                this.state = "join";
                this.render();
            });
        } else if(this.state === "create") {
            this.shadowRoot.innerHTML = `
                ${styles}
                <div class="wrapper">
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

            const createButton = this.shadowRoot.getElementById("create")
            this.shadowRoot.getElementById("cancel").addEventListener("click", () => {
                this.state = "default";
                this.render();
            });
            createButton.addEventListener("click", () => {
                createButton.style.display = "none";
                const password = this.shadowRoot.getElementById("pwd").value;
                this.state = "connected";
                this.render();
            });
        } else if(this.state === "join") {
            this.shadowRoot.innerHTML = `
                ${styles}
                <div class="wrapper">
                  <div class="header"> Join an ongoing session: </div>
                  <div class="wrapper" style="gap: 5px; margin: 10px auto 10px auto;">
                    8-Character Session Code: <input type="text" id="code" placeholder="Session Code" maxlength="8"> </input>
                  </div>
                  <div class="wrapper" style="gap: 5px; margin: 10px auto 10px auto;">
                    Password: <input type="password" id="pwd" placeholder="Password" maxlength="40"> </input> 
                  </div>
                  <div class="center">
                    <button class="actionButton confirmButton" id="join"> Join </button>
                    <button class="actionButton cancelButton" id="cancel"> Cancel </button>
                  </div>
                </div>
            `;
            this.shadowRoot.getElementById("cancel").addEventListener("click", () => {
                this.state = "default";
                this.render();
            });
        } else if(this.state === "connected") {
            this.shadowRoot.innerHTML = `
                ${styles}
                <div class="wrapper">
                  <div class="codeDisplay center">
                    ${this.sessionCode ? this.sessionCode : "_PH_CODE"}
                  </div>
                  <div class="center">
                    <button class="actionButton cancelButton" style="max-width: 50%" id="leave"> Leave Session </button>
                  </div>
                </div>
            `;
            this.shadowRoot.getElementById("leave").addEventListener("click", () => {
                this.state = "default";
                this.render();
            });
        }
    }
}

customElements.define("session-handler", SessionHandler);