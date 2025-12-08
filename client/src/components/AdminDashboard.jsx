import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductForm from './ProductForm';
import Reportes from './Reportes';

export default function AdminDashboard() {
  const [productos, setProductos] = useState([]);
  const [finanzas, setFinanzas] = useState({ totalVentas: 0, totalGastos: 0, totalCaja: 0, cantidadPedidos: 0 });
  const [gastos, setGastos] = useState([]);
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [cargandoExcel, setCargandoExcel] = useState(false);
  const [vista, setVista] = useState('dashboard'); 

  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  const cargarDatos = () => {
    fetch('/api/productos').then(res => res.json()).then(setProductos);
    fetch('/api/ventas/hoy').then(res => res.json()).then(setFinanzas);
    fetch('/api/gastos/hoy').then(res => res.json()).then(setGastos);
  };

  useEffect(() => {
    if (vista === 'dashboard') {
        cargarDatos();
        const interval = setInterval(cargarDatos, 5000);
        return () => clearInterval(interval);
    }
  }, [vista]);

  // --- DESCARGAR EXCEL DEL TURNO ACTUAL ---
  const handleDescargarExcel = async () => {
    setCargandoExcel(true);
    try {
        // NOTA: Agregamos '/actual' a la ruta
        const response = await fetch('/api/ventas/excel/actual', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Cierre_Parcial_${new Date().toLocaleDateString('es-CO').replace(/\//g, '-')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } else { alert("Error al generar Excel."); }
    } catch {
      alert("Error de conexión.");
    } 
    finally { setCargandoExcel(false); }
  };

  // ... (RESTO DE FUNCIONES IGUAL QUE ANTES: handleRegistrarGasto, handleCerrarCaja, etc.) ...
  // Para ahorrar espacio, asumo que copias las funciones del paso anterior.
  // Solo asegúrate de que el return sea el siguiente:

  const handleRegistrarGasto = async (e) => {
      e.preventDefault();
      if (!nuevoGasto.descripcion || !nuevoGasto.monto) return alert("Complete datos");
      await fetch('/api/gastos', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(nuevoGasto) });
      setNuevoGasto({ descripcion: '', monto: '' }); cargarDatos();
  };
  const handleBorrarGasto = async (id) => { if(window.confirm("¿Borrar?")) await fetch(`/api/gastos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); cargarDatos(); };
  const handleCerrarCaja = async () => {
    const input = prompt("💰 Efectivo total en caja:");
    if (input === null) return;
    const efectivoReal = Number(input);
    if (isNaN(efectivoReal)) return alert("Número inválido");
    if (!window.confirm(`¿Cerrar turno con $${efectivoReal.toLocaleString()}?`)) return;
    const res = await fetch('/api/ventas/cerrar', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify({ efectivoReal }) });
    if (res.ok) { alert("Cierre Exitoso"); cargarDatos(); } else { alert("Error"); }
  };
  const handleDelete = (id) => { if(window.confirm("¿Borrar?")) fetch(`/api/productos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }).then(cargarDatos); };
  const handleSave = (formData) => { 
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct ? `/api/productos/${formData.id}` : '/api/productos';
    fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(formData) }).then(() => { setShowForm(false); cargarDatos(); });
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark"><i className="bi bi-speedometer2 me-2"></i>Panel Administrativo</h2>
        <div className="d-flex gap-2">
            <button className={`btn ${vista === 'dashboard' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setVista('dashboard')}><i className="bi bi-grid-1x2-fill me-2"></i>Control</button>
            <button className={`btn ${vista === 'reportes' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setVista('reportes')}><i className="bi bi-bar-chart-fill me-2"></i>Reportes</button>
            
            {/* BOTÓN DE EXCEL ACTUAL */}
            <button className="btn btn-success" onClick={handleDescargarExcel} disabled={cargandoExcel}>
                {cargandoExcel ? '...' : <><i className="bi bi-file-earmark-excel-fill me-2"></i>Excel Hoy</>}
            </button>

            <button className="btn btn-danger ms-2" onClick={handleLogout}><i className="bi bi-box-arrow-right me-2"></i>Salir</button>
        </div>
      </div>

      {vista === 'reportes' ? <Reportes /> : (
          <>
            <div className="row mb-4">
                <div className="col-md-7 mb-3">
                    <div className="card bg-dark text-white shadow h-100">
                        <div className="card-body p-4 d-flex flex-column justify-content-center">
                            <div className="d-flex justify-content-between mb-2"><span className="text-success fw-bold">Ventas:</span><span className="text-success fw-bold">${finanzas.totalVentas?.toLocaleString()}</span></div>
                            <div className="d-flex justify-content-between mb-3 border-bottom border-secondary pb-2"><span className="text-danger fw-bold">Gastos:</span><span className="text-danger fw-bold">${finanzas.totalGastos?.toLocaleString()}</span></div>
                            <div className="d-flex justify-content-between align-items-end">
                                <div><h5 className="text-white-50 mb-0">Saldo Teórico:</h5><h1 className="display-4 fw-bold text-warning mb-0">${finanzas.totalCaja?.toLocaleString()}</h1></div>
                                <button onClick={handleCerrarCaja} className="btn btn-warning fw-bold py-2 px-4 shadow"><i className="bi bi-lock-fill me-2"></i> CERRAR CAJA</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-5 mb-3">
                    <div className="card shadow h-100 border-danger">
                        <div className="card-header bg-danger text-white fw-bold"><i className="bi bi-wallet2 me-2"></i> Registrar Salida</div>
                        <div className="card-body">
                            <form onSubmit={handleRegistrarGasto} className="d-flex gap-2 mb-3">
                                <input type="text" className="form-control" placeholder="Concepto" value={nuevoGasto.descripcion} onChange={e => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})} />
                                <input type="number" className="form-control" placeholder="$" style={{width:'100px'}} value={nuevoGasto.monto} onChange={e => setNuevoGasto({...nuevoGasto, monto: e.target.value})} />
                                <button type="submit" className="btn btn-outline-danger"><i className="bi bi-plus-lg"></i></button>
                            </form>
                            <div className="overflow-auto" style={{maxHeight: '150px'}}>
                                <ul className="list-group list-group-flush small">
                                    {gastos.map(g => (
                                        <li key={g._id} className="list-group-item d-flex justify-content-between px-0 py-1"><span>{g.descripcion}</span><span><span className="badge bg-light text-danger border me-2">-${g.monto.toLocaleString()}</span><i className="bi bi-trash text-muted" style={{cursor:'pointer'}} onClick={() => handleBorrarGasto(g._id)}></i></span></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-3 mt-5"><h4>Inventario</h4><button className="btn btn-success fw-bold" onClick={() => { setEditingProduct(null); setShowForm(true); }}><i className="bi bi-plus-circle me-2"></i>Nuevo Plato</button></div>
            <div className="card shadow-sm border-0"><div className="card-body p-0"><div className="table-responsive"><table className="table table-hover align-middle mb-0"><thead className="bg-light"><tr><th className="p-3">Img</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th className="text-end p-3">Acciones</th></tr></thead><tbody>
                {productos.map((prod) => (
                <tr key={prod.id}><td className="p-3"><img src={prod.imagen} alt="img" className="rounded border" style={{width: '40px'}} /></td><td className="fw-bold">{prod.nombre}</td><td><span className="badge bg-secondary">{prod.categoria}</span></td><td>${prod.precios?.unico || 0}</td><td className="text-end p-3"><button className="btn btn-sm btn-outline-primary me-2" onClick={() => { setEditingProduct(prod); setShowForm(true); }}><i className="bi bi-pencil"></i></button><button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(prod.id)}><i className="bi bi-trash"></i></button></td></tr>
                ))}
            </tbody></table></div></div></div>
            {showForm && <ProductForm productToEdit={editingProduct} onClose={() => setShowForm(false)} onSave={handleSave} />}
          </>
      )}
    </div>
  );
}