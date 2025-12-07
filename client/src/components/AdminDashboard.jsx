import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductForm from './ProductForm';

export default function AdminDashboard() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState({ total: 0, cantidadPedidos: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [descargaConfirmada, setDescargaConfirmada] = useState(false);
  const [cargandoExcel, setCargandoExcel] = useState(false);
  
  const navigate = useNavigate();

  // Función auxiliar para obtener el token
  const getToken = () => localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('token'); // Borramos también el token
    navigate('/login');
  };

  const fetchProductos = () => {
    // GET sigue siendo público según nuestra configuración
    fetch('/api/productos')
      .then(res => res.json())
      .then(data => setProductos(data))
      .catch(err => console.error(err));
  };

  const fetchVentas = () => {
    // GET sigue siendo público
    fetch('/api/ventas/hoy')
      .then(res => res.json())
      .then(data => setVentas(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchProductos();
    fetchVentas();
    const interval = setInterval(fetchVentas, 10000);
    return () => clearInterval(interval);
  }, []);

  // --- ACCIÓN PROTEGIDA: DESCARGAR EXCEL ---
  const handleDescargarExcel = async () => {
    setCargandoExcel(true);
    try {
        const response = await fetch('/api/ventas/excel', {
            headers: { 
                'Authorization': `Bearer ${getToken()}` // <--- LLAVE DE SEGURIDAD
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Cierre_${new Date().toLocaleDateString('es-CO').replace(/\//g, '-')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setDescargaConfirmada(true);
        } else if (response.status === 401 || response.status === 403) {
            alert("⛔ Sesión expirada. Por favor inicia sesión de nuevo.");
            handleLogout();
        } else {
            alert("Error generando Excel.");
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión.");
    } finally {
        setCargandoExcel(false);
    }
  };

  // --- ACCIÓN PROTEGIDA: CERRAR CAJA ---
  const handleCerrarCajaSeguro = async () => {
    const input = prompt("💰 CONTEO DE DINERO:\n\nIngresa la cantidad exacta de efectivo que hay en la caja (sin puntos ni comas):");
    
    if (input === null) return;
    const efectivoReal = Number(input);

    if (isNaN(efectivoReal)) {
        alert("❌ Por favor ingresa un número válido.");
        return;
    }

    if (!window.confirm(`Vas a cerrar caja con:\n\n💵 EFECTIVO: $${efectivoReal.toLocaleString()}\n\n¿Estás seguro?`)) {
        return;
    }

    try {
        const res = await fetch('/api/ventas/cerrar', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}` // <--- LLAVE DE SEGURIDAD
            },
            body: JSON.stringify({ efectivoReal })
        });

        const data = await res.json();

        if (res.ok) {
            const reporte = data.reporte;
            let mensaje = `✅ CIERRE EXITOSO\n\n`;
            mensaje += `🖥️ Sistema: $${reporte.totalVentasSistema.toLocaleString()}\n`;
            mensaje += `💵 Real: $${reporte.totalEfectivoReal.toLocaleString()}\n`;
            mensaje += `---------------------\n`;

            if (reporte.diferencia === 0) {
                mensaje += `✨ ¡CUADRE PERFECTO! ✨`;
            } else if (reporte.diferencia > 0) {
                mensaje += `🤑 SOBRAN: $${reporte.diferencia.toLocaleString()}`;
            } else {
                mensaje += `⚠️ FALTAN: $${Math.abs(reporte.diferencia).toLocaleString()} ⚠️`;
            }

            alert(mensaje);
            setVentas({ total: 0, cantidadPedidos: 0 });
            setDescargaConfirmada(false);
        } else if (res.status === 401 || res.status === 403) {
            alert("⛔ No tienes permiso o tu sesión expiró.");
            handleLogout();
        } else {
            alert("⚠️ " + data.message);
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión al cerrar caja.");
    }
  };

  // --- ACCIÓN PROTEGIDA: ELIMINAR PLATO ---
  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar plato permanentemente?')) {
      fetch(`/api/productos/${id}`, { 
          method: 'DELETE',
          headers: { 
            'Authorization': `Bearer ${getToken()}` // <--- LLAVE DE SEGURIDAD
          }
      })
      .then(res => {
          if (res.ok) {
              alert('Eliminado'); 
              fetchProductos();
          } else {
              alert('⛔ Error: No autorizado');
          }
      });
    }
  };

  // --- ACCIÓN PROTEGIDA: GUARDAR/EDITAR PLATO ---
  const handleSave = (formData) => {
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct ? `/api/productos/${formData.id}` : '/api/productos';

    fetch(url, {
        method: method,
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}` // <--- LLAVE DE SEGURIDAD
        },
        body: JSON.stringify(formData)
    }).then(res => {
        if (res.ok) {
            setShowForm(false);
            fetchProductos();
        } else {
            alert('⛔ Error al guardar. Verifica tu sesión.');
        }
    });
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark">Panel Administrativo</h2>
        <button className="btn btn-danger" onClick={handleLogout}>Salir</button>
      </div>

      <div className="row mb-5">
        <div className="col-md-12">
            <div className="card bg-dark text-white shadow">
                <div className="card-body p-4">
                    <div className="row align-items-center">
                        <div className="col-md-6 mb-3 mb-md-0">
                            <h5 className="text-white-50 mb-1">Ventas del Turno Actual ({ventas.cantidadPedidos} pedidos)</h5>
                            <h1 className="display-4 fw-bold text-warning mb-0">${ventas.total.toLocaleString()}</h1>
                        </div>

                        <div className="col-md-6 text-end">
                            <div className="d-flex gap-2 justify-content-md-end flex-column flex-md-row">
                                <button 
                                    onClick={handleDescargarExcel} 
                                    className="btn btn-primary fw-bold py-2"
                                    disabled={cargandoExcel}
                                >
                                    {cargandoExcel ? 'Generando...' : '1. Bajar Excel 📥'}
                                </button>

                                <button 
                                    onClick={handleCerrarCajaSeguro} 
                                    className={`btn fw-bold py-2 ${descargaConfirmada ? 'btn-danger' : 'btn-secondary'}`}
                                    title="Cierra el turno y calcula diferencias"
                                >
                                    2. Cerrar Caja y Auditar 🕵️
                                </button>
                            </div>
                            <div className="text-white-50 small mt-2">
                                {descargaConfirmada 
                                    ? "✅ Excel guardado. Listo para cierre." 
                                    : "💡 Tip: Descarga el Excel antes de cerrar."}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

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