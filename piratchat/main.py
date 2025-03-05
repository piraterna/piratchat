from aiohttp import web
from routes import register, login, logout, get_online, get_user, wshandler
from routes import handle_sessions, disconnect_ws_clients

import uvloop

app = web.Application()

app.add_routes(
    [
        web.post("/api/register", register),
        web.post("/api/login", login),
        web.get("/api/logout", logout),
        web.get("/api/online", get_online),
        web.get("/api/user/{username}", get_user),
        web.get("/ws", wshandler),
    ]
)


async def on_shutdown(app):
    print("Running shutdown tasks...")
    await disconnect_ws_clients()
    print("WebSocket clients disconnected.")


app.on_startup.append(lambda app: handle_sessions())
app.on_shutdown.append(on_shutdown)

if __name__ == "__main__":
    loop = uvloop.new_event_loop()
    web.run_app(app, host="0.0.0.0", port=7777, loop=loop)
