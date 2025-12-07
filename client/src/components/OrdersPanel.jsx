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

  // Función genérica para imprimir
  const handleImprimir = (orden, tipo) => {
    const itemsAdaptados = orden.items.map(i => ({
        nombre: i.nombre,
        quantity: i.cantidad,
        selectedSize: i.tamaño,
        selectedPrice: i.precio,
        nota: i.nota
    }));

    // Info extra para el ticket de cocina
    const ordenInfo = {
        tipo: orden.tipo,          // 'Mesa' o 'Domicilio'
        numero: orden.numeroMesa,  // '5' o null
        id: orden._id
    };
    
    printReceipt(itemsAdaptados, orden.total, orden.cliente, tipo, ordenInfo);
  };

  // Función para cerrar la orden
  const handleCompletar = (id) => {
    if(!window.confirm("¿Seguro que ya despachaste este pedido?")) return;

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
        <h2 className="fw-bold text-danger">👨‍🍳 Comandas Activas</h2>
        <span className="badge bg-dark fs-6">En vivo...</span>
      </div>
      
      {ordenes.length === 0 ? (
        <div className="alert alert-secondary text-center py-5">
            <h4>Todo limpio ✅</h4>
            <p>Esperando pedidos...</p>
        </div>
      ) : (
        <div className="row">
            {ordenes.map(orden => (
                <div key={orden._id} className="col-md-6 col-lg-4 mb-4">
                    <div className={`card shadow h-100 ${orden.tipo === 'Mesa' ? 'border-primary' : 'border-warning'}`}>
                        
                        {/* HEADER */}
                        <div className={`card-header text-white d-flex justify-content-between align-items-center ${orden.tipo === 'Mesa' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                            <div>
                                {orden.tipo === 'Mesa' ? (
                                    <span className="fw-bold fs-5"><i className="bi bi-people-fill me-2"></i>MESA {orden.numeroMesa}</span>
                                ) : (
                                    <span className="fw-bold fs-5"><i className="bi bi-bicycle me-2"></i>DOMICILIO</span>
                                )}
                            </div>
                            <span className="badge bg-light text-dark opacity-75">
                                {new Date(orden.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>

                        {/* BODY */}
                        <div className="card-body">
                            <h5 className="card-title fw-bold mb-0 text-truncate">{orden.cliente.nombre}</h5>
                            {orden.tipo === 'Domicilio' && <p className="small text-muted mb-2 text-truncate"><i className="bi bi-geo-alt"></i> {orden.cliente.direccion}</p>}
                            
                            <hr />
                            <ul className="list-group list-group-flush mb-3">
                                {orden.items.map((item, idx) => (
                                    <li key={idx} className="list-group-item px-0 py-2 d-flex flex-column align-items-start">
                                        <div className="w-100 d-flex justify-content-between">
                                            <span>
                                                <span className="badge bg-dark me-2 fs-6">{item.cantidad}</span> 
                                                <span className="fw-bold">{item.nombre}</span>
                                            </span>
                                            <small className="text-muted">{item.tamaño}</small>
                                        </div>
                                        {item.nota && (
                                            <div className="alert alert-warning mt-1 mb-0 py-1 px-2 w-100" style={{fontSize: '0.85rem'}}>
                                                <i className="bi bi-exclamation-circle-fill me-1 text-danger"></i> 
                                                <strong>NOTA:</strong> {item.nota}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* FOOTER CON 3 BOTONES */}
                        <div className="card-footer bg-white p-2">
                            <div className="row g-2">
                                <div className="col-6">
                                    <button 
                                        onClick={() => handleImprimir(orden, 'cocina')}
                                        className="btn btn-secondary w-100 fw-bold btn-sm"
                                        title="Imprimir Comanda para Cocina"
                                    >
                                        <i className="bi bi-printer"></i> Cocina
                                    </button>
                                </div>
                                <div className="col-6">
                                    <button 
                                        onClick={() => handleImprimir(orden, 'cliente')}
                                        className="btn btn-outline-dark w-100 fw-bold btn-sm"
                                        title="Imprimir Factura para Cliente"
                                    >
                                        <i className="bi bi-receipt"></i> Cliente
                                    </button>
                                </div>
                                <div className="col-12">
                                    <button 
                                        onClick={() => handleCompletar(orden._id)}
                                        className="btn btn-success w-100 fw-bold"
                                    >
                                        <i className="bi bi-check-circle-fill me-2"></i> DESPACHAR PEDIDO
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