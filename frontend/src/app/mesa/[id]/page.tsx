'use client'
import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

function MesaContent() {
  const params = useParams()
  const mesaId = params.id

  const [productos, setProductos] = useState<any[]>([])
  const [carrito, setCarrito] = useState<any[]>([])
  const [pedidoActivo, setPedidoActivo] = useState<any>(null)
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(true)
  const [mozoLlamado, setMozoLlamado] = useState(false)

  // Cargar menú y pedido activo
  useEffect(() => {
    const cargarDatos = async () => {
      const { data: prods } = await supabase.from('productos').select('*').eq('disponible', true)
      if (prods) setProductos(prods)

      const { data: pedido } = await supabase
        .from('pedidos')
        .select('*, pedido_detalles(*)')
        .eq('mesa_id', Number(mesaId))
        .in('estado', ['recibido', 'en_cocina', 'listo', 'entregado', 'pidio_cuenta']) 
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle() 

      if (pedido) setPedidoActivo(pedido)
      setCargando(false)
    }
    cargarDatos()
  }, [mesaId])
  
  // Escuchar cambios en el menú (si el admin oculta un plato)
  useEffect(() => {
    const canalProductos = supabase
      .channel('productos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' },
        async () => {
          const { data: prods } = await supabase.from('productos').select('*').eq('disponible', true)
          if (prods) setProductos(prods)
        }
      ).subscribe()

    return () => { supabase.removeChannel(canalProductos) }
  }, [])

  // Escuchar cambios en el estado del pedido actual
  useEffect(() => {
    if (!pedidoActivo) return
    const canal = supabase
      .channel('cliente-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${pedidoActivo.id}` },
        (payload) => { setPedidoActivo((prev: any) => ({ ...prev, estado: payload.new.estado })) }
      ).subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [pedidoActivo])

  const agregarAlCarrito = (producto: any) => {
    const existe = carrito.find((item) => item.id === producto.id)
    if (existe) {
      setCarrito(carrito.map((item) => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item))
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }])
    }
  }

  const enviarPedido = async () => {
    if (carrito.length === 0) return
    setMensaje('Enviando pedido...')

    const { data: mesaData, error: errorMesa } = await supabase.from('mesas').select('id').eq('numero_mesa', Number(mesaId)).maybeSingle() 
    if (errorMesa || !mesaData) { setMensaje('Error: mesa no encontrada'); return }

    await supabase.from('mesas').update({ estado: 'ocupada' }).eq('id', mesaData.id)
    const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)

    const { data: nuevoPedido, error: errorPedido } = await supabase.from('pedidos').insert({ mesa_id: mesaData.id, estado: 'recibido', total }).select().single()
    if (errorPedido) { setMensaje('Error al crear pedido'); return }

    const detalles = carrito.map((item) => ({ pedido_id: nuevoPedido.id, nombre_plato: item.nombre, cantidad: item.cantidad, precio_unitario: item.precio }))
    const { error: errorDetalles } = await supabase.from('pedido_detalles').insert(detalles)
    if (errorDetalles) { setMensaje('Error al guardar platos'); return }

    setCarrito([])
    setMensaje('¡Pedido enviado a cocina!')
    const { data: pedidoActualizado } = await supabase.from('pedidos').select('*, pedido_detalles(*)').eq('id', nuevoPedido.id).single()
    setPedidoActivo(pedidoActualizado)
  }

  const llamarMozo = async () => {
    const { data: mesaData, error } = await supabase.from('mesas').select('id').eq('numero_mesa', Number(mesaId)).maybeSingle()
    
    if (error || !mesaData) {
      setMensaje('Error: mesa no encontrada')
      return
    }

    const { error: updateError } = await supabase.from('mesas').update({ alerta_mozo: true }).eq('id', mesaData.id)
    
    if (updateError) {
      setMensaje('Error al llamar mozo')
    } else {
      setMozoLlamado(true)
      setMensaje('🔔 Mozo notificado')
      setTimeout(() => { setMozoLlamado(false); setMensaje('') }, 5000)
    }
  }

  const pedirCuenta = async () => {
    if (!pedidoActivo) return
    await supabase.from('pedidos').update({ estado: 'pidio_cuenta' }).eq('id', pedidoActivo.id)
    setPedidoActivo((prev: any) => ({ ...prev, estado: 'pidio_cuenta' }))
    setMensaje('🧾 Cuenta solicitada')
    setTimeout(() => setMensaje(''), 3000)
  }

  if (cargando) {
    return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Cargando...</div>
  }

  // VISTA 1: SI YA TIENE UN PEDIDO ACTIVO
  if (pedidoActivo) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-4 pb-24">
        <div className="text-center mb-6 pt-4">
          <h1 className="text-3xl font-black text-orange-500">MESA {mesaId}</h1>
          <p className="text-slate-400">Tu pedido está en curso</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl mb-6 border border-slate-700">
          <h2 className="text-xl font-bold mb-4">Estado del Pedido</h2>
          <div className="flex justify-between items-center mb-6 relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-700 -z-10"></div>
            {['recibido', 'en_cocina', 'listo', 'entregado'].map((estado, index) => {
              const estadosOrden = ['recibido', 'en_cocina', 'listo', 'entregado']
              const estadoActualIndex = estadosOrden.indexOf(pedidoActivo.estado === 'pidio_cuenta' ? 'entregado' : pedidoActivo.estado)
              const completado = index <= estadoActualIndex
              return (
                <div key={estado} className="flex flex-col items-center gap-2 bg-slate-900 px-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${completado ? 'bg-green-500 text-white' : 'bg-slate-700 text-gray-400'}`}>
                    {completado ? '✓' : index + 1}
                  </div>
                  <span className="text-xs text-slate-400 capitalize">{estado.replace('_', ' ')}</span>
                </div>
              )
            })}
          </div>

          {pedidoActivo.estado === 'pidio_cuenta' && (
            <div className="bg-orange-900/50 border border-orange-500 text-orange-200 p-4 rounded-xl mb-4 text-center font-bold animate-pulse">
              🧾 Has pedido la cuenta. Un mozo se acercará en breve.
            </div>
          )}

          <div className="space-y-2">
            {pedidoActivo.pedido_detalles?.map((det: any) => (
              <div key={det.id} className="flex justify-between text-slate-300">
                <span>{det.cantidad}x {det.nombre_plato}</span>
                <span>${det.precio_unitario}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 w-full p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
          <button 
            onClick={llamarMozo} 
            disabled={mozoLlamado}
            className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              mozoLlamado ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {mozoLlamado ? '🔔 Mozo avisado...' : '🔔 Llamar Mozo'}
          </button>
          <button onClick={pedirCuenta} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
            🧾 Pedir Cuenta
          </button>
        </div>
      </div>
    )
  }

  // VISTA 2: SI NO TIENE PEDIDO, MOSTRAR EL MENÚ
  return (
    <div className="min-h-screen bg-slate-900 text-white pb-32 font-sans">
      {/* Header con logo */}
      <div className="p-6 bg-slate-800 sticky top-0 z-10 shadow-xl border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-xl">
            🍽️
          </div>
          <div>
            <h1 className="text-2xl font-black text-orange-500 leading-none">MESA {mesaId}</h1>
            <p className="text-slate-400 text-xs mt-1">Toca un plato para agregar</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {productos.map((prod) => (
          <div key={prod.id} className="bg-slate-800 rounded-xl overflow-hidden flex border border-slate-700">
            {/* Imagen del plato (si existe) */}
            {prod.imagen_url && (
              <img src={prod.imagen_url} alt={prod.nombre} className="w-24 h-24 object-cover" />
            )}
            
            <div className="p-4 flex-1 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{prod.nombre}</h3>
                <p className="text-orange-400 font-mono">${prod.precio}</p>
              </div>
              <button onClick={() => agregarAlCarrito(prod)} className="w-12 h-12 bg-blue-600 rounded-full text-2xl font-bold flex items-center justify-center hover:bg-blue-500 transition-colors">
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {carrito.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 p-4 shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-bold">{carrito.reduce((a, b) => a + b.cantidad, 0)} items</span>
            <span className="text-xl font-black text-orange-500">${carrito.reduce((a, b) => a + (b.precio * b.cantidad), 0)}</span>
          </div>
          <button onClick={enviarPedido} className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wide transition-colors">
            Enviar Pedido a Cocina
          </button>
        </div>
      )}

      {mensaje && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg z-50">
          {mensaje}
        </div>
      )}
    </div>
  )
}

export default function ClientePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Cargando mesa...</div>}>
      <MesaContent />
    </Suspense>
  )
}