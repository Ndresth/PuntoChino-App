import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function PosCartSidebar({ isOpen, onClose }) {
  const { cart, removeFromCart, total, clearCart, updateItemNote } = useCart();
  const [esParaLlevar, setEsParaLlevar] = useState(false);
  const [mesa, setMesa] = useState(''); 

  const handleCobrar = () => {
    if (!esParaLlevar && !mesa) {
        alert("⚠️ Por favor ingresa el número de mesa.");
        return;
    }

    if(window.confirm("¿Enviar comanda a cocina?")) {
        const nuevaOrden = {
            tipo: esParaLlevar ? 'Domicilio' : 'Mesa',
            numeroMesa: esParaLlevar ? null : mesa,
            cliente: { 
                nombre: esParaLlevar ? "Cliente en Barra" : `Mesa ${mesa}`, 
                telefono: "", 
                direccion: "Local", 
                metodoPago: "Efectivo/QR" 
            },
            items: cart.map(i => ({ 
                nombre: i.nombre, 
                cantidad: i.quantity, 
                precio: i.selectedPrice, 
                tamaño: i.selectedSize,
                nota: i.nota || '' // <--- ENVIAR NOTA
            })),
            total: total
        };

        fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaOrden)
        })
        .then(res => {
            if(res.ok) {
                alert("✅ Comanda enviada");
                clearCart();
                setMesa('');
                setEsParaLlevar(false);
                onClose();
            } else { alert("Error al enviar"); }
        })
        .catch(err => console.error(err));
    }
  };

  return (
    <>
      {isOpen && <div className="modal-backdrop fade show" onClick={onClose} style={{zIndex: 1040}}></div>}
      <div className={`offcanvas offcanvas-end bg-white ${isOpen ? 'show' : ''}`} tabIndex="-1" style={{ visibility: isOpen ? 'visible' : 'hidden', zIndex: 1050 }}>
        <div className="offcanvas-header bg-dark text-white">
          <h5 className="offcanvas-title">🖥️ Caja / Mesero</h5>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>
        <div className="offcanvas-body d-flex flex-column">
          <div className="flex-grow-1 overflow-auto mb-3">
            {cart.map((item, index) => (
              <div key={index} className="list-group-item border-0 border-bottom px-0 pb-2">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="w-100 me-2">
                    <div className="fw-bold">{item.nombre}</div>
                    <small className="text-muted">{item.selectedSize} | x{item.quantity}</small>
                    
                    {/* INPUT DE NOTAS */}
                    <input 
                        type="text" 
                        className="form-control form-control-sm mt-1 border-secondary" 
                        placeholder="📝 Nota (Ej: Sin cebolla)"
                        value={item.nota || ''}
                        onChange={(e) => updateItemNote(item.id, item.selectedSize, e.target.value)}
                    />
                  </div>
                  <div className="text-end" style={{minWidth: '80px'}}>
                      <span className="fw-bold">${(item.selectedPrice * item.quantity).toLocaleString()}</span><br/>
                      <small className="text-danger" style={{cursor:'pointer'}} onClick={() => removeFromCart(item.id, item.selectedSize)}>Quitar</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* ... El resto del footer igual (Botón cobrar, switch mesa) ... */}
           <div className="border-top pt-3 bg-light p-3">
            <div className="d-flex justify-content-between mb-3"><span className="fs-4 fw-bold">Total:</span><span className="fs-2 fw-bold text-success">${total.toLocaleString()}</span></div>
            <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" id="paraLlevarCheck" checked={esParaLlevar} onChange={(e) => setEsParaLlevar(e.target.checked)}/>
                <label className="form-check-label fw-bold" htmlFor="paraLlevarCheck">🥡 ¿Es para llevar?</label>
            </div>
            {!esParaLlevar && (
                <div className="input-group mb-3">
                    <span className="input-group-text bg-white"><i className="bi bi-hash"></i></span>
                    <input type="number" className="form-control" placeholder="Número de Mesa" value={mesa} onChange={(e) => setMesa(e.target.value)} />
                </div>
            )}
            <button onClick={handleCobrar} className="btn btn-dark w-100 py-3 fw-bold" disabled={cart.length === 0}>
                <i className="bi bi-send-fill me-2"></i> {esParaLlevar ? 'EMPACAR Y COBRAR' : 'SERVIR A MESA'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}