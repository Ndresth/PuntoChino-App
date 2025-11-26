import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function CartSidebar({ isOpen, onClose }) {
  const { cart, removeFromCart, total } = useCart();
  
  const [cliente, setCliente] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    barrio: '',
    metodoPago: 'Nequi'
  });

  const handleInputChange = (e) => {
    setCliente({
      ...cliente,
      [e.target.name]: e.target.value
    });
  };

  const handleWhatsApp = () => {
    if (!cliente.nombre || !cliente.direccion || !cliente.telefono || !cliente.barrio) {
      alert("Por favor completa todos tus datos para el domicilio");
      return;
    }

    let mensaje = `*HOLA PUNTO CHINO, QUIERO UN PEDIDO:*\n\n`;
    
    mensaje += `*Nombre:* ${cliente.nombre}\n`;
    mensaje += `*Teléfono:* ${cliente.telefono}\n`;
    mensaje += `*Dirección:* ${cliente.direccion} - ${cliente.barrio}\n`;
    mensaje += `*Método de Pago:* ${cliente.metodoPago}\n`;
    mensaje += `-----------------------------------\n`;
    
    cart.forEach(item => {
      mensaje += `- ${item.quantity}x ${item.nombre} (${item.selectedSize}) | $${(item.selectedPrice * item.quantity).toLocaleString()}\n`;
    });
    
    mensaje += `-----------------------------------\n`;
    mensaje += `*TOTAL A PAGAR: $${total.toLocaleString()}*`;

    const url = `https://wa.me/573242233760?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  return (
    <>
      {isOpen && (
        <div 
          className="modal-backdrop fade show" 
          onClick={onClose} 
          style={{ zIndex: 1040 }} 
        ></div>
      )}

      <div 
        className={`offcanvas offcanvas-end bg-white ${isOpen ? 'show' : ''}`} 
        tabIndex="-1" 
        style={{ 
          visibility: isOpen ? 'visible' : 'hidden', 
          zIndex: 1050 
        }}
      >
        <div className="offcanvas-header bg-danger text-white">
          <h5 className="offcanvas-title fw-bold">🛒 Tu Pedido</h5>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>
        
        <div className="offcanvas-body d-flex flex-column">
          
          <div className="flex-grow-1 overflow-auto mb-3">
            {cart.length === 0 ? (
              <div className="text-center mt-5 text-muted">
                <i className="bi bi-cart-x fs-1"></i>
                <p>Tu carrito está vacío.</p>
              </div>
            ) : (
              <div className="list-group">
                {cart.map((item, index) => (
                  <div key={index} className="list-group-item border-start-0 border-end-0 border-top-0 px-0">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="ms-2">
                        <div className="fw-bold text-danger">{item.nombre}</div>
                        <small className="text-muted">{item.selectedSize} | Cant: {item.quantity}</small>
                      </div>
                      <div className="text-end">
                          <span className="fw-bold">${(item.selectedPrice * item.quantity).toLocaleString()}</span>
                          <br/>
                          <small 
                            className="text-danger text-decoration-underline" 
                            style={{cursor:'pointer', fontSize: '0.8rem'}} 
                            onClick={() => removeFromCart(item.id, item.selectedSize)}
                          >
                            Eliminar
                          </small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-top pt-3 bg-light p-3 rounded">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fs-5 fw-bold text-secondary">Total:</span>
                <span className="fs-3 fw-bold text-danger">${total.toLocaleString()}</span>
            </div>

            <h6 className="mb-2 fw-bold">📍 Datos de Entrega</h6>
            <form className="d-grid gap-2">
              <input 
                type="text" name="nombre" 
                className="form-control form-control-sm" 
                placeholder="Tu Nombre" 
                value={cliente.nombre} onChange={handleInputChange} 
              />
              <input 
                type="tel" name="telefono" 
                className="form-control form-control-sm" 
                placeholder="Teléfono" 
                value={cliente.telefono} onChange={handleInputChange} 
              />
              <input 
                type="text" name="direccion" 
                className="form-control form-control-sm" 
                placeholder="Dirección exacta" 
                value={cliente.direccion} onChange={handleInputChange} 
              />
              <input 
                type="text" name="barrio" 
                className="form-control form-control-sm" 
                placeholder="Barrio" 
                value={cliente.barrio} onChange={handleInputChange} 
              />
              
              <select name="metodoPago" className="form-select form-select-sm" value={cliente.metodoPago} onChange={handleInputChange}>
                  <option value="Nequi">Pago con Nequi</option>
                  <option value="Efectivo">Pago en Efectivo</option>
              </select>

              <button type="button" onClick={handleWhatsApp} className="btn btn-success fw-bold mt-2" disabled={cart.length === 0}>
                ✅ Enviar a WhatsApp
              </button>
            </form>
          </div>

        </div>
      </div>
    </>
  );
}