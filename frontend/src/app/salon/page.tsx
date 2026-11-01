'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Navigation from '../../components/Navigation'

export default function SalonPage() {
  const [mesas, setMesas] = useState<any[]>([])
  const [alertaGlobal, setAlertaGlobal] = useState(false)
  const [mesaACobrar, setMesaACobrar] = useState<{pedidoId: number, mesaId: number} | null>(null)


  const fetchMesas = async () => {
    const { data, error } = await supabase
      .from('mesas')
      .select(`
        id, 
        numero_mesa, 
        estado, 
        alerta_mozo,
        pedidos (id, estado, total)
      `)
      .order('numero_mesa', { ascending: true })
    
    if (data) {
      setMesas(data)
      const hayAlerta = data.some((m: any) => m.alerta_mozo)
      setAlertaGlobal(hayAlerta)
    }
    if (error) console.error("Error mesas:", error)
  }

  useEffect(() => {
    fetchMesas()

    // Recarga automática cada 2 segundos (por si falla el WebSocket)
    const intervalo = setInterval(() => {
      fetchMesas()
    }, 2000)

    const canal = supabase
      .channel('salon-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => fetchMesas())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => fetchMesas())
      .subscribe()

    return () => { 
      clearInterval(intervalo)
      supabase.removeChannel(canal) 
    }
  }, [])

  // Atender el llamado del mozo (apagar alerta roja)
  const atenderMesa = async (mesaId: number) => {
    await supabase.from('mesas').update({ alerta_mozo: false }).eq('id', mesaId)
    fetchMesas()
  }

  // Entregar la comida
  const entregarPedido = async (pedidoId: number) => {
    await supabase.from('pedidos').update({ estado: 'entregado' }).eq('id', pedidoId)
    fetchMesas()
  }

  // COBRAR Y CERRAR MESA
  const cobrarMesa = async (pedidoId: number, mesaId: number, metodo: string) => {
    // 1. Actualizamos el pedido con el método de pago
    await supabase.from('pedidos').update({ estado: 'pagado', metodo_pago: metodo }).eq('id', pedidoId)
    
    // 2. Liberamos la mesa
    await supabase.from('mesas').update({ estado: 'libre', alerta_mozo: false }).eq('id', mesaId)
    
    // 3. Recargamos la vista
    fetchMesas()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <Navigation />
      <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-blue-500">🏃 SALÓN / MESERO</h1>
        {alertaGlobal && (
          <div className="bg-red-600 px-4 py-2 rounded-full font-bold animate-pulse">
            🔔 Hay mesas llamando
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mesas.map((mesa) => {
          const pedidoListo = mesa.pedidos?.find((p: any) => p.estado === 'listo')
          const pidioCuenta = mesa.pedidos?.find((p: any) => p.estado === 'pidio_cuenta')
          const pedidoActivo = mesa.pedidos?.find((p: any) => ['recibido', 'en_cocina', 'listo', 'pidio_cuenta'].includes(p.estado))

          // Determinamos el estilo del borde y fondo
          let borde = 'border-gray-700 bg-gray-800 opacity-60'
          if (mesa.alerta_mozo) borde = 'border-red-500 bg-red-900/30 animate-pulse'
          else if (pidioCuenta) borde = 'border-orange-500 bg-orange-900/30'
          else if (pedidoListo) borde = 'border-green-500 bg-green-900/30'
          else if (mesa.estado === 'ocupada') borde = 'border-blue-500 bg-gray-800'

          return (
            <div key={mesa.id} className={`p-4 rounded-xl border-2 transition-all ${borde}`}>
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-3xl font-black">Mesa {mesa.numero_mesa}</h2>
                <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${
                  mesa.estado === 'ocupada' ? 'bg-blue-600' : 'bg-gray-600'
                }`}>
                  {mesa.estado}
                </span>
              </div>

              <div className="space-y-2 mt-4">
                {/* 1. Botón de Alerta Mozo */}
                {mesa.alerta_mozo && (
                  <button onClick={() => atenderMesa(mesa.id)} className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-lg font-bold">
                    Atender Llamado
                  </button>
                )}

                {/* 2. Botón de Cobrar */}
                {pidioCuenta && (
                  <button onClick={() => setMesaACobrar({ pedidoId: pidioCuenta.id, mesaId: mesa.id })} className="w-full bg-orange-600 hover:bg-orange-500 py-3 rounded-lg font-bold">
                    Cobrar / Cerrar Mesa
                  </button>
                )}

                {/* 3. Botón de Entregar */}
                {pedidoListo && !pidioCuenta && (
                  <button onClick={() => entregarPedido(pedidoListo.id)} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold">
                    Entregar Pedido
                  </button>
                )}

                {/* 4. Textos de estado */}
                {!pedidoListo && !pidioCuenta && pedidoActivo && !mesa.alerta_mozo && (
                  <div className="text-center text-sm text-gray-400 py-3 bg-gray-900/50 rounded-lg">
                    En preparación...
                  </div>
                )}

                {!pedidoActivo && !mesa.alerta_mozo && !pedidoListo && (
                  <div className="text-center text-sm text-gray-500 py-3 bg-gray-900/50 rounded-lg">
                    Mesa Libre
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
            {/* MODAL DE MÉTODO DE PAGO */}
      {mesaACobrar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-600">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">¿Cómo pagó el cliente?</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <button onClick={() => { cobrarMesa(mesaACobrar.pedidoId, mesaACobrar.mesaId, 'efectivo'); setMesaACobrar(null); }} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-bold text-xl transition-colors">
                💵 Efectivo
              </button>
              <button onClick={() => { cobrarMesa(mesaACobrar.pedidoId, mesaACobrar.mesaId, 'mercadopago'); setMesaACobrar(null); }} className="w-full bg-blue-500 hover:bg-blue-400 py-4 rounded-xl font-bold text-xl transition-colors">
                📱 Mercado Pago
              </button>
              <button onClick={() => { cobrarMesa(mesaACobrar.pedidoId, mesaACobrar.mesaId, 'tarjeta'); setMesaACobrar(null); }} className="w-full bg-purple-600 hover:bg-purple-500 py-4 rounded-xl font-bold text-xl transition-colors">
                💳 Tarjeta
              </button>
            </div>

            <button onClick={() => setMesaACobrar(null)} className="w-full mt-6 text-gray-400 hover:text-white transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}