import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';
import { calcSP, isOverdue } from '../../shared/constants';
import path from 'path';
import fs from 'fs';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const BOT_TOKEN = process.env.BOT_TOKEN ?? '';

async function tgSend(chatId: string, text: string, extra: Record<string, any> = {}) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
    });
  } catch (_) {}
}

async function tgSendPhoto(chatId: string, photoPath: string, caption: string) {
  if (!BOT_TOKEN) return;
  try {
    if (fs.existsSync(photoPath)) {
      const formData = new FormData();
      const blob = new Blob([fs.readFileSync(photoPath)]);
      formData.append('chat_id', chatId);
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
      formData.append('photo', blob, path.basename(photoPath));
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });
      return;
    }
  } catch (_) {}
  await tgSend(chatId, caption);
}

const taskInclude = {
  type: true,
  team: { include: { teamTypes: { include: { type: true } } } },
  assignee: { select: { id: true, firstName: true, username: true } },
} as const;

function enrichTask(t: any) {
  return {
    ...t,
    sp: calcSP(t.impostsPerItem, t.qtyItems),
    isOverdue: t.status !== 'Done' && isOverdue(t.plannedDate),
  };
}

export async function tasksRouter(app: FastifyInstance) {

  // ─── GET /api/tasks ───────────────────────────────────────────
  app.get('/', async (request, reply) => {
    const user = (request as any).currentUser;
    const query = request.query as any;
    const where: any = {};

    if (user.role === 'worker') {
      if (!user.teamId) return reply.send([]);

      // Якщо пул задач — фільтруємо по компетенціях працівника
      if (query.mine !== 'true') {
        where.teamId = user.teamId;
        // Отримуємо типи конструкцій які цей працівник вміє
        const userTypes = await prisma.userCompetency.findMany({
          where: { userId: user.id },
          select: { typeId: true }
        });
        if (userTypes.length > 0) {
          where.typeId = { in: userTypes.map((c) => c.typeId) };
        }
      }
    }

    if (query.teamId) where.teamId = parseInt(query.teamId);
    if (query.status) where.status = query.status;
    if (query.typeId) where.typeId = parseInt(query.typeId);

    if (query.dateFrom || query.dateTo) {
      where.plannedDate = {};
      if (query.dateFrom) where.plannedDate.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const to = new Date(query.dateTo); to.setHours(23, 59, 59, 999);
        where.plannedDate.lte = to;
      }
    }

    if (query.overdue === 'true') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      where.plannedDate = { lt: today };
      where.status = { in: ['New', 'InProgress', 'Rework'] };
    }

    if (query.mine === 'true') {
      where.assigneeUserId = user.id;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ plannedDate: 'asc' }, { id: 'asc' }],
    });

    return tasks.map(enrichTask);
  });

  // ─── GET /api/tasks/:id ───────────────────────────────────────
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as any;
    const task = await prisma.task.findUnique({ where: { id: parseInt(id) }, include: taskInclude });
    if (!task) return reply.status(404).send({ error: 'Not found' });
    return enrichTask(task);
  });

  // ─── POST /api/tasks — створення ─────────────────────────────
  app.post('/', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });
    const body = request.body as any;

    // Якщо teamId не вказано — визначаємо по типу
    let teamId: number | null = body.teamId ? parseInt(body.teamId) : null;

    if (!teamId && body.typeId) {
      const teamType = await prisma.teamType.findFirst({
        where: { typeId: parseInt(body.typeId) },
      });
      teamId = teamType?.teamId ?? null;
    }

    const task = await prisma.task.create({
      data: {
        batch: body.batch,
        cell: body.cell,
        typeId: parseInt(body.typeId),
        qtyItems: parseInt(body.qtyItems),
        impostsPerItem: parseInt(body.impostsPerItem ?? '0'),
        plannedDate: new Date(body.plannedDate),
        description: body.description ?? null,
        photoUrl: body.photoUrl ?? null,
        teamId,
        status: 'New',
      },
      include: taskInclude,
    });

    // Пуш новим задачам — всім членам команди крім того хто створив
    if (teamId) {
      const workers = await prisma.user.findMany({
        where: { teamId, role: { in: ['worker', 'admin'] }, id: { not: user.id } },
      });
      const sp = calcSP(task.impostsPerItem, task.qtyItems);
      const text =
        `🆕 <b>Нова задача!</b>\n\n` +
        `📦 Партія: <b>${task.batch}</b> / Комірка: <b>${task.cell}</b>\n` +
        `🏗 Тип: <b>${task.type.code} — ${task.type.label}</b>\n` +
        `🔢 ${task.qtyItems} шт.${task.impostsPerItem ? ` · ${task.impostsPerItem} імп.` : ''} · 💎 <b>${sp} СП</b>\n` +
        `📅 ${new Date(task.plannedDate).toLocaleDateString('uk-UA')}` +
        `${task.description ? `\n\n📝 ${task.description}` : ''}`;

      for (const worker of workers) {
        if (task.photoUrl) {
          const photoPath = path.join(process.cwd(), task.photoUrl);
          await tgSendPhoto(worker.telegramId, photoPath, text);
        } else {
          await tgSend(worker.telegramId, text);
        }
      }
    }

    return enrichTask(task);
  });

  // ─── PUT /api/tasks/:id ───────────────────────────────────────
  app.put('/:id', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });
    const { id } = request.params as any;
    const body = request.body as any;

    // Якщо поміняли тип — переобраховуємо бригаду
    let teamId = body.teamId !== undefined ? (body.teamId ? parseInt(body.teamId) : null) : undefined;
    if (body.typeId && body.teamId === undefined) {
      const teamType = await prisma.teamType.findFirst({ where: { typeId: parseInt(body.typeId) } });
      teamId = teamType?.teamId ?? null;
    }

    const task = await prisma.task.update({
      where: { id: parseInt(id) },
      data: {
        ...(body.batch   !== undefined ? { batch: body.batch } : {}),
        ...(body.cell    !== undefined ? { cell: body.cell } : {}),
        ...(body.typeId  !== undefined ? { typeId: parseInt(body.typeId) } : {}),
        ...(body.qtyItems !== undefined ? { qtyItems: parseInt(body.qtyItems) } : {}),
        ...(body.impostsPerItem !== undefined ? { impostsPerItem: parseInt(body.impostsPerItem) } : {}),
        ...(body.plannedDate !== undefined ? { plannedDate: new Date(body.plannedDate) } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.photoUrl !== undefined ? { photoUrl: body.photoUrl } : {}),
        ...(teamId !== undefined ? { teamId } : {}),
      },
      include: taskInclude,
    });
    return enrichTask(task);
  });

  // ─── POST /api/tasks/:id/photo — завантаження фото ───────────
  app.post('/:id/photo', { config: { rawBody: true } }, async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });

    const { id } = request.params as any;
    const data = await (request as any).file();
    if (!data) return reply.status(400).send({ error: 'No file' });

    const ext = path.extname(data.filename) || '.jpg';
    const filename = `task_${id}_${Date.now()}${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    fs.writeFileSync(filepath, Buffer.concat(chunks));

    const photoUrl = `/uploads/${filename}`;
    await prisma.task.update({ where: { id: parseInt(id) }, data: { photoUrl } });
    return { photoUrl };
  });

  // ─── PATCH /api/tasks/:id/status ─────────────────────────────
  app.patch('/:id/status', async (request, reply) => {
    const user = (request as any).currentUser;
    const { id } = request.params as any;
    const body = request.body as any;

    const task = await prisma.task.findUnique({ where: { id: parseInt(id) }, include: { type: true } });
    if (!task) return reply.status(404).send({ error: 'Not found' });

    // Перевірка компетенції працівника
    if (user.role === 'worker' && body.status === 'InProgress') {
      const hasComp = await prisma.userCompetency.findFirst({
        where: { userId: user.id, typeId: task.typeId }
      });
      if (!hasComp) {
        return reply.status(403).send({ error: 'Ця задача не відповідає вашим компетенціям' });
      }
    }

    const now = new Date();
    let updateData: any = {};

    if (body.status === 'InProgress') {
      if (task.status !== 'New' && task.status !== 'Rework') return reply.status(400).send({ error: 'Invalid transition' });
      if (task.status === 'Rework' && user.role !== 'admin') return reply.status(403).send({ error: 'Only admin can approve rework' });
      updateData = {
        status: 'InProgress',
        assigneeUserId: task.status === 'New' ? user.id : task.assigneeUserId,
        ...(task.status === 'Rework' ? { reworkApprovedAt: now } : {}),
      };

      // Пуш виконавцю при підтвердженні переробки
      if (task.status === 'Rework' && task.assigneeUserId) {
        const assignee = await prisma.user.findUnique({ where: { id: task.assigneeUserId } });
        if (assignee) {
          await tgSend(
            assignee.telegramId,
            `✅ <b>Переробку підтверджено!</b>\n\n📋 Задача #${task.id} · ${task.batch}/${task.cell}\n🏗 ${task.type.code} — ${task.type.label}`
          );
        }
      }
    } else if (body.status === 'Done') {
      if (task.status !== 'InProgress') return reply.status(400).send({ error: 'Invalid transition' });
      if (task.assigneeUserId !== user.id && user.role !== 'admin') return reply.status(403).send({ error: 'Not your task' });
      if (isOverdue(task.plannedDate, now) && !body.lateComment) return reply.status(400).send({ error: 'late_comment required' });
      updateData = {
        status: 'Done',
        doneAt: now,
        ...(task.reworkApprovedAt ? { reworkDoneAt: now } : {}),
        ...(body.lateComment ? { lateComment: body.lateComment } : {}),
      };

      // Пуш адмінам при виконанні
      const admins = await prisma.user.findMany({ where: { role: 'admin' } });
      const workerName = (await prisma.user.findUnique({ where: { id: user.id } }))?.firstName ?? 'Працівник';
      for (const admin of admins) {
        await tgSend(
          admin.telegramId,
          `✅ <b>Задача виконана!</b>\n\n📋 #${task.id} · ${task.batch}/${task.cell}\n🏗 ${task.type.code} — ${task.type.label}\n👷 ${workerName}` +
          (body.lateComment ? `\n⚠️ Прострочка: ${body.lateComment}` : '')
        );
      }
    } else if (body.status === 'Rework') {
      if (task.status !== 'InProgress') return reply.status(400).send({ error: 'Invalid transition' });
      if (!body.reworkComment) return reply.status(400).send({ error: 'rework_comment required' });
      updateData = { status: 'Rework', reworkComment: body.reworkComment, reworkRequestedAt: now };

      // Пуш адмінам з кнопкою підтвердження
      const admins = await prisma.user.findMany({ where: { role: 'admin' } });
      const workerName = (await prisma.user.findUnique({ where: { id: user.id } }))?.firstName ?? 'Працівник';
      for (const admin of admins) {
        await tgSend(
          admin.telegramId,
          `⚠️ <b>Запит переробки #${task.id}</b>\n\n📋 ${task.batch}/${task.cell}\n🏗 ${task.type.code} — ${task.type.label}\n👷 ${workerName}\n\n📝 ${body.reworkComment}`
        );
      }
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: updateData,
      include: taskInclude,
    });
    return enrichTask(updated);
  });

  // ─── DELETE /api/tasks/:id ────────────────────────────────────
  app.delete('/:id', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });
    const { id } = request.params as any;
    await prisma.task.delete({ where: { id: parseInt(id) } });
    return { success: true };
  });

  // ─── PATCH /api/tasks/bulk/date ───────────────────────────────
  app.patch('/bulk/date', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });
    const { ids, plannedDate } = request.body as any;
    if (!ids?.length || !plannedDate) return reply.status(400).send({ error: 'ids and plannedDate required' });
    await prisma.task.updateMany({ where: { id: { in: ids } }, data: { plannedDate: new Date(plannedDate) } });
    return { updated: ids.length };
  });
}
