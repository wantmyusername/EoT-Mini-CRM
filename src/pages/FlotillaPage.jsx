import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Truck, Plus,
  Trash2, Fuel, Grid, MapPin,
  X, Droplet, Wrench, Loader2, Eye, Download
} from 'lucide-react';

const API_URL = 'https://exclusiveontrip.com/crm/api/api_flotilla.php';

const FlotillaPage = () => {
  const navigate = useNavigate();

  // --- ESTADOS ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // --- DATOS ---
  const [trips, setTrips] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [mileageLogs, setMileageLogs] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);

  // --- MODALES ---
  const [showTripModal, setShowTripModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [selectedViewTrip, setSelectedViewTrip] = useState(null);

  // --- FORMS ---
  const initialTripForm = {
    date: '', time: '', client: '', pax: '', agency: '', provider: '',
    arrival_data: '', origin: '', destination: '', service: 'Llegada',
    vehicle: 'Crafter 26', balance_mxn: '', balance_usd: '', report_mxn: '', obs: ''
  };
  const [tripForm, setTripForm] = useState(initialTripForm);

  const [expenseForm, setExpenseForm] = useState({ date: '', vehicle: 'Crafter 26', concept: '', amount: '' });
  const [mileageForm, setMileageForm] = useState({ date: '', vehicle: 'Crafter 26', start_km: '', end_km: '' });
  const [fuelForm, setFuelForm] = useState({ date: '', vehicle: 'Crafter 26', amount: '' });

  // --- FETCH DATOS ---
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const response = await fetch(`${API_URL}?action=get_month&month=${monthStr}`);
      const data = await response.json();

      if (data.success) {
        setTrips(data.trips || []);
        setExpenses(data.expenses || []);
        setMileageLogs(data.mileage || []);
        setFuelLogs(data.fuel || []);
      } else {
        console.error("Error API:", data.error);
      }
    } catch (error) {
      console.error("Error de red:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  // --- GUARDAR ---
  const postData = async (action, body) => {
    try {
      const res = await fetch(`${API_URL}?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
        return true;
      } else {
        alert("Error: " + result.error);
        return false;
      }
    } catch (e) {
      alert("Error de conexión");
      return false;
    }
  };

  const handleSaveTrip = async () => {
    if(await postData('save_trip', tripForm)) {
        setShowTripModal(false);
        setTripForm(initialTripForm);
    }
  };
  const handleSaveExpense = async () => { if(await postData('save_expense', expenseForm)) setShowExpenseModal(false); };
  const handleSaveMileage = async () => { if(await postData('save_mileage', mileageForm)) setShowMileageModal(false); };
  const handleSaveFuel = async () => { if(await postData('save_fuel', fuelForm)) setShowFuelModal(false); };

  // --- ELIMINAR ---
  const handleDelete = async (type, id) => {
    if (!window.confirm("¿Confirma eliminar este registro?")) return;
    postData('delete', { type, id });
  };

  // --- EXPORTAR CSV ---
  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM para acentos en Excel

    // 1. VIAJES
    csvContent += "--- BITACORA DE VIAJES ---\n";
    csvContent += "Fecha,Cliente,PAX,Hora,Origen,Destino,Agencia,Proveedor,Servicio,Unidad,Balance MXN,Balance USD,Reporte MXN,Observaciones\n";
    filteredData.trips.forEach(t => {
      csvContent += `${t.date},${t.client_name},${t.pax},${t.time},${t.origin},${t.destination},${t.agency},${t.provider},${t.service_type},${t.vehicle},${t.balance_mxn},${t.balance_usd},${t.report_mxn},"${t.observations || ''}"\n`;
    });

    // 2. KILOMETRAJE
    csvContent += "\n--- KILOMETRAJE ---\n";
    csvContent += "Fecha,Unidad,Inicio,Fin,Total\n";
    filteredData.mileage.forEach(m => {
      csvContent += `${m.date},${m.vehicle},${m.start_km},${m.end_km},${m.end_km - m.start_km}\n`;
    });

    // 3. COMBUSTIBLE
    csvContent += "\n--- COMBUSTIBLE ---\n";
    csvContent += "Fecha,Unidad,Monto\n";
    filteredData.fuel.forEach(f => {
      csvContent += `${f.date},${f.vehicle},${f.amount}\n`;
    });

    // 4. GASTOS
    csvContent += "\n--- GASTOS VARIOS ---\n";
    csvContent += "Fecha,Concepto,Monto\n";
    filteredData.expenses.forEach(e => {
      csvContent += `${e.date},${e.concept},${e.amount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Flotilla_${activeTab}_${currentDate.getMonth()+1}_${currentDate.getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CÁLCULOS ---
  const formatMoney = (amount, currency = 'MXN') =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(amount) || 0);

  const changeMonth = (inc) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + inc);
    setCurrentDate(d);
  };

  const filteredData = useMemo(() => {
    const filterByVehicle = (item) => activeTab === 'all' || item.vehicle === activeTab;

    const currentTrips = trips.filter(filterByVehicle);
    const currentExpenses = expenses.filter(filterByVehicle);
    const currentMileage = mileageLogs.filter(filterByVehicle);
    const currentFuel = fuelLogs.filter(filterByVehicle);

    const totalIncomeMXN = currentTrips.reduce((acc, curr) => acc + Number(curr.balance_mxn || 0), 0);
    const totalIncomeUSD = currentTrips.reduce((acc, curr) => acc + Number(curr.balance_usd || 0), 0);
    const totalReportMXN = currentTrips.reduce((acc, curr) => acc + Number(curr.report_mxn || 0), 0);

    const totalExpenses = currentExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const totalFuel = currentFuel.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const totalKm = currentMileage.reduce((acc, curr) => acc + (Number(curr.end_km) - Number(curr.start_km)), 0);

    const estimatedUtility = (totalIncomeMXN + (totalIncomeUSD * 18)) - (totalExpenses + totalFuel);

    return {
        trips: currentTrips, expenses: currentExpenses, mileage: currentMileage, fuel: currentFuel,
        totalIncomeMXN, totalIncomeUSD, totalReportMXN, totalExpenses, totalFuel, totalKm, estimatedUtility
    };
  }, [trips, expenses, mileageLogs, fuelLogs, activeTab]);

  const handleChange = (e, setFunc, state) => setFunc({ ...state, [e.target.name]: e.target.value });

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-800 pb-20">

      {/* HEADER STICKY */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-4 shadow-sm">
        <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={() => navigate('/menu')} className="bg-white border border-gray-200 text-gray-600 p-2.5 rounded-lg hover:bg-gray-50 shadow-sm transition">
                        <Grid size={20}/>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            Control de Flotilla
                            {isLoading && <Loader2 className="animate-spin text-brand-cyan" size={18}/>}
                        </h1>
                        <p className="text-xs text-slate-500 font-medium hidden md:block">Gestión Operativa y Financiera</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-lg text-slate-600 transition-all shadow-sm"><ChevronLeft size={18}/></button>
                    <div className="px-4 text-sm font-bold text-slate-700 uppercase tracking-wide min-w-[140px] text-center">
                        {currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                    </div>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-lg text-slate-600 transition-all shadow-sm"><ChevronRight size={18}/></button>
                </div>
            </div>

            {/* TABS */}
            <div className="flex justify-center md:justify-start mb-4 overflow-x-auto">
                <div className="inline-flex bg-slate-200/50 p-1 rounded-lg">
                    {['all', 'Crafter 26', 'Urban 25'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {tab === 'all' ? 'Todas' : tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KPICard label="Ingresos MXN" value={formatMoney(filteredData.totalIncomeMXN)} color="text-emerald-600" />
                <KPICard label="Ingresos USD" value={formatMoney(filteredData.totalIncomeUSD, 'USD')} color="text-blue-600" />
                <KPICard label="Reporte (MXN)" value={formatMoney(filteredData.totalReportMXN)} color="text-slate-700" />
                <KPICard label="Gastos Varios" value={formatMoney(filteredData.totalExpenses)} color="text-orange-600" />
                <KPICard label="Combustible" value={formatMoney(filteredData.totalFuel)} color="text-red-600" />
                <KPICard label="Utilidad Neta" value={formatMoney(filteredData.estimatedUtility)} color="text-slate-900" bg="bg-indigo-50 border-indigo-100" />
            </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 md:px-6 mt-6 space-y-6">

        {/* TABLA PRINCIPAL - REORDENADA */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-700 flex gap-2 items-center text-sm uppercase tracking-wide"><Truck size={16}/> Bitácora de Viajes</h3>
                <div className="flex gap-2">
<div className="flex items-center gap-3">
  <button
    onClick={() => setShowTripModal(true)}
    className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
  >
    <Plus size={18} />
    Nuevo Servicio
  </button>

  <button
    onClick={exportToCSV}
    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
  >
    <Download size={16} />
    Descargar CSV
  </button>
</div>


                </div>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
                {isLoading ? (
                    <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin" size={30} />
                        <p className="text-sm">Cargando datos...</p>
                    </div>
                ) : (
                    <table className="w-full text-xs text-left whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-500 font-bold uppercase sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 w-10"></th>
                                <th className="px-4 py-3 min-w-[90px]">Fecha</th>
                                <th className="px-4 py-3 text-slate-800">Nombre</th>
                                <th className="px-4 py-3 text-center">PAX</th>
                                <th className="px-4 py-3 text-center">Hora (24H)</th>
                                <th className="px-4 py-3">Lugar</th>
                                <th className="px-4 py-3">Destino</th>
                                <th className="px-4 py-3">Agencia</th>
                                <th className="px-4 py-3">Proveedor</th>
                                <th className="px-4 py-3 text-center">Servicio</th>
                                <th className="px-4 py-3 text-center">Tipo de Unidad</th>
                                <th className="px-4 py-3 text-right bg-emerald-50/30 text-emerald-900">Balance MXN</th>
                                <th className="px-4 py-3 text-right bg-blue-50/30 text-blue-900">Balance USD</th>
                                <th className="px-4 py-3 text-right text-slate-700">Reporte (MXN)</th>
                                <th className="px-4 py-3 max-w-[200px]">Observaciones</th>
                                <th className="px-4 py-3 text-center w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.trips.map(trip => (
                                <tr key={trip.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-4 py-2.5">
                                        <button onClick={() => setSelectedViewTrip(trip)} className="text-indigo-400 hover:text-indigo-600 transition-colors">
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                    {/* 1. Fecha */}
                                    <td className="px-4 py-2.5 text-slate-600 font-medium">{trip.date}</td>
                                    {/* 2. Nombre */}
                                    <td className="px-4 py-2.5 font-bold text-slate-800">{trip.client_name}</td>
                                    {/* 3. PAX */}
                                    <td className="px-4 py-2.5 text-center text-slate-500">{trip.pax}</td>
                                    {/* 4. Hora */}
                                    <td className="px-4 py-2.5 text-center font-mono text-slate-500">{trip.time ? trip.time.substring(0,5) : '-'}</td>
                                    {/* 5. Lugar */}
                                    <td className="px-4 py-2.5 text-slate-600">{trip.origin}</td>
                                    {/* 6. Destino */}
                                    <td className="px-4 py-2.5 text-slate-600">{trip.destination}</td>
                                    {/* 7. Agencia */}
                                    <td className="px-4 py-2.5 text-slate-600">{trip.agency}</td>
                                    {/* 8. Proveedor */}
                                    <td className="px-4 py-2.5 italic text-slate-500">{trip.provider}</td>
                                    {/* 9. Servicio */}
                                    <td className="px-4 py-2.5 text-center">
                                        <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold ${
                                            trip.service_type === 'Llegada' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            trip.service_type === 'Salida' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                            'bg-orange-50 text-orange-700 border-orange-100'
                                        }`}>{trip.service_type}</span>                                    </td>
                                    {/* 10. Tipo de Unidad */}
                                    <td className="px-4 py-2.5 text-center"><span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded border text-slate-600">{trip.vehicle}</span></td>
                                    {/* 11. Balance MXN */}
                                    <td className="px-4 py-2.5 text-right font-mono text-emerald-600 bg-emerald-50/10">{Number(trip.balance_mxn) > 0 ? formatMoney(trip.balance_mxn) : '-'}</td>
                                    {/* 12. Balance USD */}
                                    <td className="px-4 py-2.5 text-right font-mono text-blue-600 bg-blue-50/10">{Number(trip.balance_usd) > 0 ? formatMoney(trip.balance_usd, 'USD') : '-'}</td>
                                    {/* 13. Reporte (MXN) */}
                                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-700">{Number(trip.report_mxn) > 0 ? formatMoney(trip.report_mxn) : '-'}</td>
                                    {/* 14. Observaciones */}
                                    <td className="px-4 py-2.5 text-xs text-slate-400 truncate max-w-[150px]" title={trip.observations}>{trip.observations || '-'}</td>
                                    {/* Acciones */}
                                    <td className="px-4 py-2.5 text-center"><button onClick={() => handleDelete('trip', trip.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-all"><Trash2 size={14}/></button></td>
                                </tr>
                            ))}
                            {filteredData.trips.length === 0 && (
                                <tr><td colSpan="16" className="py-12 text-center text-slate-400 text-sm">No hay servicios registrados.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

 {/* 3. SECCIÓN INFERIOR (CORREGIDA) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* A. Kilometraje */}
            <SectionBox title="Kilometraje" icon={<MapPin size={16} className="text-indigo-500"/>} onAdd={() => setShowMileageModal(true)} total={`${filteredData.totalKm.toLocaleString()} km`}>
                <TableHeaders cols={['Fecha', 'Unidad', 'Inicio', 'Fin', 'Total']} />
                <tbody className="divide-y divide-slate-50">
                    {filteredData.mileage.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50">
                            <td className="p-2 text-slate-600">{log.date}</td>
                            <td className="p-2 text-[10px] font-bold">{log.vehicle}</td>
                            <td className="p-2 text-right font-mono text-xs text-slate-400">{log.start_km}</td>
                            <td className="p-2 text-right font-mono text-xs text-slate-400">{log.end_km}</td>
                            <td className="p-2 text-right font-mono text-xs font-bold text-indigo-600">{(log.end_km - log.start_km)}</td>
                            <td className="p-2 text-center"><DelBtn onClick={() => handleDelete('mileage', log.id)}/></td>
                        </tr>
                    ))}
                </tbody>
            </SectionBox>

            {/* B. Combustible */}
            <SectionBox title="Combustible" icon={<Droplet size={16} className="text-red-500"/>} onAdd={() => setShowFuelModal(true)} total={formatMoney(filteredData.totalFuel)}>
                <TableHeaders cols={['Fecha', 'Unidad', 'Monto']} />
                <tbody className="divide-y divide-slate-50">
                    {filteredData.fuel.map(log => (
                        <tr key={log.id} className="hover:bg-red-50/10">
                            <td className="p-2 text-slate-600">{log.date}</td>
                            <td className="p-2 text-[10px] font-bold">{log.vehicle}</td>
                            <td className="p-2 text-right font-mono font-bold text-red-600">{formatMoney(log.amount)}</td>
                            <td className="p-2 text-center"><DelBtn onClick={() => handleDelete('fuel', log.id)}/></td>
                        </tr>
                    ))}
                </tbody>
            </SectionBox>

            {/* C. Gastos Adicionales */}
            <SectionBox title="Gastos Varios" icon={<Wrench size={16} className="text-orange-500"/>} onAdd={() => setShowExpenseModal(true)} total={formatMoney(filteredData.totalExpenses)}>
                <TableHeaders cols={['Fecha', 'Concepto', 'Monto']} />
                <tbody className="divide-y divide-slate-50">
                    {filteredData.expenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-orange-50/10">
                            <td className="p-2 text-slate-600">{exp.date}</td>
                            <td className="p-2 text-[10px] font-bold uppercase text-slate-500">{exp.concept}</td>
                            <td className="p-2 text-right font-mono font-bold text-orange-600">{formatMoney(exp.amount)}</td>
                            <td className="p-2 text-center"><DelBtn onClick={() => handleDelete('expense', exp.id)}/></td>
                        </tr>
                    ))}
                </tbody>
            </SectionBox>

        </div>


      </div>

      {/* --- MODALES --- */}

      {/* Modal Ver Detalle (NUEVO) */}
      {selectedViewTrip && (
        <Modal title="Detalle del Servicio" onClose={() => setSelectedViewTrip(null)}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="Fecha" value={selectedViewTrip.date} />
                    <DetailItem label="Hora" value={selectedViewTrip.time} />
                    <DetailItem label="Cliente" value={selectedViewTrip.client_name} full />
                    <DetailItem label="PAX" value={selectedViewTrip.pax} />
                    <DetailItem label="Servicio" value={selectedViewTrip.service_type} />
                    <DetailItem label="Agencia" value={selectedViewTrip.agency} />
                    <DetailItem label="Proveedor" value={selectedViewTrip.provider} />
                    <DetailItem label="Origen" value={selectedViewTrip.origin} />
                    <DetailItem label="Destino" value={selectedViewTrip.destination} />
                    <DetailItem label="Unidad" value={selectedViewTrip.vehicle} />
                    <DetailItem label="Vuelo / Info" value={selectedViewTrip.arrival_data || '-'} full />
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-3 gap-2">
                    <DetailItem label="Balance MXN" value={formatMoney(selectedViewTrip.balance_mxn)} color="text-emerald-600" />
                    <DetailItem label="Balance USD" value={formatMoney(selectedViewTrip.balance_usd, 'USD')} color="text-blue-600" />
                    <DetailItem label="Reporte" value={formatMoney(selectedViewTrip.report_mxn)} color="text-slate-900" />
                </div>
                <div className="border-t pt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Observaciones</p>
                    <p className="text-sm text-slate-700 italic bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[60px]">
                        {selectedViewTrip.observations || 'Sin observaciones.'}
                    </p>
                </div>
            </div>
        </Modal>
      )}

      {/* Modal Servicio */}
      {showTripModal && (
        <Modal title="Nuevo Servicio" onClose={() => setShowTripModal(false)}>
             <div className="grid grid-cols-2 gap-3">
                <Input name="date" label="Fecha" type="date" value={tripForm.date} onChange={(e) => handleChange(e, setTripForm, tripForm)} />
                <Input name="time" label="Hora (24 HRS)" type="time" value={tripForm.time} onChange={(e) => handleChange(e, setTripForm, tripForm)} />
                <div className="col-span-2"><Input name="client" label="Nombre (Cliente)" placeholder="Nombre completo" value={tripForm.client} onChange={(e) => handleChange(e, setTripForm, tripForm)} /></div>
                <Input name="pax" label="PAX" type="number" value={tripForm.pax} onChange={(e) => handleChange(e, setTripForm, tripForm)} />
                <Input name="agency" label="Agencia" value={tripForm.agency} onChange={(e) => handleChange(e, setTripForm, tripForm)} />
                <Input name="provider" label="Proveedor" value={tripForm.provider} onChange={(e) => handleChange(e, setTripForm, tripForm)} />
                <Input name="arrival_data" label="Llegada (Vuelo/Info)" value={tripForm.arrival_data} onChange={(e) => handleChange(e, setTripForm, tripForm)} />
                <Input name="origin" label="Lugar (Origen)" value={tripForm.origin} onChange={(e) => handleChange(e, setTripForm, tripForm)} />
                <Input name="destination" label="Destino" value={tripForm.destination} onChange={(e) => handleChange(e, setTripForm, tripForm)} />
                <Select name="service" label="Servicio" options={['Llegada', 'Salida', 'Inter', 'Marina', 'Open']} value={tripForm.service} onChange={(e) => handleChange(e, setTripForm, tripForm)} />
                <Select name="vehicle" label="Tipo de Unidad" options={['Crafter 26', 'Urban 25']} value={tripForm.vehicle} onChange={(e) => handleChange(e, setTripForm, tripForm)} />

                <div className="col-span-2 border-t pt-4 mt-2">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1">Finanzas</p>
                    <div className="grid grid-cols-3 gap-3">
                        <Input name="balance_mxn" label="Balance MXN" type="number" placeholder="0.00" value={tripForm.balance_mxn} onChange={(e) => handleChange(e, setTripForm, tripForm)} />
                        <Input name="balance_usd" label="Balance USD" type="number" placeholder="0.00" value={tripForm.balance_usd} onChange={(e) => handleChange(e, setTripForm, tripForm)} />
                        <Input name="report_mxn" label="Reporte MXN" type="number" placeholder="0.00" value={tripForm.report_mxn} onChange={(e) => handleChange(e, setTripForm, tripForm)} />
                    </div>
                </div>
                <div className="col-span-2">
                    <Input name="obs" label="Observaciones" value={tripForm.obs} onChange={(e) => handleChange(e, setTripForm, tripForm)} />
                </div>
                <button onClick={handleSaveTrip} className="col-span-2 bg-slate-900 text-white py-3 rounded-xl font-bold mt-4 hover:bg-slate-800 transition-all shadow-md">Guardar Servicio</button>
             </div>
        </Modal>
      )}

      {/* Modal Kilometraje */}
      {showMileageModal && (
         <Modal title="Registro Kilometraje" onClose={() => setShowMileageModal(false)}>
             <div className="flex flex-col gap-3">
                <Input name="date" label="Fecha" type="date" value={mileageForm.date} onChange={(e) => handleChange(e, setMileageForm, mileageForm)} />
                <Select name="vehicle" label="Unidad" options={['Crafter 26', 'Urban 25']} value={mileageForm.vehicle} onChange={(e) => handleChange(e, setMileageForm, mileageForm)} />
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <Input name="start_km" label="Km Inicial" type="number" value={mileageForm.start_km} onChange={(e) => handleChange(e, setMileageForm, mileageForm)} />
                    <Input name="end_km" label="Km Final" type="number" value={mileageForm.end_km} onChange={(e) => handleChange(e, setMileageForm, mileageForm)} />
                </div>
                <button onClick={handleSaveMileage} className="bg-indigo-600 text-white py-3 rounded-xl font-bold mt-2 hover:bg-indigo-700 transition-all shadow-md">Guardar Registro</button>
             </div>
         </Modal>
      )}

      {/* Modal Combustible */}
      {showFuelModal && (
         <Modal title="Registro Combustible" onClose={() => setShowFuelModal(false)}>
             <div className="flex flex-col gap-3">
                <Input name="date" label="Fecha" type="date" value={fuelForm.date} onChange={(e) => handleChange(e, setFuelForm, fuelForm)} />
                <Select name="vehicle" label="Unidad" options={['Crafter 26', 'Urban 25']} value={fuelForm.vehicle} onChange={(e) => handleChange(e, setFuelForm, fuelForm)} />
                <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <Input name="amount" label="Monto ($)" type="number" placeholder="0.00" value={fuelForm.amount} onChange={(e) => handleChange(e, setFuelForm, fuelForm)} />
                </div>
                <button onClick={handleSaveFuel} className="bg-red-600 text-white py-3 rounded-xl font-bold mt-2 hover:bg-red-700 transition-all shadow-md">Registrar Carga</button>
             </div>
         </Modal>
      )}

      {/* Modal Gasto */}
      {showExpenseModal && (
         <Modal title="Gasto Adicional" onClose={() => setShowExpenseModal(false)}>
             <div className="flex flex-col gap-3">
                <Input name="date" label="Fecha" type="date" value={expenseForm.date} onChange={(e) => handleChange(e, setExpenseForm, expenseForm)} />
                <Select name="vehicle" label="Unidad" options={['Crafter 26', 'Urban 25']} value={expenseForm.vehicle} onChange={(e) => handleChange(e, setExpenseForm, expenseForm)} />
                <Input name="concept" label="Concepto" placeholder="Ej. Refacciones" value={expenseForm.concept} onChange={(e) => handleChange(e, setExpenseForm, expenseForm)} />
                <Input name="amount" label="Monto ($)" type="number" value={expenseForm.amount} onChange={(e) => handleChange(e, setExpenseForm, expenseForm)} />
                <button onClick={handleSaveExpense} className="bg-orange-600 text-white py-3 rounded-xl font-bold mt-2 hover:bg-orange-700 transition-all shadow-md">Registrar Gasto</button>
             </div>
         </Modal>
      )}

    </div>
  );
};

// --- COMPONENTES UI REUTILIZABLES ---

const KPICard = ({ label, value, color, bg = "bg-white" }) => (
    <div className={`${bg} p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full`}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
        <h3 className={`text-xl font-bold ${color}`}>{value}</h3>
    </div>
);

const DetailItem = ({ label, value, full = false, color = "text-slate-800" }) => (
    <div className={full ? "col-span-2" : ""}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
        <p className={`text-sm font-semibold truncate ${color}`}>{value || '-'}</p>
    </div>
);

const SectionBox = ({ title, icon, onAdd, total, children }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[350px]">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h4 className="font-bold text-slate-700 text-xs flex items-center gap-2 uppercase tracking-wide">{icon} {title}</h4>
            <div className="flex items-center gap-2">
                {total && <span className="text-[10px] font-mono bg-white border px-1.5 rounded text-slate-600 shadow-sm">{total}</span>}
                <button onClick={onAdd} className="text-[10px] font-bold bg-slate-900 text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors">+ Añadir</button>
            </div>
        </div>
        <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
                {children}
            </table>
        </div>
    </div>
);

const TableHeaders = ({ cols }) => (
    <thead className="bg-white text-slate-400 text-[10px] uppercase font-bold sticky top-0 border-b z-10">
        <tr>{cols.map(c => <th key={c} className={`px-2 py-1.5 ${c === 'Monto' || c === 'Inicio' || c === 'Fin' || c === 'Total' ? 'text-right' : 'text-left'}`}>{c}</th>)}<th className="w-6"></th></tr>
    </thead>
);

const Modal = ({ title, children, onClose }) => (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h3 className="font-bold text-lg text-slate-800">{title}</h3>
                <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-all">
                    <X size={24} />
                </button>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    </div>
);

const Input = ({ label, type = "text", placeholder, name, value, onChange }) => (
    <div>
        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wide">{label}</label>
        <input
            name={name}
            value={value}
            onChange={onChange}
            type={type}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
            placeholder={placeholder}
        />
    </div>
);

const Select = ({ label, options, name, value, onChange }) => (
    <div>
        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wide">{label}</label>
        <div className="relative">
            <select
                name={name}
                value={value}
                onChange={onChange}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                <ChevronRight size={14} className="rotate-90"/>
            </div>
        </div>
    </div>
);

const DelBtn = ({ onClick }) => (
    <button onClick={onClick} className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-all"><Trash2 size={12}/></button>
);

export default FlotillaPage;
