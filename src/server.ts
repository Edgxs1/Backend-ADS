import app from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${env.PORT}`);
});
