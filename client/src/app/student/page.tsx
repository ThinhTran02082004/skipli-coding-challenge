'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lesson, ChatMessage } from '../../types';
import { getMyLessons, markLessonDone, editProfile } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Bell, User, LogOut, Send, BookOpen, MessageSquare, CheckCircle2, GraduationCap, AlertCircle, X } from 'lucide-react';

export default function StudentDashboard() {
  const router = useRouter();
  const [studentPhone, setStudentPhone] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [mainTab, setMainTab] = useState<'lessons' | 'messages'>('lessons');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ name: '', email: '' });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName') || 'Student';
    const email = localStorage.getItem('userEmail') || '';

    if (!phone || role !== 'student') {
      router.push('/');
      return;
    }
    setStudentPhone(phone);
    setStudentName(name);
    setStudentEmail(email);
    loadLessons(phone);
  }, [router]);

  // Keyboard Escape listener for Edit Profile modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && showEditModal) {
        setShowEditModal(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEditModal]);

  async function loadLessons(phone: string) {
    setLoading(true);
    try {
      const res = await getMyLessons(phone);
      setLessons(res.lessons);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load lessons');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!studentPhone) return;

    const socket = getSocket();
    socket.emit('join_room', studentPhone);
    socket.emit('get_history', { phone1: studentPhone, phone2: 'INSTRUCTOR_GENERAL' });

    function handleReceive(msg: ChatMessage) {
      if (msg.senderPhone === studentPhone || msg.receiverPhone === studentPhone) {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    }

    function handleHistory(payload: ChatMessage[] | { studentPhone: string; messages: ChatMessage[] }) {
      if (Array.isArray(payload)) {
        setChatMessages(payload);
      } else {
        setChatMessages(payload.messages);
      }
    }

    socket.on('receive_message', handleReceive);
    socket.on('chat_history', handleHistory);

    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('chat_history', handleHistory);
    };
  }, [studentPhone]);

  async function handleMarkDone(lessonId: string) {
    setErrorMessage(null);
    try {
      await markLessonDone(studentPhone, lessonId);
      setLessons((prev) =>
        prev.map((l) => (l.id === lessonId ? { ...l, completed: true, completedAt: new Date().toISOString() } : l))
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to mark lesson done');
    }
  }

  async function handleEditProfile(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await editProfile(studentPhone, editData.name, editData.email);
      setStudentName(editData.name);
      setStudentEmail(editData.email);
      localStorage.setItem('userName', editData.name);
      localStorage.setItem('userEmail', editData.email);
      setShowEditModal(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update profile');
    }
  }

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !studentPhone) return;

    const socket = getSocket();
    socket.emit('send_message', {
      senderPhone: studentPhone,
      receiverPhone: 'INSTRUCTOR_GENERAL',
      senderRole: 'student',
      text: chatInput.trim(),
    });
    setChatInput('');
  }

  function handleLogout() {
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-blue-600 text-lg">
          <GraduationCap className="w-6 h-6 text-blue-600" />
          <span>Classroom Portal</span>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors" title="Notifications">
            <Bell className="w-5 h-5" />
          </button>
          <div
            onClick={() => {
              setEditData({ name: studentName, email: studentEmail });
              setShowEditModal(true);
            }}
            className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-blue-200 transition-colors"
            title="Edit Profile"
          >
            <User className="w-5 h-5" />
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-slate-600 hover:text-slate-900">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      {/* Main Responsive Layout */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-6 gap-8">
        <aside className="w-full md:w-64 shrink-0 space-y-2">
          <button
            onClick={() => setMainTab('lessons')}
            className={`w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-colors text-left relative rounded-lg ${
              mainTab === 'lessons' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {mainTab === 'lessons' && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-l-lg" />}
            <BookOpen className="w-4 h-4" /> Manage Lessons
          </button>

          <button
            onClick={() => setMainTab('messages')}
            className={`w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-colors text-left relative rounded-lg ${
              mainTab === 'messages' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {mainTab === 'messages' && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-l-lg" />}
            <MessageSquare className="w-4 h-4" /> Message
          </button>
        </aside>

        <main className="flex-1">
          {/* Non-disruptive Inline Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700" title="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {mainTab === 'lessons' && (
            <Card className="p-6 border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Assigned Lessons</h1>
                  <p className="text-xs text-slate-600 mt-1">Welcome back, {studentName}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setEditData({ name: studentName, email: studentEmail }); setShowEditModal(true); }}>
                  Edit Profile
                </Button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500">Loading lessons...</div>
              ) : lessons.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">No lessons assigned to you yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lessons.map((l) => (
                    <Card key={l.id} className="p-4 flex flex-col justify-between border-slate-200 shadow-sm">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-slate-900">{l.title}</h3>
                          <Badge variant={l.completed ? 'success' : 'secondary'}>
                            {l.completed ? 'Done' : 'Pending'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 mb-4">{l.description}</p>
                      </div>
                      {!l.completed && (
                        <Button size="sm" onClick={() => handleMarkDone(l.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Mark as Done
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          )}

          {mainTab === 'messages' && (
            <div className="flex flex-col md:flex-row gap-6 h-[600px]">
              <Card className="w-full md:w-72 p-4 flex flex-col shrink-0 border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm mb-4">Messages</h3>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">Instructor</p>
                    <p className="text-xs text-blue-700 font-medium">Classroom Support</p>
                  </div>
                </div>
              </Card>

              <Card className="flex-1 flex flex-col overflow-hidden bg-slate-50 border-slate-200 shadow-sm">
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 text-xs">No messages yet. Send a message to start chatting!</div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.senderRole === 'student' || msg.senderPhone === studentPhone;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[70%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${isMe ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'}`}>
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 px-1">
                            {isMe ? 'You' : 'Instructor'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 bg-slate-100 border-t border-slate-200 flex gap-2">
                  <Input
                    placeholder="Reply message"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="bg-white border-slate-200 text-xs focus:ring-blue-600"
                  />
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </Card>
            </div>
          )}
        </main>
      </div>

      {showEditModal && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-student-profile-title"
        >
          <Card className="max-w-md w-full p-6 border-slate-200 shadow-xl">
            <h2 id="edit-student-profile-title" className="text-xl font-bold text-slate-900 mb-4">Edit Profile</h2>
            <form onSubmit={handleEditProfile} className="space-y-4">
              <div>
                <label htmlFor="student-name-input" className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <Input
                  id="student-name-input"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="student-email-input" className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                <Input
                  id="student-email-input"
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
