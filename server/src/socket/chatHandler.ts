import { Server as SocketIOServer, Socket } from 'socket.io';
import { db } from '../config/firebase';
import { ChatMessage } from '../types';

export function setupSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on('join_room', (room: string) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room: ${room}`);
    });

    socket.on('send_message', async (data: Omit<ChatMessage, 'id' | 'timestamp'>) => {
      try {
        const messageRef = db.collection('messages').doc();
        const newMessage: ChatMessage = {
          id: messageRef.id,
          senderPhone: data.senderPhone,
          receiverPhone: data.receiverPhone,
          senderRole: data.senderRole,
          text: data.text,
          timestamp: new Date().toISOString(),
        };

        await messageRef.set(newMessage);

        io.emit('receive_message', newMessage);
      } catch (error: unknown) {
        console.error('Error handling socket send_message:', error);
      }
    });

    socket.on('get_history', async (data: { phone1: string; phone2: string }) => {
      try {
        const studentPhone = data.phone2 === 'INSTRUCTOR_GENERAL' ? data.phone1 : data.phone2;

        const snapshot1 = await db
          .collection('messages')
          .where('senderPhone', '==', studentPhone)
          .get();

        const snapshot2 = await db
          .collection('messages')
          .where('receiverPhone', '==', studentPhone)
          .get();

        const messagesMap = new Map<string, ChatMessage>();
        snapshot1.forEach((doc) => messagesMap.set(doc.id, doc.data() as ChatMessage));
        snapshot2.forEach((doc) => messagesMap.set(doc.id, doc.data() as ChatMessage));

        const messages: ChatMessage[] = Array.from(messagesMap.values());
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        socket.emit('chat_history', messages);
      } catch (error: unknown) {
        console.error('Error fetching chat history:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
}
