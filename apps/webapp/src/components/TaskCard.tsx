import { useState } from 'react'
import type { Task } from '../types'

interface Props {
  task: Task
  mode: 'pool' | 'my'
  onTake?:   (task: Task) => void
  onDone?:   (task: Task) => void
  onRework?: (task: Task) => void
  onHelp?:   (task: Task) => void
}

const STATUS_LABEL: Record<string, string> = {
  New: 'Нове', InProgress: 'В роботі', Rework: 'Переробка', Done: 'Виконано',
}
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  New:        { bg: '#F3F4F6', color: '#6B7280' },
  InProgress: { bg: '#DBEAFE', color: '#1D4ED8' },
  Rework:     { bg: '#FEF3C7', color: '#92400E' },
  Done:       { bg: '#D1FAE5', color: '#065F46' },
}

const BADGE: React.CSSProperties = {
  fontWeight: 700, fontSize: 15, lineHeight: 1.3,
  border: '1.5px solid #D1D5DB', borderRadius: 7,
  padding: '2px 7px', flexShrink: 0,
  color: 'var(--tg-theme-text-color, #111)',
}

export default function TaskCard({ task, mode, onTake, onDone, onRework, onHelp }: Props) {
  const [photoOpen, setPhotoOpen] = useState(false)

  const sp = (task.impostsPerItem + 1) * task.qtyItems
  const isOverdue = task.status !== 'Done' && new Date(task.plannedDate) < new Date()
  const dateStr = new Date(task.plannedDate).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })
  const statusStyle = STATUS_STYLE[task.status] ?? STATUS_STYLE.New

  return (
    <>
      <div style={{
        background: 'var(--tg-theme-bg-color, #fff)',
        borderRadius: 14,
        border: `1.5px solid ${task.isOverdue ? '#FCA5A5' : 'var(--tg-theme-secondary-bg-color, #EBEBEB)'}`,
        overflow: 'hidden',
        display: 'flex',
        marginBottom: 8,
      }}>

        {/* ── Фото зліва — квадрат ── */}
        {task.photoUrl ? (
          <button
            onClick={() => setPhotoOpen(true)}
            style={{
              flexShrink: 0, width: 88, minHeight: 88, alignSelf: 'stretch',
              padding: 0, border: 'none', cursor: 'pointer', background: 'none',
            }}
          >
            <img
              src={task.photoUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </button>
        ) : (
          <div style={{
            flexShrink: 0, width: 88, minHeight: 88, alignSelf: 'stretch',
            background: '#F3F4F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#D1D5DB',
          }}>
            📷
          </div>
        )}

        {/* ── Контент справа ── */}
        <div style={{ flex: 1, padding: '10px 12px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>

          {/* Рядок 1: [Партія] / [Комірка] [Тип] [Назва типу]   Статус */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
              <span style={BADGE}>{task.batch}</span>
              <span style={{ color: '#C4C4C4', fontSize: 13, flexShrink: 0 }}>/</span>
              <span style={BADGE}>{task.cell}</span>
              <span style={{
                fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                background: '#EFF6FF', color: '#1D4ED8',
                padding: '1px 6px', borderRadius: 6, flexShrink: 0,
              }}>
                {task.type?.code}
              </span>
              <span style={{
                fontSize: 11, color: 'var(--tg-theme-hint-color, #888)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flex: 1, minWidth: 0,
              }}>
                {task.type?.label}
              </span>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600,
              padding: '2px 8px', borderRadius: 20,
              background: statusStyle.bg, color: statusStyle.color,
              flexShrink: 0, marginLeft: 4, whiteSpace: 'nowrap',
            }}>
              {STATUS_LABEL[task.status]}
            </span>
          </div>

          {/* Рядок 2: Дата · Імпости · СП  +  "В роботу" (pool/New) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 10, flex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: isOverdue ? '#EF4444' : 'var(--tg-theme-text-color, #111)' }}>
                📅 {dateStr}
              </span>
              {task.impostsPerItem > 0 && (
                <span style={{ fontSize: 16, color: 'var(--tg-theme-hint-color, #888)' }}>
                  📐 {task.impostsPerItem}
                </span>
              )}
              <span style={{ fontSize: 16, fontWeight: 700, color: '#2563EB' }}>
                💎 {sp} СП
              </span>
            </div>
            {mode === 'pool' && task.status === 'New' && onTake && (
              <button
                onClick={() => onTake(task)}
                style={{
                  flexShrink: 0, background: '#3B82F6', color: '#fff',
                  border: 'none', borderRadius: 10,
                  padding: '7px 14px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                ▶ В роботу
              </button>
            )}
          </div>

          {/* Причина переробки */}
          {task.reworkComment && (
            <div style={{
              background: '#FFFBEB', border: '1px solid #FDE68A',
              borderRadius: 8, padding: '5px 8px',
            }}>
              <p style={{ fontSize: 11, color: '#92400E', margin: 0 }}>⚠️ {task.reworkComment}</p>
            </div>
          )}

          {/* Виконавець (тільки в пулі) */}
          {task.assignee && mode === 'pool' && (
            <p style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #888)', margin: 0 }}>
              👷 {task.assignee.firstName ?? task.assignee.username}
            </p>
          )}

          {/* Кнопки для режиму "Мої задачі" */}
          {mode === 'my' && task.status === 'InProgress' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {onDone   && <ActionBtn onClick={() => onDone!(task)}   color="#10B981" label="✅ Виконано" flex />}
                {onRework && <ActionBtn onClick={() => onRework!(task)} color="#F59E0B" label="⚠️ Переробка" flex />}
              </div>
              {onHelp && (
                <ActionBtn onClick={() => onHelp(task)} color="#9CA3AF" label="🆘 Потрібна допомога" flex />
              )}
            </div>
          )}
          {mode === 'my' && task.status === 'Rework' && (
            <div style={{
              background: '#FFFBEB', borderRadius: 8,
              padding: '7px 10px', fontSize: 12, color: '#92400E',
              textAlign: 'center', marginTop: 2,
            }}>
              ⏳ Очікує підтвердження адміна
            </div>
          )}
        </div>
      </div>

      {/* Прев'ю фото на весь екран */}
      {photoOpen && task.photoUrl && (
        <div
          onClick={() => setPhotoOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <img
            src={task.photoUrl}
            alt="фото задачі"
            style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 12, objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          />
          <p style={{ color: '#fff', marginTop: 12, fontSize: 14, textAlign: 'center', opacity: 0.8 }}>
            {task.batch}/{task.cell} · {task.type?.code} — {task.type?.label}
          </p>
          <button
            onClick={() => setPhotoOpen(false)}
            style={{
              marginTop: 16, background: 'rgba(255,255,255,0.2)',
              color: '#fff', border: 'none', borderRadius: 20,
              padding: '8px 24px', fontSize: 14, cursor: 'pointer',
            }}
          >
            Закрити
          </button>
        </div>
      )}
    </>
  )
}

function ActionBtn({ onClick, color, label, flex }: { onClick: () => void; color: string; label: string; flex?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: flex ? 1 : undefined,
        background: color, color: '#fff',
        border: 'none', borderRadius: 10,
        padding: '10px 14px', fontSize: 13, fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}
