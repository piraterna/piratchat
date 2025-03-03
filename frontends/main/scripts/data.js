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
    isInWindow: true
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
    })()
};

// ---------------------- Audio ----------------------
const audio = {
    notification: new Audio("notify.mp3")
};