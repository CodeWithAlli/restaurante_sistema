'use client'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'

export default function QRPage() {
  const [urlBase, setUrlBase] = useState('')

  useEffect(() => {
    // Detectamos la URL base de la app (ej: http://localhost:3000 o https://turestaurante.com)
    setUrlBase(window.location.origin)
  }, [])

  const mesas = [1, 2, 3, 4, 5, 6, 7, 8]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-orange-500">📱 GENERADOR DE CÓDIGOS QR</h1>
          <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-bold print:hidden">
            🖨️ Imprimir Todos
          </button>
        </div>

        <p className="text-gray-400 mb-8 print:hidden">
          Imprime estos códigos y pégalos en cada mesa. Los clientes escanearán el QR y se abrirá el menú de su mesa automáticamente.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mesas.map((num) => (
            <div key={num} className="bg-white p-6 rounded-xl flex flex-col items-center shadow-lg text-black">
              <h2 className="text-2xl font-black mb-4 uppercase">Mesa {num}</h2>
              {urlBase && (
                <QRCodeSVG 
                  value={`${urlBase}/mesa/${num}`} 
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              )}
              <p className="mt-4 text-xs text-center text-gray-500">
                Escanea para ver el menú<br/>
                {urlBase}/mesa/{num}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}