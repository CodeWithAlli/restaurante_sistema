'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Navigation from '../../components/Navigation'

export default function CocinaPage() {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [horaActual, setHoraActual] = useState('')

  // 1. Reloj en tiempo real
  useEffect(() => {
    const actualizarReloj = () => {
      setHoraActual(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
    
    actualizarReloj()
    const intervalo = setInterval(actualizarReloj, 1000)
    return () => clearInterval(intervalo)
  }, [])

  // 2. Cargar pedidos
  const fetchPedidos = async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        id, 
        estado, 
        creado_en,
        mesas (numero_mesa),
        pedido_detalles (nombre_plato, cantidad)
      `)
      .in('estado', ['recibido', 'en_cocina'])
      .order('creado_en', { ascending: true })

    if (!error) setPedidos(data)
  }

  // 3. Tiempo real
  useEffect(() => {
    fetchPedidos()

    const canal = supabase
      .channel('cocina-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        (payload) => {
          fetchPedidos()
          if (payload.eventType === 'INSERT') {
            new Audio('/ding.mp3').play().catch(() => {}) 
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  // 4. Marcar como LISTO
  const marcarListo = async (pedidoId: number) => {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'listo' })
      .eq('id', pedidoId)

    if (error) alert('Error al actualizar: ' + error.message)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <Navigation />
      {/* Reloj y Título */}
      <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-orange-500">🔥 COCINA</h1>
        <div className="text-2xl font-mono bg-gray-800 px-4 py-2 rounded-lg text-blue-400">
          {horaActual || '--:--'}
        </div>
      </div>

      {/* Tablero de Pedidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pedidos.length === 0 && (
          <div className="col-span-full text-center text-gray-500 text-xl py-10">
            No hay pedidos pendientes. ¡Todo al día!
          </div>
        )}

        {pedidos.map((pedido) => {
          // Calcular minutos transcurridos
          const minutosEsperando = Math.floor((new Date().getTime() - new Date(pedido.creado_en).getTime()) / 60000);
          const estaTarde = minutosEsperando >= 15;

          return (
            <div 
              key={pedido.id} 
              className={`bg-gray-800 rounded-2xl p-5 shadow-lg border-l-8 transition-all ${
                estaTarde ? 'border-red-600 animate-pulse bg-red-900/20' : 
                pedido.estado === 'recibido' ? 'border-yellow-500' : 'border-blue-500'
              }`}
            >
              {/* Cabecera del pedido */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-sm text-gray-400 uppercase tracking-wide">Mesa</span>
                  <h2 className="text-4xl font-black">{pedido.mesas?.numero_mesa}</h2>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-400">Hora</span>
                  <p className="text-xl font-mono">
                    {new Date(pedido.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {estaTarde && <span className="text-red-400 font-bold text-sm block animate-pulse">¡Demorado!</span>}
                </div>
              </div>

              {/* Lista de Platos */}
              <div className="bg-gray-700/50 rounded-xl p-4 mb-6 min-h-[120px]">
                {pedido.pedido_detalles?.map((detalle: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 text-xl py-1">
                    <span className="font-bold text-orange-400">{detalle.cantidad}x</span>
                    <span className="font-medium text-gray-100">{detalle.nombre_plato}</span>
                  </div>
                ))}
              </div>

              {/* Botón LISTO */}
              <button
                onClick={() => marcarListo(pedido.id)}
                className="w-full py-5 text-2xl font-black text-white bg-green-600 hover:bg-green-500 active:bg-green-700 rounded-xl transition-all shadow-md uppercase tracking-wider"
              >
                ✔ LISTO
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}