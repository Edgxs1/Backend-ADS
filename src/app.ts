import express from 'express';
import cors from 'cors';

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Ruta de prueba (Health Check)
app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ status: 'OK', message: 'API de Obra Pública funcionando' });
});

// Aquí iremos inyectando las rutas de tus módulos (Auth, Admin, etc.)
// app.use('/api/v1/admin', adminRoutes);

export default app;
