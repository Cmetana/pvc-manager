import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';

export async function helpRouter(app: FastifyInstance) {
  // GET /api/help — список запитів (адмін бачить всі, працівник — свої)
  app.get('/', async (request) => {
    const user = (request as any).currentUser;
    const query = request.query as any;

    const where: any = {};
    if (user.role !== 'admin') {
      where.userId = user.id;
    }
    if (query.status) where.status = query.status;

    return prisma.helpRequest.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, username: true, telegramId: true } },
        task: { select: { id: true, batch: true, cell: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });

  // POST /api/help — створення запиту
  app.post('/', async (request, reply) => {
    const user = (request as any).currentUser;
    const body = request.body as any;

    if (!body.message?.trim()) {
      return reply.status(400).send({ error: 'Повідомлення обов\'язкове' });
    }

    const helpReq = await prisma.helpRequest.create({
      data: {
        userId: user.id,
        taskId: body.taskId ?? null,
        category: body.category ?? 'other',
        message: body.message.trim(),
        attachment: body.attachment ?? null,
      },
      include: {
        user: true,
        task: { select: { id: true, batch: true, cell: true } },
      },
    });

    // Сповіщаємо адмінів через бот
    const bot = (globalThis as any).bot;
    if (bot) {
      const admins = await prisma.user.findMany({ where: { role: 'admin' } });
      const taskInfo = helpReq.task
        ? `\n📋 Задача #${helpReq.task.id}: ${helpReq.task.batch}/${helpReq.task.cell}`
        : '';

      for (const admin of admins) {
        try {
          await bot.api.sendMessage(
            admin.telegramId,
            `🆘 <b>Запит допомоги #${helpReq.id}</b>\n\n` +
            `👤 ${user.firstName ?? user.username ?? user.telegramId}${taskInfo}\n\n` +
            `📝 ${helpReq.message}`,
            { parse_mode: 'HTML' }
          );
        } catch {}
      }
    }

    return helpReq;
  });

  // PATCH /api/help/:id/resolve — закрити запит (адмін)
  app.patch('/:id/resolve', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });

    const { id } = request.params as any;

    return prisma.helpRequest.update({
      where: { id: parseInt(id) },
      data: { status: 'resolved' },
    });
  });
}
