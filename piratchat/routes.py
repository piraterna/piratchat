import aiohttp
from aiohttp import web
import json
from database import Database

import secrets
import string

from enum import Enum
import asyncio
from datetime import datetime, timedelta
import re


class HTTPStatusCode(Enum):
    OK = 200
    CREATED = 201
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    CONFLICT = 409
    UNPROCESSABLE_ENTITY = 422
    INTERNAL_SERVER_ERROR = 500
    NOT_IMPLEMENTED = 501


DB = Database("db.sqlite")

# {"key123": {"expiration_time": datetime.obj, "username": "johndoe"}}
SESSIONS: dict = {}
SESSION_EXPIRATION_TIME = timedelta(hours=1)
SESSION_ITERATION_DELAY_SECONDS: int = 1

WS_CLIENTS: dict = {}


async def disconnect_ws_clients():
    print("Disconnecting all WebSocket clients...")
    for session_key, ws in list(WS_CLIENTS.items()):
        if not ws.closed:
            await ws.close()
        WS_CLIENTS.pop(session_key, None)
    print("All WebSocket clients disconnected.")


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

    # check the length of queried username
    if len(username) > 32:
        return web.Response(status=HTTPStatusCode.BAD_REQUEST.value)

    if not re.match(r"^[a-zA-Z0-9]+$", username):
        return web.Response(status=HTTPStatusCode.BAD_REQUEST.value)

    print("registering username:", username)

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

    # check if the user has already got a session created, but hasnt connected to it via ws
    for session_key, client in SESSIONS.items():
        if client["username"] == username:
            resp = web.Response(status=HTTPStatusCode.OK.value)
            resp.set_cookie(
                "session",
                session_key,
                expires=client["expiration_time"].strftime("%a, %d %b %Y %H:%M:%S GMT"),
            )
            return resp

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


async def get_online(request: web.Request) -> web.Response:
    session_key = request.cookies.get("session")
    if not session_key:
        return web.Response(status=HTTPStatusCode.UNPROCESSABLE_ENTITY.value)

    client = SESSIONS.get(session_key, None)
    if not client:
        return web.Response(status=HTTPStatusCode.UNAUTHORIZED.value)

    resp: dict = {"online_clients": []}
    for session_key in WS_CLIENTS.keys():
        client = SESSIONS.get(session_key, None)
        if client:
            resp["online_clients"].append(client["username"])

    return web.Response(text=json.dumps(resp), status=HTTPStatusCode.OK.value)


async def get_user(request: web.Request) -> web.Response:
    session_key = request.cookies.get("session")
    if not session_key:
        return web.Response(status=HTTPStatusCode.UNPROCESSABLE_ENTITY.value)

    client = SESSIONS.get(session_key, None)
    if not client:
        return web.Response(status=HTTPStatusCode.UNAUTHORIZED.value)

    username: str = request.match_info.get("username")
    print("get_user:", username)

    # special username for `self`
    if username == "@me":
        return web.Response(
            status=HTTPStatusCode.OK.value,
            text=json.dumps({"username": client["username"]}),
        )

    # TODO: find the user from the database and return stuff about it
    return web.Response(HTTPStatusCode.NOT_IMPLEMENTED.value)


async def broadcast(message: str, exclude_session_key=None):
    for session_key, ws_client in WS_CLIENTS.items():
        if exclude_session_key != session_key:
            await ws_client.send_str(message)

async def wshandler(request: web.Request) -> web.WebSocketResponse | web.Response:
    print("ws cookies:", request.cookies)
    session_key = request.cookies.get("session")

    if not session_key:
        return web.Response(status=HTTPStatusCode.UNPROCESSABLE_ENTITY.value)

    client = SESSIONS.get(session_key, None)
    if not client:
        return web.Response(status=HTTPStatusCode.UNAUTHORIZED.value)

    # check if the user has already connected (websocket)
    for connected_session_key in WS_CLIENTS.keys():
        session = SESSIONS.get(connected_session_key, None)
        if session and session["username"] == client["username"]:
            print("Client is connected to the websocket chat, returning CONFLICT")
            return web.Response(status=HTTPStatusCode.CONFLICT.value)

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

    """
    Consideration: if /logout route is triggered while the client is connected to the websocket, disconnect it? 
    """

    async for msg in ws:
        print("ws data:", msg.data)
        if msg.type == aiohttp.WSMsgType.TEXT:
            data: dict = json.loads(msg.data)

            # expect only one field: message
            message: str = data.get("message")
            if not message or len(data.items()) != 1:
                print("malformed ws data")
                break

            if len(message) > 300:
                print("message too long")
                await ws.send_str(
                    json.dumps({"status": False, "code": "message_too_long"})
                )
                continue

            print(f"Received message: {message} from {client['username']}")
            forwarded: str = json.dumps(
                {"message": message, "author": client["username"]}
            )
            print("forwarded data:", forwarded)
            print("forwarding data to: ", WS_CLIENTS.values())

            await broadcast(forwarded, exclude_session_key=session_key)
            await ws.send_str(json.dumps({"status": True}))

        elif msg.type == aiohttp.WSMsgType.ERROR:
            print(f"websocket connection closed with exception {ws.exception()}")

    print("websocket connection closed")

    WS_CLIENTS.pop(session_key, None)

    # announce the leave
    leave_announcement: str = json.dumps(
        {"event": "leave", "username": client["username"]}
    )
    for ws_client in WS_CLIENTS.values():
        await ws_client.send_str(leave_announcement)

    return ws
