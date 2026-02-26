import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';
import { calcSP } from '../../shared/constants';

// ─── Статистика ───────────────────────────────────────────────
export async function statsRouter(app: FastifyInstance) {
  // GET /api/stats?dateFrom=&dateTo=&userId=&teamId=
  app.get('/', async (request) => {
    const user = (request as any).currentUser;
    const query = request.query as any;

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : (() => {
      const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d;
    })();
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();

    const userId = query.userId ? parseInt(query.userId) : (user.role === 'worker' ? user.id : undefined);
    const teamId = query.teamId ? parseInt(query.teamId) : undefined;

    // Задачі за діапазон (план)
    const planTasks = await prisma.task.findMany({
      where: {
        plannedDate: { gte: dateFrom, lte: dateTo },
        ...(teamId ? { teamId } : user.role === 'worker' && user.teamId ? { teamId: user.teamId } : {}),
      },
    });

    // Виконані задачі за діапазон (факт)
    const doneTasks = await prisma.task.findMany({
      where: {
        doneAt: { gte: dateFrom, lte: dateTo },
        status: 'Done',
        ...(userId ? { assigneeUserId: userId } : {}),
        ...(teamId ? { teamId } : user.role === 'worker' && user.teamId ? { teamId: user.teamId } : {}),
      },
      include: { type: true, assignee: { select: { id: true, firstName: true, username: true } } },
    });

    // Групуємо по днях
    const byDay = new Map<string, { plan: number; fact: number }>();

    for (const t of planTasks) {
      const key = t.plannedDate.toISOString().split('T')[0];
      if (!byDay.has(key)) byDay.set(key, { plan: 0, fact: 0 });
      byDay.get(key)!.plan += calcSP(t.impostsPerItem, t.qtyItems);
    }

    for (const t of doneTasks) {
      const key = t.doneAt!.toISOString().split('T')[0];
      if (!byDay.has(key)) byDay.set(key, { plan: 0, fact: 0 });
      byDay.get(key)!.fact += calcSP(t.impostsPerItem, t.qtyItems);
    }

    const daily = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { plan, fact }]) => ({
        date,
        plan,
        fact,
        diff: fact - plan,
        hoursPerSP: fact > 0 ? +(10.5 / fact).toFixed(2) : null,
      }));

    // По типах
    const byType = new Map<string, { name: string; sp: number; items: number }>();
    for (const t of doneTasks) {
      const key = String(t.typeId);
      if (!byType.has(key)) byType.set(key, { name: (t as any).type?.name ?? key, sp: 0, items: 0 });
      byType.get(key)!.sp += calcSP(t.impostsPerItem, t.qtyItems);
      byType.get(key)!.items += t.qtyItems;
    }

    const byTypeArr = Array.from(byType.entries()).map(([id, v]) => ({ typeId: parseInt(id), ...v }));

    return { daily, byType: byTypeArr };
  });
}

// ─── Довідники ────────────────────────────────────────────────
export async function refsRouter(app: FastifyInstance) {
  // Типи конструкцій
  app.get('/types', async () =>
    prisma.constructType.findMany({
      where: { isActive: true },
      include: { competency: true },
      orderBy: { name: 'asc' },
    })
  );

  app.post('/types', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });
    const body = request.body as any;
    return prisma.constructType.create({
      data: { name: body.name, competencyId: body.competencyId },
      include: { competency: true },
    });
  });

  app.put('/types/:id', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });
    const { id } = request.params as any;
    const body = request.body as any;
    return prisma.constructType.update({
      where: { id: parseInt(id) },
      data: { name: body.name, competencyId: body.competencyId, isActive: body.isActive },
      include: { competency: true },
    });
  });

  // Компетенції
  app.get('/competencies', async () =>
    prisma.competency.findMany({ orderBy: { code: 'asc' } })
  );

  app.post('/competencies', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });
    const body = request.body as any;
    return prisma.competency.create({ data: { code: body.code, label: body.label } });
  });

  // Підкоманди
  app.get('/teams', async () =>
    prisma.team.findMany({ orderBy: { name: 'asc' } })
  );

  app.post('/teams', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });
    const body = request.body as any;
    return prisma.team.create({ data: { name: body.name } });
  });
}
