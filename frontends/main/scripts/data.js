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
    // Dynamic URL construction
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
        return {
            emojis: {
                "heart": {
                    emoji: "❤️",
                    renderer: (token) => `<p class="emoji heart">${token.emoji}</p>`
                },
                "sob": {
                    emoji: "😭",
                    renderer: (token) => `<p class="emoji sob">${token.emoji}</p>`
                },
                "skull": {
                    emoji: "💀",
                    renderer: (token) => `<p class="emoji skull">${token.emoji}</p>`
                },
                "eggplant": {
                    emoji: "🍆",
                    renderer: (token) => `<p class="emoji eggplant">${token.emoji}</p>`
                },
		"shrug": {
		    emoji: "🤷",
		    renderer: (token) => `<p class="emoji shrug">${token.emoji}</p>`
		}
            }
        };
    })()
};

// ---------------------- Audio ----------------------
const audio = {
    notification: new Audio("notify.mp3")
};
