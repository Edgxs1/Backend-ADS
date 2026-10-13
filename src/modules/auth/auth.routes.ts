import { Router } from 'express';
import { validateBody } from '../../middlewares/validate.middleware.js';
import { login } from './auth.controller.js';
import { loginSchema } from './auth.schemas.js';

export const authRouter = Router();

authRouter.post('/login', validateBody(loginSchema), login);
