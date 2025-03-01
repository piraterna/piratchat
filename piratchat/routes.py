import aiohttp
from aiohttp import web
import json
from database import Database

import secrets
import string

from enum import Enum
import asyncio
from datetime import datetime, timedelta


class HTTPStatusCode(Enum):
    OK = 200
    CREATED = 201
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    CONFLICT = 409
    UNPROCESSABLE_ENTITY = 422
    INTERNAL_SERVER_ERROR = 500


DB = Database("db.sqlite")

# {"key123": {"expiration_time": datetime.obj, "username": "johndoe"}}
SESSIONS: dict = {}
SESSION_EXPIRATION_TIME = timedelta(seconds=30)  # timedelta(hours=1)
SESSION_ITERATION_DELAY_SECONDS: int = 1

WS_CLIENTS: dict = {}


async def clean_expired_sessions():
    while True:
        global SESSIONS

        for key, value in SESSIONS.copy().items():
            if value["expiration_time"] < datetime.now():
                print("popping:", key)
                SESSIONS.pop(key, None)

        await asyncio.sleep(SESSION_ITERATION_DELAY_SECONDS)


async def handle_sessions():
    asyncio.create_task(clean_expired_sessions())


async def generate_session_key(length=32) -> str:
    alphabet = string.ascii_letters + string.digits
    session_key = "".join(secrets.choice(alphabet) for _ in range(length))
    return session_key


async def register(request: web.Request) -> web.Response:
    json: dict = await request.json()
    print("json:", json)

    # check if we have only one field - username
    username: str = json.get("username")
    if not username or len(json.items()) != 1:
        return web.Response(status=HTTPStatusCode.UNPROCESSABLE_ENTITY.value)

    print("queried username:", username)

    # check if username is occupied in database
    if await DB.get_by_username(username):
        return web.Response(status=HTTPStatusCode.CONFLICT.value)

    key = await DB.add_username(username)
    print(key)

    return web.json_response({"key": key}, status=HTTPStatusCode.CREATED.value)


async def login(request: web.Request) -> web.Response:
    json: dict = await request.json()
    print("json:", json)

    key: str = json.get("key")
    if not key or len(json.items()) != 1:
        return web.Response(status=HTTPStatusCode.UNPROCESSABLE_ENTITY.value)

    user = await DB.get_by_key(key)
    print("user:", user)

    if not user:
        return web.Response(status=HTTPStatusCode.UNAUTHORIZED.value)

    db_index, username, hashed_key = user

    resp = web.Response(status=HTTPStatusCode.OK.value)

    session_key: str = await generate_session_key()
    expiration_time = datetime.now() + SESSION_EXPIRATION_TIME

    SESSIONS[session_key] = {"expiration_time": expiration_time, "username": username}

    resp.set_cookie(
        "session",
        session_key,
        expires=expiration_time.strftime("%a, %d %b %Y %H:%M:%S GMT"),
    )

    return resp


async def logout(request: web.Request) -> web.Response:
    print("Handling logout")

    session_key = request.cookies.get("session")
    if session_key:
        SESSIONS.pop(session_key, None)

    # stay mysterious?
    return web.Response(status=HTTPStatusCode.OK.value)


async def wshandler(request: web.Request) -> web.WebSocketResponse | web.Response:
    print("ws cookies:", request.cookies)
    session_key = request.cookies.get("session")

    if not session_key:
        return web.Response(status=HTTPStatusCode.UNPROCESSABLE_ENTITY.value)

    client = SESSIONS.get(session_key, None)
    if not client:
        return web.Response(status=HTTPStatusCode.UNAUTHORIZED.value)

    print("Retrieved WS client object:", client)
    print("Username:", client["username"])

    ws = web.WebSocketResponse()
    await ws.prepare(request)

    # announce the join
    join_announcement: str = json.dumps(
        {"event": "join", "username": client["username"]}
    )
    for ws_client in WS_CLIENTS.values():
        await ws_client.send_str(join_announcement)

    WS_CLIENTS[session_key] = ws

    async for msg in ws:
        print("ws data:", msg.data)
        if msg.type == aiohttp.WSMsgType.TEXT:
            data: dict = json.loads(msg.data)

            # expect only one field: message
            message: str = data.get("message")
            if not message or len(data.items()) != 1:
                print("malformed ws data")
                break

            print(f"Received message: {message} from {client['username']}")
            forwarded: str = json.dumps(
                {"message": message, "author": client["username"]}
            )
            print("forwarded data:", forwarded)
            print("forwarding data to: ", WS_CLIENTS.values())

            # forward the message
            for ws_client in WS_CLIENTS.values():
                print("wsclient:", ws_client)
                if ws_client != ws:
                    await ws_client.send_str(forwarded)

        elif msg.type == aiohttp.WSMsgType.ERROR:
            print(f"websocket connection closed with exception {ws.exception()}")

    print("websocket connection closed")

    WS_CLIENTS.pop(session_key, None)

    # announce the leave
    leave_announcement: str = json.dumps(
        {"event": "leave", "username": client["username"]}
    )
    for ws_client in WS_CLIENTS.values():
        await ws_client.send_str(join_announcement)

    return ws
