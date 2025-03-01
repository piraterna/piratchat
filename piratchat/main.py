from aiohttp import web
from routes import register, login, logout, wshandler
from routes import handle_sessions


async def index(request):
    return web.FileResponse("test.html")


app = web.Application()
app.add_routes(
    [
        web.post("/register", register),
        web.post("/login", login),
        web.get("/logout", logout),
        web.get("/ws", wshandler),
        web.get("/", index),
    ]
)

app.on_startup.append(lambda app: handle_sessions())

if __name__ == "__main__":
    web.run_app(app)
