import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Users, Car, LogOut } from 'lucide-react';

export default function DashboardMenu() {
  const navigate = useNavigate();
  const user = localStorage.getItem('crm_user');

  const logout = () => {
    localStorage.removeItem('crm_user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col">

      {/* Contenido */}
      <div className="flex-grow">

        {/* Header */}
        <div className="bg-white shadow p-4 flex justify-between items-center">
          <img src="https://exclusiveontrip.com/logo.png" className="h-8" alt="Logo"/>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-gray-600">Hola, {user}</span>
            <button
              onClick={logout}
              className="text-red-500 hover:bg-red-50 p-2 rounded"
            >
              <LogOut size={20}/>
            </button>
          </div>
        </div>

        {/* Grid de Módulos */}
        <div className="container mx-auto p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            Selecciona un Módulo
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">

            {/* Módulo 1 */}
            <div
              onClick={() => navigate('/tours')}
              className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition cursor-pointer border border-transparent hover:border-blue-500 group"
            >
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Map size={32} className="text-blue-600"/>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Cotizador de Tours
              </h2>
              <p className="text-gray-500">
                Genera vouchers, administra cotizaciones y descarga PDFs.
              </p>
            </div>

            {/* Módulo 2 */}
            <div
              onClick={() => navigate('/minicrm')}
              className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition cursor-pointer border border-transparent hover:border-purple-500 group"
            >
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Users size={32} className="text-purple-600"/>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                EoT CRM
              </h2>
              <p className="text-gray-500">
                Gestión de clientes, leads y seguimiento comercial.
              </p>
            </div>
            {/* Módulo 3: Control de Flotilla */}
            <div
              onClick={() => navigate('/flotilla')}
              className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-transparent hover:border-orange-500 group"
            >
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:bg-orange-200 transition-colors">
                <Car size={32} className="text-orange-600 group-hover:scale-110 transition-transform duration-300"/>
              </div>

              <h2 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-orange-700 transition-colors">
                Control de Flotilla
              </h2>

              <p className="text-gray-500 text-sm leading-relaxed">
                Bitácora operativa: control de viajes, ingresos, gastos y kilometraje por unidad.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 py-4">
        <a
          href="./secret-history"
          className="hover:text-blue-600 underline font-medium"
        >
          Log
        </a>
      </div>

    </div>
  );
}
