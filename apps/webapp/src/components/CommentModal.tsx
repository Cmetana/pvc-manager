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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full bg-tg-bg rounded-t-2xl p-5 shadow-xl">
        <h2 className="text-lg font-bold text-tg-text mb-3">{title}</h2>
        <textarea
          className="w-full border border-gray-200 rounded-xl p-3 text-sm text-tg-text bg-tg-secondary resize-none focus:outline-none focus:ring-2 focus:ring-tg-button"
          placeholder={placeholder}
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        {required && !text.trim() && (
          <p className="text-xs text-red-500 mt-1">Коментар обов'язковий</p>
        )}
        <div className="flex gap-3 mt-4">
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
