'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/admin', label: '⚙️ Admin', color: 'hover:text-orange-400' },
    { href: '/cocina', label: '🔥 Cocina', color: 'hover:text-orange-400' },
    { href: '/salon', label: '🏃 Salón', color: 'hover:text-blue-400' },
    { href: '/caja', label: '💰 Caja', color: 'hover:text-green-400' },
    { href: '/qr', label: '📱 QRs', color: 'hover:text-purple-400' },
  ]

  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4 mb-6 flex justify-between items-center">
      <div className="flex items-center gap-6">
        <span className="text-xl font-black text-white">🍽️ Sistema</span>
        <div className="flex gap-4">
          {links.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className={`text-sm font-bold transition-colors ${
                pathname === link.href ? 'text-orange-400 border-b-2 border-orange-400 pb-1' : 'text-gray-400 ' + link.color
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      
      <button 
        onClick={cerrarSesion}
        className="text-sm text-red-400 hover:text-red-300 font-bold transition-colors"
      >
        Cerrar Sesión
      </button>
    </nav>
  )
}