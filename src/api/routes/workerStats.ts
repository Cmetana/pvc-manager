import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';
import { calcSP } from '../../shared/constants';

export async function workerStatsRouter(app: FastifyInstance) {
  // GET /api/stats/workers?dateFrom=&dateTo=&teamId=
  // Повертає статистику по кожному працівнику
  app.get('/workers', async (request) => {
    const user = (request as any).currentUser;
    const query = request.query as any;

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : (() => {
      const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d;
    })();
    const dateTo = query.dateTo ? (() => { const d = new Date(query.dateTo); d.setHours(23, 59, 59, 999); return d; })() : new Date();
    const teamId = query.teamId ? parseInt(query.teamId) : undefined;

    // Отримуємо всіх активних працівників
    const workers = await prisma.user.findMany({
      where: {
        role: 'worker',
        ...(teamId ? { teamId } : {}),
      },
      include: { team: true },
    });

    // Виконані задачі за діапазон
    const doneTasks = await prisma.task.findMany({
      where: {
        doneAt: { gte: dateFrom, lte: dateTo },
        status: 'Done',
        ...(teamId ? { teamId } : {}),
      },
    });

    // Задачі в переробці (для статистики переробок)
    const reworkTasks = await prisma.task.findMany({
      where: {
        reworkDoneAt: { gte: dateFrom, lte: dateTo },
        reworkApprovedAt: { not: null },
      },
    });

    // Будуємо статистику по кожному працівнику
    const workerStats = workers.map((worker) => {
      const workerDone = doneTasks.filter((t) => t.assigneeUserId === worker.id);
      const factSP = workerDone.reduce((s, t) => s + calcSP(t.impostsPerItem, t.qtyItems), 0);
      const tasksCount = workerDone.length;

      // Середній hours_per_SP (10.5 год / кількість СП)
      // Тут ми рахуємо по виконаних задачах
      const hoursPerSP = factSP > 0 ? +(10.5 / factSP).toFixed(2) : null;

      // Рерворки де цей юзер виконавець
      const workerReworks = reworkTasks.filter((t) => t.assigneeUserId === worker.id);
      const reworkCount = workerReworks.length;

      // Середній час переробки (хвилини)
      let avgReworkMinutes: number | null = null;
      if (reworkCount > 0) {
        const totalMs = workerReworks.reduce((s, t) => {
          if (t.reworkApprovedAt && t.reworkDoneAt) {
            return s + (t.reworkDoneAt.getTime() - t.reworkApprovedAt.getTime());
          }
          return s;
        }, 0);
        avgReworkMinutes = Math.round(totalMs / reworkCount / 60000);
      }

      // Прострочені виконані задачі
      const lateCount = workerDone.filter((t) => t.lateComment).length;

      return {
        userId: worker.id,
        name: worker.firstName ?? worker.username ?? worker.telegramId,
        teamId: worker.teamId,
        teamName: worker.team?.name ?? null,
        factSP,
        tasksCount,
        hoursPerSP,
        reworkCount,
        avgReworkMinutes,
        lateCount,
      };
    });

    // Сортуємо по factSP спадаючи
    return workerStats.sort((a, b) => b.factSP - a.factSP);
  });

  // GET /api/stats/unassigned — задачі без підкоманди
  app.get('/unassigned', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });

    const tasks = await prisma.task.findMany({
      where: {
        teamId: null,
        status: { in: ['New', 'InProgress', 'Rework'] },
      },
      include: {
        type: { include: { competency: true } },
      },
      orderBy: { plannedDate: 'asc' },
    });

    return tasks.map((t) => ({
      ...t,
      sp: calcSP(t.impostsPerItem, t.qtyItems),
      isOverdue: t.status !== 'Done' && new Date(t.plannedDate) < new Date(),
    }));
  });

  // PATCH /api/stats/unassigned/:id/assign — призначити підкоманду
  app.patch('/unassigned/:id/assign', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });

    const { id } = request.params as any;
    const body = request.body as any;

    return prisma.task.update({
      where: { id: parseInt(id) },
      data: { teamId: body.teamId },
      include: { type: true, team: true },
    });
  });
}
