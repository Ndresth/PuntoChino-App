import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../utils/api';
import { money } from '../../utils/format';
import { printOrder } from '../../utils/printReceipt';
import { useProducts } from '../../hooks/useProducts';
import { TAMANO_LABEL, TAMANO_NOMBRE } from '../../config';

const TAMANOS = ['familiar', 'mediano', 'personal', 'unico'];

/**
 * Editar una orden del turno (caja): cambiar tamaño o cantidad, o quitar productos.
 * Los precios los pone el servidor; aquí solo se muestran para que caja vea el nuevo total.
 * Para agregar productos se sigue usando "Adicionar" en el POS.
 */
export default function EditarOrden({ orden, onClose, onSaved }) {
  const { productos } = useProducts();
  const [edits, setEdits] = useState(() => Object.fromEntries(orden.items.map(i => [i._id, { cantidad: i.cantidad, tamaño: i.tamaño }])));
  const [imprimir, setImprimir] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const set = (id, cambio) => setEdits(e => ({ ...e, [id]: { ...e[id], ...cambio } }));
  const producto = (i) => (i.extra ? null : productos.find(p => p.id === i.productoId));
  const precioDe = (i) => {
    const e = edits[i._id];
    return e.tamaño === i.tamaño ? i.precio : producto(i)?.precios?.[e.tamaño] || i.precio;
  };

  const cambios = orden.items
    .filter(i => edits[i._id].cantidad !== i.cantidad || edits[i._id].tamaño !== i.tamaño)
    .map(i => ({ id: i._id, cantidad: edits[i._id].cantidad, ...(edits[i._id].tamaño !== i.tamaño ? { tamaño: edits[i._id].tamaño } : {}) }));
  const totalNuevo = orden.items.reduce((a, i) => a + precioDe(i) * edits[i._id].cantidad, 0) + (orden.valorDomicilio || 0);
  const quedaVacia = orden.items.every(i => i.extra || edits[i._id].cantidad === 0);

  const guardar = async () => {
    if (!cambios.length) { toast('No hay cambios'); return; }
    if (quedaVacia) { toast.error('La orden quedaría sin productos. Si ya no la quieren, anúlela.'); return; }
    setGuardando(true);
    try {
      const r = await api(`/api/orders/${orden._id}/items`, { method: 'PATCH', body: { items: cambios } });
      toast.success(`Orden #${r.orden.numero} actualizada: ${money(r.orden.total)}`);
      if (r.pagoReiniciado) toast(`La orden #${r.orden.numero} tenía pago dividido: vuelva a dividirlo con el nuevo total`, { icon: '⚠️', duration: 6000 });
      if (imprimir) printOrder({ ...r.orden, cambio: r.detalle }, 'cocina');
      onSaved?.(r.orden);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="small fw-bold mb-1"><i className="bi bi-pencil-square me-1"></i>Editar orden #{orden.numero} · cambie tamaño o cantidad, o quite productos</div>
      {orden.items.map(i => {
        const e = edits[i._id];
        const p = producto(i);
        const tamanos = p ? TAMANOS.filter(t => p.precios?.[t] > 0) : [];
        const quitado = e.cantidad === 0;
        return (
          <div key={i._id} className="d-flex align-items-center gap-2 py-1 border-bottom">
            <div className="qty-control">
              <button type="button" onClick={() => set(i._id, { cantidad: Math.max(0, e.cantidad - 1) })} aria-label={`Menos ${i.nombre}`} disabled={quitado}>−</button>
              <span className="px-2 fw-bold">{e.cantidad}</span>
              <button type="button" onClick={() => set(i._id, { cantidad: Math.min(99, e.cantidad + 1) })} aria-label={`Más ${i.nombre}`}>+</button>
            </div>
            <div className={`flex-grow-1 min-w-0 fw-semibold text-truncate ${quitado ? 'text-decoration-line-through text-muted' : ''}`}>{i.nombre}</div>
            {tamanos.length > 1 && !quitado && (
              <select className="form-select form-select-sm w-auto" value={e.tamaño} onChange={ev => set(i._id, { tamaño: ev.target.value })} aria-label={`Tamaño de ${i.nombre}`}>
                {tamanos.map(t => <option key={t} value={t}>{TAMANO_LABEL[t]} – {TAMANO_NOMBRE[t]} · {money(p.precios[t])}</option>)}
              </select>
            )}
            <span className="fw-bold text-nowrap text-end" style={{ minWidth: 80 }}>{quitado ? <span className="badge bg-danger">Quitado</span> : money(precioDe(i) * e.cantidad)}</span>
            {quitado
              ? <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => set(i._id, { cantidad: i.cantidad || 1 })} title="Volver a poner"><i className="bi bi-arrow-counterclockwise"></i></button>
              : <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => set(i._id, { cantidad: 0 })} title="Quitar de la orden"><i className="bi bi-trash"></i></button>}
          </div>
        );
      })}
      {orden.valorDomicilio > 0 && <div className="d-flex justify-content-between small text-muted py-1"><span>Domicilio</span><span>{money(orden.valorDomicilio)}</span></div>}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2">
        <div>
          <span className="fw-bold">Nuevo total: {money(totalNuevo)}</span>
          {totalNuevo !== orden.total && <span className="small text-muted ms-2">antes {money(orden.total)}</span>}
        </div>
        <div className="form-check m-0">
          <input className="form-check-input" type="checkbox" id={`imp-${orden._id}`} checked={imprimir} onChange={ev => setImprimir(ev.target.checked)} />
          <label className="form-check-label small" htmlFor={`imp-${orden._id}`}><i className="bi bi-printer me-1"></i>Imprimir comanda del cambio</label>
        </div>
      </div>
      <div className="d-flex gap-2 mt-2">
        <button className="btn btn-sm btn-dark" onClick={guardar} disabled={guardando || !cambios.length}>
          {guardando ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-check-lg me-1"></i>}Guardar cambios
        </button>
        <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}
