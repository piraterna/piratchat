import aiosqlite
import sqlite3
import time
import asyncio
from hashlib import sha256

class Database:
    def __init__(self, file: str) -> None:
        self.file = file
        self.create_tables()

    def create_tables(self) -> None:
        conn = sqlite3.connect(self.file)
        cursor = conn.cursor()
        cursor.execute("CREATE TABLE IF NOT EXISTS keys(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, key TEXT NOT NULL)")
        conn.commit()
        conn.close()

    async def get_by_username(self, username: str):
        async with aiosqlite.connect(self.file) as db:
            async with db.execute("SELECT * FROM keys WHERE username = ?", (username,)) as cursor:
                return await cursor.fetchone()

    async def add_username(self, username: str) -> str:
        ''' Returns a key '''

        key = await asyncio.to_thread(self.gen_hash_username, username)
        print("key:", key)

        hashed = await asyncio.to_thread(self.gen_hash, key)
        print("hashed:", hashed)

        async with aiosqlite.connect(self.file) as db:
            await db.execute("INSERT INTO keys (username, key) VALUES (?, ?)", (username, hashed))
            await db.commit()

        return key

    async def get_by_key(self, key: str):
        hashed = await asyncio.to_thread(self.gen_hash, key)
        print("hashed:", hashed)

        async with aiosqlite.connect(self.file) as db:
            async with db.execute("SELECT * FROM keys WHERE key = ?", (hashed,)) as cursor:
                return await cursor.fetchone()

    def gen_hash_username(self, username: str) -> str:
        hasher = sha256()
        hasher.update((str(time.time_ns()) + username).encode())
        return hasher.hexdigest()

    def gen_hash(self, data: str) -> str:
        hasher = sha256()
        hasher.update(data.encode())
        return hasher.hexdigest()

