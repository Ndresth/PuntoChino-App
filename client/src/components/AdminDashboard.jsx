import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductForm from './ProductForm';

export default function AdminDashboard() {
  const [productos, setProductos] = useState([]);
  
  // Estado financiero ampliado
  const [finanzas, setFinanzas] = useState({ 
      totalVentas: 0, 
      totalGastos: 0, 
      totalCaja: 0, 
      cantidadPedidos: 0 
  });
  
  const [gastos, setGastos] = useState([]); // Lista de gastos del día
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '' });

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const cargarDatos = () => {
    // 1. Productos
    fetch('/api/productos').then(res => res.json()).then(setProductos);
    // 2. Finanzas (Ventas vs Gastos)
    fetch('/api/ventas/hoy').then(res => res.json()).then(setFinanzas);
    // 3. Lista de Gastos
    fetch('/api/gastos/hoy').then(res => res.json()).then(setGastos);
  };

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(cargarDatos, 5000); // Actualiza cada 5s
    return () => clearInterval(interval);
  }, []);

  // --- REGISTRAR GASTO ---
  const handleRegistrarGasto = async (e) => {
      e.preventDefault();
      if (!nuevoGasto.descripcion || !nuevoGasto.monto) return alert("Completa los datos del gasto");

      const res = await fetch('/api/gastos', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify(nuevoGasto)
      });

      if (res.ok) {
          alert("💸 Salida de dinero registrada");
          setNuevoGasto({ descripcion: '', monto: '' });
          cargarDatos();
      } else {
          alert("Error registrando gasto");
      }
  };

  const handleBorrarGasto = async (id) => {
      if(!window.confirm("¿Borrar este gasto? (El dinero volverá a sumar a la caja)")) return;
      await fetch(`/api/gastos/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      cargarDatos();
  };

  // --- CERRAR CAJA ---
  const handleCerrarCaja = async () => {
    const input = prompt("💰 ¿Cuánto EFECTIVO contaste en el cajón?");
    if (input === null) return;
    const efectivoReal = Number(input);
    
    if (isNaN(efectivoReal)) return alert("Número inválido");

    const msg = `Resumen del Turno:\n` +
                `+ Ventas: $${finanzas.totalVentas.toLocaleString()}\n` +
                `- Salidas/Gastos: $${finanzas.totalGastos.toLocaleString()}\n` +
                `= EN CAJA DEBE HABER: $${finanzas.totalCaja.toLocaleString()}\n\n` +
                `Tú contaste: $${efectivoReal.toLocaleString()}\n\n` +
                `¿Cerrar turno definitivamente?`;

    if (!window.confirm(msg)) return;

    const res = await fetch('/api/ventas/cerrar', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ efectivoReal })
    });

    const data = await res.json();
    if (res.ok) {
        const rep = data.reporte;
        let veredicto = "";
        
        if(rep.diferencia === 0) veredicto = "✨ CUADRE PERFECTO";
        else if(rep.diferencia > 0) veredicto = `🤑 SOBRAN $${rep.diferencia.toLocaleString()}`;
        else veredicto = `⚠️ FALTAN $${Math.abs(rep.diferencia).toLocaleString()} (¡ROBO O PÉRDIDA!)`;
        
        alert(`✅ CAJA CERRADA\n\n${veredicto}`);
        cargarDatos();
    } else {
        alert(data.message);
    }
  };

  // Funciones de productos (sin cambios)
  const handleDelete = (id) => { if(window.confirm("¿Borrar?")) fetch(`/api/productos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }).then(cargarDatos); };
  const handleSave = (formData) => { 
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct ? `/api/productos/${formData.id}` : '/api/productos';
    fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(formData) }).then(() => { setShowForm(false); cargarDatos(); });
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark">Panel Administrativo</h2>
        <button className="btn btn-danger" onClick={handleLogout}>Salir</button>
      </div>

      {/* ZONA FINANCIERA ANTIRROBO */}
      <div className="row mb-4">
        {/* Tarjeta de Resumen */}
        <div className="col-md-7 mb-3">
            <div className="card bg-dark text-white shadow h-100">
                <div className="card-body p-4 d-flex flex-column justify-content-center">
                    <div className="d-flex justify-content-between mb-2">
                        <span className="text-success fw-bold">+ Ventas Totales:</span>
                        <span className="text-success fw-bold">${finanzas.totalVentas.toLocaleString()}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-3 border-bottom border-secondary pb-2">
                        <span className="text-danger fw-bold">- Gastos / Salidas:</span>
                        <span className="text-danger fw-bold">${finanzas.totalGastos.toLocaleString()}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-end">
                        <div>
                            <h5 className="text-white-50 mb-0">Debe haber en Caja:</h5>
                            <h1 className="display-4 fw-bold text-warning mb-0">${finanzas.totalCaja.toLocaleString()}</h1>
                        </div>
                        <button onClick={handleCerrarCaja} className="btn btn-warning fw-bold py-2 px-4 shadow">
                            <i className="bi bi-lock-fill me-2"></i> CERRAR CAJA
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Tarjeta de Registro de Gastos */}
        <div className="col-md-5 mb-3">
            <div className="card shadow h-100 border-danger">
                <div className="card-header bg-danger text-white fw-bold">
                    <i className="bi bi-wallet2 me-2"></i> Registrar Salida de Dinero
                </div>
                <div className="card-body">
                    <form onSubmit={handleRegistrarGasto} className="d-flex gap-2 mb-3">
                        <input type="text" className="form-control" placeholder="Motivo (Ej: Hielo)" 
                            value={nuevoGasto.descripcion} onChange={e => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})} />
                        <input type="number" className="form-control" placeholder="$ Valor" style={{width:'100px'}}
                            value={nuevoGasto.monto} onChange={e => setNuevoGasto({...nuevoGasto, monto: e.target.value})} />
                        <button type="submit" className="btn btn-outline-danger"><i className="bi bi-plus-lg"></i></button>
                    </form>
                    
                    <div className="overflow-auto" style={{maxHeight: '150px'}}>
                        <ul className="list-group list-group-flush small">
                            {gastos.map(g => (
                                <li key={g._id} className="list-group-item d-flex justify-content-between px-0 py-1">
                                    <span className="text-truncate" style={{maxWidth: '150px'}}>{g.descripcion}</span>
                                    <span>
                                        <span className="badge bg-danger rounded-pill me-2">-${g.monto.toLocaleString()}</span>
                                        <i className="bi bi-x-circle text-muted" style={{cursor:'pointer'}} onClick={() => handleBorrarGasto(g._id)}></i>
                                    </span>
                                </li>
                            ))}
                            {gastos.length === 0 && <li className="text-center text-muted fst-italic">Sin gastos hoy</li>}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* GESTIÓN DE PRODUCTOS (IGUAL) */}
      <div className="d-flex justify-content-between align-items-center mb-3 mt-5">
        <h4>Gestión de Menú</h4>
        <button className="btn btn-success fw-bold" onClick={() => { setEditingProduct(null); setShowForm(true); }}>+ Nuevo Plato</button>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="p-3">Imagen</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th className="text-end p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((prod) => (
                  <tr key={prod.id}>
                    <td className="p-3">
                      <img src={prod.imagen || "https://via.placeholder.com/50"} alt="img" className="rounded" style={{width: '50px', height: '50px', objectFit: 'cover'}} />
                    </td>
                    <td className="fw-bold">{prod.nombre}</td>
                    <td><span className="badge bg-secondary text-light">{prod.categoria}</span></td>
                    <td>${prod.precios ? Object.values(prod.precios).find(p => p > 0)?.toLocaleString() : '0'}</td>
                    <td className="text-end p-3">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => { setEditingProduct(prod); setShowForm(true); }}>Editar</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(prod.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && <ProductForm productToEdit={editingProduct} onClose={() => setShowForm(false)} onSave={handleSave} />}
    </div>
  );
}