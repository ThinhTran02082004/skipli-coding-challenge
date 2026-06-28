import { AuthSuccessResponse, Lesson, UserProfile } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function handleResponse<T>(response: Response): Promise<T> {
  const data: unknown = await response.json();
  if (!response.ok) {
    const errorObj = data as { error?: string; message?: string };
    throw new Error(errorObj.error || errorObj.message || 'API Request Failed');
  }
  return data as T;
}

// Auth API
export async function createAccessCode(phoneNumber: string): Promise<{ success: boolean; message: string; code?: string }> {
  const res = await fetch(`${API_BASE_URL}/createAccessCode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  });
  return handleResponse(res);
}

export async function validateAccessCode(phoneNumber: string, accessCode: string): Promise<AuthSuccessResponse> {
  const res = await fetch(`${API_BASE_URL}/validateAccessCode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, accessCode }),
  });
  return handleResponse(res);
}

export async function loginEmail(email: string): Promise<{ success: boolean; message: string; accessCode?: string }> {
  const res = await fetch(`${API_BASE_URL}/loginEmail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
}

export async function validateEmailAccessCode(email: string, accessCode: string): Promise<AuthSuccessResponse> {
  const res = await fetch(`${API_BASE_URL}/validateEmailAccessCode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, accessCode }),
  });
  return handleResponse(res);
}

// Instructor API
export async function addStudent(name: string, phone: string, email: string): Promise<{ success: boolean; student: UserProfile }> {
  const res = await fetch(`${API_BASE_URL}/addStudent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, email }),
  });
  return handleResponse(res);
}

export async function assignLesson(studentPhone: string, title: string, description: string): Promise<{ success: boolean; lesson: Lesson }> {
  const res = await fetch(`${API_BASE_URL}/assignLesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentPhone, title, description }),
  });
  return handleResponse(res);
}

export async function getStudents(): Promise<{ success: boolean; students: UserProfile[] }> {
  const res = await fetch(`${API_BASE_URL}/students`);
  return handleResponse(res);
}

export async function getStudentByPhone(phone: string): Promise<{ success: boolean; profile: UserProfile; lessons: Lesson[] }> {
  const res = await fetch(`${API_BASE_URL}/student/${encodeURIComponent(phone)}`);
  return handleResponse(res);
}

export async function editStudent(phone: string, name?: string, email?: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/editStudent/${encodeURIComponent(phone)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email }),
  });
  return handleResponse(res);
}

export async function deleteStudent(phone: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/student/${encodeURIComponent(phone)}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}

// Student API
export async function getMyLessons(phone: string): Promise<{ success: boolean; lessons: Lesson[] }> {
  const res = await fetch(`${API_BASE_URL}/myLessons?phone=${encodeURIComponent(phone)}`);
  return handleResponse(res);
}

export async function markLessonDone(phone: string, lessonId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/markLessonDone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, lessonId }),
  });
  return handleResponse(res);
}

export async function editProfile(phone: string, name?: string, email?: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/editProfile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name, email }),
  });
  return handleResponse(res);
}
