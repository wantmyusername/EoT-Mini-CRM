import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';


const API_URL = 'https://exclusiveontrip.com/crm/api/index.php'; // Tu API

export default function Login() {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // POST a tu PHP
      // NOTA: Asegúrate de tener usuarios en tu DB con password_hash
      // Para prueba rápida, puedes hardcodear en PHP
      const res = await axios.post(`${API_URL}?action=login`, creds);
      
      if (res.data.status === 'success') {
        localStorage.setItem('crm_user', res.data.user); // Guardamos sesión simple
        navigate('/menu');
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } catch (err) { setError('Error de conexión'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden p-8 space-y-6">
        <div className="text-center">
          <img src="https://exclusiveontrip.com/logo.png" className="h-12 mx-auto mb-4"/>
          <h2 className="text-2xl font-bold text-gray-800">Acceso CRM</h2>
          <p className="text-gray-500 text-sm">Ingresa tus credenciales</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Usuario</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="text" className="w-full pl-10 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                onChange={e => setCreds({...creds, username: e.target.value})}/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="password" className="w-full pl-10 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                onChange={e => setCreds({...creds, password: e.target.value})}/>
            </div>
          </div>
          
          {error && <div className="text-red-500 text-sm text-center font-bold">{error}</div>}

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
