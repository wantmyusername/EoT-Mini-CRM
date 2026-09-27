import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Save, Trash2, Plus, RefreshCw, List, Briefcase, User, Eye, Edit, X, Clock, DollarSign, Users, Search, ChevronLeft, ChevronRight, Grid, ArrowLeft, FileText } from 'lucide-react';

const API_URL = 'https://exclusiveontrip.com/crm/api/index.php';
const VOUCHER_VIEWER = 'https://exclusiveontrip.com/crm/api/ver.php';

function ToursModule() {
  const navigate = useNavigate();

  // Estados
  const [view, setView] = useState('voucher');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [quotesHistory, setQuotesHistory] = useState([]);

  // Buscador y Paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Editor
  const [currentId, setCurrentId] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({
    agent: '', date: new Date().toLocaleDateString('es-MX'), clientName: '',
    travelDate: '', hotel: '', country: '', paymentStatus: '', observations: ''
  });

  // Modal y Edición Item
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ESTADO NUEVO: Soporte para múltiples tipos de pasajeros en un solo item
  const [newItem, setNewItem] = useState({
      name: '',
      pickup: '',
      qtyAdult: 0, rateAdult: 0,
      qtyMinor: 0, rateMinor: 0,
      qtyInfant: 0, rateInfant: 0
  });
  const [editingItemId, setEditingItemId] = useState(null);

  // Init
  useEffect(() => { generateInvoiceNum(); fetchProducts(); }, []);
  useEffect(() => { if(view === 'dashboard') fetchHistory(); }, [view]);

  // --- API ---
  const fetchProducts = async () => { try { const res = await axios.get(`${API_URL}?action=get_products`); if(Array.isArray(res.data)) setProducts(res.data); } catch (e) {} };
  const fetchHistory = async () => { try { const res = await axios.get(`${API_URL}?action=get_quotes`); if(Array.isArray(res.data)) setQuotesHistory(res.data); } catch (e) {} };
  const deleteQuote = async (id) => { if(confirm("¿Eliminar?")) { await axios.post(`${API_URL}?action=delete_quote`, { id, current_user: localStorage.getItem('crm_user') }); fetchHistory(); } };
  const generateInvoiceNum = () => setInvoiceNumber(`#INV-${Math.floor(100000 + Math.random() * 900000)}`);

  // --- LÓGICA ITEMS ---
  const saveItem = () => {
      if(!newItem.name) return alert("Selecciona un servicio");

      const totalAdults = (parseInt(newItem.qtyAdult) || 0);
      const totalMinors = (parseInt(newItem.qtyMinor) || 0);
      const totalInfants = (parseInt(newItem.qtyInfant) || 0);
      const totalPax = totalAdults + totalMinors + totalInfants;

      if(totalPax === 0) return alert("Debes agregar al menos un pasajero.");

      // Calculamos el total monetario
      const totalMoney = (totalAdults * (parseFloat(newItem.rateAdult)||0)) +
                         (totalMinors * (parseFloat(newItem.rateMinor)||0)) +
                         (totalInfants * (parseFloat(newItem.rateInfant)||0));

      // Generamos una descripción inteligente para el PDF
      // Ejemplo: "Tour Xcaret (2 Adultos, 1 Menor)"
      let details = [];
      if(totalAdults > 0) details.push(`${totalAdults} ADULTOS`);
      if(totalMinors > 0) details.push(`${totalMinors} MENOR`);
      if(totalInfants > 0) details.push(`${totalInfants} INAFNTE`);

      // Guardamos la info compactada para que el PDF la entienda sin cambios
      // Usamos el campo 'qty' como el total de personas para referencia
      // Y 'rate' como el promedio o 0, ya que usaremos 'total' directo.
      const itemToSave = {
          id: editingItemId || Date.now(),
          name: newItem.name, // Nombre base
          pickup: newItem.pickup,
          qty: totalPax, // Total de personas
          rate: 0, // No aplica tasa única, se usa el total
          total: totalMoney,
          isMinor: details.join(', '), // Usamos este campo para mostrar el desglose en el PDF (hack inteligente)

          // Guardamos el desglose por si queremos editarlo luego
          breakdown: {
              qtyAdult: newItem.qtyAdult, rateAdult: newItem.rateAdult,
              qtyMinor: newItem.qtyMinor, rateMinor: newItem.rateMinor,
              qtyInfant: newItem.qtyInfant, rateInfant: newItem.rateInfant
          }
      };

      if (editingItemId) {
          setItems(items.map(item => item.id === editingItemId ? itemToSave : item));
      } else {
          setItems([...items, itemToSave]);
      }
      closeModal();
  };

  const handleEditItem = (item) => {
      // Recuperamos el desglose si existe, o intentamos adivinar si es legacy
      const bd = item.breakdown || {
          qtyAdult: item.qty, rateAdult: item.rate || 0,
          qtyMinor: 0, rateMinor: 0,
          qtyInfant: 0, rateInfant: 0
      };

      setNewItem({
          name: item.name,
          pickup: item.pickup,
          ...bd
      });
      setEditingItemId(item.id);
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setNewItem({ name: '', pickup: '', qtyAdult: 0, rateAdult: 0, qtyMinor: 0, rateMinor: 0, qtyInfant: 0, rateInfant: 0 });
      setEditingItemId(null);
      setIsModalOpen(false);
  };

  const deleteItem = (id) => setItems(items.filter(item => item.id !== id));
  const editorTotal = items.reduce((acc, item) => acc + parseFloat(item.total), 0);

  // --- ACCIONES COTIZACIÓN ---
  const saveQuote = async () => {
    if (!formData.clientName) return alert("Falta nombre del cliente");
    setLoading(true);
    try {
      const netTotal = items.reduce((acc, item) => acc + parseFloat(item.total), 0);
      const payload = { ...formData, items, netTotal, invoiceNumber, id: currentId, current_user: localStorage.getItem('crm_user') };
      const res = await axios.post(`${API_URL}?action=save_quote`, payload);
      if(res.data.id) {
          if (!currentId) setCurrentId(res.data.id);
          window.open(`${VOUCHER_VIEWER}?id=${res.data.id}`, '_blank');
          fetchHistory();
      }
    } catch (error) { alert("Error al guardar"); }
    setLoading(false);
  };

  const handleEditQuote = (quote) => {
    try {
        const data = typeof quote.data_json === 'string' ? JSON.parse(quote.data_json) : quote.data_json;
        setFormData({ agent: data.agent||'', date: data.date||'', clientName: data.clientName||'', travelDate: data.travelDate||'', hotel: data.hotel||'', country: data.country||'', paymentStatus: data.paymentStatus||'', observations: data.observations||'' });
        setItems(data.items || []);
        setInvoiceNumber(data.invoiceNumber || quote.invoice_number);
        setCurrentId(quote.id);
        setView('voucher');
    } catch (e) { alert("Error al cargar."); }
  };

  const openPdf = (id) => window.open(`${VOUCHER_VIEWER}?id=${id}`, '_blank');

  const resetForm = () => {
      setItems([]);
      setFormData({ agent: '', date: new Date().toLocaleDateString('es-MX'), clientName: '', travelDate: '', hotel: '', country: '', paymentStatus: '', observations: '' });
      generateInvoiceNum();
      setCurrentId(null);
  };

  // --- PAGINACIÓN ---
  const filteredHistory = quotesHistory.filter(q => q.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) || q.client_name.toLowerCase().includes(searchTerm.toLowerCase()));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-32 font-sans">

      {/* NAVBAR */}
      <div className="bg-gray-900 text-white shadow-lg sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/menu')} className="bg-gray-800 hover:bg-gray-700 p-2 rounded text-gray-300 hover:text-white transition"><Grid size={20} /></button>
                <img src="https://exclusiveontrip.com/logo.png" className="h-8 bg-white rounded px-2 hidden sm:block"/>
                <nav className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
                    <button onClick={() => setView('voucher')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2 ${view === 'voucher' ? 'bg-white text-gray-900 shadow' : 'text-gray-400 hover:text-white'}`}>
                        <Edit size={16}/> <span className="hidden sm:inline">Editor</span>
                    </button>
                    <button onClick={() => setView('dashboard')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2 ${view === 'dashboard' ? 'bg-white text-gray-900 shadow' : 'text-gray-400 hover:text-white'}`}>
                        <List size={16}/> <span className="hidden sm:inline">Historial</span>
                    </button>
                </nav>
            </div>

            {view === 'voucher' && (
                <button onClick={resetForm} className="text-gray-400 hover:text-white flex items-center gap-2 text-xs font-bold bg-gray-800 px-3 py-1.5 rounded hover:bg-gray-700 transition">
                    <RefreshCw size={14}/> LIMPIAR
                </button>
            )}
        </div>
      </div>

      {/* VISTA: HISTORIAL */}
      {view === 'dashboard' && (
          <div className="container mx-auto p-4 md:p-8 animate-fade-in-up">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <h2 className="text-2xl font-bold text-gray-800">Historial</h2>
                  <div className="relative w-full md:w-auto">
                      <Search className="absolute left-3 top-3 text-gray-400" size={20}/>
                      <input
                        type="text"
                        placeholder="Buscar por Folio o Nombre..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-80 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      />
                  </div>
              </div>
              <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs border-b">
                                <tr><th className="p-4">Folio</th><th className="p-4">Cliente</th><th className="p-4 text-right">Total</th><th className="p-4 text-center">Acciones</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentItems.map((q) => (
                                    <tr key={q.id} className="hover:bg-blue-50 transition">
                                        <td className="p-4 font-bold text-blue-600">{q.invoice_number}</td>
                                        <td className="p-4 font-medium">{q.client_name}</td>
                                        <td className="p-4 text-right font-bold text-gray-800">${parseFloat(q.total).toLocaleString()}</td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleEditQuote(q)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition tooltip" title="Editar"><Edit size={18}/></button>
                                                <button onClick={() => openPdf(q.id)} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded transition tooltip" title="Ver PDF"><Eye size={18}/></button>
                                                <button onClick={() => deleteQuote(q.id)} className="p-2 text-red-500 hover:bg-red-50 rounded transition tooltip" title="Eliminar"><Trash2 size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                      <span className="text-xs text-gray-500">Página {currentPage} de {totalPages || 1}</span>
                      <div className="flex gap-2">
                          <button onClick={prevPage} disabled={currentPage===1} className="p-2 rounded border bg-white disabled:opacity-50"><ChevronLeft size={18}/></button>
                          <button onClick={nextPage} disabled={currentPage>=totalPages} className="p-2 rounded border bg-white disabled:opacity-50"><ChevronRight size={18}/></button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* VISTA: EDITOR */}
      {view === 'voucher' && (
        <>
            <div className="container mx-auto px-4 py-6 max-w-5xl">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Panel Izquierdo (Datos) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
                            <h3 className="font-bold text-gray-500 text-xs uppercase flex gap-2 items-center"><Briefcase size={14}/> Datos Operativos</h3>
                            <div><label className="text-xs font-bold text-gray-500 ml-1">Agente</label><input className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition" placeholder="Tu nombre" value={formData.agent} onChange={e=>setFormData({...formData, agent:e.target.value})}/></div>
                            <div><label className="text-xs font-bold text-gray-500 ml-1">Pago</label><select className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.paymentStatus} onChange={e=>setFormData({...formData, paymentStatus:e.target.value})}><option value="">Seleccionar...</option><option>Pago al abordar</option><option>Reservado con anticipo</option><option>Balance pagado</option></select></div>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
                            <h3 className="font-bold text-gray-500 text-xs uppercase flex gap-2 items-center"><User size={14}/> Cliente</h3>
                            <div><label className="text-xs font-bold text-gray-500 ml-1">Nombre Completo</label><input className="w-full border border-gray-300 p-2.5 rounded-lg text-sm font-bold outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition" placeholder="Ej. Juan Pérez" value={formData.clientName} onChange={e=>setFormData({...formData, clientName:e.target.value})}/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-gray-500 ml-1">Fecha Viaje / Tour</label><input type="date" className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-gray-50 focus:bg-white" value={formData.travelDate} onChange={e=>setFormData({...formData, travelDate:e.target.value})}/></div>
                                <div><label className="text-xs font-bold text-gray-500 ml-1">País de Origen</label><input className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-gray-50 focus:bg-white" placeholder="Ej. México" value={formData.country} onChange={e=>setFormData({...formData, country:e.target.value})}/></div>
                            </div>
                            <div><label className="text-xs font-bold text-gray-500 ml-1">Hotel / Airbnb</label><input className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-gray-50 focus:bg-white" placeholder="Ubicación de recogida" value={formData.hotel} onChange={e=>setFormData({...formData, hotel:e.target.value})}/></div>
                        </div>
                    </div>

                    {/* Panel Derecho (Servicios) */}
                    <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 min-h-[500px] flex flex-col relative">

                            {/* Header Servicios */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
                                <h3 className="font-bold text-lg flex gap-2 items-center text-gray-800"><List size={20} className="text-blue-600"/> Servicios Cotizados</h3>
                                <button onClick={()=>setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition transform active:scale-95 w-full sm:w-auto justify-center">
                                    <Plus size={18}/> Agregar Servicio
                                </button>
                            </div>

                            {/* Lista de Items */}
                            <div className="flex-1 overflow-y-auto max-h-[400px]">
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 m-4">
                                        <List size={40} className="mb-2 opacity-50"/>
                                        <p className="text-sm font-medium">No hay servicios agregados aún.</p>
                                        <p className="text-xs">Presiona "Agregar Servicio" para comenzar.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0 z-10">
                                            <tr><th className="p-3">Servicio</th><th className="p-3 text-center">Pickup</th><th className="p-3 text-center">Total Pax</th><th className="p-3 text-right">Total $</th><th className="p-3"></th></tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-gray-100">
                                            {items.map(i => (
                                                <tr key={i.id} className="hover:bg-blue-50 transition group">
                                                    <td className="p-3">
                                                        <div className="font-medium text-gray-800">{i.name}</div>
                                                        {/* MOSTRAR DESGLOSE */}
                                                        <div className="text-[10px] text-gray-500 font-medium">
                                                            {i.breakdown ?
                                                                `${i.breakdown.qtyAdult} ADULTOS ($${i.breakdown.rateAdult}) · ${i.breakdown.qtyMinor} MENOR ($${i.breakdown.rateMinor}) · ${i.breakdown.qtyInfant} INFANTE`
                                                                : 'Tasa única'}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center text-gray-500 font-mono text-xs">{i.pickup}</td>
                                                    <td className="p-3 text-center font-bold">{i.qty}</td>
                                                    <td className="p-3 text-right font-bold text-gray-900">${i.total.toLocaleString()}</td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition">
                                                            <button onClick={()=>handleEditItem(i)} className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded"><Edit size={16}/></button>
                                                            <button onClick={()=>deleteItem(i.id)} className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-100 rounded"><Trash2 size={16}/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Observaciones */}
                            <div className="mt-6">
                                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase ml-1">Observaciones / Notas</label>
                                <textarea className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-gray-700 h-24 focus:outline-none focus:border-yellow-400 resize-none transition" placeholder="Escribe notas adicionales aquí..." value={formData.observations} onChange={e=>setFormData({...formData, observations:e.target.value})}></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- BARRA FIJA INFERIOR (STICKY FOOTER) --- */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-40">
                <div className="container mx-auto max-w-5xl flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-bold uppercase">Total Estimado</span>
                        <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-none">
                            ${editorTotal.toLocaleString()} <span className="text-sm font-bold text-gray-400">USD</span>
                        </span>
                    </div>

                    <button
                        onClick={saveQuote}
                        disabled={loading}
                        className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold shadow-xl flex items-center gap-3 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={20}/> : <FileText size={20}/>}
                        <span>{loading ? 'Generando...' : 'Guardar y Generar Recibo'}</span>
                    </button>
                </div>
            </div>

            {/* MODAL MULTI-TARIFA (NUEVO) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                        <div className="bg-gray-900 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold flex items-center gap-2 text-lg">
                                {editingItemId ? <Edit size={20}/> : <Plus size={20}/>}
                                {editingItemId ? 'Editar Servicio' : 'Agregar Servicio'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white transition"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-5">

                            {/* SERVICIO */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Servicio</label>
                                <div className="relative">
                                    <select className="w-full border border-gray-300 rounded-lg p-3 pl-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none"
                                        value={newItem.name}
                                        onChange={e=>{ const p = products.find(x=>x.name===e.target.value); if(p) setNewItem({...newItem, name:p.name, rateAdult: parseFloat(p.price)}); }}>
                                        <option value="">Seleccionar del catálogo...</option>
                                        <optgroup label="Tours">{products.filter(p=>p.type==='tour').map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</optgroup>
                                        <optgroup label="Servicios">{products.filter(p=>p.type==='servicio').map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</optgroup>
                                    </select>
                                </div>
                            </div>

                            {/* PICKUP */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Hora Pickup</label>
                                <div className="relative"><Clock className="absolute left-3 top-3 text-gray-400" size={18}/><input type="time" className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 text-sm" value={newItem.pickup} onChange={e=>setNewItem({...newItem, pickup:e.target.value})}/></div>
                            </div>

                            {/* TARIFAS (FILAS) */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase border-b pb-1">Desglose de personas</h4>

                                {/* ADULTO */}
                                <div className="flex gap-4 items-center">
                                    <div className="w-24 text-sm font-bold text-gray-700">Adultos</div>
                                    <input type="number" className="w-16 border rounded p-1 text-center font-bold" placeholder="Cant" min="0" value={newItem.qtyAdult || ''} onChange={e=>setNewItem({...newItem, qtyAdult: parseInt(e.target.value)||0})} />
                                    <div className="flex-1 relative"><span className="absolute left-2 top-1.5 text-gray-400">$</span><input type="number" className="w-full border rounded p-1 pl-5" placeholder="Precio" value={newItem.rateAdult || ''} onChange={e=>setNewItem({...newItem, rateAdult: parseFloat(e.target.value)||0})} /></div>
                                </div>

                                {/* MENOR */}
                                <div className="flex gap-4 items-center">
                                    <div className="w-24 text-sm font-bold text-gray-600">Menores</div>
                                    <input type="number" className="w-16 border rounded p-1 text-center font-bold" placeholder="Cant" min="0" value={newItem.qtyMinor || ''} onChange={e=>setNewItem({...newItem, qtyMinor: parseInt(e.target.value)||0})} />
                                    <div className="flex-1 relative"><span className="absolute left-2 top-1.5 text-gray-400">$</span><input type="number" className="w-full border rounded p-1 pl-5" placeholder="Precio" value={newItem.rateMinor || ''} onChange={e=>setNewItem({...newItem, rateMinor: parseFloat(e.target.value)||0})} /></div>
                                </div>

                                {/* INFANTE */}
                                <div className="flex gap-4 items-center">
                                    <div className="w-24 text-sm font-bold text-gray-600">Infantes</div>
                                    <input type="number" className="w-16 border rounded p-1 text-center font-bold" placeholder="Cant" min="0" value={newItem.qtyInfant || ''} onChange={e=>setNewItem({...newItem, qtyInfant: parseInt(e.target.value)||0})} />
                                    <div className="flex-1 relative"><span className="absolute left-2 top-1.5 text-gray-400">$</span><input type="number" className="w-full border rounded p-1 pl-5" placeholder="Precio" value={newItem.rateInfant || ''} onChange={e=>setNewItem({...newItem, rateInfant: parseFloat(e.target.value)||0})} /></div>
                                </div>
                            </div>

                            {/* TOTAL DINÁMICO DEL MODAL */}
                            <div className="text-right text-sm font-bold text-gray-500">
                                Total: <span className="text-lg text-black">${((newItem.qtyAdult*newItem.rateAdult) + (newItem.qtyMinor*newItem.rateMinor) + (newItem.qtyInfant*newItem.rateInfant)).toLocaleString()}</span>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button onClick={closeModal} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                                <button onClick={saveItem} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-lg transition transform active:scale-95">{editingItemId ? 'Guardar Cambios' : 'Agregar'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
      )}
    </div>
  );
}

export default ToursModule;
