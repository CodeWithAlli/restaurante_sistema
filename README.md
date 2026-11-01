# 🍽️ Restaurante Sistema (Menú 4D)

Sistema de gestión de pedidos para restaurantes en tiempo real. Permite a los clientes pedir desde su celular escaneando un código QR, a la cocina recibir los pedidos al instante, al mesero gestionar el salón y a la caja llevar el control de las ventas. 

El proyecto está diseñado bajo una filosofía de **"acciones, no texto"**: botones grandes, colores claros y flujos rápidos para que el personal del restaurante no pierda tiempo leyendo.

---

## 🏗️ Arquitectura del Proyecto

El sistema está dividido en dos grandes bloques principales y utiliza Supabase como motor de base de datos en la nube.

*   **Frontend:** Next.js (App Router), React y Tailwind CSS. Es la interfaz visual que ven los clientes y el personal.
*   **Backend:** Node.js + Express. (Destinado a futuras integraciones complejas como impresoras térmicas, pasarelas de pago o webhooks).
*   **Base de Datos en la Nube:** Supabase (PostgreSQL). Se encarga de la persistencia de datos y de la magia del **Tiempo Real (Realtime)** mediante WebSockets.

### Estructura de Carpetas 
```text
restaurante_sistema/
├── frontend/       # Aplicación Next.js (Interfaces de usuario)
├── backend/        # Servidor Node.js (Lógica extra/Webhooks)
├── .gitignore      # Archivos ignorados por Git
└── README.md       # Este archivo


cd frontend

# Instalar dependencias
npm install

# Crear el archivo de variables de entorno (.env.local)
# Pega tus credenciales de Supabase:
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima

# Iniciar el servidor de desarrollo
npm run dev



cd backend

# Instalar dependencias
npm install

# Iniciar el servidor en modo desarrollo
npm run dev