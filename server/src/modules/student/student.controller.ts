import { Request, Response } from 'express';
import { db } from '../../core/config/firebase';
import { Lesson, UserProfile } from '../../core/types';

// hàm lấy danh sách các bài học được giao cho học sinh
export async function getMyLessons(req: Request, res: Response): Promise<void> {
  try {
    const phone = req.query.phone as string | undefined;
    if (!phone) {
      res.status(400).json({ success: false, error: 'phone query parameter is required' });
      return;
    }

    // truy vấn danh sách bài học dựa trên số điện thoại học sinh
    const snapshot = await db.collection('lessons').where('studentPhone', '==', phone).get();
    const lessons: Lesson[] = [];
    snapshot.forEach((doc) => {
      lessons.push(doc.data() as Lesson);
    });

    res.status(200).json({
      success: true,
      lessons,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: errorMessage });
  }
}

// hàm đánh dấu bài học đã hoàn thành
export async function markLessonDone(req: Request, res: Response): Promise<void> {
  try {
    const { phone, lessonId } = req.body as { phone?: string; lessonId?: string };
    if (!phone || !lessonId) {
      res.status(400).json({ success: false, error: 'phone and lessonId are required' });
      return;
    }

    // kiểm tra sự tồn tại của bài học trong csdl
    const lessonRef = db.collection('lessons').doc(lessonId);
    const docSnap = await lessonRef.get();
    if (!docSnap.exists) {
      res.status(404).json({ success: false, error: 'Lesson not found' });
      return;
    }

    // cập nhật trạng thái hoàn thành và thời gian hoàn tất
    await lessonRef.update({
      completed: true,
      completedAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: 'Lesson marked as completed',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: errorMessage });
  }
}

// hàm tự cập nhật thông tin cá nhân dành cho học sinh
export async function editProfile(req: Request, res: Response): Promise<void> {
  try {
    const { phone, name, email } = req.body as { phone?: string; name?: string; email?: string };
    if (!phone) {
      res.status(400).json({ success: false, error: 'phone is required' });
      return;
    }

    // chuẩn bị thông tin hồ sơ mới cần cập nhật
    const updateData: Partial<UserProfile> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    await db.collection('users').doc(phone).update(updateData);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: errorMessage });
  }
}
