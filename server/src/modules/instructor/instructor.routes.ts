import { Router } from 'express';
import {
  addStudent,
  assignLesson,
  getStudents,
  getStudentByPhone,
  editStudent,
  deleteStudent,
} from './instructor.controller';

const router = Router();

// khai báo các api quản lý học sinh và bài học dành cho giảng viên
router.post('/addStudent', addStudent);
router.post('/assignLesson', assignLesson);
router.get('/students', getStudents);
router.get('/student/:phone', getStudentByPhone);
router.put('/editStudent/:phone', editStudent);
router.delete('/student/:phone', deleteStudent);

export default router;
