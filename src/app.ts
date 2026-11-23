import { createRequire } from 'node:module';
import express, { type RequestHandler } from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { AppError } from './shared/errors/AppError.js';
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware.js';
import { verifyInternalSecret } from './middlewares/verify-internal-secret.middleware.js';
import { authRouter } from './routes/auth.routes.js';
import { obraRouter } from './routes/obra.routes.js';
import { partidaRouter } from './routes/partida.routes.js';
import { catalogoRouter } from './routes/catalogo.routes.js';
import { contratoRouter } from './routes/contrato.routes.js';
import { archivoRouter } from './routes/archivo.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { usuariosRouter } from './routes/usuarios.routes.js';
import { reporteRouter } from './routes/reporte.routes.js';
import { bitacoraNotaRouter, bitacoraRouter } from './routes/bitacora.routes.js';
import {
  estimacionDirectaRouter,
  estimacionRouter,
} from './routes/estimacion.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { pendientesRouter } from './routes/pendientes.routes.js';
import { compendioRouter } from './routes/compendio.routes.js';

const nodeRequire = createRequire(import.meta.url);
const helmet = nodeRequire('helmet') as () => RequestHandler;

const app = express();
const frontendUrl = env.FRONTEND_URL.replace(/\/+$/, '');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
  },
});

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (env.NODE_ENV !== 'production' || !origin || origin === frontendUrl) {
        callback(null, true);
        return;
      }

      callback(new AppError(403, 'Origen no permitido por CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-secret'],
    credentials: true,
  }),
);
app.use('/api/', apiLimiter);
app.use(express.json());
app.use(verifyInternalSecret);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`,
    );
  });
  next();
});

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ success: true, data: { message: 'API OK' } });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/usuarios', usuariosRouter);
app.use('/api/v1/obras', archivoRouter);
app.use('/api/v1/obras', contratoRouter);
app.use('/api/v1/obras', catalogoRouter);
app.use('/api/v1/obras', partidaRouter);
app.use('/api/v1/obras', reporteRouter);
app.use('/api/v1/obras', bitacoraRouter);
app.use('/api/v1/bitacora', bitacoraRouter);
app.use('/api/v1/bitacora', bitacoraNotaRouter);
app.use('/api/v1/obras', estimacionRouter);
app.use('/api/v1/estimaciones', estimacionDirectaRouter);
app.use('/api/v1/obras', dashboardRouter);
app.use('/api/v1/obras', compendioRouter);
app.use('/api/v1/pendientes', pendientesRouter);
app.use('/api/v1/obras', obraRouter);
app.use('/api/v1/admin', adminRouter);

// Manejo centralizado de rutas no encontradas y errores
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
