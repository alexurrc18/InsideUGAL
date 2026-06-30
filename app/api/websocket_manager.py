import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class NotificationManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, profile_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.setdefault(profile_id, []).append(websocket)

    def disconnect(self, profile_id: str, websocket: WebSocket) -> None:
        connections = self.active_connections.get(profile_id)
        if not connections:
            return

        if websocket in connections:
            connections.remove(websocket)

        if not connections:
            self.active_connections.pop(profile_id, None)

    async def send_notification_to_user(self, profile_id: str, notification_data: dict[str, Any]) -> None:
        connections = list(self.active_connections.get(profile_id, []))
        if not connections:
            return

        disconnected: list[WebSocket] = []
        for websocket in connections:
            try:
                await websocket.send_json(notification_data)
            except Exception:
                logger.warning("WebSocket notification delivery failed for profile %s", profile_id)
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(profile_id, websocket)


notification_manager = NotificationManager()
