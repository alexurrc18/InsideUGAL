import pytest

from app.api.websocket_manager import NotificationManager


class FakeWebSocket:
    def __init__(self, *, fail_send: bool = False) -> None:
        self.accepted = False
        self.fail_send = fail_send
        self.messages: list[dict] = []

    async def accept(self) -> None:
        self.accepted = True

    async def send_json(self, payload: dict) -> None:
        if self.fail_send:
            raise RuntimeError("closed")
        self.messages.append(payload)


@pytest.mark.asyncio
async def test_connect_stores_multiple_connections_for_profile():
    manager = NotificationManager()
    first = FakeWebSocket()
    second = FakeWebSocket()

    await manager.connect("profile-1", first)
    await manager.connect("profile-1", second)

    assert first.accepted
    assert second.accepted
    assert manager.active_connections["profile-1"] == [first, second]


@pytest.mark.asyncio
async def test_send_notification_to_user_sends_to_all_profile_connections():
    manager = NotificationManager()
    first = FakeWebSocket()
    second = FakeWebSocket()
    payload = {"id": 1, "title": "Salut"}

    await manager.connect("profile-1", first)
    await manager.connect("profile-1", second)
    await manager.send_notification_to_user("profile-1", payload)

    assert first.messages == [payload]
    assert second.messages == [payload]


@pytest.mark.asyncio
async def test_send_notification_to_user_removes_failed_connections():
    manager = NotificationManager()
    failed = FakeWebSocket(fail_send=True)
    active = FakeWebSocket()
    payload = {"id": 1}

    await manager.connect("profile-1", failed)
    await manager.connect("profile-1", active)
    await manager.send_notification_to_user("profile-1", payload)

    assert active.messages == [payload]
    assert manager.active_connections["profile-1"] == [active]


def test_disconnect_removes_empty_profile_bucket():
    manager = NotificationManager()
    websocket = FakeWebSocket()
    manager.active_connections["profile-1"] = [websocket]

    manager.disconnect("profile-1", websocket)

    assert "profile-1" not in manager.active_connections
