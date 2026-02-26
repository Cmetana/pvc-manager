interface Props {
  emoji: string
  title: string
  message: string
}

export default function ErrorScreen({ emoji, title, message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 px-6 text-center bg-tg-bg">
      <span className="text-6xl">{emoji}</span>
      <h1 className="text-xl font-bold text-tg-text">{title}</h1>
      <p className="text-tg-hint text-sm leading-relaxed">{message}</p>
    </div>
  )
}
