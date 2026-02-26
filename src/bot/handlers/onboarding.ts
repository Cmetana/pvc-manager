import { Bot, InlineKeyboard } from 'grammy';
import { prisma } from '../../db/client';

const ROLE_LABELS: Record<string, string> = {
  admin: '👑 Адмін',
  worker: '👷 Працівник',
  banned: '🚫 Заблоковано',
  pending: '⏳ Очікує',
};

export function setupOnboarding(bot: Bot) {
  // ─── /start ───────────────────────────────────────────────────
  bot.command('start', async (ctx) => {
    const tgId     = String(ctx.from!.id);
    const username = ctx.from!.username ?? null;
    const firstName = ctx.from!.first_name ?? null;
    const lastName  = ctx.from!.last_name ?? null;

    let user = await prisma.user.findUnique({ where: { telegramId: tgId } });

    if (user) {
      if (user.role === 'banned')   return ctx.reply('🚫 Ваш акаунт заблоковано. Зверніться до адміністратора.');
      if (user.role === 'pending')  return ctx.reply('⏳ Ваша заявка відправлена. Очікуйте підтвердження.');
      return sendMainMenu(ctx, bot, user.role, firstName);
    }

    // Новий — перевіряємо чи є вже адміни
    const adminsCount = await prisma.user.count({ where: { role: 'admin' } });

    user = await prisma.user.create({
      data: { telegramId: tgId, username, firstName, lastName, role: adminsCount === 0 ? 'admin' : 'pending' }
    });

    if (adminsCount === 0) {
      await ctx.reply(
        `👑 Вітаємо, ${firstName}!\n\n` +
        `Ви перший користувач — вам автоматично призначено роль <b>Адміна</b>.\n\n` +
        `Доступні команди:\n` +
        `/stats — статистика\n` +
        `/users — список користувачів\n` +
        `/pending — лист очікування`,
        { parse_mode: 'HTML' }
      );
      return sendMainMenu(ctx, bot, 'admin', firstName);
    }

    await ctx.reply(
      `👋 Вітаємо, ${firstName}!\n\n` +
      `Ваша заявка відправлена адміністратору.\n` +
      `Після підтвердження ви отримаєте повідомлення.`
    );

    // Сповіщаємо адмінів
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    for (const admin of admins) {
      try {
        const kb = new InlineKeyboard()
          .text('👑 Адмін',      `approve:${user.id}:admin`)
          .text('👷 Працівник',  `approve:${user.id}:worker`)
          .row()
          .text('🚫 Заблокувати', `approve:${user.id}:banned`);

        await bot.api.sendMessage(
          admin.telegramId,
          `🔔 <b>Новий користувач!</b>\n\n` +
          `👤 ${firstName}${lastName ? ' ' + lastName : ''}\n` +
          `${username ? `🔗 @${username}\n` : ''}` +
          `🆔 ${tgId}\n\nПризначте роль:`,
          { parse_mode: 'HTML', reply_markup: kb }
        );
      } catch (e) {}
    }
  });

  // ─── Callback: approve ────────────────────────────────────────
  bot.callbackQuery(/^approve:(\d+):(admin|worker|banned)$/, async (ctx) => {
    const [, userIdStr, role] = ctx.match!;

    const adminUser = await prisma.user.findUnique({ where: { telegramId: String(ctx.from.id) } });
    if (!adminUser || adminUser.role !== 'admin') return ctx.answerCallbackQuery('❌ Недостатньо прав');

    const target = await prisma.user.findUnique({ where: { id: parseInt(userIdStr) } });
    if (!target) return ctx.answerCallbackQuery('❌ Не знайдено');

    await prisma.user.update({ where: { id: target.id }, data: { role: role as any } });

    await ctx.editMessageText(
      `✅ ${target.firstName ?? target.username ?? target.telegramId} — роль: <b>${ROLE_LABELS[role]}</b>`,
      { parse_mode: 'HTML' }
    );
    await ctx.answerCallbackQuery('Оновлено!');

    // Сповіщаємо самого юзера
    const webappUrl = process.env.WEBAPP_URL ?? 'http://localhost:5173';
    const adminUrl  = process.env.ADMIN_URL  ?? 'http://localhost:5174';

    try {
      if (role === 'banned') {
        await bot.api.sendMessage(target.telegramId, '🚫 На жаль, ваш запит відхилено.');
      } else if (role === 'worker') {
        await bot.api.sendMessage(
          target.telegramId,
          `✅ <b>Акаунт активовано!</b>\n\nРоль: ${ROLE_LABELS[role]}\n\nНатисніть кнопку <b>📱 Відкрити систему</b> внизу зліва — або використайте /start`,
          { parse_mode: 'HTML' }
        );
      } else if (role === 'admin') {
        const kb = new InlineKeyboard()
        await bot.api.sendMessage(
          target.telegramId,
          `✅ <b>Акаунт активовано!</b>\n\nРоль: ${ROLE_LABELS[role]}\n\nВідкрийте адмін-панель або натисніть кнопку WebApp:`,
          { parse_mode: 'HTML', reply_markup: kb }
        );
      }
    } catch (e) {}
  });

  // ─── /menu ────────────────────────────────────────────────────
  bot.command('menu', async (ctx) => {
    const user = await prisma.user.findUnique({ where: { telegramId: String(ctx.from!.id) } });
    if (!user || user.role === 'pending') return ctx.reply('⏳ Акаунт ще не активовано.');
    if (user.role === 'banned') return ctx.reply('🚫 Акаунт заблоковано.');
    return sendMainMenu(ctx, bot, user.role, ctx.from!.first_name);
  });
}

// ─── Головне меню ─────────────────────────────────────────────
export async function sendMainMenu(ctx: any, bot: Bot, role: string, firstName?: string | null) {
  const webappUrl = process.env.WEBAPP_URL ?? 'http://localhost:5173';
  const adminUrl  = process.env.ADMIN_URL  ?? 'http://localhost:5174';
  const name = firstName ? `, ${firstName}` : '';

  if (role === 'admin') {
    // Адмін — показуємо статистику прямо в меню
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [planCount, doneCount, reworkCount, overdueCount] = await Promise.all([
      prisma.task.count({ where: { plannedDate: { gte: today, lt: tomorrow } } }),
      prisma.task.count({ where: { status: 'Done', doneAt: { gte: today } } }),
      prisma.task.count({ where: { status: 'Rework' } }),
      prisma.task.count({ where: { status: { in: ['New', 'InProgress'] }, plannedDate: { lt: today } } }),
    ]);

    const kb = new InlineKeyboard()
      .webApp('📱 Відкрити WebApp', webappUrl)
      .row()
      

    return ctx.reply(
      `👑 Привіт${name}!\n\n` +
      `📊 <b>Сьогодні:</b>\n` +
      `📋 План: <b>${planCount}</b> задач\n` +
      `✅ Виконано: <b>${doneCount}</b>\n` +
      `⚠️ Переробка: <b>${reworkCount}</b>\n` +
      `🔴 Прострочено: <b>${overdueCount}</b>\n\n` +
      `Команди: /stats /users /pending`,
      { parse_mode: 'HTML', reply_markup: kb }
    );
  }

  // Працівник
  const kb = new InlineKeyboard().webApp('📱 Відкрити систему', webappUrl);
  return ctx.reply(
    `👷 Привіт${name}!\n\nНатисніть кнопку нижче або скористайтесь кнопкою <b>📱 Відкрити систему</b> зліва внизу.`,
    { parse_mode: 'HTML', reply_markup: kb }
  );
}
