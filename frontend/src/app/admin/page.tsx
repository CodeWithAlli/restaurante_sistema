'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'
import Navigation from '../../components/Navigation'
import Toast from '../../components/ui/Toast'

export default function AdminPage() {
  const [productos, setProductos] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  
  // Estado para el Toast
  const [toast, setToast] = useState<{ mensaje: string, tipo: 'exito' | 'error' | 'info' } | null>(null)

  const supabase = createClient()

  const cargarProductos = async () => {
    const { data } = await supabase.from('productos').select('*').order('id', { ascending: false })
    if (data) setProductos(data)
  }

  useEffect(() => {
    cargarProductos()
  }, [])

  const crearProducto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre || !precio) {
      setToast({ mensaje: 'Faltan datos: nombre y precio son obligatorios', tipo: 'error' })
      return
    }
    setSubiendo(true)

    let imagen_url = null

    // 1. Subir la imagen si el usuario seleccionó una
    if (archivo) {
      const fileName = `${Date.now()}-${archivo.name}`
      const { error: uploadError } = await supabase.storage
        .from('platos')
        .upload(fileName, archivo)

      if (uploadError) {
        setToast({ mensaje: 'Error subiendo imagen: ' + uploadError.message, tipo: 'error' })
        setSubiendo(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('platos')
        .getPublicUrl(fileName)

      imagen_url = publicUrlData.publicUrl
    }

    // 2. Guardar en la base de datos
    const { error } = await supabase.from('productos').insert({
      nombre,
      precio: Number(precio),
      imagen_url,
      disponible: true
    })

    if (error) {
      setToast({ mensaje: 'Error guardando: ' + error.message, tipo: 'error' })
    } else {
      setNombre('')
      setPrecio('')
      setArchivo(null)
      cargarProductos()
      setToast({ mensaje: '¡Plato creado con éxito!', tipo: 'exito' })
    }
    setSubiendo(false)
  }

  const toggleDisponible = async (id: number, actual: boolean) => {
    // Cambiamos el estado visual inmediatamente (Optimistic UI)
    setProductos(productos.map(p => p.id === id ? { ...p, disponible: !actual } : p))

    // Actualizamos en Supabase
    const { error } = await supabase
      .from('productos')
      .update({ disponible: !actual })
      .eq('id', id)

    if (error) {
      setToast({ mensaje: 'Error en la base de datos: ' + error.message, tipo: 'error' })
      // Si falla, revertimos el cambio visual
      setProductos(productos.map(p => p.id === id ? { ...p, disponible: actual } : p))
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Navigation />
      
      {/* Renderizamos el Toast si hay un mensaje */}
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
      
      <div className="p-6">
        <h1 className="text-3xl font-bold text-orange-500 mb-8">⚙️ ADMINISTRACIÓN DE MENÚ</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Formulario para crear plato */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4">Agregar Nuevo Plato</h2>
            <form onSubmit={crearProducto} className="space-y-4">
              <input
                type="text"
                placeholder="Nombre del plato"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-900 p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none"
              />
              <input
                type="number"
                placeholder="Precio"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="w-full bg-slate-900 p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none"
              />
              <div>
                <label className="text-sm text-gray-400 block mb-2">Foto del plato (opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setArchivo(e.target.files ? e.target.files[0] : null)}
                  className="w-full bg-slate-900 p-3 rounded-lg border border-slate-700 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={subiendo}
                className="w-full bg-orange-600 hover:bg-orange-500 py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                {subiendo ? 'Subiendo...' : 'Guardar Plato'}
              </button>
            </form>
          </div>

          {/* Lista de platos */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4">Lista de Platos</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {productos.map((prod) => (
                <div key={prod.id} className={`flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700 transition-opacity ${!prod.disponible ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    {prod.imagen_url ? (
                      <img src={prod.imagen_url} alt={prod.nombre} className="w-12 h-12 object-cover rounded-md" />
                    ) : (
                      <div className="w-12 h-12 bg-slate-700 rounded-md flex items-center justify-center text-xs">Sin foto</div>
                    )}
                    <div>
                      <p className="font-bold">{prod.nombre} {!prod.disponible && <span className="text-xs text-red-400">(Oculto)</span>}</p>
                      <p className="text-sm text-gray-400">${prod.precio}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleDisponible(prod.id, prod.disponible)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${prod.disponible ? 'bg-red-600/20 text-red-400 hover:bg-red-600/40' : 'bg-green-600/20 text-green-400 hover:bg-green-600/40'}`}
                  >
                    {prod.disponible ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}