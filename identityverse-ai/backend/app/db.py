"""
Database access layer.

WHY TinyDB instead of MongoDB right now:
MongoDB needs a running server or an Atlas cluster + network access, which
is friction you don't want while you're still building features. TinyDB is
a pure-Python, file-backed, document store with the same basic shape
(insert / find / update on JSON documents), so the rest of the codebase
(routers, services) never touches Mongo-specific syntax directly -- it only
calls the methods on `Collection` below.

SWAPPING TO REAL MONGODB FOR PRODUCTION (~5 line change):
    from pymongo import MongoClient
    client = MongoClient(settings.MONGO_URI)
    mongo_db = client["identityverse"]

    class Collection:
        def __init__(self, name): self.col = mongo_db[name]
        def insert_many(self, docs): self.col.insert_many(docs)
        def all(self): return list(self.col.find({}, {"_id": 0}))
        def find(self, **kwargs): return list(self.col.find(kwargs, {"_id": 0}))
        def find_one(self, **kwargs): return self.col.find_one(kwargs, {"_id": 0})
        def update_one(self, query, update): self.col.update_one(query, {"$set": update})
        def truncate(self): self.col.delete_many({})

Everything else in the app stays identical.
"""
from tinydb import TinyDB, Query
from tinydb.storages import JSONStorage
from tinydb.middlewares import CachingMiddleware
from app import config

# CachingMiddleware keeps the parsed JSON in memory and only writes to disk
# every ~1000 operations (or on close) instead of re-reading and re-parsing
# the entire file from scratch on every single query. Without this, each
# read (find/find_one/all) re-parses the whole multi-table JSON file from
# disk -- harmless with a handful of records, but with 10,000+ audit log
# rows and dozens of parallel requests (e.g. the Command Center's trend
# chart fetching 15-40 timelines at once), that overhead compounds fast.
_db = TinyDB(config.TINYDB_PATH, storage=CachingMiddleware(JSONStorage))


class Collection:
    def __init__(self, name: str):
        self.table = _db.table(name)
        self.Q = Query()

    def insert_many(self, docs: list[dict]):
        self.table.insert_multiple(docs)

    def insert_one(self, doc: dict):
        self.table.insert(doc)

    def all(self) -> list[dict]:
        return self.table.all()

    def find(self, **kwargs) -> list[dict]:
        if not kwargs:
            return self.table.all()
        cond = None
        for k, v in kwargs.items():
            c = self.Q[k] == v
            cond = c if cond is None else (cond & c)
        return self.table.search(cond)

    def find_one(self, **kwargs) -> dict | None:
        results = self.find(**kwargs)
        return results[0] if results else None

    def update_one(self, match: dict, update: dict):
        cond = None
        for k, v in match.items():
            c = self.Q[k] == v
            cond = c if cond is None else (cond & c)
        self.table.update(update, cond)

    def truncate(self):
        self.table.truncate()

    def count(self) -> int:
        return len(self.table)


# Collections used across the app -- mirrors the MongoDB collection names
# from the problem statement so the swap above is literally drop-in.
users = Collection("users")
identity_snapshots = Collection("identity_snapshots")
audit_logs = Collection("audit_logs")
role_mappings = Collection("role_mappings")
offboarding_records = Collection("offboarding_records")
unified_identities = Collection("unified_identities")  # output of resolver + risk scoring


def flush():
    """CachingMiddleware buffers writes in memory and only periodically
    flushes to disk. Call this after bulk write operations (data
    generation, pipeline recompute) so a server restart -- e.g. uvicorn
    --reload picking up a code change -- doesn't lose data that was only
    ever in memory."""
    _db.storage.flush()
