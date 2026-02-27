import { useState } from 'react'

interface Props {
  title: string
  placeholder: string
  required?: boolean
  onConfirm: (comment: string) => void
  onCancel: () => void
}

export default function CommentModal({ title, placeholder, required = true, onConfirm, onCancel }: Props) {
  const [text, setText] = useState('')

  const handleConfirm = () => {
    if (required && !text.trim()) return
    onConfirm(text.trim())
  }

  return (
    // z-[200] — вище за navbar (z-50) щоб не перекривався
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-end">
      <div
        className="w-full bg-tg-bg rounded-t-2xl shadow-xl flex flex-col"
        style={{
          padding: '20px 20px max(20px, env(safe-area-inset-bottom, 20px))',
          maxHeight: '75vh',
        }}
      >
        <h2 className="text-lg font-bold text-tg-text mb-3 shrink-0">{title}</h2>
        <textarea
          className="w-full border border-gray-200 rounded-xl p-3 text-sm text-tg-text bg-tg-secondary resize-none focus:outline-none focus:ring-2 focus:ring-tg-button flex-1 min-h-0"
          placeholder={placeholder}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {required && !text.trim() && (
          <p className="text-xs text-red-500 mt-1 shrink-0">Коментар обов'язковий</p>
        )}
        <div className="flex gap-3 mt-4 shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium active:opacity-80"
          >
            Скасувати
          </button>
          <button
            onClick={handleConfirm}
            disabled={required && !text.trim()}
            className="flex-1 py-3 rounded-xl bg-tg-button text-tg-button-text font-medium active:opacity-80 disabled:opacity-40"
          >
            Підтвердити
          </button>
        </div>
      </div>
    </div>
  )
}
