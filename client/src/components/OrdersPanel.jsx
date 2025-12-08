import React, { useState, useEffect } from 'react';
import { printReceipt } from '../utils/printReceipt';

export default function OrdersPanel() {
  const [ordenes, setOrdenes] = useState([]);

  const cargarPedidos = () => {
    fetch('/api/orders') 
      .then(res => res.json())
      .then(data => setOrdenes(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, 5000); 
    return () => clearInterval(intervalo);
  }, []);

  const handleImprimir = (orden, tipo) => {
    const itemsAdaptados = orden.items.map(i => ({
        nombre: i.nombre,
        quantity: i.cantidad,
        selectedSize: i.tamaño,
        selectedPrice: i.precio,
        nota: i.nota
    }));

    const ordenInfo = { type: orden.tipo, numero: orden.numeroMesa, id: orden._id };
    printReceipt(itemsAdaptados, orden.total, orden.cliente, tipo, ordenInfo);
  };

  const handleCompletar = (id) => {
    if(!window.confirm("¿Confirmar despacho de la orden?")) return;
    fetch(`/api/orders/${id}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'Completado' })
    })
    .then(() => cargarPedidos())
    .catch(err => console.error("Error:", err));
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-danger"><i className="bi bi-clipboard-data me-2"></i>Gestión de Pedidos</h2>
        <span className="badge bg-secondary"><i className="bi bi-activity me-1"></i>En línea</span>
      </div>
      
      {ordenes.length === 0 ? (
        <div className="alert alert-secondary text-center py-5">
            <h4><i className="bi bi-check2-circle me-2"></i>Sin pendientes</h4>
            <p className="mb-0">No hay órdenes activas en este momento.</p>
        </div>
      ) : (
        <div className="row">
            {ordenes.map(orden => (
                <div key={orden._id} className="col-md-6 col-lg-4 mb-4">
                    <div className={`card shadow h-100 ${orden.tipo === 'Mesa' ? 'border-primary' : 'border-warning'}`}>
                        
                        {/* ENCABEZADO */}
                        <div className={`card-header text-white d-flex justify-content-between align-items-center ${orden.tipo === 'Mesa' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                            <div className="fw-bold">
                                {orden.tipo === 'Mesa' ? (
                                    <span><i className="bi bi-shop me-2"></i>MESA {orden.numeroMesa}</span>
                                ) : (
                                    <span><i className="bi bi-bicycle me-2"></i>DOMICILIO</span>
                                )}
                            </div>
                            <span className="badge bg-light text-dark opacity-75">
                                {new Date(orden.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>

                        <div className="card-body">
                            <h5 className="card-title fw-bold mb-0 text-truncate">{orden.cliente.nombre}</h5>
                            {orden.tipo === 'Domicilio' && <p className="small text-muted mb-2 text-truncate"><i className="bi bi-geo-alt me-1"></i>{orden.cliente.direccion}</p>}
                            
                            <hr />
                            <ul className="list-group list-group-flush mb-3">
                                {orden.items.map((item, idx) => (
                                    <li key={idx} className="list-group-item px-0 py-2 d-flex flex-column align-items-start">
                                        <div className="w-100 d-flex justify-content-between">
                                            <span>
                                                <span className="badge bg-dark me-2">{item.cantidad}</span> 
                                                <span className="fw-bold">{item.nombre}</span>
                                            </span>
                                            <small className="text-muted">{item.tamaño}</small>
                                        </div>
                                        {item.nota && (
                                            <div className="alert alert-warning mt-1 mb-0 py-1 px-2 w-100 small">
                                                <i className="bi bi-info-circle-fill me-1"></i> 
                                                <strong>Obs:</strong> {item.nota}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="card-footer bg-white p-2">
                            <div className="row g-2">
                                <div className="col-6">
                                    <button onClick={() => handleImprimir(orden, 'cocina')} className="btn btn-secondary w-100 btn-sm">
                                        <i className="bi bi-printer me-1"></i> Comanda
                                    </button>
                                </div>
                                <div className="col-6">
                                    <button onClick={() => handleImprimir(orden, 'cliente')} className="btn btn-outline-dark w-100 btn-sm">
                                        <i className="bi bi-receipt me-1"></i> Factura
                                    </button>
                                </div>
                                <div className="col-12">
                                    <button onClick={() => handleCompletar(orden._id)} className="btn btn-success w-100 fw-bold">
                                        <i className="bi bi-check-lg me-2"></i> DESPACHAR
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}