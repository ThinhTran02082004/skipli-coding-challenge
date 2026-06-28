export type UserRole = 'instructor' | 'student';

export interface UserProfile {
  phone: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface AccessCodeRecord {
  phoneOrEmail: string;
  code: string;
  createdAt: number;
  type: 'sms' | 'email';
}

export interface Lesson {
  id: string;
  studentPhone: string;
  title: string;
  description: string;
  completed: boolean;
  assignedAt: string;
  completedAt?: string;
}

export interface ChatMessage {
  id: string;
  senderPhone: string;
  receiverPhone: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
