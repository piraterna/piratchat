# Real-time Chat Application

A lightweight, real-time chat application built with Python using the aiohttp framework. This application provides user registration, authentication, and real-time messaging capabilities through WebSockets.

## Features

- User registration and authentication
- Session management with automatic expiration
- Real-time messaging via WebSockets
- Online user tracking
- Event notifications for user join/leave events

## Architecture

The application is built using:
- **aiohttp**: Asynchronous HTTP client/server framework
- **SQLite**: Lightweight database for user information storage
- **WebSockets**: For real-time bidirectional communication

## API Endpoints

### Authentication

#### `POST /api/register`
Register a new user.

**Request Body:**
```json
{
  "username": "johndoe"
}
```

**Responses:**
- `201 Created`: User successfully registered with a key
- `400 Bad Request`: Invalid username format (must be alphanumeric and max 32 characters)
- `409 Conflict`: Username already exists
- `422 Unprocessable Entity`: Invalid request format

#### `POST /api/login`
Authenticate with a user key.

**Request Body:**
```json
{
  "key": "user_key_here"
}
```

**Responses:**
- `200 OK`: Successfully authenticated, sets a session cookie
- `401 Unauthorized`: Invalid key
- `422 Unprocessable Entity`: Invalid request format

#### `GET /api/logout`
End the current user session.

**Responses:**
- `200 OK`: Session terminated successfully

### User Information

#### `GET /api/online`
Retrieve a list of currently online users.

**Responses:**
- `200 OK`: Returns list of online users
- `401 Unauthorized`: Session invalid or expired
- `422 Unprocessable Entity`: Missing session cookie

#### `GET /api/user/{username}`
Get information about a specific user. Use `@me` to get information about the current user.

**Responses:**
- `200 OK`: Returns user information
- `401 Unauthorized`: Session invalid or expired
- `422 Unprocessable Entity`: Missing session cookie
- `501 Not Implemented`: User lookup not implemented (except for `@me`)

### WebSocket Communication

#### `GET /ws`
Connect to the WebSocket server for real-time messaging.

**Events:**
- `join`: Sent when a user connects to the chat
- `leave`: Sent when a user disconnects from the chat
- `message`: Chat message from a user

**Message Format (Send):**
```json
{
  "message": "Hello, world!"
}
```

**Message Format (Receive):**
```json
{
  "message": "Hello, world!",
  "author": "johndoe"
}
```

**Acknowledgment Format:**
When a message is sent by a client, the server sends an acknowledgment back to the sender:

**Success Acknowledgment:**
```json
{
  "status": true
}
```

**Error Acknowledgment:**
```json
{
  "status": false,
  "code": "message_too_long"
}
```

Possible error codes:
- `message_too_long`: Message exceeds the 300 character limit

**Event Format:**
```json
{
  "event": "join|leave",
  "username": "johndoe"
}
```

**Responses:**
- `101 Switching Protocols`: WebSocket connection established
- `401 Unauthorized`: Session invalid or expired
- `409 Conflict`: User already has an active WebSocket connection
- `422 Unprocessable Entity`: Missing session cookie

## Session Management

- Sessions expire after 1 hour of inactivity
- Each user can have only one active WebSocket connection at a time
- Sessions are automatically cleaned up by a background task

## Database Structure

The application uses SQLite to store user information:
- `username`: Unique user identifier (alphanumeric, max 32 characters)
- `key`: Authentication key for the user

## Running the Application

1. Ensure you have the required dependencies installed:
   ```
   pip3 install -r requirements.txt 
   ```

2. Start the server:
   ```
   python3 main.py
   ```

3. The server will start on `0.0.0.0:7777`

### Production Deployment

For production deployment, the application should be run with SSL/TLS certificates to ensure secure communication:

1. **Using with Nginx as a Reverse Proxy (Recommended)**:
   
   The production service at `chat.piraterna.org` is proxied using Nginx which handles the SSL/TLS termination. This setup allows:
   - Proper SSL/TLS certificate management
   - WebSocket protocol upgrade handling
   - Additional security headers
   - Load balancing if needed

   Example Nginx configuration for WebSocket proxying:
   ```nginx
   server {
       listen 443 ssl;
       server_name chat.piraterna.org;

       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/private.key;

       location / {
           proxy_pass http://localhost:7777;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

2. **Direct SSL Configuration**:
   
   Alternatively, the application can be run with SSL directly:
   ```python
   ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
   ssl_context.load_cert_chain('certificate.crt', 'private.key')
   web.run_app(app, host="0.0.0.0", port=7777, ssl_context=ssl_context)
   ```

   This requires modifying the `main.py` file to include SSL context configuration.

## Security Considerations

- Username validation ensures only alphanumeric characters are accepted
- Session keys are cryptographically secure 32-character strings
- Inactive sessions are automatically expired and cleaned up
- WebSocket connections are properly closed during server shutdown
- **SSL/TLS encryption** is essential in production to secure data transmission
- CORS headers should be configured appropriately in production
