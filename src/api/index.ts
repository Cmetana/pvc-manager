import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import path from 'path';
import { prisma } from '../db/client';
import { tasksRouter }       from './routes/tasks';
import { usersRouter }       from './routes/users';
import { statsRouter }       from './routes/stats';
import { refsRouter }        from './routes/refs';
import { importRouter }      from './routes/import';
import { helpRouter }        from './routes/help';
import { workerStatsRouter } from './routes/workerStats';

const app = Fastify({ logger: { level: 'warn' } });

app.register(cors, {
  origin: [
    process.env.WEBAPP_URL  ?? 'http://localhost:5173',
    process.env.ADMIN_URL   ?? 'http://localhost:5174',
    'https://web.telegram.org',
    /\.ngrok\.io$/,
    /\.ngrok-free\.app$/,
    /\.vercel\.app$/,
  ],
  credentials: true,
});

// Multipart — для завантаження фото
app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

// Статичні файли (фото задач)
const uploadsDir = path.join(process.cwd(), 'uploads');
app.register(staticFiles, { root: uploadsDir, prefix: '/uploads/' });

// ─── Auth middleware ──────────────────────────────────────────
app.addHook('preHandler', async (request, reply) => {
  if (
    request.url.startsWith('/uploads/') ||
    request.url === '/health' ||
    // GET /api/tasks/:id/photo — публічний доступ, бо <img> не надсилає заголовки
    // POST /api/tasks/:id/photo — потребує авторизації
    (request.method === 'GET' && /^\/api\/tasks\/\d+\/photo(\?.*)?$/.test(request.url))
  ) return;
  const telegramId = request.headers['x-telegram-id'] as string;
  if (!telegramId) return reply.status(401).send({ error: 'Unauthorized' });
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user)             return reply.status(401).send({ error: 'User not found. Send /start to the bot first.' });
  if (user.role === 'banned')  return reply.status(403).send({ error: 'Banned' });
  if (user.role === 'pending') return reply.status(403).send({ error: 'Pending approval' });
  (request as any).currentUser = user;
});

app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

app.register(tasksRouter,        { prefix: '/api/tasks' });
app.register(usersRouter,        { prefix: '/api/users' });
app.register(statsRouter,        { prefix: '/api/stats' });
app.register(workerStatsRouter,  { prefix: '/api/stats' });
app.register(refsRouter,         { prefix: '/api/refs' });
app.register(importRouter,       { prefix: '/api/import' });
app.register(helpRouter,         { prefix: '/api/help' });

const PORT = parseInt(process.env.API_PORT ?? '3000');
const HOST = process.env.API_HOST ?? '0.0.0.0';

app.listen({ port: PORT, host: HOST }, async (err) => {
  if (err) { console.error('❌ API помилка:', err); process.exit(1); }
  await prisma.$connect();
  console.log(`🚀 API: http://localhost:${PORT}`);
});

export { app };
