import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../utils/api';
import { money } from '../../utils/format';
import { printOrder } from '../../utils/printReceipt';
import { useProducts } from '../../hooks/useProducts';
import { CATEGORIAS, TAMANO_LABEL, TAMANO_NOMBRE } from '../../config';

const TAMANOS = ['familiar', 'mediano', 'personal', 'unico'];

const tamanosDe = (p) => (p ? TAMANOS.filter(t => p.precios?.[t] > 0) : []);

/**
 * Editar una orden del turno (caja): cambiar un producto por otro, el tamaño o la cantidad, o quitar productos.
 * Los precios los pone el servidor; aquí solo se muestran para que caja vea el nuevo total.
 * Para agregar productos se sigue usando "Adicionar" en el POS.
 */
export default function EditarOrden({ orden, onClose, onSaved }) {
  const { productos } = useProducts();
  const [edits, setEdits] = useState(() => Object.fromEntries(orden.items.map(i => [i._id, { cantidad: i.cantidad, tamaño: i.tamaño, productoId: i.productoId }])));
  const [cambiando, setCambiando] = useState(null); // ítem al que se le está eligiendo otro producto
  const [imprimir, setImprimir] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const set = (id, cambio) => setEdits(e => ({ ...e, [id]: { ...e[id], ...cambio } }));
  // Producto elegido para el ítem (el mismo u otro si se cambió)
  const producto = (i) => (i.extra ? null : productos.find(p => p.id === edits[i._id].productoId));
  const otro = (i) => edits[i._id].productoId !== i.productoId;
  const precioDe = (i) => {
    const e = edits[i._id];
    return e.tamaño === i.tamaño && !otro(i) ? i.precio : producto(i)?.precios?.[e.tamaño] || i.precio;
  };
  // Otro producto: conserva el tamaño si lo tiene; si no, el primero disponible
  const elegirProducto = (i, id) => {
    const p = productos.find(x => x.id === Number(id));
    if (!p) return;
    const tamanos = tamanosDe(p);
    set(i._id, { productoId: p.id, tamaño: tamanos.includes(edits[i._id].tamaño) ? edits[i._id].tamaño : tamanos[0] });
    setCambiando(null);
  };
  const porCategoria = CATEGORIAS
    .map(c => [c, productos.filter(p => p.categoria === c && p.disponible !== false && tamanosDe(p).length)])
    .filter(([, lista]) => lista.length);

  const cambios = orden.items
    .filter(i => edits[i._id].cantidad !== i.cantidad || edits[i._id].tamaño !== i.tamaño || otro(i))
    .map(i => ({
      id: i._id,
      cantidad: edits[i._id].cantidad,
      ...(edits[i._id].tamaño !== i.tamaño ? { tamaño: edits[i._id].tamaño } : {}),
      ...(otro(i) ? { productoId: edits[i._id].productoId } : {})
    }));
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
      <div className="small fw-bold mb-1"><i className="bi bi-pencil-square me-1"></i>Editar orden #{orden.numero} · cambie el producto, el tamaño o la cantidad, o quítelo</div>
      {orden.items.map(i => {
        const e = edits[i._id];
        const p = producto(i);
        const tamanos = tamanosDe(p);
        const quitado = e.cantidad === 0;
        return (
          <div key={i._id} className="py-1 border-bottom">
          <div className="d-flex align-items-center gap-2">
            <div className="qty-control">
              <button type="button" onClick={() => set(i._id, { cantidad: Math.max(0, e.cantidad - 1) })} aria-label={`Menos ${i.nombre}`} disabled={quitado}>−</button>
              <span className="px-2 fw-bold">{e.cantidad}</span>
              <button type="button" onClick={() => set(i._id, { cantidad: Math.min(99, e.cantidad + 1) })} aria-label={`Más ${i.nombre}`}>+</button>
            </div>
            <div className={`flex-grow-1 min-w-0 ${quitado ? 'text-decoration-line-through text-muted' : ''}`}>
              {otro(i)
                ? <><div className="fw-semibold text-truncate text-primary">{p?.nombre}</div><div className="small text-muted text-truncate text-decoration-line-through">{i.nombre}</div></>
                : <div className="fw-semibold text-truncate">{i.nombre}</div>}
            </div>
            {!i.extra && !quitado && (
              <button type="button" className={`btn btn-sm ${cambiando === i._id ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setCambiando(cambiando === i._id ? null : i._id)} title="Cambiar por otro producto">
                <i className="bi bi-arrow-left-right"></i>
              </button>
            )}
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
          {cambiando === i._id && (
            <div className="d-flex gap-2 align-items-center mt-1 ms-5">
              <select className="form-select form-select-sm" autoFocus value={e.productoId} onChange={ev => elegirProducto(i, ev.target.value)} aria-label={`Cambiar ${i.nombre} por`}>
                {porCategoria.map(([cat, lista]) => (
                  <optgroup key={cat} label={cat}>
                    {lista.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                  </optgroup>
                ))}
              </select>
              {otro(i) && <button type="button" className="btn btn-sm btn-link text-nowrap" onClick={() => { set(i._id, { productoId: i.productoId, tamaño: i.tamaño }); setCambiando(null); }}>Dejar el original</button>}
            </div>
          )}
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
