import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';
import { calcSP } from '../../shared/constants';

interface SheetRow {
  batch: string;
  cell: string;
  type: string;
  qtyItems: number;
  impostsPerItem: number;
  plannedDate: string;
}

interface ImportMapping {
  batch: string;
  cell: string;
  type: string;
  qtyItems: string;
  impostsPerItem: string;
  plannedDate: string;
}

// Парсимо публічну Google Sheet через CSV export URL
async function fetchSheetData(spreadsheetId: string, sheetName: string): Promise<string[][]> {
  const encodedSheet = encodeURIComponent(sheetName);
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Не вдалося отримати таблицю. Переконайтеся що вона відкрита для перегляду (статус: ${res.status})`);
  }

  const text = await res.text();

  // Парсимо CSV вручну (враховуємо лапки)
  const rows: string[][] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    rows.push(cols);
  }

  return rows;
}

// Витягуємо spreadsheetId з URL
function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export async function importRouter(app: FastifyInstance) {

  // ─── POST /api/import/preview ─────────────────────────────────
  // Повертає прев'ю рядків без збереження
  app.post('/preview', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });

    const body = request.body as {
      url: string;
      sheetName: string;
      mapping: ImportMapping;
      hasHeader: boolean;
    };

    const spreadsheetId = extractSpreadsheetId(body.url);
    if (!spreadsheetId) {
      return reply.status(400).send({ error: 'Невалідний URL Google Sheets' });
    }

    try {
      const rows = await fetchSheetData(spreadsheetId, body.sheetName || 'Sheet1');
      const dataRows = body.hasHeader ? rows.slice(1) : rows;

      // Індекси колонок з mapping (A=0, B=1, ...)
      const colIndex = (col: string) => col.toUpperCase().charCodeAt(0) - 65;

      const constructTypes = await prisma.constructType.findMany({ where: { isActive: true } });
      const typeMap = new Map(constructTypes.map((t) => [t.name.toLowerCase(), t]));

      const preview: Array<{
        row: number;
        data: SheetRow;
        typeFound: boolean;
        errors: string[];
      }> = [];

      for (let i = 0; i < Math.min(dataRows.length, 100); i++) {
        const row = dataRows[i];
        const errors: string[] = [];

        const batch = row[colIndex(body.mapping.batch)] ?? '';
        const cell = row[colIndex(body.mapping.cell)] ?? '';
        const typeName = row[colIndex(body.mapping.type)] ?? '';
        const qtyRaw = row[colIndex(body.mapping.qtyItems)] ?? '';
        const impostsRaw = row[colIndex(body.mapping.impostsPerItem)] ?? '';
        const dateRaw = row[colIndex(body.mapping.plannedDate)] ?? '';

        if (!batch) errors.push('Партія порожня');
        if (!cell) errors.push('Комірка порожня');
        if (!typeName) errors.push('Тип порожній');

        const qtyItems = parseInt(qtyRaw);
        const impostsPerItem = parseInt(impostsRaw);
        if (isNaN(qtyItems) || qtyItems < 1) errors.push(`Невалідна кількість: "${qtyRaw}"`);
        if (isNaN(impostsPerItem) || impostsPerItem < 0) errors.push(`Невалідні імпости: "${impostsRaw}"`);

        // Парсимо дату (підтримуємо DD.MM.YYYY і YYYY-MM-DD)
        let plannedDate = '';
        if (dateRaw) {
          if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateRaw)) {
            const [d, m, y] = dateRaw.split('.');
            plannedDate = `${y}-${m}-${d}`;
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
            plannedDate = dateRaw;
          } else {
            errors.push(`Невалідна дата: "${dateRaw}" (очікується DD.MM.YYYY)`);
          }
        } else {
          errors.push('Дата порожня');
        }

        const typeFound = typeMap.has(typeName.toLowerCase());
        if (!typeFound && typeName) errors.push(`Тип "${typeName}" не знайдено в довіднику`);

        preview.push({
          row: i + (body.hasHeader ? 2 : 1),
          data: { batch, cell, type: typeName, qtyItems, impostsPerItem, plannedDate },
          typeFound,
          errors,
        });
      }

      return {
        totalRows: dataRows.length,
        preview,
        validRows: preview.filter((p) => p.errors.length === 0).length,
        invalidRows: preview.filter((p) => p.errors.length > 0).length,
      };
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  // ─── POST /api/import/execute ─────────────────────────────────
  // Виконує реальний імпорт
  app.post('/execute', async (request, reply) => {
    const user = (request as any).currentUser;
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' });

    const body = request.body as {
      url: string;
      sheetName: string;
      mapping: ImportMapping;
      hasHeader: boolean;
      mode: 'add' | 'update'; // add = тільки нові, update = оновити по batch+cell
    };

    const spreadsheetId = extractSpreadsheetId(body.url);
    if (!spreadsheetId) {
      return reply.status(400).send({ error: 'Невалідний URL Google Sheets' });
    }

    try {
      const rows = await fetchSheetData(spreadsheetId, body.sheetName || 'Sheet1');
      const dataRows = body.hasHeader ? rows.slice(1) : rows;
      const colIndex = (col: string) => col.toUpperCase().charCodeAt(0) - 65;

      const constructTypes = await prisma.constructType.findMany({
        where: { isActive: true },
        include: { competency: true },
      });
      const typeMap = new Map(constructTypes.map((t) => [t.name.toLowerCase(), t]));

      const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + (body.hasHeader ? 2 : 1);

        try {
          const batch = row[colIndex(body.mapping.batch)]?.trim() ?? '';
          const cell = row[colIndex(body.mapping.cell)]?.trim() ?? '';
          const typeName = row[colIndex(body.mapping.type)]?.trim() ?? '';
          const qtyItems = parseInt(row[colIndex(body.mapping.qtyItems)] ?? '');
          const impostsPerItem = parseInt(row[colIndex(body.mapping.impostsPerItem)] ?? '0');
          const dateRaw = row[colIndex(body.mapping.plannedDate)]?.trim() ?? '';

          if (!batch || !cell || !typeName) { results.skipped++; continue; }
          if (isNaN(qtyItems)) { results.errors.push(`Рядок ${rowNum}: невалідна кількість`); continue; }

          const constructType = typeMap.get(typeName.toLowerCase());
          if (!constructType) { results.errors.push(`Рядок ${rowNum}: тип "${typeName}" не знайдено`); continue; }

          // Парсимо дату
          let plannedDate: Date;
          if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateRaw)) {
            const [d, m, y] = dateRaw.split('.');
            plannedDate = new Date(`${y}-${m}-${d}`);
          } else {
            plannedDate = new Date(dateRaw);
          }
          if (isNaN(plannedDate.getTime())) { results.errors.push(`Рядок ${rowNum}: невалідна дата`); continue; }

          // Визначаємо підкоманду по компетенції типу
          let teamId: number | null = null;
          const workerWithComp = await prisma.userCompetency.findFirst({
            where: { competencyId: constructType.competencyId },
            include: { user: true },
          });
          teamId = workerWithComp?.user.teamId ?? null;

          const taskData = {
            batch,
            cell,
            typeId: constructType.id,
            qtyItems,
            impostsPerItem: isNaN(impostsPerItem) ? 0 : impostsPerItem,
            plannedDate,
            teamId,
            status: 'New' as const,
          };

          if (body.mode === 'update') {
            // Шукаємо існуючу задачу по batch+cell
            const existing = await prisma.task.findFirst({
              where: { batch, cell, status: { in: ['New', 'InProgress'] } },
            });

            if (existing) {
              await prisma.task.update({
                where: { id: existing.id },
                data: {
                  typeId: taskData.typeId,
                  qtyItems: taskData.qtyItems,
                  impostsPerItem: taskData.impostsPerItem,
                  plannedDate: taskData.plannedDate,
                  teamId: taskData.teamId,
                },
              });
              results.updated++;
            } else {
              await prisma.task.create({ data: taskData });
              results.created++;
            }
          } else {
            await prisma.task.create({ data: taskData });
            results.created++;
          }
        } catch (e: any) {
          results.errors.push(`Рядок ${rowNum}: ${e.message}`);
        }
      }

      // Сповіщаємо підкоманди якщо є нові задачі
      if (results.created > 0) {
        const bot = (globalThis as any).bot;
        if (bot) {
          const teams = await prisma.team.findMany();
          for (const team of teams) {
            const workers = await prisma.user.findMany({ where: { teamId: team.id, role: 'worker' } });
            for (const worker of workers) {
              try {
                await bot.api.sendMessage(
                  worker.telegramId,
                  `📥 <b>Імпорт задач</b>\n\nДо вашої бригади додано нових задач: <b>${results.created}</b>\nВідкрийте WebApp щоб переглянути.`,
                  { parse_mode: 'HTML' }
                );
              } catch {}
            }
          }
        }
      }

      return results;
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });
}
