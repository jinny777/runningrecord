// 경량 토스트 유틸리티 (외부 라이브러리 없이)
type ToastType = 'success' | 'error' | 'warn' | 'info'

function showToast(message: string, type: ToastType = 'info') {
  const existing = document.getElementById('fitai-toast')
  existing?.remove()

  const toast = document.createElement('div')
  toast.id = 'fitai-toast'

  const colors: Record<ToastType, string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warn: 'bg-yellow-500',
    info: 'bg-[#2A2A2A]',
  }

  toast.className = `
    fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]
    ${colors[type]} text-white text-sm font-medium
    px-4 py-2.5 rounded-xl shadow-lg
    transition-all duration-300 opacity-0 scale-95
    max-w-sm text-center
  `
  toast.textContent = message
  document.body.appendChild(toast)

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translate(-50%, 0) scale(1)'
  })

  // Auto dismiss
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translate(-50%, 0) scale(0.95)'
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

export const toast = {
  success: (msg: string) => showToast(msg, 'success'),
  error: (msg: string) => showToast(msg, 'error'),
  warn: (msg: string) => showToast(msg, 'warn'),
  info: (msg: string) => showToast(msg, 'info'),
}
