export type UserRole = 'instructor' | 'student';

export interface UserProfile {
  phone: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
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

export interface AuthSuccessResponse {
  success: boolean;
  role: UserRole;
  user: UserProfile;
  message?: string;
  error?: string;
}
