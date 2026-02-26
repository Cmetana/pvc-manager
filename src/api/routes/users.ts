import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';

// Хелпер: збагачений юзер
const userInclude = {
  team: true,
  competencies: { include: { type: true } }
} as const;

export async function usersRouter(app: FastifyInstance) {
  // GET /api/users/me
  app.get('/me', async (request) => {
    const user = (request as any).currentUser;
    return prisma.user.findUnique({ where: { id: user.id }, include: userInclude });
  });

  // GET /api/users
  app.get('/', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });
    return prisma.user.findMany({ include: userInclude, orderBy: { createdAt: 'asc' } });
  });

  // PUT /api/users/:id
  app.put('/:id', async (request, reply) => {
    const admin = (request as any).currentUser;
    if (admin.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });

    const { id } = request.params as any;
    const body = request.body as any;
    const userId = parseInt(id);

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.role   !== undefined ? { role: body.role } : {}),
        ...(body.teamId !== undefined ? { teamId: body.teamId ?? null } : {}),
      }
    });

    // Оновлюємо компетенції (typeIds — масив id типів конструкцій)
    if (body.typeIds !== undefined) {
      await prisma.userCompetency.deleteMany({ where: { userId } });
      if (body.typeIds.length > 0) {
        await prisma.userCompetency.createMany({
          data: body.typeIds.map((tid: number) => ({ userId, typeId: tid }))
        });
      }
    }

    return prisma.user.findUnique({ where: { id: userId }, include: userInclude });
  });
}
