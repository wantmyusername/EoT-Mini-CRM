import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Save, Search, RefreshCw, ChevronLeft, ChevronRight, Grid, Edit, Eye, Trash2, Plus, ArrowLeft, CheckCircle, AlertCircle, X, Download, Calendar, DollarSign, Users, Wallet, MessageSquare } from 'lucide-react';

const API_URL = 'https://exclusiveontrip.com/crm/api/transport.php';
const VIEWER_URL = 'https://exclusiveontrip.com/crm/api/ver_transport.php';

export default function TransportModule() {
  const navigate = useNavigate();

  // Estados
  const [view, setView] = useState('list');
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({});

  // FILTROS
  const [filters, setFilters] = useState({
      client: '', agency: '', provider: '', id: '',
      dateFrom: '', dateTo: '', month: '', vehicle: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // UI States
  const [toast, setToast] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [financeModal, setFinanceModal] = useState(null);

  useEffect(() => { fetchServices(); }, []);

  const showToast = (message, type = 'success') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
  };

  // --- API ---
  const fetchServices = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
          if (filters[key]) {
              if (key === 'dateFrom') params.append('date_from', filters[key]);
              else if (key === 'dateTo') params.append('date_to', filters[key]);
              else params.append(key, filters[key]);
          }
      });
      const res = await axios.get(`${API_URL}?action=get_services&${params.toString()}`);
      if (Array.isArray(res.data)) {
          setServices(res.data);
          setCurrentPage(1);
      }
    } catch (e) { console.error(e); }
  };

  const handleFilterChange = (e) => {
      const { name, value } = e.target;
      if (name === 'month' && value) setFilters(prev => ({ ...prev, [name]: value, dateFrom: '', dateTo: '' }));
      else if ((name === 'dateFrom' || name === 'dateTo') && value) setFilters(prev => ({ ...prev, [name]: value, month: '' }));
      else setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
      setFilters({ client: '', agency: '', provider: '', id: '', dateFrom: '', dateTo: '', month: '', vehicle: '' });
      setTimeout(() => { axios.get(`${API_URL}?action=get_services`).then(res => setServices(res.data)); }, 50);
  };

  const downloadCSV = () => {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
          if (filters[key]) {
             if (key === 'dateFrom') params.append('date_from', filters[key]);
             else if (key === 'dateTo') params.append('date_to', filters[key]);
             else params.append(key, filters[key]);
          }
      });
      window.location.href = `${API_URL}?action=export_csv&${params.toString()}`;
  };

  // --- CRUD ---
  const handleEdit = (service) => { setFormData(service); setView('form'); };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await axios.post(`${API_URL}?action=delete_service`, { id: deleteId, current_user: localStorage.getItem('crm_user') }); showToast('Eliminado', 'success'); fetchServices(); } catch (e) { showToast('Error', 'error'); }
    setDeleteId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // --- VALIDACIÓN FRONTEND ---
    const required = [
        'client_name', 'agency', 'provider',
        'service_date', 'passengers', 'pickup_location',
        'destination', 'service_type', 'vehicle_type'
    ];

    const missing = required.filter(field => !formData[field]);

    if (missing.length > 0) {
        showToast(`Faltan campos obligatorios: ${missing.join(', ')}`, 'error');
        return;
    }

    if (formData.trip_type === 'round_trip' && !formData.return_pickup_time) {
        showToast('Falta la fecha de regreso para el viaje redondo', 'error');
        return;
    }

    try {
        const action = formData.id ? 'update_service' : 'create_service';
        const response = await axios.post(`${API_URL}?action=${action}`, { ...formData, current_user: localStorage.getItem('crm_user') });

        if (response.data.error) {
             showToast(response.data.error, 'error');
        } else {
             showToast('Guardado con éxito', 'success');
             setView('list');
             fetchServices();
        }
    } catch (e) {
        const msg = e.response?.data?.error || 'Error de conexión o servidor';
        showToast(msg, 'error');
    }
  };

  // Modal Rápido Finanzas
  const openFinanceModal = (s) => {
      setFinanceModal({
          id: s.id,
          provider_status: s.provider_status || 'Pendiente',
          provider_paid_amount: s.provider_paid_amount || 0,
          provider_notes: s.provider_notes || '',
          total_debt: parseFloat(s.report_provider_amount || 0)
      });
  };

  const saveFinanceQuick = async () => {
      if(!financeModal) return;
      try {
          await axios.post(`${API_URL}?action=quick_update_provider`, { ...financeModal, current_user: localStorage.getItem('crm_user') });
          showToast('Finanzas actualizadas', 'success');
          setFinanceModal(null);
          fetchServices();
      } catch (e) { showToast('Error al actualizar', 'error'); }
  };

  const openVoucher = (id) => window.open(`${VIEWER_URL}?id=${id}`, '_blank');

  // --- UI HELPERS ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = services.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(services.length / itemsPerPage);

  const totals = currentItems.reduce((acc, s) => {
      if(s.balance_currency === 'MXN') acc.bal_mxn += parseFloat(s.balance || 0);
      if(s.balance_currency === 'USD') acc.bal_usd += parseFloat(s.balance || 0);
      acc.rep_agency += parseFloat(s.report_amount || 0);
      acc.rep_provider += parseFloat(s.report_provider_amount || 0);
      return acc;
  }, { bal_mxn: 0, bal_usd: 0, rep_agency: 0, rep_provider: 0 });

  const money = (val, currency = '') => { if(!val) return '-'; return `${currency} ` + val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); };
  const Toast = () => ( toast && <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{toast.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}<span className="font-medium text-sm">{toast.message}</span></div>);
  const DeleteModal = () => ( deleteId && <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center"><h3 className="text-lg font-bold text-gray-800 mb-4">¿Eliminar Servicio?</h3><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2 bg-gray-100 rounded-lg">Cancelar</button><button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Eliminar</button></div></div></div>);

  // Modal Finanzas Rápido
  const FinanceModal = () => (
      financeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="bg-gray-900 p-4 flex justify-between items-center text-white">
                      <h3 className="font-bold flex items-center gap-2"><Wallet size={20}/> Pagos a Proveedor #{financeModal.id}</h3>
                      <button onClick={()=>setFinanceModal(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                          <span className="text-sm font-bold text-gray-500 uppercase">Total a Pagar</span>
                          <span className="text-xl font-bold text-gray-800">${financeModal.total_debt.toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Estatus</label>
                              <select className="w-full border p-2 rounded" value={financeModal.provider_status} onChange={e=>setFinanceModal({...financeModal, provider_status:e.target.value})}>
                                  <option>Pendiente</option>
                                  <option>Abonado</option>
                                  <option>Liquidado</option>
                                  <option>N/A</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Pagado ($)</label>
                              <input required type="number" className="w-full border p-2 rounded font-bold text-green-700" value={financeModal.provider_paid_amount} onChange={e=>setFinanceModal({...financeModal, provider_paid_amount:e.target.value})}/>
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Notas Internas</label>
                          <textarea className="w-full border p-2 rounded text-sm h-20" placeholder="Ej: Transferencia SPEI..." value={financeModal.provider_notes} onChange={e=>setFinanceModal({...financeModal, provider_notes:e.target.value})}></textarea>
                      </div>
                      <div className="pt-2 flex gap-3">
                          <button onClick={()=>setFinanceModal(null)} className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-600 font-bold">Cancelar</button>
                          <button onClick={saveFinanceQuick} className="flex-1 py-2 bg-blue-600 rounded-lg text-white font-bold shadow hover:bg-blue-700">Guardar Cambios</button>
                      </div>
                  </div>
              </div>
          </div>
      )
  );

  if (view === 'list') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 p-4 font-sans text-gray-800">
        <Toast /> <DeleteModal /> <FinanceModal />

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <button onClick={() => navigate('/menu')} className="bg-white border border-gray-200 text-gray-600 p-2.5 rounded-lg hover:bg-gray-50 shadow-sm transition"><Grid size={20}/></button>
                <div><h1 className="text-2xl font-bold text-gray-900">EoT CRM</h1><p className="text-xs text-gray-500 font-medium">Gestión de Transportes</p></div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <button onClick={handleReset} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 hover:text-blue-600 transition shadow-sm"><RefreshCw size={18}/> <span>Recargar</span></button>
                <button onClick={() => {
                    setFormData({
                        trip_type: 'one_way',
                        balance_currency: 'USD',
                        service_type: 'Llegada',
                        vehicle_type: 'Van',
                        pickup_location_url: '',
                        destination_url: '',
                        passengers: 1
                    });
                    setView('form');
                }} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold hover:bg-black transition shadow-lg transform active:scale-95"><Plus size={18}/> <span>Nuevo Servicio</span></button>
            </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1"><label className="text-[11px] font-bold text-gray-500 uppercase">Cliente</label><input required name="client" value={filters.client} onChange={handleFilterChange} onKeyDown={e=>e.key==='Enter'&&fetchServices()} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none" placeholder="Nombre..."/></div>
                    <div className="space-y-1"><label className="text-[11px] font-bold text-gray-500 uppercase">Agencia</label><input required name="agency" value={filters.agency} onChange={handleFilterChange} onKeyDown={e=>e.key==='Enter'&&fetchServices()} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none" placeholder="Agencia..."/></div>
                    <div className="space-y-1"><label className="text-[11px] font-bold text-gray-500 uppercase">Proveedor</label><input required name="provider" value={filters.provider} onChange={handleFilterChange} onKeyDown={e=>e.key==='Enter'&&fetchServices()} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none" placeholder="Proveedor..."/></div>
                    <div className="space-y-1"><label className="text-[11px] font-bold text-gray-500 uppercase">Folio (#SRV)</label><input required name="id" value={filters.id} onChange={handleFilterChange} onKeyDown={e=>e.key==='Enter'&&fetchServices()} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none" placeholder="123"/></div>
                </div>
                <div className="lg:col-span-4 flex flex-col justify-between gap-4">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 grid grid-cols-2 gap-3">
                         <div className="col-span-2 sm:col-span-1"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Mes</label><input required type="month" name="month" value={filters.month} onChange={handleFilterChange} className="w-full border border-gray-200 p-1.5 rounded-md text-xs bg-white"/></div>
                         <div className="col-span-2 sm:col-span-1"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Rango (Desde)</label><input required type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} className="w-full border border-gray-200 p-1.5 rounded-md text-xs bg-white mb-1"/><input required type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} className="w-full border border-gray-200 p-1.5 rounded-md text-xs bg-white"/></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={fetchServices} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-md"><Search size={18}/> Buscar</button>
                        <button onClick={downloadCSV} className="bg-green-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-green-700 shadow-md" title="Exportar CSV"><Download size={20}/></button>
                    </div>
                </div>
            </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-600 uppercase font-bold border-b border-gray-200">
                        <tr>
                            <th className="p-4">Folio</th><th className="p-4">Fecha</th><th className="p-4">Cliente</th><th className="p-4">Ruta</th><th className="p-4">Agencia / Prov</th><th className="p-4">Servicio</th><th className="p-4">Unidad</th>
                            <th className="p-4 text-right bg-blue-50/50">Bal. MXN</th><th className="p-4 text-right bg-green-50/50">Bal. USD</th><th className="p-4 text-right">Rep. Agencia</th><th className="p-4 text-right">Rep. Prov</th>
                            <th className="p-4 text-center">Estatus</th>
                            <th className="p-4 text-center bg-gray-100 border-l">Pago Prov</th>
                            <th className="p-4 text-center sticky right-0 bg-gray-50 shadow-sm">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {currentItems.map(s => {
                            const estado = s.provider_status || 'Pendiente';
                            const pagado = parseFloat(s.provider_paid_amount || 0);

                            let semaforoColor = 'bg-red-500';
                            if (estado === 'Liquidado') semaforoColor = 'bg-green-500';
                            else if (estado === 'Abonado') semaforoColor = 'bg-yellow-400';
                            else if (estado === 'N/A') semaforoColor = 'bg-gray-300';

                            return (
                            <tr key={s.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="p-4 font-mono font-bold text-gray-500">SRV{s.id}</td>
                                <td className="p-4"><div className="font-bold text-gray-800">{new Date(s.service_date).toLocaleDateString()}</div><div className="text-[10px] text-gray-500 font-mono">{new Date(s.service_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div></td>
                                <td className="p-4"><div className="font-bold text-gray-900 truncate max-w-[140px]" title={s.client_name}>{s.client_name}</div><div className="text-[10px] text-gray-500">{s.passengers} PAX</div></td>
                                <td className="p-4"><div className="flex flex-col gap-1 max-w-[150px]"><div className="truncate text-[11px] text-gray-600">📍 {s.pickup_location}</div><div className="truncate text-[11px] text-gray-600">🏁 {s.destination}</div></div></td>
                                <td className="p-4"><div className="font-bold text-gray-700">{s.agency}</div><div className="text-[10px] text-gray-500">{s.provider}</div></td>
                                <td className="p-4 text-gray-600">{s.service_type}</td>
                                <td className="p-4 text-gray-600">{s.vehicle_type}</td>
                                <td className="p-4 text-right font-bold text-gray-700 bg-blue-50/30">{s.balance_currency === 'MXN' ? money(parseFloat(s.balance)) : '-'}</td>
                                <td className="p-4 text-right font-bold text-green-700 bg-green-50/30">{s.balance_currency === 'USD' ? money(parseFloat(s.balance)) : '-'}</td>
                                <td className="p-4 text-right text-red-600 font-medium">{money(parseFloat(s.report_amount))}</td>
                                <td className="p-4 text-right text-orange-600 font-medium">{money(parseFloat(s.report_provider_amount))}</td>
                                <td className="p-4 text-center"><span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border ${s.payment_status==='Pagado'?'bg-green-100 text-green-800 border-green-200':s.payment_status==='Cancelado'?'bg-red-100 text-red-800 border-red-200':'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>{s.payment_status}</span></td>

                                {/* CELDA SEMÁFORO */}
                                <td className="p-4 text-center border-l bg-gray-50/50">
                                    <div className="flex items-center justify-center gap-2 cursor-pointer hover:scale-110 transition" onClick={()=>openFinanceModal(s)}>
                                        <div className={`w-3 h-3 rounded-full ${semaforoColor} shadow-sm ring-2 ring-white`} title={estado}></div>
                                        {s.provider_notes && <MessageSquare size={12} className="text-gray-400"/>}
                                    </div>
                                    <div className="text-[9px] text-gray-400 font-mono mt-1">{pagado > 0 ? money(pagado) : '-'}</div>
                                </td>

                                <td className="p-4 sticky right-0 bg-white group-hover:bg-blue-50/30 shadow-sm text-center">
                                    <div className="flex justify-center gap-1">
                                        <button onClick={()=>openVoucher(s.id)} className="text-green-600 bg-green-50 p-1.5 rounded-lg hover:bg-green-100 transition border border-green-200" title="Ver"><Eye size={16}/></button>
                                        <button onClick={()=>handleEdit(s)} className="text-blue-600 bg-blue-50 p-1.5 rounded-lg hover:bg-blue-100 transition border border-blue-200" title="Editar"><Edit size={16}/></button>
                                        <button onClick={()=>setDeleteId(s.id)} className="text-red-600 bg-red-50 p-1.5 rounded-lg hover:bg-red-100 transition border border-red-200" title="Borrar"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        );})}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200 text-[11px]">
                        <tr>
                            <td colSpan="7" className="p-4 text-right text-gray-500 uppercase tracking-wide">Totales de la página:</td>
                            <td className="p-4 text-right text-gray-800 bg-blue-50/50">{money(totals.bal_mxn, 'MXN')}</td>
                            <td className="p-4 text-right text-green-700 bg-green-50/50">{money(totals.bal_usd, 'USD')}</td>
                            <td className="p-4 text-right text-red-700">{money(totals.rep_agency, 'MXN')}</td>
                            <td className="p-4 text-right text-orange-700">{money(totals.rep_provider, 'MXN')}</td>
                            <td colSpan="3"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
                <span className="text-xs text-gray-500 font-medium">Mostrando {currentItems.length} registros (Página <span className="font-bold text-gray-800">{currentPage}</span> de {totalPages})</span>
                <div className="flex gap-2"><button onClick={()=>setCurrentPage(c=>Math.max(1,c-1))} disabled={currentPage===1} className="p-2 border rounded-lg hover:bg-white disabled:opacity-40 bg-white shadow-sm"><ChevronLeft size={18}/></button><button onClick={()=>setCurrentPage(c=>Math.min(totalPages,c+1))} disabled={currentPage===totalPages} className="p-2 border rounded-lg hover:bg-white disabled:opacity-40 bg-white shadow-sm"><ChevronRight size={18}/></button></div>
            </div>
        </div>
      </div>
    );
  }

  // VISTA FORMULARIO (MEJORADA)
  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans flex justify-center">
        <Toast />
        <div className="w-full max-w-5xl bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4 mb-6 border-b pb-4">
                <button onClick={()=>setView('list')} className="p-2 hover:bg-gray-100 rounded text-gray-600"><ArrowLeft/></button>
                <h2 className="text-xl font-bold text-gray-800">{formData.id ? 'Editar Servicio' : 'Nuevo Servicio de Transporte'}</h2>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. Cliente */}
                <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
                    <h3 className="font-bold text-gray-700 text-xs uppercase border-b border-gray-200 pb-2">Datos del Cliente</h3>
                    <div><label className="text-xs font-bold block mb-1">Nombre Completo</label><input required className="w-full border p-2 rounded text-sm" value={formData.client_name||''} onChange={e=>setFormData({...formData, client_name:e.target.value})}/></div>
                    <div className="flex gap-2">
                        <div className="flex-1"><label className="text-xs font-bold block mb-1">Teléfono</label><input required className="w-full border p-2 rounded text-sm" value={formData.client_phone||''} onChange={e=>setFormData({...formData, client_phone:e.target.value})}/></div>
                        <div className="flex-1"><label className="text-xs font-bold block mb-1">Email</label><input className="w-full border p-2 rounded text-sm" placeholder="Opcional" value={formData.client_email||''} onChange={e=>setFormData({...formData, client_email:e.target.value})}/></div>
                    </div>
                </div>

                {/* 2. Operativo */}
                <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
                    <h3 className="font-bold text-gray-700 text-xs uppercase border-b border-gray-200 pb-2">Detalles del Servicio</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-xs font-bold block mb-1">Agencia</label><input required className="w-full border p-2 rounded text-sm" value={formData.agency||''} onChange={e=>setFormData({...formData, agency:e.target.value})}/></div>
                        <div><label className="text-xs font-bold block mb-1">Proveedor</label><input required className="w-full border p-2 rounded text-sm" required value={formData.provider||''} onChange={e=>setFormData({...formData, provider:e.target.value})}/></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1"><label className="text-xs font-bold block mb-1">Fecha y Hora de Recogida</label><input required type="datetime-local" required className="w-full border p-2 rounded text-sm" value={formData.service_date||''} onChange={e=>setFormData({...formData, service_date:e.target.value})}/></div>
                        <div className="w-20"><label className="text-xs font-bold block mb-1">PAX</label><input required type="number" required className="w-full border p-2 rounded text-sm" value={formData.passengers||''} onChange={e=>setFormData({...formData, passengers:e.target.value})}/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-xs font-bold block mb-1">Unidad</label><select className="w-full border p-2 rounded text-sm" value={formData.vehicle_type||''} onChange={e=>setFormData({...formData, vehicle_type:e.target.value})}><option>Van</option><option>Sprinter</option><option>Suburban</option><option>Toyota</option></select></div>
                        <div><label className="text-xs font-bold block mb-1">Tipo Servicio</label><select className="w-full border p-2 rounded text-sm" value={formData.service_type||''} onChange={e=>setFormData({...formData, service_type:e.target.value})}><option>Llegada</option><option>Salida</option><option>Interhotel</option><option>Tour Privado</option><option>Marina</option></select></div>
                    </div>
                </div>

                {/* 3. Ruta */}
                <div className="md:col-span-2 space-y-4 border p-4 rounded-lg bg-white border-gray-200">
                    <h3 className="font-bold text-gray-700 text-xs uppercase border-b pb-2 flex justify-between items-center">
                        Ruta y Trayecto
                        <select className="border p-1 rounded text-xs" value={formData.trip_type||'one_way'} onChange={e=>setFormData({...formData, trip_type:e.target.value})}>
                            <option value="one_way">Sencillo (One Way)</option>
                            <option value="round_trip">Redondo (Round Trip)</option>
                        </select>
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold block mb-1">Pickup (Lugar de recogida)</label>
                            <textarea required className="w-full border p-2 rounded text-sm" rows="2" value={formData.pickup_location||''} onChange={e=>setFormData({...formData, pickup_location:e.target.value})}></textarea>
                            <input className="w-full border p-2 rounded mt-1 text-xs bg-gray-50" placeholder="URL Google Maps (Opcional)" value={formData.pickup_location_url||''} onChange={e=>setFormData({...formData, pickup_location_url:e.target.value})}/>
                        </div>
                        <div>
                            <label className="text-xs font-bold block mb-1">Destino</label>
                            <textarea required className="w-full border p-2 rounded text-sm" rows="2" value={formData.destination||''} onChange={e=>setFormData({...formData, destination:e.target.value})}></textarea>
                            <input className="w-full border p-2 rounded mt-1 text-xs bg-gray-50" placeholder="URL Google Maps (Opcional)" value={formData.destination_url||''} onChange={e=>setFormData({...formData, destination_url:e.target.value})}/>
                        </div>
                    </div>
                    {formData.trip_type === 'round_trip' && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-100 animate-fade-in-up">
                            <label className="text-xs font-bold block mb-1 text-blue-800">Fecha y Hora del Pick Up de Regreso</label>
                            <input required type="datetime-local" className="border p-2 rounded text-sm w-auto" value={formData.return_pickup_time||''} onChange={e=>setFormData({...formData, return_pickup_time:e.target.value})}/>
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-bold block mb-1">Número de Vuelo (Opcional)</label>
                        <input className="border p-2 rounded text-sm w-1/2" value={formData.flight_number||''} onChange={e=>setFormData({...formData, flight_number:e.target.value})}/>
                    </div>
                </div>

                {/* 4. Financiero (DISEÑO MEJORADO Y SEPARADO) */}
                <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

                    {/* CABECERA */}
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-2">
                            <DollarSign size={16} className="text-blue-600"/> Información Financiera
                        </h3>
                    </div>

                    <div className="p-6 space-y-6">

                        {/* SECCIÓN 1: VISTA CLIENTE (Voucher) */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Visible en Voucher</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Balance */}
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Balance a Cobrar</label>
                                    <div className="flex">
                                        <div className="bg-gray-100 border border-r-0 border-gray-300 rounded-l px-3 flex items-center text-gray-500 text-sm">$</div>
                                        <input required type="number" className="w-full border border-gray-300 p-2 text-sm font-bold text-gray-800 outline-none focus:border-blue-500" placeholder="0.00" value={formData.balance||''} onChange={e=>setFormData({...formData, balance:e.target.value})}/>
                                        <select className="border border-l-0 border-gray-300 rounded-r bg-gray-50 text-sm font-bold text-gray-600 px-2 outline-none" value={formData.balance_currency||'USD'} onChange={e=>setFormData({...formData, balance_currency:e.target.value})}><option>USD</option><option>MXN</option></select>
                                    </div>
                                </div>
                                {/* Estatus Cliente */}
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Estatus de Pago (Cliente)</label>
                                    <select className="w-full border border-gray-300 p-2 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.payment_status||'Pendiente'} onChange={e=>setFormData({...formData, payment_status:e.target.value})}><option>Pendiente</option><option>Pagado</option><option>No Show</option><option>Cancelado</option>
                                    </select>
                                </div>
                            </div>

                            {/* Observaciones Voucher */}
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Observaciones (Para el Cliente) (Opcional)</label>
                                <textarea className="w-full border border-gray-300 p-2 rounded text-sm focus:border-blue-500 outline-none resize-none" rows="2" placeholder="Notas visibles en el voucher..." value={formData.notes||''} onChange={e=>setFormData({...formData, notes:e.target.value})}></textarea>
                            </div>
                        </div>

                        {/* DIVISOR */}
                        <div className="border-t border-gray-200 border-dashed my-4"></div>

                        {/* SECCIÓN 2: CONTROL INTERNO (Privado) */}
                        <div className="bg-yellow-50/50 p-4 rounded-lg border border-yellow-100 space-y-4">
                            <h4 className="text-xs font-bold text-yellow-700 uppercase tracking-widest flex items-center gap-2">
                                <Users size={14}/> Control Interno / Proveedor
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Reporte Agencia */}
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Reporte agencia (Opcional)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-400 text-xs">$</span>
                                        <input type="number" className="w-full border border-gray-300 p-2 pl-6 rounded text-sm text-gray-700 bg-white focus:border-yellow-500 outline-none" value={formData.report_amount||''} onChange={e=>setFormData({...formData, report_amount:e.target.value})}/>
                                    </div>
                                </div>
                                {/* Deuda Proveedor */}
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Deuda Proveedor (Costo) (Opcional)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-400 text-xs">$</span>
                                        <input required type="number" className="w-full border border-gray-300 p-2 pl-6 rounded text-sm font-bold text-red-600 bg-white focus:border-yellow-500 outline-none" value={formData.report_provider_amount||''} onChange={e=>setFormData({...formData, report_provider_amount:e.target.value})}/>
                                    </div>
                                </div>
                                {/* Estatus Pago Agencia - CHANGED */}
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Estatus de pago agencia</label>
                                    <select
                                        className="w-full border border-gray-300 p-2 rounded text-sm bg-white focus:border-yellow-500 outline-none"
                                        value={formData.agency_payment_status || 'Pendiente'}
                                        onChange={e => setFormData({ ...formData, agency_payment_status: e.target.value })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option>Pendiente</option>
                                        <option>Abonado</option>
                                        <option>Liquidado</option>
                                        <option>N/A</option>
                                    </select>
                                </div>
                                {/* Estatus Proveedor */}
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Estatus Proveedor</label>
                                    <select className="w-full border border-gray-300 p-2 rounded text-sm bg-white focus:border-yellow-500 outline-none" value={formData.provider_status||'Pendiente'} onChange={e=>setFormData({...formData, provider_status:e.target.value})}>
                                        <option value="">Seleccionar...</option><option>Pendiente</option><option>Abonado</option><option>Liquidado</option><option>N/A</option>
                                    </select>
                                </div>
                            </div>

                            {/* Notas Internas */}
                            <div>
                                <label className="text-xs font-bold text-gray-600 block mb-1">Notas Internas (Privado) (Opcional)</label>
                                <textarea className="w-full border border-gray-300 p-2 rounded text-sm bg-white focus:border-yellow-500 outline-none resize-none" rows="2" placeholder="Detalles de pago al proveedor..." value={formData.provider_notes||''} onChange={e=>setFormData({...formData, provider_notes:e.target.value})}></textarea>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="md:col-span-2 pt-4 border-t flex justify-end gap-3">
                    <button type="button" onClick={()=>setView('list')} className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded transition">Cancelar</button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition">Guardar Servicio</button>
                </div>

            </form>
        </div>
    </div>
  );
}
