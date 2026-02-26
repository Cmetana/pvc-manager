export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-3 bg-tg-bg">
      <div className="w-10 h-10 border-4 border-tg-button border-t-transparent rounded-full animate-spin" />
      <p className="text-tg-hint text-sm">Завантаження...</p>
    </div>
  )
}
