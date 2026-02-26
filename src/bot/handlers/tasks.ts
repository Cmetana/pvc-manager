import { Bot, InlineKeyboard } from 'grammy';
import { prisma } from '../../db/client';
import { calcSP, formatDate, isOverdue, STATUS_LABELS } from '../../shared/constants';

export function setupTaskHandlers(bot: Bot) {
  // ─── Callback: task:view:taskId ──────────────────────────────
  bot.callbackQuery(/^task:view:(\d+)$/, async (ctx) => {
    const taskId = parseInt(ctx.match![1]);
    const user = await prisma.user.findUnique({
      where: { telegramId: String(ctx.from.id) },
    });

    if (!user) return ctx.answerCallbackQuery('❌ Не авторизовано');

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { type: true, team: true, assignee: true },
    });

    if (!task) return ctx.answerCallbackQuery('❌ Задачу не знайдено');

    const sp = calcSP(task.impostsPerItem, task.qtyItems);
    const overdue = task.status !== 'Done' && isOverdue(task.plannedDate);

    const text =
      `📋 <b>Задача #${task.id}</b>\n\n` +
      `📦 Партія: <b>${task.batch}</b> / Комірка: <b>${task.cell}</b>\n` +
      `🏗 Тип: ${task.type.name}\n` +
      `🔢 Кількість: ${task.qtyItems} шт.\n` +
      `📐 Імпости: ${task.impostsPerItem}\n` +
      `💎 СП: <b>${sp}</b>\n` +
      `📅 Дата: ${formatDate(task.plannedDate)}${overdue ? ' ⚠️ <b>ПРОСТРОЧЕНО</b>' : ''}\n` +
      `📊 Статус: ${STATUS_LABELS[task.status]}\n` +
      (task.assignee ? `👤 Виконавець: ${task.assignee.firstName ?? task.assignee.username}\n` : '') +
      (task.reworkComment ? `\n⚠️ Причина переробки: ${task.reworkComment}\n` : '');

    const keyboard = new InlineKeyboard();

    if (task.status === 'New' && task.assigneeUserId === null) {
      keyboard.text('▶️ Взяти в роботу', `task:take:${task.id}`).row();
    }
    if (task.status === 'InProgress' && task.assigneeUserId === user.id) {
      keyboard.text('✅ Виконано', `task:done:${task.id}`).row();
      keyboard.text('⚠️ Переробка', `task:rework:${task.id}`).row();
    }
    if (task.status === 'Rework' && user.role === 'admin') {
      keyboard.text('✅ Підтвердити переробку', `task:approve_rework:${task.id}`).row();
    }

    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  // ─── Callback: task:take:taskId ──────────────────────────────
  bot.callbackQuery(/^task:take:(\d+)$/, async (ctx) => {
    const taskId = parseInt(ctx.match![1]);
    const user = await prisma.user.findUnique({
      where: { telegramId: String(ctx.from.id) },
    });

    if (!user || (user.role !== 'worker' && user.role !== 'admin')) {
      return ctx.answerCallbackQuery('❌ Недостатньо прав');
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.status !== 'New') {
      return ctx.answerCallbackQuery('❌ Задача вже в роботі');
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'InProgress', assigneeUserId: user.id },
    });

    await ctx.answerCallbackQuery('✅ Задача взята в роботу!');
    await ctx.editMessageText(
      `✅ Ви взяли задачу #${taskId} в роботу!\n\nВідкрийте WebApp щоб керувати задачами.`
    );
  });

  // ─── Callback: task:done:taskId ──────────────────────────────
  bot.callbackQuery(/^task:done:(\d+)$/, async (ctx) => {
    const taskId = parseInt(ctx.match![1]);
    const user = await prisma.user.findUnique({
      where: { telegramId: String(ctx.from.id) },
    });

    if (!user) return ctx.answerCallbackQuery('❌ Не авторизовано');

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.status !== 'InProgress' || task.assigneeUserId !== user.id) {
      return ctx.answerCallbackQuery('❌ Неможливо виконати цю дію');
    }

    const now = new Date();
    const overdue = isOverdue(task.plannedDate, now);

    if (overdue) {
      // Просимо коментар причини прострочки
      await ctx.answerCallbackQuery('⚠️ Задача прострочена — потрібен коментар');
      await ctx.editMessageText(
        `⚠️ <b>Задача прострочена!</b>\n\n` +
        `Будь ласка, напишіть причину прострочки.\n\n` +
        `Надішліть текст у відповідь на це повідомлення:\n` +
        `<code>причина:${taskId}:ваш коментар тут</code>`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    // Позначаємо як виконано
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'Done', doneAt: now },
    });

    await ctx.answerCallbackQuery('✅ Виконано!');
    await ctx.editMessageText(`✅ Задача #${taskId} відмічена як виконана!`);
  });

  // ─── Текст: причина:taskId:коментар ──────────────────────────
  bot.hears(/^причина:(\d+):(.+)$/, async (ctx) => {
    const [, taskIdStr, comment] = ctx.match!;
    const taskId = parseInt(taskIdStr);
    const user = await prisma.user.findUnique({
      where: { telegramId: String(ctx.from.id) },
    });

    if (!user) return;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.assigneeUserId !== user.id) {
      return ctx.reply('❌ Задачу не знайдено або ви не є виконавцем');
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'Done',
        doneAt: new Date(),
        lateComment: comment.trim(),
      },
    });

    await ctx.reply(`✅ Задача #${taskId} виконана!\n📝 Причина прострочки збережена.`);
  });

  // ─── Callback: task:rework:taskId ────────────────────────────
  bot.callbackQuery(/^task:rework:(\d+)$/, async (ctx) => {
    const taskId = ctx.match![1];

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `⚠️ <b>Переробка задачі #${taskId}</b>\n\n` +
      `Опишіть причину переробки:\n\n` +
      `Надішліть:\n<code>переробка:${taskId}:ваш коментар тут</code>`,
      { parse_mode: 'HTML' }
    );
  });

  // ─── Текст: переробка:taskId:коментар ────────────────────────
  bot.hears(/^переробка:(\d+):(.+)$/, async (ctx) => {
    const [, taskIdStr, comment] = ctx.match!;
    const taskId = parseInt(taskIdStr);
    const user = await prisma.user.findUnique({
      where: { telegramId: String(ctx.from.id) },
    });

    if (!user) return;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { type: true },
    });

    if (!task || task.status !== 'InProgress' || task.assigneeUserId !== user.id) {
      return ctx.reply('❌ Задачу не знайдено або ви не є виконавцем');
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'Rework',
        reworkComment: comment.trim(),
        reworkRequestedAt: new Date(),
      },
    });

    await ctx.reply(`⚠️ Задача #${taskId} відправлена на переробку.\nАдмін буде сповіщений.`);

    // Сповіщаємо адмінів
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    for (const admin of admins) {
      try {
        const keyboard = new InlineKeyboard()
          .text('✅ Підтвердити переробку', `task:approve_rework:${taskId}`);

        await bot.api.sendMessage(
          admin.telegramId,
          `⚠️ <b>Переробка задачі #${taskId}</b>\n\n` +
          `📦 ${task.batch} / ${task.cell}\n` +
          `🏗 ${task.type.name}\n` +
          `👤 Ініціатор: ${user.firstName ?? user.username}\n\n` +
          `📝 Причина: ${comment}\n\n` +
          `Підтвердіть переробку:`,
          { parse_mode: 'HTML', reply_markup: keyboard }
        );
      } catch (e) {
        console.error('Помилка сповіщення адміна:', e);
      }
    }
  });

  // ─── Callback: task:approve_rework:taskId ────────────────────
  bot.callbackQuery(/^task:approve_rework:(\d+)$/, async (ctx) => {
    const taskId = parseInt(ctx.match![1]);
    const admin = await prisma.user.findUnique({
      where: { telegramId: String(ctx.from.id) },
    });

    if (!admin || admin.role !== 'admin') {
      return ctx.answerCallbackQuery('❌ Тільки для адмінів');
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: true },
    });

    if (!task || task.status !== 'Rework') {
      return ctx.answerCallbackQuery('❌ Задача не в статусі Переробка');
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'InProgress',
        reworkApprovedAt: new Date(),
      },
    });

    await ctx.answerCallbackQuery('✅ Переробку підтверджено');
    await ctx.editMessageText(`✅ Переробку задачі #${taskId} підтверджено. Задача повернута в роботу.`);

    // Сповіщаємо виконавця
    if (task.assignee) {
      try {
        await bot.api.sendMessage(
          task.assignee.telegramId,
          `✅ <b>Переробку підтверджено!</b>\n\n` +
          `Задача #${taskId} (${task.batch}/${task.cell}) повернута в роботу.\n` +
          `Можете продовжувати!`,
          { parse_mode: 'HTML' }
        );
      } catch (e) {
        console.error('Помилка сповіщення виконавця:', e);
      }
    }
  });
}
