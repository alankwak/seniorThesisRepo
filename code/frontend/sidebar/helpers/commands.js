export const commands = {
    password: {
        set: (socket, args) => {
            if(!args[0]) return "Missing password.";
            socket.emit("update-session-password", args[0]);
        },
        remove: (socket) => {
            socket.emit("update-session-password", null);
        }
    },

    defaultrole: (socket, args) => {
        const validRoles = { "admin": 1, "collaborator": 2, "view_only": 3 };
        const role = args[0]?.toLowerCase();

        if(!role) return "Missing role.";
        if(!validRoles[role]) return `Invalid role: "${role}"`;

        socket.emit("update-default-role", validRoles[role]);
    },

    clear: (socket, args, chatStorage) => {
        chatStorage.length = 0;
        chrome.runtime.sendMessage({ action: "new-chat-message" });
    }
};

export function processCommand(text, socket, chatStorage) {
    if(!text.startsWith("/")) return false;

    const [commandName, subcommand, ...args] = text.substring(1).trim().split(/\s+/);

    const sendInvalid = (msg) => {
        const message = {
            text: `Invalid command: ${text}. ${msg}`,
            timestamp: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }),
            system: true
        };

        chatStorage.push(message); // doesn't abide by storage limit, will fix upon message from server -- not a big deal

        chrome.runtime.sendMessage({
            action: "new-chat-message",
            message
        });
    };

    const command = commands[commandName?.toLowerCase()];

    if(!command) {
        sendInvalid("Unknown command.");
        return true;
    }

    if(typeof command === "object") {
        const handler = command[subcommand?.toLowerCase()];

        if(!handler) {
            sendInvalid(`Unknown argument: "${subcommand}"`);
            return true;
        }

        const error = handler(socket, args, chatStorage);
        if(error) sendInvalid(error);
    }
    else if(typeof command === "function") {
        const error = command(socket, [subcommand, ...args], chatStorage);
        if(error) sendInvalid(error);
    }

    return true;
}