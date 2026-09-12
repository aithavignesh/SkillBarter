from typing import Dict, List, Any
import json
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Map user_id to list of active WebSockets (allows multiple tabs/devices)
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, data: Dict[str, Any], user_id: int):
        if user_id in self.active_connections:
            dead_sockets = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(data))
                except Exception:
                    dead_sockets.append(connection)
            for dead in dead_sockets:
                self.disconnect(user_id, dead)

    async def broadcast(self, data: Dict[str, Any]):
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(data, user_id)

ws_manager = ConnectionManager()
