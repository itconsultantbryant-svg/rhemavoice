import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close()
            return
        if not await self._is_participant():
            await self.close()
            return
        self.group = f"chat_{self.conversation_id}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        data = json.loads(text_data)
        body = (data.get("body") or "").strip()
        if not body:
            return
        message = await self._create_message(body)
        await self.channel_layer.group_send(
            self.group,
            {"type": "chat.message", "payload": message},
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({"type": "message", "payload": event["payload"]}))

    @database_sync_to_async
    def _is_participant(self):
        from apps.chat.models import Participant

        return Participant.objects.filter(conversation_id=self.conversation_id, user=self.user).exists()

    @database_sync_to_async
    def _create_message(self, body: str):
        from apps.chat.models import Conversation, Message

        convo = Conversation.objects.get(id=self.conversation_id)
        msg = Message.objects.create(conversation=convo, sender=self.user, body=body)
        convo.save(update_fields=["updated_at"])
        return {
            "id": str(msg.id),
            "body": msg.body,
            "sender_name": self.user.get_full_name() or self.user.get_username(),
            "sender_id": str(self.user.id),
            "created_at": msg.created_at.isoformat(),
        }


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close()
            return
        self.group = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def notify(self, event):
        await self.send(text_data=json.dumps({"type": "notification", "payload": event["payload"]}))
