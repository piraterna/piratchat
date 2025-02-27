import aiohttp
from aiohttp import web


async def register(request: web.Request) -> web.Response:
    json = await request.json()
    print("json:", json)
    return web.Response(text="hi")


async def login(request: web.Request) -> web.Response:
    json = await request.json()
    print("json:", json)
    return web.Response(text="hi")


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


app = web.Application()
app.add_routes(
    [
        web.post("/register", register),
        web.post("/login", login),
        web.get("/ws", wshandler),
    ]
)

if __name__ == "__main__":
    web.run_app(app)
