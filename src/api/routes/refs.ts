import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';

export async function refsRouter(app: FastifyInstance) {

  // ─── Типи конструкцій ─────────────────────────────────────────
  app.get('/types', async () =>
    prisma.constructType.findMany({ orderBy: { code: 'asc' } })
  );

  app.get('/types/all', async () =>
    prisma.constructType.findMany({ orderBy: { code: 'asc' } })
  );

  app.post('/types', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });
    const body = request.body as any;
    return prisma.constructType.create({
      data: { code: body.code.toUpperCase().trim(), label: body.label.trim() }
    });
  });

  app.put('/types/:id', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });
    const { id } = request.params as any;
    const body = request.body as any;
    return prisma.constructType.update({
      where: { id: parseInt(id) },
      data: {
        ...(body.code !== undefined  ? { code: body.code.toUpperCase().trim() } : {}),
        ...(body.label !== undefined ? { label: body.label.trim() } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      }
    });
  });

  // ─── Бригади ──────────────────────────────────────────────────
  // GET /api/refs/teams — з типами які вона виконує
  app.get('/teams', async () =>
    prisma.team.findMany({
      include: { teamTypes: { include: { type: true } } },
      orderBy: { name: 'asc' }
    })
  );

  app.post('/teams', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });
    const body = request.body as any;
    const team = await prisma.team.create({ data: { name: body.name.trim() } });
    // Додаємо типи якщо передані
    if (body.typeIds?.length) {
      await prisma.teamType.createMany({
        data: body.typeIds.map((tid: number) => ({ teamId: team.id, typeId: tid }))
      });
    }
    return prisma.team.findUnique({
      where: { id: team.id },
      include: { teamTypes: { include: { type: true } } }
    });
  });

  // PUT /api/refs/teams/:id — оновити типи бригади
  app.put('/teams/:id', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });
    const { id } = request.params as any;
    const body = request.body as any;
    const teamId = parseInt(id);

    if (body.name !== undefined) {
      await prisma.team.update({ where: { id: teamId }, data: { name: body.name.trim() } });
    }
    if (body.typeIds !== undefined) {
      await prisma.teamType.deleteMany({ where: { teamId } });
      if (body.typeIds.length > 0) {
        await prisma.teamType.createMany({
          data: body.typeIds.map((tid: number) => ({ teamId, typeId: tid }))
        });
      }
    }
    return prisma.team.findUnique({
      where: { id: teamId },
      include: { teamTypes: { include: { type: true } } }
    });
  });

  // GET /api/refs/teams/for-type/:typeId — бригади що можуть виконати цей тип
  app.get('/teams/for-type/:typeId', async (request) => {
    const { typeId } = request.params as any;
    const teamTypes = await prisma.teamType.findMany({
      where: { typeId: parseInt(typeId) },
      include: { team: true }
    });
    return teamTypes.map((tt) => tt.team);
  });
}
