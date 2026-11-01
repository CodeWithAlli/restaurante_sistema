export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold text-orange-500 mb-4">
        Sistema de Restaurante
      </h1>
      <p className="text-gray-400 text-lg">
        Menú 4D - Iniciando...
      </p>
      <div className="mt-8 flex gap-4">
        <a href="./cocina" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors">
          Ir a Cocina
        </a>
      </div>
    </main>
  )
}