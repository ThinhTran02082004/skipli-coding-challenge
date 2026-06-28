import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './modules/auth/auth.routes';
import instructorRoutes from './modules/instructor/instructor.routes';
import studentRoutes from './modules/student/student.routes';
import { setupSocketHandlers } from './modules/chat/chat.socket';

// thêm biến môi trường từ file .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// cấu hình middleware cors và json parser
app.use(cors());
app.use(express.json());

// nạp các router phân theo module tính năng
app.use('/', authRoutes);
app.use('/', instructorRoutes);
app.use('/', studentRoutes);

// route kiểm tra trạng thái hoạt động của máy chủ
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// tạo http server và tích hợp socket.io cho ứng dụng chat thời gian thực
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

//evnt socket.io
setupSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Modular Server running on http://localhost:${PORT}`);
});
