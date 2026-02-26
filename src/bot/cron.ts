import cron from 'node-cron';
import { Bot } from 'grammy';
import { prisma } from '../db/client';
import { calcSP, isInNotificationWindow } from '../shared/constants';
import { sendDailyReport } from './handlers/admin';

export function startCronJobs(bot: Bot) {
  // ─── Звіт адмінам кожні 3 години (08:00–20:00) ───────────────
  // Запускається о 08:00, 11:00, 14:00, 17:00, 20:00
  cron.schedule('0 8,11,14,17,20 * * *', async () => {
    console.log('📊 Відправка звіту план/факт адмінам...');
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    for (const admin of admins) {
      await sendDailyReport(admin.telegramId);
    }
  }, { timezone: 'Europe/Kiev' });

  // ─── Прострочені задачі о 10:00 ──────────────────────────────
  cron.schedule('0 10 * * *', async () => {
    console.log('⚠️ Перевірка прострочених задач...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = await prisma.task.findMany({
      where: {
        plannedDate: { lt: today },
        status: { in: ['New', 'InProgress', 'Rework'] },
      },
      include: { team: true, type: true, assignee: true },
    });

    if (overdueTasks.length === 0) return;

    // Групуємо по виконавцях
    const byWorker = new Map<string, typeof overdueTasks>();
    for (const task of overdueTasks) {
      if (task.assignee) {
        const tid = task.assignee.telegramId;
        if (!byWorker.has(tid)) byWorker.set(tid, []);
        byWorker.get(tid)!.push(task);
      }
    }

    // Сповіщаємо кожного виконавця
    for (const [telegramId, tasks] of byWorker) {
      try {
        const lines = tasks
          .map((t) => `• #${t.id} ${t.batch}/${t.cell} (${t.type.name})`)
          .join('\n');

        await bot.api.sendMessage(
          telegramId,
          `⚠️ <b>Прострочені задачі (${tasks.length})</b>\n\n${lines}\n\n` +
          `Будь ласка, завершіть або повідомте адміна.`,
          { parse_mode: 'HTML' }
        );
      } catch (e) {
        console.error('Помилка сповіщення:', e);
      }
    }

    // Сповіщаємо адмінів про всі прострочення
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    const lines = overdueTasks
      .map((t) => `• #${t.id} ${t.batch}/${t.cell} — ${t.status}${t.assignee ? ` (${t.assignee.firstName ?? t.assignee.username})` : ' (не призначено)'}`)
      .join('\n');

    for (const admin of admins) {
      try {
        await bot.api.sendMessage(
          admin.telegramId,
          `⚠️ <b>Прострочені задачі: ${overdueTasks.length}</b>\n\n${lines}`,
          { parse_mode: 'HTML' }
        );
      } catch (e) {
        console.error('Помилка сповіщення адміна:', e);
      }
    }
  }, { timezone: 'Europe/Kiev' });

  console.log('⏰ Крон-задачі запущено');
}
