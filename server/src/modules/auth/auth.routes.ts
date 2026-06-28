import { Router } from 'express';
import {
  createAccessCode,
  validateAccessCode,
  loginEmail,
  validateEmailAccessCode,
} from './auth.controller';

const router = Router();

router.post('/createAccessCode', createAccessCode);
router.post('/validateAccessCode', validateAccessCode);
router.post('/LoginEmail', loginEmail);
router.post('/loginEmail', loginEmail);
router.post('/ValidateAccessCode', validateEmailAccessCode);
router.post('/validateEmailAccessCode', validateEmailAccessCode);

export default router;
