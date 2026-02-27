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
  New: '🆕 Нове', InProgress: '🔧 В роботі', Rework: '⚠️ Переробка', Done: '✅ Виконано'
}
const STATUS_BG: Record<string, string> = {
  New: '#F3F4F6',     // gray
  InProgress: '#DBEAFE', // blue
  Rework: '#FEF3C7',     // yellow
  Done: '#D1FAE5',       // green
}

export default function TaskCard({ task, mode, onTake, onDone, onRework, onHelp }: Props) {
  const [photoOpen, setPhotoOpen] = useState(false)

  const sp = (task.impostsPerItem + 1) * task.qtyItems
  const isOverdue = task.status !== 'Done' && new Date(task.plannedDate) < new Date()

  const dateStr = new Date(task.plannedDate).toLocaleDateString('uk-UA', {
    day: '2-digit', month: '2-digit'
  })

  return (
    <>
      <div
        style={{
          background: 'var(--tg-theme-bg-color, #fff)',
          borderRadius: 16,
          border: '1px solid',
          borderColor: task.isOverdue ? '#FCA5A5' : 'var(--tg-theme-secondary-bg-color, #F3F4F6)',
          padding: '12px 14px',
          marginBottom: 10,
        }}
      >
        {/* Верхній рядок: код типу + статус + дата */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Тип — великий код */}
            <span style={{
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: 700,
              background: '#EFF6FF',
              color: '#1D4ED8',
              padding: '2px 8px',
              borderRadius: 8,
              letterSpacing: 0.5,
            }}>
              {task.type?.code}
            </span>
            <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #888)' }}>
              {task.type?.label}
            </span>
          </div>
          <span style={{
            fontSize: 11,
            background: STATUS_BG[task.status] ?? '#F3F4F6',
            padding: '2px 8px',
            borderRadius: 20,
            fontWeight: 600,
            color: '#374151',
          }}>
            {STATUS_LABEL[task.status]}
          </span>
        </div>

        {/* Партія / комірка */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{task.batch}</span>
          <span style={{ color: '#9CA3AF' }}>/</span>
          <span style={{ fontSize: 15 }}>{task.cell}</span>
        </div>

        {/* Фото + опис + метрики в ряд */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          {/* Фото мініатюра */}
          {task.photoUrl && (
            <button
              onClick={() => setPhotoOpen(true)}
              style={{
                width: 52, height: 52,
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                overflow: 'hidden',
                flexShrink: 0,
                background: '#F9FAFB',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <img
                src={task.photoUrl}
                alt="фото"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          )}

          <div style={{ flex: 1 }}>
            {/* Опис */}
            {task.description && (
              <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #888)', marginBottom: 4, lineHeight: 1.4 }}>
                {task.description}
              </p>
            )}

            {/* Метрики */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Chip icon="🔢" label={`${task.qtyItems} шт.`} />
              {task.impostsPerItem > 0 && <Chip icon="📐" label={`${task.impostsPerItem} імп.`} />}
              <Chip icon="💎" label={`${sp} СП`} bold />
              <Chip
                icon="📅"
                label={dateStr}
                color={isOverdue ? '#EF4444' : undefined}
              />
            </div>
          </div>
        </div>

        {/* Виконавець */}
        {task.assignee && (
          <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #888)', marginBottom: 8 }}>
            👷 {task.assignee.firstName ?? task.assignee.username}
          </p>
        )}

        {/* Причина переробки */}
        {task.reworkComment && (
          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: 10, padding: '8px 10px', marginBottom: 8,
          }}>
            <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>
              ⚠️ <strong>Причина переробки:</strong> {task.reworkComment}
            </p>
          </div>
        )}

        {/* Кнопки */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {mode === 'pool' && task.status === 'New' && onTake && (
            <ActionBtn onClick={() => onTake(task)} color="#3B82F6" label="▶️ В роботу" flex />
          )}
          {mode === 'my' && task.status === 'InProgress' && (
            <>
              {/* Виконано + Переробка — повну ширину ділять між собою */}
              <div style={{ display: 'flex', gap: 6 }}>
                {onDone   && <ActionBtn onClick={() => onDone(task)}   color="#10B981" label="✅ Виконано" flex />}
                {onRework && <ActionBtn onClick={() => onRework(task)} color="#F59E0B" label="⚠️ Переробка" flex />}
              </div>
              {/* Допомога — окремий рядок, менш помітна */}
              {onHelp && (
                <ActionBtn onClick={() => onHelp(task)} color="#9CA3AF" label="🆘 Потрібна допомога" flex />
              )}
            </>
          )}
          {mode === 'my' && task.status === 'Rework' && (
            <div style={{
              flex: 1, background: '#FFFBEB', borderRadius: 10,
              padding: '8px 12px', fontSize: 13, color: '#92400E', textAlign: 'center',
            }}>
              ⏳ Очікує підтвердження адміна
            </div>
          )}
        </div>
      </div>

      {/* Прев'ю фото (повноекранне) */}
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

function Chip({ icon, label, bold, color }: { icon: string; label: string; bold?: boolean; color?: string }) {
  return (
    <span style={{
      fontSize: 12,
      color: color ?? 'var(--tg-theme-hint-color, #666)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontWeight: bold ? 700 : 400,
    }}>
      {icon} {label}
    </span>
  )
}

function ActionBtn({ onClick, color, label, flex }: { onClick: () => void; color: string; label: string; flex?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: flex ? 1 : undefined,
        background: color,
        color: '#fff',
        border: 'none',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}
