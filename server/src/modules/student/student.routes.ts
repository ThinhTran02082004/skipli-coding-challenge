import { Router } from 'express';
import {
  getMyLessons,
  markLessonDone,
  editProfile,
} from './student.controller';

const router = Router();

router.get('/myLessons', getMyLessons);
router.post('/markLessonDone', markLessonDone);
router.put('/editProfile', editProfile);

export default router;
