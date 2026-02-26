import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Запуск seed...');

  // ─── Типи конструкцій (з кодами) ─────────────────────────────
  const types = await Promise.all([
    prisma.constructType.upsert({ where: { code: 'K'   }, update: { label: 'Трапеція'        }, create: { code: 'K',   label: 'Трапеція'        } }),
    prisma.constructType.upsert({ where: { code: 'G'   }, update: { label: 'Арка'            }, create: { code: 'G',   label: 'Арка'            } }),
    prisma.constructType.upsert({ where: { code: 'KD'  }, update: { label: 'Косі Двері'      }, create: { code: 'KD',  label: 'Косі Двері'      } }),
    prisma.constructType.upsert({ where: { code: 'GD'  }, update: { label: 'Гнуті Двері'     }, create: { code: 'GD',  label: 'Гнуті Двері'     } }),
    prisma.constructType.upsert({ where: { code: 'Q'   }, update: { label: 'Розсувні системи'}, create: { code: 'Q',   label: 'Розсувні системи'} }),
    prisma.constructType.upsert({ where: { code: 'EXP' }, update: { label: 'Експорт'         }, create: { code: 'EXP', label: 'Експорт'         } }),
    prisma.constructType.upsert({ where: { code: 'Q76' }, update: { label: 'SL76'            }, create: { code: 'Q76', label: 'SL76'            } }),
    prisma.constructType.upsert({ where: { code: 'R'   }, update: { label: 'Примітки'        }, create: { code: 'R',   label: 'Примітки'        } }),
    prisma.constructType.upsert({ where: { code: 'D'   }, update: { label: 'Прямі Двері'     }, create: { code: 'D',   label: 'Прямі Двері'     } }),
  ]);

  const typeMap = new Map(types.map((t) => [t.code, t]));
  console.log(`✅ Типи конструкцій: ${types.length}`);

  // ─── Бригади ──────────────────────────────────────────────────
  const teamK = await prisma.team.upsert({ where: { name: 'Команда K' }, update: {}, create: { name: 'Команда K' } });
  const teamD = await prisma.team.upsert({ where: { name: 'Команда D' }, update: {}, create: { name: 'Команда D' } });
  const teamQ = await prisma.team.upsert({ where: { name: 'Команда Q' }, update: {}, create: { name: 'Команда Q' } });

  // Компетенції бригад (які типи вони виконують)
  const teamTypesData = [
    // Команда K: K, G, KD, GD
    { teamId: teamK.id, typeId: typeMap.get('K')!.id },
    { teamId: teamK.id, typeId: typeMap.get('G')!.id },
    { teamId: teamK.id, typeId: typeMap.get('KD')!.id },
    { teamId: teamK.id, typeId: typeMap.get('GD')!.id },
    // Команда D: D, R
    { teamId: teamD.id, typeId: typeMap.get('D')!.id },
    { teamId: teamD.id, typeId: typeMap.get('R')!.id },
    // Команда Q: Q, Q76, R, EXP
    { teamId: teamQ.id, typeId: typeMap.get('Q')!.id },
    { teamId: teamQ.id, typeId: typeMap.get('Q76')!.id },
    { teamId: teamQ.id, typeId: typeMap.get('R')!.id },
    { teamId: teamQ.id, typeId: typeMap.get('EXP')!.id },
  ];

  // Видаляємо старі і вставляємо нові
  await prisma.teamType.deleteMany({ where: { teamId: { in: [teamK.id, teamD.id, teamQ.id] } } });
  await prisma.teamType.createMany({ data: teamTypesData });

  console.log(`✅ Бригади: Команда K (K,G,KD,GD), Команда D (D,R), Команда Q (Q,Q76,R,EXP)`);

  // ─── Тестові задачі ───────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.task.createMany({
    data: [
      { batch: 'П-2025-001', cell: 'А-01', typeId: typeMap.get('K')!.id,  qtyItems: 3, impostsPerItem: 2, plannedDate: today,    teamId: teamK.id, description: 'Трапецієподібне вікно, велике' },
      { batch: 'П-2025-001', cell: 'А-02', typeId: typeMap.get('G')!.id,  qtyItems: 2, impostsPerItem: 1, plannedDate: today,    teamId: teamK.id, description: 'Арка стандартна' },
      { batch: 'П-2025-001', cell: 'Б-01', typeId: typeMap.get('D')!.id,  qtyItems: 4, impostsPerItem: 0, plannedDate: tomorrow, teamId: teamD.id, description: 'Прямі двері 900мм' },
      { batch: 'П-2025-002', cell: 'В-01', typeId: typeMap.get('Q')!.id,  qtyItems: 1, impostsPerItem: 3, plannedDate: today,    teamId: teamQ.id, description: 'Розсувна система 3-стулкова' },
      { batch: 'П-2025-002', cell: 'В-02', typeId: typeMap.get('Q76')!.id,qtyItems: 2, impostsPerItem: 1, plannedDate: today,    teamId: teamQ.id },
    ],
  });

  console.log(`✅ Тестові задачі: 5`);
  console.log('');
  console.log('🎉 Seed завершено!');
  console.log('📌 Напишіть /start боту — перший користувач стає Адміном');
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
