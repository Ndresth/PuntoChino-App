import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductForm from './ProductForm';

export default function AdminDashboard() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState({ total: 0, cantidadPedidos: 0 }); // Nuevo estado
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  // Cargar Productos
  const fetchProductos = () => {
    // Usa la ruta relativa /api/productos si vas a subir a Render
    fetch('/api/productos')
      .then(res => res.json())
      .then(data => setProductos(data))
      .catch(err => console.error(err));
  };

  // NUEVO: Cargar Ventas del Día
  const fetchVentas = () => {
    fetch('/api/ventas/hoy')
      .then(res => res.json())
      .then(data => setVentas(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchProductos();
    fetchVentas();
    // Actualizar ventas cada 30 segs
    const interval = setInterval(fetchVentas, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- FUNCIÓN MAGICA: DESCARGAR Y BORRAR ---
  const handleCerrarCaja = async () => {
    if (!window.confirm("¿Seguro que quieres CERRAR CAJA?\n1. Se descargará el Excel.\n2. Se borrarán todos los pedidos del sistema.")) {
        return;
    }

    // 1. Descargar Excel
    // Truco: Abrimos la url en una ventana nueva para forzar la descarga
    window.open('/api/ventas/excel', '_blank');

    // Esperamos unos segundos a que la descarga inicie antes de borrar
    setTimeout(async () => {
        const confirmDelete = window.confirm("¿El Excel se descargó correctamente? Si le das OK, se borrarán los datos.");
        
        if (confirmDelete) {
            // 2. Borrar Datos
            const res = await fetch('/api/ventas/cerrar', { method: 'DELETE' });
            if (res.ok) {
                alert("✅ ¡Caja Cerrada! Sistema listo para mañana.");
                fetchVentas(); // Resetear contador visual a 0
            } else {
                alert("Error al borrar datos.");
            }
        }
    }, 3000);
  };
  // -------------------------------------------

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar plato?')) {
      fetch(`/api/productos/${id}`, { method: 'DELETE' })
      .then(() => { alert('Eliminado'); fetchProductos(); });
    }
  };

  const handleSave = (formData) => {
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct 
        ? `/api/productos/${formData.id}`
        : '/api/productos';

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    }).then(() => {
        setShowForm(false);
        fetchProductos();
    });
  };

  return (
    <div className="container py-5">
      
      {/* HEADER DE NAVEGACIÓN */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark">Panel Administrativo</h2>
        <button className="btn btn-danger" onClick={handleLogout}>Salir</button>
      </div>

      {/* --- ZONA FINANCIERA (NUEVO) --- */}
      <div className="row mb-5">
        <div className="col-md-12">
            <div className="card bg-dark text-white shadow">
                <div className="card-body d-flex justify-content-between align-items-center p-4">
                    <div>
                        <h5 className="text-white-50 mb-1">Ventas de Hoy ({ventas.cantidadPedidos} pedidos)</h5>
                        <h1 className="display-4 fw-bold text-warning mb-0">${ventas.total.toLocaleString()}</h1>
                    </div>
                    <div className="text-end">
                        <button onClick={handleCerrarCaja} className="btn btn-light fw-bold px-4 py-3 rounded-pill">
                            <i className="bi bi-file-earmark-spreadsheet-fill text-success me-2"></i> 
                            Cerrar Caja y Descargar Excel
                        </button>
                        <div className="text-white-50 small mt-2">
                            *Esto descargará el reporte y reiniciará el sistema.
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
      {/* ------------------------------- */}

      <div className="d-flex justify-content-between align-items-center mb-3">
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

      {showForm && (
        <ProductForm 
            productToEdit={editingProduct} 
            onClose={() => setShowForm(false)} 
            onSave={handleSave} 
        />
      )}
    </div>
  );
}