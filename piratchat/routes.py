import aiohttp
from aiohttp import web
import json
from database import Database

from enum import Enum


class HTTPStatusCode(Enum):
    OK = 200
    CREATED = 201
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    CONFLICT = 409
    UNPROCESSABLE_ENTITY = 422
    INTERNAL_SERVER_ERROR = 500


db = Database("db.sqlite")


async def register(request: web.Request) -> web.Response:
    json: dict = await request.json()
    print("json:", json)

    # check if we have only one field - username
    username: str = json.get("username")
    if not username or len(json.items()) != 1:
        return web.Response(status=HTTPStatusCode.UNPROCESSABLE_ENTITY.value)

    print("queried username:", username)

    # check if username is occupied in database
    if await db.get_by_username(username):
        return web.Response(status=HTTPStatusCode.CONFLICT.value)

    key = await db.add_username(username)
    print(key)

    return web.json_response({"key": key}, status=HTTPStatusCode.CREATED.value)


async def login(request: web.Request) -> web.Response:
    json: dict = await request.json()
    print("json:", json)

    key: str = json.get("key")
    if not key or len(json.items()) != 1:
        return web.Response(status=HTTPStatusCode.UNPROCESSABLE_ENTITY.value)

    user = await db.get_by_key(key)
    print("user:", user)

    if not user:
        return web.Response(status=HTTPStatusCode.UNAUTHORIZED.value)

    # TODO: make a session key and set cookies to response
    return web.Response(status=HTTPStatusCode.OK.value)


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
