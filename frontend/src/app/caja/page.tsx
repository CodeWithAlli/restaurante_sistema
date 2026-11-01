'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Navigation from '../../components/Navigation'

export default function CajaPage() {
  const [ventasTotales, setVentasTotales] = useState(0)
  const [ventasHoy, setVentasHoy] = useState(0)
  const [mesasOcupadas, setMesasOcupadas] = useState(0)
  const [pedidosActivos, setPedidosActivos] = useState(0)
  const [ultimosPagos, setUltimosPagos] = useState<any[]>([])

  const cargarDatos = async () => {
    // 1. Traer todos los pedidos
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('id, total, estado, creado_en, metodo_pago')
      .order('creado_en', { ascending: false })

    if (pedidos) {
      // Calcular ventas totales (solo pagados)
      const pagados = pedidos.filter(p => p.estado === 'pagado')
      const total = pagados.reduce((acc, p) => acc + Number(p.total), 0)
      setVentasTotales(total)

      // Calcular ventas de hoy
      const hoy = new Date().toISOString().split('T')[0]
      const ventasDeHoy = pagados
        .filter(p => p.creado_en.startsWith(hoy))
        .reduce((acc, p) => acc + Number(p.total), 0)
      setVentasHoy(ventasDeHoy)

      // Últimos 5 pagos
      setUltimosPagos(pagados.slice(0, 5))

      // Pedidos activos (recibido, en_cocina, listo)
      const activos = pedidos.filter(p => ['recibido', 'en_cocina', 'listo'].includes(p.estado))
      setPedidosActivos(activos.length)
    }

    // 2. Traer mesas ocupadas
    const { data: mesas } = await supabase
      .from('mesas')
      .select('estado')
      .eq('estado', 'ocupada')
    
    if (mesas) setMesasOcupadas(mesas.length)
  }

  useEffect(() => {
    cargarDatos()
    // Refrescar cada 5 segundos para ver los cambios en vivo
    const intervalo = setInterval(cargarDatos, 5000)
    return () => clearInterval(intervalo)
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <Navigation />
      <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-green-500">💰 CAJA / RESUMEN</h1>
        <span className="text-sm text-gray-400">Actualización automática cada 5s</span>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm uppercase tracking-wide">Ventas Totales</p>
          <p className="text-4xl font-black text-green-400 mt-2">${ventasTotales.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm uppercase tracking-wide">Ventas Hoy</p>
          <p className="text-4xl font-black text-blue-400 mt-2">${ventasHoy.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm uppercase tracking-wide">Mesas Ocupadas</p>
          <p className="text-4xl font-black text-orange-400 mt-2">{mesasOcupadas}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm uppercase tracking-wide">Pedidos Activos</p>
          <p className="text-4xl font-black text-purple-400 mt-2">{pedidosActivos}</p>
        </div>
      </div>

      {/* Últimos Pagos */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h2 className="text-xl font-bold mb-4">Últimos Pagos Recibidos</h2>
        {ultimosPagos.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No hay pagos registrados aún</p>
        ) : (
          <div className="space-y-3">
            {ultimosPagos.map((pago) => (
              <div key={pago.id} className="flex justify-between items-center bg-gray-900/50 p-4 rounded-lg">
                <div>
                  <p className="font-bold">Pedido #{pago.id}</p>
                  <p className="text-sm text-gray-400">{new Date(pago.creado_en).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className="text-green-400 font-black text-xl">+${pago.total}</span>
                  <p className="text-xs text-gray-400 uppercase font-bold mt-1">
                    {pago.metodo_pago || 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acceso Rápido a otras pantallas */}
      <div className="mt-8 flex gap-4">
        <a href="/cocina" className="bg-orange-600 hover:bg-orange-500 px-6 py-3 rounded-lg font-bold transition-colors">🔥 Ir a Cocina</a>
        <a href="/salon" className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-bold transition-colors">🏃 Ir al Salón</a>
        <a href="/mesa/4" className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg font-bold transition-colors">📱 Probar Mesa 4</a>
      </div>
    </div>
  )
}