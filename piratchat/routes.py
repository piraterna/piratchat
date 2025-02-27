import aiohttp
from aiohttp import web
import json
from database import Database

db = Database("db.sqlite")


async def register(request: web.Request) -> web.Response:
    json: dict = await request.json()
    print("json:", json)

    # check if we have only one field - username
    username: str = json.get("username")
    if not username or len(json.items()) != 1:
        return web.Response(status=400)

    print("queried username:", username)

    # check if username is occupied in database
    if await db.get_by_username(username):
        return web.json_response({"error": "Username taken"}, status=400)

    key = await db.add_username(username)
    print(key)

    return web.json_response({"key": key}, status=201)


async def login(request: web.Request) -> web.Response:
    json: dict = await request.json()
    print("json:", json)

    key: str = json.get("key")
    if not key or len(json.items()) != 1:
        return web.Response(status=400)

    user = await db.get_by_key(key)
    print("user:", user)

    if not user:
        return web.Response(status=401)

    # TODO: make a session key and set cookies to response
    return web.Response(status=200)


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
