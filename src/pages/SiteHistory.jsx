import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Smartphone, Monitor, Clock, ArrowLeft, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://exclusiveontrip.com/crm/api/index.php';

export default function SiteHistory() {
  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();

  // Estados para Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    axios.get(`${API_URL}?action=get_logs`).then(res => setLogs(res.data));
  }, []);

  // Función para detectar dispositivo
  const getDeviceIcon = (ua) => {
      if(ua.toLowerCase().includes('mobile')) return <Smartphone size={16} className="text-purple-400"/>;
      return <Monitor size={16} className="text-blue-400"/>;
  };

  // --- LÓGICA DE PAGINACIÓN ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = logs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(logs.length / itemsPerPage);

  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-6 font-mono text-sm">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
            <div className="flex items-center gap-3">
                <Shield className="text-green-500" size={24}/>
                <h1 className="text-xl font-bold text-white">SYSTEM AUDIT LOG</h1>
            </div>
            <button onClick={() => navigate('/menu')} className="text-gray-500 hover:text-white flex items-center gap-2 transition">
                <ArrowLeft size={16}/> Volver
            </button>
        </div>

        {/* Tabla */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-black text-gray-400 uppercase text-xs">
                        <tr>
                            <th className="p-4">Fecha / Hora</th>
                            <th className="p-4">Usuario</th>
                            <th className="p-4">Acción</th>
                            <th className="p-4">Detalle</th>
                            <th className="p-4">IP</th>
                            <th className="p-4">Dispositivo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {currentLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-700 transition">
                                <td className="p-4 whitespace-nowrap flex items-center gap-2 text-gray-400">
                                    <Clock size={14} className="text-gray-500"/>
                                    {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td className="p-4 font-bold text-white">
                                    <span className="flex items-center gap-2">
                                        <User size={14} className="text-yellow-500"/> {log.user_name}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border border-opacity-20 ${
                                        log.action_type === 'ELIMINAR' ? 'bg-red-900 text-red-200 border-red-500' :
                                        log.action_type === 'CREAR' ? 'bg-green-900 text-green-200 border-green-500' :
                                        log.action_type === 'LOGIN' ? 'bg-purple-900 text-purple-200 border-purple-500' :
                                        'bg-blue-900 text-blue-200 border-blue-500'
                                    }`}>
                                        {log.action_type}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-300">{log.description}</td>
                                <td className="p-4 font-mono text-xs text-gray-500">{log.ip_address}</td>
                                <td className="p-4 text-xs truncate max-w-[150px]" title={log.user_agent}>
                                    <div className="flex items-center gap-2">
                                        {getDeviceIcon(log.user_agent)}
                                        <span className="opacity-50">{log.user_agent}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Mensaje vacío */}
                {logs.length === 0 && <div className="p-8 text-center text-gray-500">No hay actividad registrada aún.</div>}
            </div>

            {/* Footer Paginación */}
            {logs.length > 0 && (
                <div className="px-6 py-4 bg-black border-t border-gray-700 flex justify-between items-center text-xs text-gray-500">
                    <span>
                        Mostrando {currentPage * itemsPerPage - itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, logs.length)} de {logs.length} eventos
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={prevPage}
                            disabled={currentPage === 1}
                            className={`p-2 rounded border border-gray-700 ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-800 text-white'}`}
                        >
                            <ChevronLeft size={16}/>
                        </button>
                        <button
                            onClick={nextPage}
                            disabled={currentPage >= totalPages}
                            className={`p-2 rounded border border-gray-700 ${currentPage >= totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-800 text-white'}`}
                        >
                            <ChevronRight size={16}/>
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}
