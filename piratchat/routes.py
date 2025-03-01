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
SESSION_KEYS: list = []
SESSION_EXPIRATION_TIME = timedelta(seconds=10)  # timedelta(hours=1)
SESSION_ITERATION_DELAY_SECONDS: int = 1


async def clean_expired_sessions():
    while True:
        global SESSION_KEYS
        SESSION_KEYS = [
            (key, expiration_time)
            for key, expiration_time in SESSION_KEYS
            if expiration_time > datetime.now()
        ]
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

    resp = web.Response(status=HTTPStatusCode.OK.value)

    session_key: str = await generate_session_key()
    expiration_time = datetime.now() + SESSION_EXPIRATION_TIME
    SESSION_KEYS.append((session_key, expiration_time))
    resp.set_cookie(
        "session",
        session_key,
        expires=expiration_time.strftime("%a, %d %b %Y %H:%M:%S GMT"),
    )

    return resp


async def wshandler(request: web.Request) -> web.WebSocketResponse:
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    async for msg in ws:
        print("ws data:", msg.data)
        if msg.type == aiohttp.WSMsgType.TEXT:
            await ws.send_str("hello world")
        elif msg.type == aiohttp.WSMsgType.ERROR:
            print(f"websocket connection closed with exception {ws.exception()}")

    print("websocket connection closed")
    return ws
