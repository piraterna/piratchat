from aiohttp import web
from routes import register, login, wshandler
from routes import handle_sessions

app = web.Application()
app.add_routes(
    [
        web.post("/register", register),
        web.post("/login", login),
        web.get("/ws", wshandler),
    ]
)

app.on_startup.append(lambda app: handle_sessions())

if __name__ == "__main__":
    web.run_app(app)
