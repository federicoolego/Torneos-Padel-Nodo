import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { configurado } from './lib/supabase'
import './index.css'

function SinConfigurar() {
  return (
    <div className="min-h-screen grid place-items-center bg-vidrio p-6">
      <div className="max-w-md rounded-xl bg-white p-6 shadow">
        <h1 className="font-display text-2xl font-bold text-noche">Falta configurar Supabase</h1>
        <p className="mt-2 text-sm text-noche/70">
          Este build se generó sin <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code>.
          Cargalas como secrets del repo (o en el <code>.env</code> local) y volvé a compilar.
        </p>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  !configurado ? <SinConfigurar /> :
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
