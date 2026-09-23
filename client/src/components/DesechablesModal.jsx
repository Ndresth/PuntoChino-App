import { useState } from 'react';
import { DESECHABLES } from '../config';
import { money } from '../utils/format';

/**
 * Ventana que aparece antes de enviar cualquier pedido para agregar cucharas y platos.
 * onConfirm recibe { cucharas, platos }.
 */
export default function DesechablesModal({ onConfirm, onCancel, enviando, textoBoton = 'Enviar pedido' }) {
  const [cant, setCant] = useState({ cucharas: 0, platos: 0 });
  const set = (key, v, max) => setCant(c => ({ ...c, [key]: Math.max(0, Math.min(max, v)) }));
  const costo = DESECHABLES.reduce((a, d) => a + d.precio * cant[d.key], 0);

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1080 }} onClick={() => !enviando && onCancel()}></div>
      <div className="modal fade show d-block" style={{ zIndex: 1090 }} role="dialog" aria-modal="true" aria-labelledby="desech-title"
        onClick={e => { if (e.target === e.currentTarget && !enviando) onCancel(); }}>
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
          <div className="modal-content border-0 rounded-4 overflow-hidden">
            <div className="modal-header border-0 pb-0">
              <h5 className="modal-title fw-bold" id="desech-title"><i className="bi bi-bag-plus me-2 text-danger"></i>¿Agregar desechables?</h5>
              <button type="button" className="btn-close" onClick={onCancel} disabled={enviando} aria-label="Volver"></button>
            </div>
            <div className="modal-body">
              {DESECHABLES.map(d => (
                <div key={d.key} className="desech-row">
                  <div>
                    <div className="fw-bold">{d.nombre}</div>
                    <div className="small text-muted">{d.precio ? `${money(d.precio)} c/u` : 'Gratis'} · máximo {d.max}</div>
                  </div>
                  <div className="qty-control qty-lg">
                    <button type="button" onClick={() => set(d.key, cant[d.key] - 1, d.max)} disabled={cant[d.key] === 0} aria-label={`Menos ${d.nombre}`}>−</button>
                    <span aria-live="polite">{cant[d.key]}</span>
                    <button type="button" onClick={() => set(d.key, cant[d.key] + 1, d.max)} disabled={cant[d.key] >= d.max} aria-label={`Más ${d.nombre}`}>+</button>
                  </div>
                </div>
              ))}
              {costo > 0 && <div className="text-end small mt-2">Se suman <b>{money(costo)}</b> al total</div>}
            </div>
            <div className="modal-footer border-0 pt-0 d-grid gap-2" style={{ justifyContent: 'stretch' }}>
              <button className="btn btn-brand btn-lg fw-bold" onClick={() => onConfirm(cant)} disabled={enviando}>
                {enviando ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-send-fill me-2"></i>}
                {textoBoton}
              </button>
              <button className="btn btn-link text-muted" onClick={onCancel} disabled={enviando}>Volver al pedido</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
