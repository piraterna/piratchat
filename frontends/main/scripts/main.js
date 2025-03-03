// ---------------------- Mobile Responsiveness ----------------------
const MobileView = {
    init() {
        if (appState.isMobile) {
            elements.membersList.classList.add('mobile-hidden');
        } else {
            elements.membersList.classList.remove('mobile-hidden');
            elements.membersList.classList.remove('mobile-shown');
        }
    },

    setupEventListeners() {
        // Update on resize
        window.addEventListener('resize', function () {
            appState.isMobile = window.innerWidth <= 768;
            MobileView.init();
        });

        // Toggle members list for mobile
        elements.membersToggle.addEventListener('click', function () {
            if (appState.isMobile) {
                elements.membersList.classList.add('mobile-shown');
            }
        });

        // Close members list for mobile
        elements.membersClose.addEventListener('click', function () {
            if (appState.isMobile) {
                elements.membersList.classList.remove('mobile-shown');
            }
        });

        // Close members panel when clicking outside (for mobile)
        document.addEventListener('click', function (event) {
            if (appState.isMobile &&
                elements.membersList.classList.contains('mobile-shown') &&
                !elements.membersList.contains(event.target) &&
                event.target !== elements.membersToggle) {
                elements.membersList.classList.remove('mobile-shown');
            }
        });
    }
};

// ---------------------- Authentication ----------------------
const Auth = {
    async register() {
        const username = elements.usernameInput.value.trim();
        if (!username) {
            Chat.displayOutput("Please enter a username", "server");
            return;
        }

        try {
            const response = await fetch(`${config.apiBaseUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });

            // Check if response has content
            const contentType = response.headers.get("content-type");
            let data = {};

            if (contentType && contentType.indexOf("application/json") !== -1 && response.status !== 204) {
                try {
                    data = await response.json();
                } catch (jsonError) {
                    Chat.displayOutput(`Server returned invalid JSON: ${jsonError.message}`, "error");
                    return;
                }
            }

            if (response.status === 201) {
                Chat.displayOutput(`Registration successful! Your key is: ${data.key || "No key provided"}`, "system");
                Chat.displayOutput("Save this key for future logins", "system");
                if (data.key) {
                    elements.keyInput.value = data.key;
                }
            } else if (response.status === 409) {
                Chat.displayOutput("Username already taken. Try another one.", "server");
            } else if (response.status === 422) {
                Chat.displayOutput("Invalid username format.", "server");
            } else {
                Chat.displayOutput(`Registration failed with status: ${response.status}`, "server");
            }
        } catch (error) {
            Chat.displayOutput(`Error during registration: ${error.message}`, "error");
        }
    },

    async login() {
        const key = elements.keyInput.value.trim();
        if (!key) {
            Chat.displayOutput("Please enter your key", "server");
            return;
        }

        // Chat.displayOutput("Attempting login...", "system");

        try {
            const response = await fetch(`${config.apiBaseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ key }),
                credentials: 'include'
            });

            // Check if response is empty or not JSON
            let data = {};
            try {
                // Only try to parse as JSON if content exists and is JSON
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1 && response.status !== 204) {
                    const text = await response.text();
                    if (text) {
                        data = JSON.parse(text);
                    }
                }
            } catch (jsonError) {
                Chat.displayOutput(`Failed to parse server response: ${jsonError.message}`, "error");
                // Continue with login flow using default values
            }

            if (response.status === 200) {
                appState.username = await User.getUsername();
                appState.loggedIn = true;
                Chat.displayOutput(`Login successful as ${appState.username}!`, "system");
                elements.authContainer.style.display = "none";
                Connection.connect();
                Members.fetchOnlineMembers(); // Fetch online members list upon successful login
            } else if (response.status === 401) {
                Chat.displayOutput("Invalid key. Please try again.", "server");
            } else if (response.status === 422) {
                Chat.displayOutput("Invalid key format.", "server");
            } else if (response.status === 204) {
                // Handle No Content response
                appState.username = 'You'; // Default value
                appState.loggedIn = true;
                Chat.displayOutput("Login successful!", "system");
                elements.authContainer.style.display = "none";
                Connection.connect();
                Members.fetchOnlineMembers(); // Fetch online members list upon successful login
            } else {
                Chat.displayOutput(`Login failed with status: ${response.status}`, "server");
            }
        } catch (error) {
            Chat.displayOutput(`Error during login: ${error.message}`, "error");
        }
    },

    async logout() {
        try {
            await fetch(`${config.apiBaseUrl}/logout`, {
                method: 'GET',
                credentials: 'include'
            });

            appState.loggedIn = false;
            if (appState.socket) {
                appState.socket.close();
            }

            elements.authContainer.style.display = "flex";
            Chat.displayOutput("Logged out successfully", "system");
            Connection.updateConnectionStatus("Disconnected", false);

            // Clear the members list
            Members.updateMembersList([]);
        } catch (error) {
            Chat.displayOutput(`Error during logout: ${error.message}`, "error");
        }
    },

    setupEventListeners() {
        elements.registerButton.addEventListener('click', Auth.register);
        elements.loginButton.addEventListener('click', Auth.login);

        // Register enter key on input fields
        elements.usernameInput.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                Auth.register();
            }
        });

        elements.keyInput.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                Auth.login();
            }
        });
    }
};

