import { Bot, InlineKeyboard } from 'grammy';
import { prisma } from '../../db/client';
import { calcSP, isOverdue } from '../../shared/constants';

export function setupAdmin(bot: Bot) {
  // ─── /stats ───────────────────────────────────────────────────
  bot.command('stats', async (ctx) => {
    const user = await prisma.user.findUnique({ where: { telegramId: String(ctx.from!.id) } });
    if (!user || user.role !== 'admin') return ctx.reply('⛔ Тільки для адмінів');

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [planTasks, doneTasks, reworkTasks, overdueTasks] = await Promise.all([
      prisma.task.findMany({ where: { plannedDate: { gte: today, lt: tomorrow } }, include: { type: true } }),
      prisma.task.findMany({ where: { status: 'Done', doneAt: { gte: today } }, include: { type: true } }),
      prisma.task.findMany({ where: { status: 'Rework' }, include: { type: true, assignee: true } }),
      prisma.task.findMany({ where: { status: { in: ['New', 'InProgress'] }, plannedDate: { lt: today } }, include: { type: true } }),
    ]);

    const planSP = planTasks.reduce((s, t) => s + calcSP(t.impostsPerItem, t.qtyItems), 0);
    const factSP = doneTasks.reduce((s, t) => s + calcSP(t.impostsPerItem, t.qtyItems), 0);
    const pct = planSP > 0 ? Math.round((factSP / planSP) * 100) : 0;

    let text = `📊 <b>Звіт на ${today.toLocaleDateString('uk-UA')}</b>\n\n`;
    text += `📋 План: <b>${planTasks.length}</b> задач · <b>${planSP}</b> СП\n`;
    text += `✅ Виконано: <b>${doneTasks.length}</b> задач · <b>${factSP}</b> СП · <b>${pct}%</b>\n`;

    if (reworkTasks.length > 0) {
      text += `\n⚠️ <b>Переробка (${reworkTasks.length}):</b>\n`;
      for (const t of reworkTasks.slice(0, 5)) {
        text += `  #${t.id} ${t.batch}/${t.cell} · ${t.type.code}\n`;
      }
    }

    if (overdueTasks.length > 0) {
      text += `\n🔴 <b>Прострочено (${overdueTasks.length}):</b>\n`;
      for (const t of overdueTasks.slice(0, 5)) {
        text += `  #${t.id} ${t.batch}/${t.cell} · ${t.type.code}\n`;
      }
    }

    const kb = new InlineKeyboard()
      .webApp('📱 Відкрити WebApp', process.env.WEBAPP_URL ?? 'http://localhost:5173')
      .row()
      .url('🖥 Адмін-панель', process.env.ADMIN_URL ?? 'http://localhost:5174');

    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  });

  // ─── /users ───────────────────────────────────────────────────
  bot.command('users', async (ctx) => {
    const user = await prisma.user.findUnique({ where: { telegramId: String(ctx.from!.id) } });
    if (!user || user.role !== 'admin') return ctx.reply('⛔ Тільки для адмінів');

    const users = await prisma.user.findMany({
      where: { role: { in: ['admin', 'worker'] } },
      include: { team: true, competencies: { include: { type: true } } },
      orderBy: { createdAt: 'asc' },
    });

    let text = `👥 <b>Користувачі (${users.length}):</b>\n\n`;
    for (const u of users) {
      const roleMark = u.role === 'admin' ? '👑' : '👷';
      const name = u.firstName ?? u.username ?? u.telegramId;
      const types = u.competencies.map((c) => c.type.code).join(', ') || '—';
      text += `${roleMark} <b>${name}</b>`;
      if (u.team) text += ` · ${u.team.name}`;
      text += `\n   Компетенції: ${types}\n`;
    }

    await ctx.reply(text, { parse_mode: 'HTML' });
  });

  // ─── /pending ─────────────────────────────────────────────────
  bot.command('pending', async (ctx) => {
    const user = await prisma.user.findUnique({ where: { telegramId: String(ctx.from!.id) } });
    if (!user || user.role !== 'admin') return ctx.reply('⛔ Тільки для адмінів');

    const pending = await prisma.user.findMany({ where: { role: 'pending' } });

    if (pending.length === 0) return ctx.reply('✅ Лист очікування порожній');

    for (const u of pending) {
      const kb = new InlineKeyboard()
        .text('👷 Працівник', `approve:${u.id}:worker`)
        .text('👑 Адмін',    `approve:${u.id}:admin`)
        .row()
        .text('🚫 Відмовити', `approve:${u.id}:banned`);

      await ctx.reply(
        `⏳ <b>${u.firstName ?? 'Без імені'}</b>${u.username ? ` @${u.username}` : ''}\n🆔 ${u.telegramId}`,
        { parse_mode: 'HTML', reply_markup: kb }
      );
    }
  });

  // ─── Підтвердження переробки (з TasksPage) ────────────────────
  bot.callbackQuery(/^task:approve_rework:(\d+)$/, async (ctx) => {
    const taskId = parseInt(ctx.match![1]);
    const admin = await prisma.user.findUnique({ where: { telegramId: String(ctx.from.id) } });
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('❌ Тільки для адмінів');

    const task = await prisma.task.findUnique({ where: { id: taskId }, include: { type: true } });
    if (!task || task.status !== 'Rework') return ctx.answerCallbackQuery('❌ Задача не в статусі Переробки');

    const now = new Date();
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'InProgress', reworkApprovedAt: now }
    });

    await ctx.editMessageText(
      `✅ Переробка #${taskId} підтверджена · ${task.batch}/${task.cell}`,
      { parse_mode: 'HTML' }
    );
    await ctx.answerCallbackQuery('Переробку підтверджено!');

    // Пуш виконавцю
    if (task.assigneeUserId) {
      const assignee = await prisma.user.findUnique({ where: { id: task.assigneeUserId } });
      if (assignee) {
        try {
          await bot.api.sendMessage(
            assignee.telegramId,
            `✅ <b>Переробку підтверджено!</b>\n\n📋 Задача #${taskId} · ${task.batch}/${task.cell}\n🏗 ${task.type.code} — ${task.type.label}\n\nМожете продовжувати виконання.`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {}
      }
    }
  });
}
