import 'dotenv/config';
import { Bot } from 'grammy';
import { prisma } from '../db/client';
import { setupOnboarding } from './handlers/onboarding';
import { setupTaskHandlers } from './handlers/tasks';
import { setupHelpHandlers } from './handlers/help';
import { setupAdmin } from './handlers/admin';
import { startCronJobs } from './cron';

const token = process.env.BOT_TOKEN;
if (!token) { console.error('❌ BOT_TOKEN не задано в .env'); process.exit(1); }

const bot = new Bot(token);
(globalThis as any).bot = bot;

setupOnboarding(bot);
setupTaskHandlers(bot);
setupHelpHandlers(bot);
setupAdmin(bot);

bot.catch((err) => {
  console.error('Bot error:', err.message);
});

bot.start({
  onStart: async (info) => {
    console.log(`🤖 Бот @${info.username} запущено`);

    const webappUrl = process.env.WEBAPP_URL ?? 'http://localhost:5173';
    try {
      await bot.api.setChatMenuButton({
        menu_button: { type: 'web_app', text: '📱 Відкрити систему', web_app: { url: webappUrl } }
      });
      console.log(`📱 Кнопка WebApp: ${webappUrl}`);
    } catch (e: any) {
      console.log('⚠️  Кнопка меню потребує HTTPS (ngrok).');
    }

    await bot.api.setMyCommands([
      { command: 'start',   description: '🏠 Головне меню' },
      { command: 'stats',   description: '📊 Статистика на сьогодні' },
      { command: 'users',   description: '👥 Список користувачів' },
      { command: 'pending', description: '⏳ Лист очікування' },
      { command: 'help',    description: '🆘 Запит допомоги' },
    ]);

    await prisma.$connect();
    startCronJobs(bot);
  },
});
