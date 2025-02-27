from aiohttp import web
from routes import register, login, wshandler

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
