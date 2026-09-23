import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { NEGOCIO, TAMANO_LABEL } from '../config';
import { api } from '../utils/api';
import { money } from '../utils/format';
import DesechablesModal from './DesechablesModal';

const CLIENTE_KEY = 'clienteWeb';
const loadCliente = () => {
  try { return { nombre: '', telefono: '', direccion: '', barrio: '', metodoPago: 'Nequi', ...JSON.parse(localStorage.getItem(CLIENTE_KEY) || '{}') }; }
  catch { return { nombre: '', telefono: '', direccion: '', barrio: '', metodoPago: 'Nequi' }; }
};

/** Carrito del menú público: registra el pedido en el sistema y lo envía por WhatsApp. */
export default function CartSidebar({ isOpen, onClose }) {
  const { cart, total, updateQuantity, updateItemNote, clearCart, toOrderItems } = useCart();
  const [cliente, setCliente] = useState(loadCliente);
  const [enviando, setEnviando] = useState(false);
  const [pidiendoDesechables, setPidiendoDesechables] = useState(false);

  const set = (e) => setCliente(c => ({ ...c, [e.target.name]: e.target.value }));

  // 1) Valida el formulario y abre la ventana de desechables; 2) enviar() registra el pedido
  const handleEnviar = (e) => {
    e.preventDefault();
    if (!cliente.nombre.trim() || !cliente.direccion.trim() || !cliente.barrio.trim()) {
      toast.error('Complete nombre, dirección y barrio.');
      return;
    }
    if (cliente.telefono.replace(/\D/g, '').length < 7) {
      toast.error('Ingrese un teléfono válido.');
      return;
    }
    setPidiendoDesechables(true);
  };

  const enviar = async (desechables) => {
    // Se abre la pestaña YA (dentro del clic) para que el navegador no la bloquee;
    // se le asigna la URL de WhatsApp cuando el servidor confirma el pedido.
    const wa = window.open('', '_blank');
    setEnviando(true);
    try {
      const orden = await api('/api/orders', {
        method: 'POST',
        body: {
          tipo: 'Domicilio',
          cliente: {
            nombre: cliente.nombre,
            telefono: cliente.telefono,
            direccion: `${cliente.direccion} - ${cliente.barrio}`,
            metodoPago: cliente.metodoPago
          },
          items: toOrderItems(),
          desechables
        }
      });
      setPidiendoDesechables(false);

      let msg = `*PEDIDO WEB #${orden.numero} - ${NEGOCIO.nombre}*\n\n`;
      msg += `*Cliente:* ${orden.cliente.nombre}\n*Tel:* ${orden.cliente.telefono}\n*Dir:* ${orden.cliente.direccion}\n*Pago:* ${orden.cliente.metodoPago}\n------------------\n`;
      orden.items.forEach(i => {
        msg += `- ${i.cantidad}x ${i.nombre}${i.extra ? '' : ` (${TAMANO_LABEL[i.tamaño] || i.tamaño})`}\n`;
        if (i.nota) msg += `  _Nota: ${i.nota}_\n`;
      });
      msg += `------------------\n*TOTAL: ${money(orden.total)} + Domicilio*`;
      const url = `https://wa.me/${NEGOCIO.whatsapp}?text=${encodeURIComponent(msg)}`;

      if (wa) wa.location.href = url; else window.location.href = url;

      try { localStorage.setItem(CLIENTE_KEY, JSON.stringify(cliente)); } catch { /* sin espacio */ }
      clearCart();
      onClose();
      toast.success(`Pedido #${orden.numero} registrado. ¡Gracias!`, { duration: 5000 });
    } catch (err) {
      wa?.close();
      toast.error(err.message || 'No se pudo registrar el pedido');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {isOpen && <div className="side-backdrop" onClick={onClose}></div>}
      <aside className={`side-panel ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
        <div className="d-flex justify-content-between align-items-center p-3 bg-danger text-white">
          <h5 className="m-0 fw-bold"><i className="bi bi-bag me-2"></i>Tu pedido</h5>
          <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Cerrar"></button>
        </div>

        <div className="flex-grow-1 overflow-auto p-3">
          {cart.length === 0 ? (
            <div className="text-center mt-5 text-muted">
              <i className="bi bi-cart-x display-3"></i>
              <p className="mt-2">Aún no has agregado productos.</p>
              <button className="btn btn-outline-danger rounded-pill" onClick={onClose}>Ver el menú</button>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.key} className="border-bottom pb-2 mb-2">
                  <div className="d-flex justify-content-between gap-2">
                    <div className="min-w-0">
                      <div className="fw-bold lh-sm">{item.nombre}</div>
                      <small className="text-muted">{TAMANO_LABEL[item.selectedSize]} · {money(item.selectedPrice)}</small>
                    </div>
                    <span className="fw-bold text-nowrap">{money(item.selectedPrice * item.quantity)}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <div className="qty-control">
                      <button onClick={() => updateQuantity(item.key, item.quantity - 1)} aria-label="Menos">
                        {item.quantity === 1 ? <i className="bi bi-trash text-danger fs-6"></i> : '−'}
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.key, item.quantity + 1)} aria-label="Más">+</button>
                    </div>
                    <input type="text" className="form-control form-control-sm bg-light border-0" placeholder="Nota para cocina"
                      maxLength={200} value={item.nota || ''} onChange={e => updateItemNote(item.key, e.target.value)} />
                  </div>
                </div>
              ))}

              <form id="checkout" onSubmit={handleEnviar} className="d-grid gap-2 mt-3">
                <h6 className="fw-bold text-secondary mb-0"><i className="bi bi-geo-alt me-1"></i>Datos de entrega</h6>
                <input name="nombre" className="form-control" placeholder="Nombre completo" autoComplete="name" maxLength={60} value={cliente.nombre} onChange={set} />
                <input name="telefono" type="tel" inputMode="tel" className="form-control" placeholder="Teléfono" autoComplete="tel" maxLength={20} value={cliente.telefono} onChange={set} />
                <input name="direccion" className="form-control" placeholder="Dirección" autoComplete="street-address" maxLength={110} value={cliente.direccion} onChange={set} />
                <input name="barrio" className="form-control" placeholder="Barrio" maxLength={35} value={cliente.barrio} onChange={set} />
                <div className="segmented" role="group" aria-label="Método de pago">
                  {['Nequi', 'Efectivo'].map(m => (
                    <button type="button" key={m} className={cliente.metodoPago === m ? 'active' : ''}
                      onClick={() => setCliente(c => ({ ...c, metodoPago: m }))}>
                      <i className={`bi ${m === 'Nequi' ? 'bi-phone' : 'bi-cash-coin'} me-1`}></i>{m === 'Nequi' ? 'Nequi / Bancolombia' : 'Efectivo'}
                    </button>
                  ))}
                </div>
              </form>
            </>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-top p-3 bg-light">
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold">Subtotal</span>
              <span className="fs-4 fw-bold text-danger">{money(total)}</span>
            </div>
            <div className="text-muted small mb-2"><i className="bi bi-info-circle me-1"></i>El domicilio se cobra contra entrega</div>
            <button type="submit" form="checkout" className="btn btn-success w-100 py-3 fw-bold rounded-3" disabled={enviando}>
              {enviando ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-whatsapp me-2"></i>}
              Enviar pedido por WhatsApp
            </button>
          </div>
        )}
      </aside>
      {pidiendoDesechables && (
        <DesechablesModal enviando={enviando} textoBoton="Enviar por WhatsApp"
          onConfirm={enviar} onCancel={() => setPidiendoDesechables(false)} />
      )}
    </>
  );
}
