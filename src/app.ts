import express from 'express';
import cors from 'cors';
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware.js';
import { apiRouter } from './routes.js';

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Ruta de prueba (Health Check)
app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ status: 'OK', message: 'API de Obra Pública funcionando' });
});

// Rutas de los módulos
app.use('/api/v1', apiRouter);

// Manejo centralizado de rutas no encontradas y errores
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
