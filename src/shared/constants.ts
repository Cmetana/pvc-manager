// Статуси задач
export const TASK_STATUS = {
  New: 'New',
  InProgress: 'InProgress',
  Rework: 'Rework',
  Done: 'Done',
} as const;

// Ролі
export const ROLE = {
  admin: 'admin',
  worker: 'worker',
  banned: 'banned',
  pending: 'pending',
} as const;

// Вікно нотифікацій (08:00–20:00 Kyiv)
export const NOTIFICATION_WINDOW = {
  start: 8,  // 08:00
  end: 20,   // 20:00
};

// Часовий пояс
export const TIMEZONE = 'Europe/Kiev';

// Розрахунок СП
export function calcSP(impostsPerItem: number, qtyItems: number): number {
  return (impostsPerItem + 1) * qtyItems;
}

// Перевірка прострочки
export function isOverdue(plannedDate: Date, doneAt?: Date | null): boolean {
  const checkDate = doneAt ?? new Date();
  const planned = new Date(plannedDate);
  planned.setHours(23, 59, 59, 999);
  return checkDate > planned;
}

// Перевірка вікна нотифікацій
export function isInNotificationWindow(): boolean {
  const now = new Date();
  const kyivTime = new Intl.DateTimeFormat('uk-UA', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    hour12: false,
  }).format(now);
  const hour = parseInt(kyivTime);
  return hour >= NOTIFICATION_WINDOW.start && hour < NOTIFICATION_WINDOW.end;
}

// Форматування дати
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIMEZONE,
  });
}

// Назви статусів українською
export const STATUS_LABELS: Record<string, string> = {
  New: '🆕 Нове',
  InProgress: '🔧 В роботі',
  Rework: '⚠️ Переробка',
  Done: '✅ Виконано',
};

export const ROLE_LABELS: Record<string, string> = {
  admin: '👑 Адмін',
  worker: '👷 Працівник',
  banned: '🚫 Заблокований',
  pending: '⏳ Очікує',
};
