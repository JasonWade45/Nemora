"""
Offline Synchronization Service

Architecture for field-first offline capability.
Uses local-first approach with eventual consistency.
"""
import json
import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from uuid import uuid4

import redis.asyncio as redis

from app.core.config import settings


class SyncOperationType(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


class SyncEntityType(str, Enum):
    VISIT = "VISIT"
    FOLLOW_UP = "FOLLOW_UP"
    DOCTOR = "DOCTOR"
    REP_DOCTOR = "REP_DOCTOR"
    CHECK_IN = "CHECK_IN"
    CHECK_OUT = "CHECK_OUT"


@dataclass
class SyncOperation:
    """Represents a single sync operation"""
    id: str = field(default_factory=lambda: str(uuid4()))
    entity_type: SyncEntityType = SyncEntityType.VISIT
    operation: SyncOperationType = SyncOperationType.CREATE
    entity_id: str = ""
    payload: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    retries: int = 0
    last_error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SyncResult:
    """Result of a sync operation"""
    operation_id: str
    success: bool
    server_entity_id: Optional[str] = None
    error: Optional[str] = None
    conflict: bool = False
    server_version: Optional[Dict[str, Any]] = None


class OfflineQueue:
    """
    Redis-backed queue for offline operations.
    Provides persistence and ordering guarantees.
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.queue_key = "offline:sync_queue"
        self.processing_key = "offline:sync_processing"
        self.max_retries = 5

    async def enqueue(self, operation: SyncOperation) -> None:
        """Add operation to sync queue"""
        # Use sorted set with timestamp as score for ordering
        await self.redis.zadd(
            self.queue_key,
            {json.dumps(asdict(operation), default=str): operation.timestamp.timestamp()}
        )

    async def dequeue_batch(self, batch_size: int = 100) -> List[SyncOperation]:
        """Get batch of operations to process"""
        # Use Lua script for atomic move from queue to processing
        lua_script = """
        local ops = redis.call('ZRANGE', KEYS[1], 0, ARGV[1]-1)
        if #ops > 0 then
            redis.call('ZREM', KEYS[1], unpack(ops))
            redis.call('ZADD', KEYS[2], ARGV[2], unpack(ops))
        end
        return ops
        """
        script = self.redis.register_script(lua_script)
        ops_json = await script(
            keys=[self.queue_key, self.processing_key],
            args=[batch_size, datetime.utcnow().timestamp()]
        )
        return [SyncOperation(**json.loads(op)) for op in ops_json]

    async def requeue(self, operation: SyncOperation) -> None:
        """Requeue operation for retry"""
        operation.retries += 1
        operation.timestamp = datetime.utcnow()
        await self.enqueue(operation)

    async def complete(self, operation: SyncOperation) -> None:
        """Mark operation as completed (remove from processing)"""
        await self.redis.zrem(self.processing_key, json.dumps(asdict(operation), default=str))

    async def get_queue_size(self) -> int:
        return await self.redis.zcard(self.queue_key)

    async def get_processing_size(self) -> int:
        return await self.redis.zcard(self.processing_key)


class SyncConflictResolver:
    """
    Handles conflict resolution for sync operations.
    Implements last-write-wins with manual override for critical entities.
    """

    @staticmethod
    def resolve_visit_conflict(
        local: Dict[str, Any],
        server: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Resolve visit conflicts - prefer server for verified data"""
        # Server wins for verified check-ins
        if server.get("is_verified") and not local.get("is_verified"):
            return server

        # Local wins for newer check-out
        local_checkout = local.get("checked_out_at")
        server_checkout = server.get("checked_out_at")

        if local_checkout and (not server_checkout or local_checkout > server_checkout):
            return local

        return server

    @staticmethod
    def resolve_follow_up_conflict(
        local: Dict[str, Any],
        server: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Resolve follow-up conflicts"""
        # Completed locally wins
        if local.get("status") == "COMPLETED" and server.get("status") != "COMPLETED":
            return local
        return server

    @staticmethod
    def resolve_doctor_conflict(
        local: Dict[str, Any],
        server: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Resolve doctor conflicts - server wins for location data"""
        merged = server.copy()
        # Preserve local notes if any
        if local.get("notes"):
            merged["notes"] = local["notes"]
        return merged


class OfflineSyncService:
    """
    Main offline synchronization service.
    Coordinates queue management, conflict resolution, and server sync.
    """

    def __init__(self, redis_client: redis.Redis):
        self.queue = OfflineQueue(redis_client)
        self.resolver = SyncConflictResolver()
        self._running = False
        self._sync_interval = 30  # seconds

    async def queue_operation(
        self,
        entity_type: SyncEntityType,
        operation: SyncOperationType,
        entity_id: str,
        payload: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SyncOperation:
        """Queue a new sync operation"""
        op = SyncOperation(
            entity_type=entity_type,
            operation=operation,
            entity_id=entity_id,
            payload=payload,
            metadata=metadata or {},
        )
        await self.queue.enqueue(op)
        return op

    async def process_queue(
        self,
        api_client,
        batch_size: int = 50,
    ) -> List[SyncResult]:
        """Process pending sync operations"""
        operations = await self.queue.dequeue_batch(batch_size)
        results = []

        for op in operations:
            try:
                result = await self._sync_operation(op, api_client)
                results.append(result)

                if result.success:
                    await self.queue.complete(op)
                elif result.conflict:
                    # Handle conflict - could notify user
                    await self.queue.complete(op)  # Or requeue with conflict flag
                else:
                    # Requeue for retry
                    op.last_error = result.error
                    if op.retries < self.queue.max_retries:
                        await self.queue.requeue(op)
                    else:
                        await self.queue.complete(op)  # Max retries reached

            except Exception as e:
                op.last_error = str(e)
                if op.retries < self.queue.max_retries:
                    await self.queue.requeue(op)
                else:
                    await self.queue.complete(op)
                results.append(SyncResult(
                    operation_id=op.id,
                    success=False,
                    error=str(e),
                ))

        return results

    async def _sync_operation(
        self,
        operation: SyncOperation,
        api_client,
    ) -> SyncResult:
        """Sync a single operation to server"""
        try:
            if operation.entity_type == SyncEntityType.VISIT:
                return await self._sync_visit(operation, api_client)
            elif operation.entity_type == SyncEntityType.FOLLOW_UP:
                return await self._sync_follow_up(operation, api_client)
            elif operation.entity_type == SyncEntityType.CHECK_IN:
                return await self._sync_check_in(operation, api_client)
            elif operation.entity_type == SyncEntityType.CHECK_OUT:
                return await self._sync_check_out(operation, api_client)
            elif operation.entity_type == SyncEntityType.REP_DOCTOR:
                return await self._sync_rep_doctor(operation, api_client)
            else:
                return SyncResult(
                    operation_id=operation.id,
                    success=False,
                    error=f"Unknown entity type: {operation.entity_type}",
                )

        except Exception as e:
            return SyncResult(
                operation_id=operation.id,
                success=False,
                error=str(e),
            )

    async def _sync_visit(self, operation: SyncOperation, api_client) -> SyncResult:
        """Sync visit operation"""
        if operation.operation == SyncOperationType.CREATE:
            response = await api_client.post("/visits", json=operation.payload)
            if response.is_success:
                data = response.json()
                return SyncResult(operation_id=operation.id, success=True, server_entity_id=data["id"])
            elif response.status_code == 409:
                # Conflict - resolve
                server_data = response.json()
                resolved = self.resolver.resolve_visit_conflict(operation.payload, server_data)
                # Retry with resolved data
                retry_response = await api_client.patch(f"/visits/{server_data['id']}", json=resolved)
                if retry_response.is_success:
                    return SyncResult(operation_id=operation.id, success=True, server_entity_id=server_data["id"], conflict=True)
                return SyncResult(operation_id=operation.id, success=False, error="Conflict resolution failed", conflict=True)
            return SyncResult(operation_id=operation.id, success=False, error=response.text)

        elif operation.operation == SyncOperationType.UPDATE:
            response = await api_client.patch(f"/visits/{operation.entity_id}", json=operation.payload)
            if response.is_success:
                return SyncResult(operation_id=operation.id, success=True, server_entity_id=operation.entity_id)
            return SyncResult(operation_id=operation.id, success=False, error=response.text)

        return SyncResult(operation_id=operation.id, success=False, error="Unsupported operation")

    async def _sync_follow_up(self, operation: SyncOperation, api_client) -> SyncResult:
        """Sync follow-up operation"""
        if operation.operation == SyncOperationType.CREATE:
            response = await api_client.post("/follow-ups", json=operation.payload)
            if response.is_success:
                data = response.json()
                return SyncResult(operation_id=operation.id, success=True, server_entity_id=data["id"])
            return SyncResult(operation_id=operation.id, success=False, error=response.text)

        elif operation.operation == SyncOperationType.UPDATE:
            response = await api_client.patch(f"/follow-ups/{operation.entity_id}", json=operation.payload)
            if response.is_success:
                return SyncResult(operation_id=operation.id, success=True, server_entity_id=operation.entity_id)
            return SyncResult(operation_id=operation.id, success=False, error=response.text)

        return SyncResult(operation_id=operation.id, success=False, error="Unsupported operation")

    async def _sync_check_in(self, operation: SyncOperation, api_client) -> SyncResult:
        """Sync check-in operation"""
        response = await api_client.post(f"/visits/{operation.entity_id}/check-in", json=operation.payload)
        if response.is_success:
            return SyncResult(operation_id=operation.id, success=True)
        return SyncResult(operation_id=operation.id, success=False, error=response.text)

    async def _sync_check_out(self, operation: SyncOperation, api_client) -> SyncResult:
        """Sync check-out operation"""
        response = await api_client.post(f"/visits/{operation.entity_id}/check-out", json=operation.payload)
        if response.is_success:
            return SyncResult(operation_id=operation.id, success=True)
        return SyncResult(operation_id=operation.id, success=False, error=response.text)

    async def _sync_rep_doctor(self, operation: SyncOperation, api_client) -> SyncResult:
        """Sync rep-doctor assignment"""
        if operation.operation == SyncOperationType.CREATE:
            response = await api_client.post(f"/my-doctors/{operation.payload['doctor_id']}", json=operation.payload)
            if response.is_success:
                return SyncResult(operation_id=operation.id, success=True)
        elif operation.operation == SyncOperationType.DELETE:
            response = await api_client.delete(f"/my-doctors/{operation.entity_id}")
            if response.is_success:
                return SyncResult(operation_id=operation.id, success=True)
        return SyncResult(operation_id=operation.id, success=False, error="Unsupported operation")


class LocalStorageManager:
    """
    Manages local data storage for offline use.
    Provides IndexedDB-like interface for web clients.
    """

    def __init__(self, storage: Dict[str, Any]):
        self.storage = storage

    def save(self, key: str, data: Any) -> None:
        """Save data to local storage"""
        self.storage[key] = {
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
            "version": 1,
        }

    def load(self, key: str) -> Optional[Any]:
        """Load data from local storage"""
        entry = self.storage.get(key)
        return entry["data"] if entry else None

    def delete(self, key: str) -> None:
        """Delete data from local storage"""
        self.storage.pop(key, None)

    def get_all_keys(self, prefix: str = "") -> List[str]:
        """Get all keys matching prefix"""
        return [k for k in self.storage.keys() if k.startswith(prefix)]

    def clear_prefix(self, prefix: str) -> None:
        """Clear all keys with prefix"""
        for key in self.get_all_keys(prefix):
            del self.storage[key]


# Global sync service (initialized with Redis)
_offline_sync_service: Optional[OfflineSyncService] = None


async def get_offline_sync_service() -> OfflineSyncService:
    """Get or create offline sync service"""
    global _offline_sync_service
    if _offline_sync_service is None:
        redis_client = redis.from_url(settings.redis_url, decode_responses=True)
        _offline_sync_service = OfflineSyncService(redis_client)
    return _offline_sync_service