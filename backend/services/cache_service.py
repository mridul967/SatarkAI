import redis
import json
import os
import torch
from typing import Optional, Dict, Any

class CacheService:
    def __init__(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        try:
            self.client = redis.from_url(redis_url)
            print(f"Connected to Redis at {redis_url}")
        except Exception as e:
            print(f"Redis connection failed: {e}")
            self.client = None

    async def get_user_features(self, user_id: str) -> Optional[Dict[str, Any]]:
        if not self.client: return None
        data = self.client.get(f"user:{user_id}:features")
        return json.loads(data) if data else None

    async def get_user_subgraph(self, user_id: str) -> Optional[bytes]:
        if not self.client: return None
        return self.client.get(f"user:{user_id}:subgraph")

    async def set_user_features(self, user_id: str, features: Dict[str, Any], ttl: int = 3600):
        if not self.client: return
        self.client.setex(f"user:{user_id}:features", ttl, json.dumps(features))

    async def set_user_subgraph(self, user_id: str, subgraph_bytes: bytes, ttl: int = 300):
        if not self.client: return
        self.client.setex(f"user:{user_id}:subgraph", ttl, subgraph_bytes)

cache_service = CacheService()
