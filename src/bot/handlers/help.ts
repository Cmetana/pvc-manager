import { Bot, InlineKeyboard } from 'grammy';
import { prisma } from '../../db/client';

export function setupHelpHandlers(bot: Bot) {
  // ─── Callback / команда: help:start ──────────────────────────
  bot.callbackQuery('help:start', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      '🆘 <b>Запит допомоги</b>\n\n' +
      'Надішліть повідомлення у форматі:\n\n' +
      '<code>допомога: ваш опис проблеми</code>\n\n' +
      'Або якщо прив\'язано до задачі:\n' +
      '<code>допомога:#123: ваш опис проблеми</code>\n\n' +
      'До повідомлення можна прикріпити фото.',
      { parse_mode: 'HTML' }
    );
  });

  bot.command('help', async (ctx) => {
    const user = await prisma.user.findUnique({
      where: { telegramId: String(ctx.from!.id) },
    });
    if (!user || user.role === 'pending' || user.role === 'banned') return;

    await ctx.reply(
      '🆘 <b>Запит допомоги</b>\n\n' +
      'Надішліть повідомлення:\n\n' +
      '<code>допомога: ваш опис проблеми</code>\n\n' +
      'Або з прив\'язкою до задачі:\n' +
      '<code>допомога:#123: опис</code>',
      { parse_mode: 'HTML' }
    );
  });

  // ─── Текст: допомога: ... або допомога:#taskId: ... ──────────
  bot.hears(/^допомога:(?:#(\d+):)?(.+)$/is, async (ctx) => {
    const [, taskIdStr, message] = ctx.match!;
    const user = await prisma.user.findUnique({
      where: { telegramId: String(ctx.from.id) },
    });

    if (!user || user.role === 'pending' || user.role === 'banned') return;

    const taskId = taskIdStr ? parseInt(taskIdStr) : null;

    // Зберігаємо запит
    const helpRequest = await prisma.helpRequest.create({
      data: {
        userId: user.id,
        taskId: taskId ?? null,
        message: message.trim(),
        category: 'other',
      },
    });

    await ctx.reply(
      `✅ Запит #${helpRequest.id} відправлено адміністратору.\nОчікуйте відповіді.`
    );

    // Сповіщаємо адмінів
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    let taskInfo = '';

    if (taskId) {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { type: true },
      });
      if (task) {
        taskInfo = `\n📋 Задача #${taskId}: ${task.batch}/${task.cell} (${task.type.name})`;
      }
    }

    for (const admin of admins) {
      try {
        await bot.api.sendMessage(
          admin.telegramId,
          `🆘 <b>Запит допомоги #${helpRequest.id}</b>\n\n` +
          `👤 Від: ${user.firstName ?? user.username ?? user.telegramId}` +
          (user.username ? ` (@${user.username})` : '') + '\n' +
          taskInfo +
          `\n\n📝 Повідомлення:\n${message.trim()}`,
          { parse_mode: 'HTML' }
        );
      } catch (e) {
        console.error('Помилка сповіщення адміна:', e);
      }
    }
  });
}
