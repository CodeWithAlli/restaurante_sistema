'use client'
import { useEffect } from 'react'

interface ToastProps {
  mensaje: string
  tipo?: 'exito' | 'error' | 'info'
  onClose: () => void
}

export default function Toast({ mensaje, tipo = 'exito', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000) // Se cierra solo a los 3 segundos

    return () => clearTimeout(timer)
  }, [onClose])

  // Colores según el tipo
  const colores = {
    exito: 'bg-green-600 border-green-400',
    error: 'bg-red-600 border-red-400',
    info: 'bg-blue-600 border-blue-400'
  }

  const iconos = {
    exito: '✓',
    error: '✕',
    info: 'ℹ'
  }

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl border shadow-2xl text-white font-bold transition-all animate-fade-in ${colores[tipo]}`}>
      <span className="text-xl">{iconos[tipo]}</span>
      <p>{mensaje}</p>
      <button onClick={onClose} className="ml-4 opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}