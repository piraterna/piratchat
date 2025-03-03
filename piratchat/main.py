from aiohttp import web
from routes import register, login, logout, get_online, get_user, wshandler
from routes import handle_sessions, disconnect_ws_clients

app = web.Application()

app.add_routes(
    [
<<<<<<< HEAD
        web.post("/api/register", register),
        web.post("/api/login", login),
        web.get("/api/logout", logout),
        web.get("/api/online", get_online),
        web.get("/api/user/{username}", get_user),
=======
        web.post("/register", register),
        web.post("/login", login),
        web.get("/logout", logout),
        web.get("/online", get_online),
        web.get("/user/{username}", get_user),
>>>>>>> 99388879e988d7efc13d3a28b172d21eaea1bdb6
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
    web.run_app(app, host="0.0.0.0", port=7777)
