import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const remove = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])
  const show = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((current) => [...current, { id, message, type }].slice(-4))
    window.setTimeout(() => remove(id), 4500)
    return id
  }, [remove])
  const value = useMemo(() => ({ show, success: (message) => show(message, 'success'), error: (message) => show(message, 'error'), warning: (message) => show(message, 'warning'), info: (message) => show(message, 'info') }), [show])

  return <ToastContext.Provider value={value}>{children}<div className="bc-toasts" aria-live="polite" aria-atomic="true">{toasts.map((toast) => <div key={toast.id} className={`bc-toast is-${toast.type}`}><span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '×' : 'i'}</span><p>{toast.message}</p><button onClick={() => remove(toast.id)} aria-label="Fechar aviso">×</button></div>)}</div></ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return context
}
