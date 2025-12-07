import React, { useState, useEffect } from 'react';
import { printReceipt } from '../utils/printReceipt';

export default function OrdersPanel() {
  const [ordenes, setOrdenes] = useState([]);

  const cargarPedidos = () => {
    fetch('/api/orders').then(res => res.json()).then(setOrdenes).catch(console.error);
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
        nota: i.nota // <--- PASAR LA NOTA
    }));
    
    // Pasar info de mesa
    const ordenInfo = { tipo: orden.tipo, numero: orden.numeroMesa };
    printReceipt(itemsAdaptados, orden.total, orden.cliente, tipo, ordenInfo);
  };

  const handleCompletar = (id) => {
    if(!window.confirm("¿Despachar?")) return;
    fetch(`/api/orders/${id}`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'Completado' })
    }).then(() => cargarPedidos());
  };

  return (
    <div className="container py-5">
      <h2 className="fw-bold text-danger mb-4">👨‍🍳 Cocina</h2>
      <div className="row">
        {ordenes.map(orden => (
          <div key={orden._id} className="col-md-4 mb-4">
            <div className={`card shadow h-100 ${orden.tipo === 'Mesa' ? 'border-primary' : 'border-warning'}`}>
               <div className={`card-header text-white fw-bold ${orden.tipo === 'Mesa' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                 {orden.tipo === 'Mesa' ? `MESA ${orden.numeroMesa}` : 'DOMICILIO'}
               </div>
               <div className="card-body">
                 <h5 className="fw-bold">{orden.cliente.nombre}</h5>
                 <hr/>
                 {orden.items.map((item, idx) => (
                   <div key={idx} className="mb-2">
                     <span className="badge bg-dark me-2">{item.cantidad}</span> {item.nombre} ({item.tamaño})
                     {/* MOSTRAR NOTA */}
                     {item.nota && <div className="alert alert-warning py-1 px-2 mt-1 small fw-bold">{item.nota}</div>}
                   </div>
                 ))}
               </div>
               <div className="card-footer bg-white p-2 row g-2">
                  <div className="col-6"><button onClick={() => handleImprimir(orden, 'cocina')} className="btn btn-secondary w-100 btn-sm">🖨️ Cocina</button></div>
                  <div className="col-6"><button onClick={() => handleImprimir(orden, 'cliente')} className="btn btn-outline-dark w-100 btn-sm">📄 Cliente</button></div>
                  <div className="col-12"><button onClick={() => handleCompletar(orden._id)} className="btn btn-success w-100">✅ Despachar</button></div>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}