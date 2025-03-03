// ---------------------- DOM Elements ----------------------
const elements = {
    outputElement: document.getElementById('output'),
    inputElement: document.getElementById('user-input'),
    sendButton: document.getElementById('send-button'),
    connectionStatusElement: document.getElementById('connection-status'),
    usernameInput: document.getElementById('username-input'),
    keyInput: document.getElementById('key-input'),
    registerButton: document.getElementById('register-button'),
    loginButton: document.getElementById('login-button'),
    authContainer: document.getElementById('auth-container'),
    membersContainer: document.getElementById('members-container'),
    membersCount: document.getElementById('members-count'),
    membersList: document.getElementById('members-list'),
    membersToggle: document.getElementById('members-toggle'),
    membersClose: document.getElementById('members-close')
};

// ---------------------- Application State ----------------------
const appState = {
    socket: null,
    loggedIn: false,
    username: '',
    onlineMembers: [],
    isMobile: window.innerWidth <= 768,
    isInWindow: true,
    isUploadingFile: false
};

// ---------------------- Configuration ----------------------
const config = {
    serverUrl: (function () {
        const currentUrl = new URL(window.location.href);
        currentUrl.port = '443';
        return currentUrl.origin.replace(/^http/, 'ws') + "/ws";
    })(),

    apiBaseUrl: (function () {
        const currentUrl = new URL(window.location.href);
        currentUrl.port = '443';
        return currentUrl.origin + "/api";
    })(),

    emojiTable: (function () {
        const emojiTable = {
            emojis: {}
        };

        const addEmojiUnicode = (name, symbol) => {
            emojiTable.emojis[name] = {
                emoji: symbol,
                renderer: (token) => `<p class="emoji ${name}">${token.emoji}</p>`
            };
        };

        const addEmojiImage = (name, path) => {
            emojiTable.emojis[name] = {
                emoji: path,
                renderer: (token) => `<img class="emoji ${name}" src="${token.emoji}" style="width: 20px; height: 20px; vertical-align: sub;">`
            };
        };

        addEmojiUnicode("heart", "❤️");
        addEmojiUnicode("sob", "😭");
        addEmojiImage("kosher", `${window.location.href}/emojis/kosher.png`);
        addEmojiImage("skull", `${window.location.href}/emojis/skull.png`);
        addEmojiImage("troll", `${window.location.href}/emojis/troll.png`);
        addEmojiImage("shrug", `${window.location.href}/emojis/shrug.png`);

        emojiTable.addEmojiUnicode = addEmojiUnicode;
        emojiTable.addEmojiImage = addEmojiImage;

        return emojiTable;
    })()
};

// ---------------------- Audio ----------------------
const audio = {
    notification: new Audio("notify.mp3")
};