// ---------------------- User Info ----------------------
const User = {
    async getUsername() {
        const response = await fetch(config.apiBaseUrl + "/user/@me", {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();
        return data.username;
    }
};

// ---------------------- WebSocket Connection ----------------------
const Connection = {
    connect() {
        if (appState.socket && appState.socket.readyState === WebSocket.OPEN) {
            return; // Already connected
        }

        try {
            appState.socket = new WebSocket(config.serverUrl);

            appState.socket.onopen = function () {
                Connection.updateConnectionStatus("Connected", true);
                Chat.displayOutput("Connected to chat server (see /help for some commands)", "system");

                // Fetch online members immediately when connected
                Members.fetchOnlineMembers();
            };

            appState.socket.onmessage = function (event) {
                try {
                    const data = JSON.parse(event.data);

                    // Handle received messages
                    if (data.message && data.author) {
                        // Skip displaying messages from yourself since we already display them when sent
                        if (data.author !== appState.username) {
                            if (!appState.isInWindow) {
                                document.title = "Piratchat (Unread Messages)";
                            } else {
                                document.title = "Piratchat";
                            }

                            audio.notification.play();
                            Chat.displayOutput({ author: data.author, message: data.message }, "chat");
                        }
                    }
                    // Handle join/leave events
                    else if (data.event === "join" && data.username) {
                        Chat.displayOutput(data.username, "join");
                        // Refresh online members on join event
                        Members.fetchOnlineMembers();
                    }
                    else if (data.event === "leave" && data.username) {
                        Chat.displayOutput(data.username, "leave");
                        // Refresh online members on leave event
                        Members.fetchOnlineMembers();
                    }
                } catch (error) {
                    Chat.displayOutput(`Error parsing message: ${error.message}`, "error");
                }
            };

            appState.socket.onclose = function () {
                Connection.updateConnectionStatus("Disconnected", false);

                // Only display the message if this wasn't a deliberate disconnect
                if (!appState.socket.isDeliberateDisconnect) {
                    Chat.displayOutput("Disconnected from chat server", "system");
                }

                // Reset the flag (in case we reconnect with the same socket object)
                appState.socket.isDeliberateDisconnect = false;
            };

            appState.socket.onerror = function (error) {
                Chat.displayOutput("WebSocket error occurred", "error");
            };
        } catch (error) {
            Chat.displayOutput(`Failed to connect: ${error.message}`, "error");
        }
    },

    disconnect() {
        if (appState.socket) {
            // Set a flag to indicate we're deliberately disconnecting
            appState.socket.isDeliberateDisconnect = true;
            appState.socket.close();
            Connection.updateConnectionStatus("Disconnected", false);
            Chat.displayOutput("Disconnected from chat server", "system");
            // We're not logging out, just disconnecting

            // Clear the members list
            Members.updateMembersList([]);
        }
    },

    reconnect() {
        if (appState.loggedIn) {
            Chat.displayOutput("Reconnecting to chat server...", "system");
            Connection.connect();
        } else {
            Chat.displayOutput("Please log in first", "server");
        }
    },

    updateConnectionStatus(text, isConnected) {
        elements.connectionStatusElement.textContent = text;
        if (isConnected) {
            elements.connectionStatusElement.classList.remove("disconnected");
            elements.connectionStatusElement.classList.add("connected");
        } else {
            elements.connectionStatusElement.classList.remove("connected");
            elements.connectionStatusElement.classList.add("disconnected");
        }
    }
};

// ---------------------- Members Management ----------------------
const Members = {
    updateMembersList(members) {
        // Update the online members array
        appState.onlineMembers = members;

        // Clear the current list
        elements.membersContainer.innerHTML = '';

        // Update member count
        elements.membersCount.textContent = `(${members.length})`;

        // Add each member to the list
        members.forEach(member => {
            const memberElement = document.createElement('div');
            memberElement.className = 'member';
            memberElement.textContent = member;
            elements.membersContainer.appendChild(memberElement);
        });

        // Update the toggle button text
        elements.membersToggle.textContent = `Users (${members.length})`;
    },

    async fetchOnlineMembers() {
        try {
            const response = await fetch(`${config.apiBaseUrl}/online`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.online_clients) {
                    Members.updateMembersList(data.online_clients);
                }
            } else {
                Chat.displayOutput(`Failed to fetch online members: ${response.status}`, "error");
            }
        } catch (error) {
            Chat.displayOutput(`Error fetching online members: ${error.message}`, "error");
        }
    }
};

// ---------------------- Chat Commands ----------------------
const CommandCallbacks = {
    async get_image(args) {
        const [url] = args;
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '50%';
        img.style.maxHeight = '250px';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '10px 0';

        // Add click event to open the image in fullscreen
        img.addEventListener('click', () => {
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = 0;
            overlay.style.left = 0;
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            overlay.style.zIndex = 1000;
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';

            const fullscreenImg = document.createElement('img');
            fullscreenImg.src = url;
            fullscreenImg.style.maxWidth = '90%';
            fullscreenImg.style.maxHeight = '90%';
            fullscreenImg.style.height = 'auto';

            overlay.appendChild(fullscreenImg);
            document.body.appendChild(overlay);

            // Close the overlay when clicked
            overlay.addEventListener('click', () => {
                document.body.removeChild(overlay);
            });
        });

        elements.outputElement.appendChild(img);
    }

};

const Commands = {
    list: [
        { command_name: 'img', callback: CommandCallbacks.get_image }, // $img(https://example.com/image.png)
    ],

    async handleCommands(message) {
        const commandPattern = /\$(\w+)\((.*?)\)/g;
        let match;
        while ((match = commandPattern.exec(message)) !== null) {
            const [fullMatch, commandName, args] = match;
            const command = Commands.list.find(cmd => cmd.command_name === commandName);

            if (command) {
                const parsedArgs = args.split(',').map(arg => arg.trim());
                await command.callback(parsedArgs);
                message = message.replace(fullMatch, '');
            }
        }
    }
};

// ---------------------- Chat Functionality ----------------------
const Chat = {
    cleanMessage(message) {
        const commandPattern = /\$(\w+)\((.*?)\)/g;
        let match;
        let final = message;

        // Replace commands
        while ((match = commandPattern.exec(final)) !== null) {
            const [fullMatch, commandName, args] = match;
            final = final.replace(fullMatch, '');
        }

        return final;
    },

    createLinkFromUrl(url) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.target = '_blank';
        anchor.textContent = url;
        return anchor;
    },

    async displayOutput(message, type = 'server') {
        const p = document.createElement('p');
        p.classList.add(`${type}-message`);

        let temp = typeof message === 'object' ? message.message || '' : message;
        let finalMessage = Chat.cleanMessage(temp);
        const pingPattern = new RegExp(`@${appState.username}(\\b|[^a-zA-Z0-9_])`, 'g');
        const highlightMessage = pingPattern.test(finalMessage);

        // Strip out wrapping block elements
        finalMessage = marked.parse(finalMessage).replace(/<\/?(p|div)[^>]*>/g, '').replace(/\n/g, ' ');

        if (type === 'server' || type === 'system' || type === 'error') {
            finalMessage = `<span>[${type}]</span> ${finalMessage}`;
        } else if (type === 'join') {
            finalMessage += `<em>has ${type}ed the chat.</em>`;
        } else if (type === 'leave') {
            finalMessage += `<em>has ${type}d the chat.</em>`;
        } else if (type === 'chat' || type === 'self') {
            finalMessage = `<strong>&lt;${type === 'self' ? appState.username : message.author}&gt;</strong> ${finalMessage}`;
        }

        p.innerHTML = finalMessage;
        if (highlightMessage) p.style.backgroundColor = "#333333";

        elements.outputElement.appendChild(p);
        await Commands.handleCommands(temp);
        elements.outputElement.scrollTop = elements.outputElement.scrollHeight;
    },

    sendMessage(message) {
        if (appState.socket && appState.socket.readyState === WebSocket.OPEN) {
            // Display your own message immediately
            Chat.displayOutput(message, "self");

            // Send the message to the server
            appState.socket.send(JSON.stringify({
                message: message
            }));
        } else {
            Chat.displayOutput("Not connected to server", "system");
            if (appState.loggedIn) {
                Chat.displayOutput("Type /reconnect to reconnect to the server", "system");
            }
        }
    },

    handleInput(input) {
        const command = input.trim();

        if (!appState.loggedIn) {
            if (command.toLowerCase() === '/help') {
                Chat.displayOutput("Use the register and login fields above to authenticate.", "server");
            } else {
                Chat.displayOutput("Please register or login first.", "server");
            }
        } else {
            if (command.toLowerCase() === '/help') {
                Chat.displayOutput("==== Available Commands ====", "server");
                Chat.displayOutput("/help       - Show this help message", "server");
                Chat.displayOutput("/logout     - Logout from the chat", "server");
                Chat.displayOutput("/leave      - Disconnect from the server", "server");
                Chat.displayOutput("/reconnect  - Reconnect to the server", "server");
                Chat.displayOutput("/online     - Refresh online users list", "server");
                Chat.displayOutput("/users      - Toggle users list (mobile)", "server");
                Chat.displayOutput("/emojis     - List all available emojis", "server");
                Chat.displayOutput("", "server");
                Chat.displayOutput("Available macros:", "server");
                Chat.displayOutput("(Macros are run by prefixing the call with a '$' symbol)", "server");
                Chat.displayOutput("img(url)   - Outputs an image", "server");
            } else if (command.toLowerCase() === '/logout') {
                Auth.logout();
            } else if (command.toLowerCase() === '/leave') {
                Connection.disconnect();
            } else if (command.toLowerCase() === '/reconnect') {
                Connection.reconnect();
            } else if (command.toLowerCase() === '/online') {
                Members.fetchOnlineMembers();
                Chat.displayOutput("Refreshing online users list...", "system");
            } else if (command.toLowerCase() === '/users') {
                if (appState.isMobile) {
                    if (elements.membersList.classList.contains('mobile-shown')) {
                        elements.membersList.classList.remove('mobile-shown');
                    } else {
                        elements.membersList.classList.add('mobile-shown');
                    }
                }
            } else if (command.toLowerCase() === '/emojis') {
                Chat.displayOutput("==== Available Emojis ====", "server");
                for (const name in config.emojiTable.emojis) {
                    Chat.displayOutput(`${name}: :${name}:`, "server");
                }
            } else {
                // Regular chat message - send to WebSocket
                Chat.sendMessage(command);
            }
        }
    },

    setupEventListeners() {
        elements.sendButton.addEventListener('click', function () {
            const userInput = elements.inputElement.value.trim();
            if (userInput) {
                Chat.handleInput(userInput);
                elements.inputElement.value = '';
            }
        });

        elements.inputElement.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const userInput = elements.inputElement.value.trim();
                if (userInput) {
                    Chat.handleInput(userInput);
                    elements.inputElement.value = '';
                }
            }
        });

        elements.inputElement.addEventListener('paste', async (event) => {
            if (appState.isUploadingFile) {
                event.preventDefault();
                return;
            }

            const items = (event.clipboardData || event.originalEvent.clipboardData).items;

            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    try {
                        appState.isUploadingFile = true;

                        const url = await Chat.uploadImageToServer(file);
                        const imgTag = `$img(${url})`;
                        elements.inputElement.value += imgTag;
                    } catch (error) {
                        console.error('Image upload failed: ', error);
                        this.displayOutput('Image upload failed: ' + error, "error");
                    } finally {
                        appState.isUploadingFile = false;
                    }
                }
            }
        });

        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "visible") {
                appState.isInWindow = true;
                document.title = "Piratchat";
            } else {
                appState.isInWindow = false;
            }
        });
    },

    async uploadImageToServer(file) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('https://chat.piraterna.org/upload.php', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Image upload failed');
        }

        const result = await response.json();
        return result.url;
    }
};

// ---------------------- Application Initialization ----------------------
async function initializeApp() {
    // Initialize mobile view
    MobileView.init();

    // Set up all event listeners
    MobileView.setupEventListeners();
    Auth.setupEventListeners();
    Chat.setupEventListeners();

    // inject my propaganda
    console.log("=== Frontend written by Kevin <kevin@piraterna.org> and backend by Splexas <splexas@piraterna.org> (special thanks to claude.ai lmao)===");
    console.log(" - https://piraterna.org");

    // Setup marked (markdown parser)
    marked.use(markedEmoji(config.emojiTable));

}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);
