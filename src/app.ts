import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware.js';
import { authRouter } from './routes/auth.routes.js';
import { obraRouter } from './routes/obra.routes.js';
import { partidaRouter } from './routes/partida.routes.js';
import { catalogoRouter } from './routes/catalogo.routes.js';
import { contratoRouter } from './routes/contrato.routes.js';
import { archivoRouter } from './routes/archivo.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { usuariosRouter } from './routes/usuarios.routes.js';
import { reporteRouter } from './routes/reporte.routes.js';

const app = express();

// Middlewares globales
app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json());

// Ruta de prueba (Health Check)
app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ success: true, data: { message: 'API OK' } });
});

// Rutas de los módulos
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/usuarios', usuariosRouter);
app.use('/api/v1/obras', archivoRouter);
app.use('/api/v1/obras', contratoRouter);
app.use('/api/v1/obras', catalogoRouter);
app.use('/api/v1/obras', partidaRouter);
app.use('/api/v1/obras', reporteRouter);
app.use('/api/v1/obras', obraRouter);
app.use('/api/v1/admin', adminRouter);

// Manejo centralizado de rutas no encontradas y errores
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
