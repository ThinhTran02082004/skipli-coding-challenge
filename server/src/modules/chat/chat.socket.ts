import { Server as SocketIOServer, Socket } from 'socket.io';
import { db } from '../../core/config/firebase';
import { ChatMessage } from '../../core/types';

// hàm evnt trao đổi tin nhắn thời gian thực qua socket.io
export function setupSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // xử lý sự kiện người dùng tham gia phòng chat
    socket.on('join_room', (room: string) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room: ${room}`);
    });

    // xử lý sự kiện gửi tin nhắn mới và phát tín hiệu cho các socket liên quan
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

        // lưu tin nhắn vào csdl firestore
        await messageRef.set(newMessage);

        // phát tín hiệu nhận tin nhắn mới thời gian thực cho toàn hệ thống
        io.emit('receive_message', newMessage);
      } catch (error: unknown) {
        console.error('Error handling socket send_message:', error);
      }
    });

    // xử lý truy vấn lấy lịch sử hội thoại giữa giảng viên và học sinh
    socket.on('get_history', async (data: { phone1: string; phone2: string }) => {
      try {
        const studentPhone = data.phone2 === 'INSTRUCTOR_GENERAL' ? data.phone1 : data.phone2;

        // truy vấn các tin nhắn do học sinh gửi
        const snapshot1 = await db
          .collection('messages')
          .where('senderPhone', '==', studentPhone)
          .get();

        // truy vấn các tin nhắn gửi đến học sinh
        const snapshot2 = await db
          .collection('messages')
          .where('receiverPhone', '==', studentPhone)
          .get();

        const messagesMap = new Map<string, ChatMessage>();
        snapshot1.forEach((doc) => messagesMap.set(doc.id, doc.data() as ChatMessage));
        snapshot2.forEach((doc) => messagesMap.set(doc.id, doc.data() as ChatMessage));

        // sắp xếp danh sách tin nhắn theo thứ tự thời gian tăng dần
        const messages: ChatMessage[] = Array.from(messagesMap.values());
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // phản hồi danh sách lịch sử tin nhắn về cho người dùng
        socket.emit('chat_history', { studentPhone, messages });
      } catch (error: unknown) {
        console.error('Error fetching chat history:', error);
      }
    });

    // lắng nghe sự kiện khi client ngắt kết nối
    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
}
