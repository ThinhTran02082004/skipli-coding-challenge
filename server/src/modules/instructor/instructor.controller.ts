import { Request, Response } from 'express';
import { db } from '../../core/config/firebase';
import { sendStudentCredentialEmail } from '../../core/services/email.service';
import { UserProfile, Lesson } from '../../core/types';

// hàm thêm mới học sinh vào hệ thống và gửi email thông báo
export async function addStudent(req: Request, res: Response): Promise<void> {
  try {
    const { name, phone, email } = req.body as { name?: string; phone?: string; email?: string };
    if (!name || !phone || !email) {
      res.status(400).json({ success: false, error: 'name, phone, and email are required' });
      return;
    }

    // khởi tạo thông tin học sinh mới
    const studentUser: UserProfile = {
      phone,
      name,
      email,
      role: 'student',
      createdAt: new Date().toISOString(),
    };

    // lưu thông tin học sinh vào bộ sưu tập users trong firestore
    await db.collection('users').doc(phone).set(studentUser);
    await sendStudentCredentialEmail(email, name, phone);

    res.status(200).json({
      success: true,
      message: 'Student added successfully',
      student: studentUser,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: errorMessage });
  }
}

// hàm giao bài học mới cho học sinh
export async function assignLesson(req: Request, res: Response): Promise<void> {
  try {
    const { studentPhone, title, description } = req.body as { studentPhone?: string; title?: string; description?: string };
    if (!studentPhone || !title || !description) {
      res.status(400).json({ success: false, error: 'studentPhone, title, and description are required' });
      return;
    }

    // khởi tạo tài liệu bài học mới với mã id tự động
    const lessonRef = db.collection('lessons').doc();
    const newLesson: Lesson = {
      id: lessonRef.id,
      studentPhone,
      title,
      description,
      completed: false,
      assignedAt: new Date().toISOString(),
    };

    await lessonRef.set(newLesson);

    res.status(200).json({
      success: true,
      message: 'Lesson assigned successfully',
      lesson: newLesson,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: errorMessage });
  }
}

// hàm lấy danh sách tất cả học sinh trong hệ thống
export async function getStudents(_req: Request, res: Response): Promise<void> {
  try {
    // truy vấn các người dùng có vai trò là học sinh
    const snapshot = await db.collection('users').where('role', '==', 'student').get();
    const students: UserProfile[] = [];
    snapshot.forEach((doc) => {
      students.push(doc.data() as UserProfile);
    });

    res.status(200).json({
      success: true,
      students,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: errorMessage });
  }
}

// hàm lấy thông tin chi tiết học sinh kèm danh sách bài học được giao
export async function getStudentByPhone(req: Request, res: Response): Promise<void> {
  try {
    const { phone } = req.params;
    if (!phone) {
      res.status(400).json({ success: false, error: 'phone parameter is required' });
      return;
    }

    // lấy hồ sơ học sinh từ csdl
    const userDoc = await db.collection('users').doc(phone).get();
    if (!userDoc.exists) {
      res.status(404).json({ success: false, error: 'Student not found' });
      return;
    }

    const profile = userDoc.data() as UserProfile;
    // lấy danh sách bài học tương ứng với số điện thoại học sinh
    const lessonsSnap = await db.collection('lessons').where('studentPhone', '==', phone).get();
    const lessons: Lesson[] = [];
    lessonsSnap.forEach((doc) => {
      lessons.push(doc.data() as Lesson);
    });

    res.status(200).json({
      success: true,
      profile,
      lessons,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: errorMessage });
  }
}

// hàm cập nhật thông tin cá nhân của học sinh
export async function editStudent(req: Request, res: Response): Promise<void> {
  try {
    const { phone } = req.params;
    const { name, email } = req.body as { name?: string; email?: string };

    if (!phone) {
      res.status(400).json({ success: false, error: 'phone parameter is required' });
      return;
    }

    // chuẩn bị dữ liệu cập nhật
    const updateData: Record<string, string> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    await db.collection('users').doc(phone).update(updateData);

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: errorMessage });
  }
}

// hàm xóa học sinh và các bài học liên quan khỏi hệ thống
export async function deleteStudent(req: Request, res: Response): Promise<void> {
  try {
    const { phone } = req.params;
    if (!phone) {
      res.status(400).json({ success: false, error: 'phone parameter is required' });
      return;
    }

    // xóa hồ sơ học sinh
    await db.collection('users').doc(phone).delete();

    // xóa toàn bộ các bài học đã giao cho học sinh này qua batch commit
    const lessonsSnap = await db.collection('lessons').where('studentPhone', '==', phone).get();
    const batch = db.batch();
    lessonsSnap.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.status(200).json({
      success: true,
      message: 'Student and associated lessons removed',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: errorMessage });
  }
}
