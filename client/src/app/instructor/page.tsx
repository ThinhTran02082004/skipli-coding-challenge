'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, Lesson, ChatMessage } from '../../types';
import { getStudents, getStudentByPhone, addStudent, editStudent, deleteStudent, assignLesson } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Bell, User, Plus, Search, LogOut, Send, BookOpen, MessageSquare, Users, GraduationCap, AlertCircle, X, AlertTriangle } from 'lucide-react';

export default function InstructorDashboard() {
  const router = useRouter();
  const [instructorPhone, setInstructorPhone] = useState('');
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [studentLessons, setStudentLessons] = useState<Lesson[]>([]);

  // Navigation tabs
  const [mainTab, setMainTab] = useState<'students' | 'lessons' | 'messages'>('students');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<UserProfile | null>(null);

  // Forms state
  const [newStudent, setNewStudent] = useState({ name: '', phone: '', email: '', role: 'Student', address: '' });
  const [editStudentData, setEditStudentData] = useState({ name: '', email: '' });
  const [newLesson, setNewLesson] = useState({ title: '', description: '' });

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setShowAssignModal(false);
        setShowEditModal(false);
        setStudentToDelete(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    const role = localStorage.getItem('userRole');

    if (!phone || role !== 'instructor') {
      router.push('/');
      return;
    }
    setInstructorPhone(phone);
    loadStudents();
  }, [router]);

  async function loadStudents() {
    setLoading(true);
    try {
      const res = await getStudents();
      setStudents(res.students);
      if (res.students.length > 0 && !selectedStudent) {
        selectStudent(res.students[0]);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }

  const selectedStudentRef = useRef<UserProfile | null>(null);

  async function selectStudent(student: UserProfile) {
    setSelectedStudent(student);
    selectedStudentRef.current = student;
    setChatMessages([]);
    try {
      const res = await getStudentByPhone(student.phone);
      setStudentLessons(res.lessons);

      const socket = getSocket();
      socket.emit('join_room', student.phone);
      socket.emit('get_history', { phone1: instructorPhone || localStorage.getItem('userPhone') || '', phone2: student.phone });
    } catch (err: unknown) {
      console.error('Error fetching student details:', err);
    }
  }

  useEffect(() => {
    if (!instructorPhone) return;

    const socket = getSocket();
    function handleReceiveMessage(msg: ChatMessage) {
      const currentStudent = selectedStudentRef.current;
      if (
        currentStudent &&
        (msg.senderPhone === currentStudent.phone || msg.receiverPhone === currentStudent.phone)
      ) {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    }

    function handleChatHistory(payload: ChatMessage[] | { studentPhone: string; messages: ChatMessage[] }) {
      const currentStudent = selectedStudentRef.current;
      if (Array.isArray(payload)) {
        setChatMessages(payload);
      } else {
        if (currentStudent && currentStudent.phone === payload.studentPhone) {
          setChatMessages(payload.messages);
        }
      }
    }

    socket.on('receive_message', handleReceiveMessage);
    socket.on('chat_history', handleChatHistory);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('chat_history', handleChatHistory);
    };
  }, [instructorPhone]);

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const res = await addStudent(newStudent.name, newStudent.phone, newStudent.email);
      setStudents((prev) => [...prev, res.student]);
      setNewStudent({ name: '', phone: '', email: '', role: 'Student', address: '' });
      setShowAddModal(false);
      selectStudent(res.student);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add student');
    }
  }

  async function handleEditStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;
    setErrorMessage(null);
    try {
      await editStudent(selectedStudent.phone, editStudentData.name, editStudentData.email);
      setStudents((prev) =>
        prev.map((s) => (s.phone === selectedStudent.phone ? { ...s, ...editStudentData } : s))
      );
      setSelectedStudent((prev) => (prev ? { ...prev, ...editStudentData } : null));
      setShowEditModal(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to edit student');
    }
  }

  async function confirmDeleteStudent() {
    if (!studentToDelete) return;
    setErrorMessage(null);
    const phone = studentToDelete.phone;
    try {
      await deleteStudent(phone);
      const updated = students.filter((s) => s.phone !== phone);
      setStudents(updated);
      if (selectedStudent?.phone === phone) {
        setSelectedStudent(updated[0] || null);
      }
      setStudentToDelete(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete student');
    }
  }

  async function handleAssignLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;
    setErrorMessage(null);
    try {
      const res = await assignLesson(selectedStudent.phone, newLesson.title, newLesson.description);
      setStudentLessons((prev) => [...prev, res.lesson]);
      setNewLesson({ title: '', description: '' });
      setShowAssignModal(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to assign lesson');
    }
  }

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !selectedStudent || !instructorPhone) return;

    const socket = getSocket();
    socket.emit('send_message', {
      senderPhone: instructorPhone,
      receiverPhone: selectedStudent.phone,
      senderRole: 'instructor',
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

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-blue-600 text-lg">
          <GraduationCap className="w-6 h-6 text-blue-600" />
          <span>Classroom Portal</span>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors" title="Notifications">
            <Bell className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm" title="Instructor Profile">
            <User className="w-5 h-5" />
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-slate-600 hover:text-slate-900">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      {/* Main Responsive Layout (flex-col on mobile, flex-row on desktop) */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6 md:gap-8">
        {/* Sidebar Menu */}
        <aside className="w-full md:w-64 shrink-0 space-y-2">
          <button
            onClick={() => setMainTab('students')}
            className={`w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-colors text-left rounded-lg md:rounded-r-none ${
              mainTab === 'students' ? 'bg-blue-50 text-blue-700 font-bold md:border-l-4 md:border-blue-600' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" /> Manage Students
          </button>

          <button
            onClick={() => setMainTab('lessons')}
            className={`w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-colors text-left rounded-lg md:rounded-r-none ${
              mainTab === 'lessons' ? 'bg-blue-50 text-blue-700 font-bold md:border-l-4 md:border-blue-600' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Manage Lessons
          </button>

          <button
            onClick={() => setMainTab('messages')}
            className={`w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-colors text-left rounded-lg md:rounded-r-none ${
              mainTab === 'messages' ? 'bg-blue-50 text-blue-700 font-bold md:border-l-4 md:border-blue-600' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Message
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
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

          {mainTab === 'students' && (
            <Card className="p-4 md:p-6 border-slate-200 shadow-sm">
              <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-900">Manage Students</h1>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
                <span className="font-bold text-slate-800 text-base">{students.length} Students</span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" onClick={() => setShowAddModal(true)} className="text-blue-600 border-blue-600 hover:bg-blue-50 font-medium">
                    <Plus className="w-4 h-4 mr-1" /> Add Student
                  </Button>
                  <div className="relative w-full sm:w-48">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <Input
                      placeholder="Filter"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-10 text-xs border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400 text-xs">No students found.</td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => (
                        <tr key={student.phone} className="hover:bg-slate-50/50">
                          <td className="py-4 px-4 font-bold text-slate-900">{student.name}</td>
                          <td className="py-4 px-4 text-slate-600 font-medium">{student.email}</td>
                          <td className="py-4 px-4">
                            <Badge variant="success">Active</Badge>
                          </td>
                          <td className="py-4 px-4 text-center space-x-2">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                              onClick={() => {
                                selectStudent(student);
                                setEditStudentData({ name: student.name, email: student.email });
                                setShowEditModal(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setStudentToDelete(student)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {mainTab === 'lessons' && (
            <Card className="p-4 md:p-6 border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Manage Lessons</h1>
                  <p className="text-xs text-slate-600 mt-1">Select a student to assign or view curriculum</p>
                </div>
                {selectedStudent && (
                  <Button onClick={() => setShowAssignModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                    <Plus className="w-4 h-4 mr-1" /> Assign Lesson
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase">Select Student</h3>
                  {students.map((s) => (
                    <div
                      key={s.phone}
                      onClick={() => selectStudent(s)}
                      className={`p-3 rounded-lg cursor-pointer border text-sm font-semibold transition-colors ${
                        selectedStudent?.phone === s.phone ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {s.name}
                    </div>
                  ))}
                </div>

                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase">
                    Assigned Lessons ({studentLessons.length})
                  </h3>
                  {studentLessons.map((l) => (
                    <Card key={l.id} className="p-4 border-slate-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900">{l.title}</h4>
                        <Badge variant={l.completed ? 'success' : 'secondary'}>
                          {l.completed ? 'Done' : 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">{l.description}</p>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {mainTab === 'messages' && (
            <div className="flex flex-col md:flex-row gap-6 h-[600px]">
              <Card className="w-full md:w-72 p-4 flex flex-col shrink-0 border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm mb-4">All Message</h3>
                <div className="space-y-2 overflow-y-auto flex-1">
                  {students.map((s) => (
                    <div
                      key={s.phone}
                      onClick={() => selectStudent(s)}
                      className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all ${
                        selectedStudent?.phone === s.phone ? 'bg-blue-50 border border-blue-200 text-blue-800 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">{s.name}</p>
                        <p className="text-xs text-slate-500 truncate">Click to chat</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="flex-1 flex flex-col overflow-hidden bg-slate-50 border-slate-200 shadow-sm">
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 text-xs">Select a student to view messages.</div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.senderRole === 'instructor' || msg.senderPhone === instructorPhone;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[70%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${isMe ? 'bg-blue-600 text-white font-medium shadow-sm' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'}`}>
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 px-1">
                            {isMe ? 'Instructor' : selectedStudent?.name || 'Student'}
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
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* [P0 Fix] Explicit Delete Student Confirmation Modal */}
      {studentToDelete && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
          onClick={(e) => { if (e.target === e.currentTarget) setStudentToDelete(null); }}
          role="dialog" 
          aria-modal="true"
          aria-labelledby="delete-student-modal-title"
        >
          <Card className="max-w-md w-full p-6 border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 id="delete-student-modal-title" className="text-lg font-bold text-slate-900">Confirm Student Deletion</h2>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">{studentToDelete.name}</strong>? This action is permanent and will remove all associated assigned lessons.
            </p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setStudentToDelete(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDeleteStudent} className="bg-red-600 hover:bg-red-700 text-white font-medium">
                Delete Student
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Create Student Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          role="dialog" 
          aria-modal="true"
          aria-labelledby="add-student-modal-title"
        >
          <Card className="max-w-2xl w-full p-8 border-slate-200 shadow-2xl">
            <h2 id="add-student-modal-title" className="text-2xl font-bold text-center text-slate-900 mb-8">Create Student</h2>
            <form onSubmit={handleAddStudent} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="new-student-name" className="block text-xs font-semibold text-slate-700 mb-2">Student Name</label>
                  <Input
                    id="new-student-name"
                    required
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="new-student-phone" className="block text-xs font-semibold text-slate-700 mb-2">Phone Number</label>
                  <Input
                    id="new-student-phone"
                    required
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="new-student-email" className="block text-xs font-semibold text-slate-700 mb-2">Email Address</label>
                  <Input
                    id="new-student-email"
                    type="email"
                    required
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="new-student-role" className="block text-xs font-semibold text-slate-700 mb-2">Role</label>
                  <Input
                    id="new-student-role"
                    value={newStudent.role}
                    onChange={(e) => setNewStudent({ ...newStudent, role: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="new-student-address" className="block text-xs font-semibold text-slate-700 mb-2">Address</label>
                <Input
                  id="new-student-address"
                  value={newStudent.address}
                  onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="px-8 bg-blue-600 hover:bg-blue-700 text-white font-medium">
                  Create
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
          role="dialog" 
          aria-modal="true"
          aria-labelledby="edit-student-modal-title"
        >
          <Card className="max-w-md w-full p-6 border-slate-200 shadow-xl">
            <h2 id="edit-student-modal-title" className="text-xl font-bold text-slate-900 mb-4">Edit Student</h2>
            <form onSubmit={handleEditStudent} className="space-y-4">
              <div>
                <label htmlFor="edit-student-name" className="block text-xs font-semibold text-slate-700 mb-1">Student Name</label>
                <Input
                  id="edit-student-name"
                  value={editStudentData.name}
                  onChange={(e) => setEditStudentData({ ...editStudentData, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="edit-student-email" className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <Input
                  id="edit-student-email"
                  type="email"
                  value={editStudentData.email}
                  onChange={(e) => setEditStudentData({ ...editStudentData, email: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Save</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Assign Lesson Modal */}
      {showAssignModal && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
          onClick={(e) => { if (e.target === e.currentTarget) setShowAssignModal(false); }}
          role="dialog" 
          aria-modal="true"
          aria-labelledby="assign-lesson-modal-title"
        >
          <Card className="max-w-md w-full p-6 border-slate-200 shadow-xl">
            <h2 id="assign-lesson-modal-title" className="text-xl font-bold text-slate-900 mb-4">Assign Lesson</h2>
            <form onSubmit={handleAssignLesson} className="space-y-4">
              <div>
                <label htmlFor="assign-lesson-title" className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <Input
                  id="assign-lesson-title"
                  value={newLesson.title}
                  onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="assign-lesson-desc" className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  id="assign-lesson-desc"
                  rows={3}
                  value={newLesson.description}
                  onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
                  className="w-full rounded-md border border-slate-200 p-2 text-xs focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Assign</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
