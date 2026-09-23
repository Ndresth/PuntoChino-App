import { useState } from 'react';
import toast from 'react-hot-toast';
import { swalBootstrap } from '../../utils/swalConfig';
import { api } from '../../utils/api';
import { hora, money } from '../../utils/format';

const Stat = ({ label, value, sub, className = '' }) => (
  <div className="stat-card">
    <div className="stat-label">{label}</div>
    <div className={`stat-value ${className}`}>{value}</div>
    {sub && <div className="small text-muted">{sub}</div>}
  </div>
);

/** Resumen del turno, gastos y arqueo de caja. */
export default function CajaView({ finanzas, gastos, onChange }) {
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '' });
  const [guardando, setGuardando] = useState(false);

  const handleRegistrarGasto = async (e) => {
    e.preventDefault();
    if (!nuevoGasto.descripcion.trim() || !(Number(nuevoGasto.monto) > 0)) {
      toast.error('Complete concepto y monto.');
      return;
    }
    setGuardando(true);
    try {
      await api('/api/gastos', { method: 'POST', body: { descripcion: nuevoGasto.descripcion, monto: Number(nuevoGasto.monto) } });
      toast.success('Gasto registrado');
      setNuevoGasto({ descripcion: '', monto: '' });
      onChange();
    } catch (err) { toast.error(err.message); }
    finally { setGuardando(false); }
  };

  const handleBorrarGasto = async (g) => {
    const r = await swalBootstrap.fire({
      title: '¿Eliminar gasto?', text: `${g.descripcion} — ${money(g.monto)}`, icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
    });
    if (!r.isConfirmed) return;
    try {
      await api(`/api/gastos/${g._id}`, { method: 'DELETE' });
      toast.success('Gasto eliminado');
      onChange();
    } catch (err) { toast.error(err.message); }
  };

  const handleCerrarCaja = async () => {
    if (finanzas.pendientes > 0) {
      const w = await swalBootstrap.fire({
        title: 'Hay órdenes sin entregar',
        text: `${finanzas.pendientes} orden(es) siguen en cocina. Si cierra ahora quedarán incluidas en este cierre.`,
        icon: 'warning', showCancelButton: true, confirmButtonText: 'Continuar igual', cancelButtonText: 'Volver'
      });
      if (!w.isConfirmed) return;
    }

    const { value } = await swalBootstrap.fire({
      title: 'Arqueo de caja',
      html: `<div class="text-start small">Cuente el <b>efectivo</b> del cajón.<br/>Esperado según sistema: <b>${money(finanzas.totalCaja)}</b></div>`,
      input: 'number',
      inputAttributes: { min: 0, step: 50, inputmode: 'numeric' },
      inputPlaceholder: 'Efectivo contado',
      showCancelButton: true, confirmButtonText: 'Verificar', cancelButtonText: 'Cancelar',
      inputValidator: (v) => (v === '' || Number(v) < 0 || isNaN(Number(v))) && 'Ingrese un valor válido'
    });
    if (value === undefined) return;

    const efectivoReal = Number(value);
    const diff = efectivoReal - finanzas.totalCaja;
    const metodos = Object.entries(finanzas.ventasPorMetodo || {})
      .map(([m, v]) => `<div class="d-flex justify-content-between"><span>${m}</span><b>${money(v)}</b></div>`).join('');

    const confirm = await swalBootstrap.fire({
      title: '¿Confirmar cierre?',
      html: `
        <div class="text-start bg-light p-3 rounded small">
          ${metodos}
          <hr class="my-2"/>
          <div class="d-flex justify-content-between"><span>Total ventas</span><b>${money(finanzas.totalVentas)}</b></div>
          <div class="d-flex justify-content-between text-danger"><span>Gastos (efectivo)</span><b>-${money(finanzas.totalGastos)}</b></div>
          <div class="d-flex justify-content-between fs-6 mt-2"><span>Efectivo esperado</span><b>${money(finanzas.totalCaja)}</b></div>
          <div class="d-flex justify-content-between fs-6 text-primary"><span>Efectivo contado</span><b>${money(efectivoReal)}</b></div>
          <div class="d-flex justify-content-between fs-6 ${diff === 0 ? 'text-success' : diff > 0 ? 'text-info' : 'text-danger'}">
            <span>${diff === 0 ? 'Cuadra' : diff > 0 ? 'Sobrante' : 'Faltante'}</span><b>${money(Math.abs(diff))}</b>
          </div>
        </div>`,
      icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, cerrar turno', cancelButtonText: 'Volver'
    });
    if (!confirm.isConfirmed) return;

    try {
      const { reporte } = await api('/api/ventas/cerrar', { method: 'POST', body: { efectivoReal } });
      const d = reporte.diferencia;
      swalBootstrap.fire({
        title: '¡Turno cerrado!',
        html: `<p class="fs-5 mb-0">${d === 0 ? 'Balance correcto ✅' : d > 0 ? `Sobrante: ${money(d)}` : `Faltante: ${money(-d)} ⚠️`}</p>`,
        icon: d === 0 ? 'success' : 'warning'
      });
      onChange();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <>
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><Stat label="Ventas del turno" value={money(finanzas.totalVentas)} className="text-success" /></div>
        <div className="col-6 col-lg-3"><Stat label="Pedidos" value={finanzas.cantidadPedidos} sub={finanzas.pendientes ? `${finanzas.pendientes} en cocina` : 'Ninguno en cocina'} /></div>
        <div className="col-6 col-lg-3"><Stat label="Ticket promedio" value={money(finanzas.ticketPromedio)} sub={finanzas.cancelados ? `${finanzas.cancelados} anulado(s)` : null} /></div>
        <div className="col-6 col-lg-3"><Stat label="Gastos" value={money(finanzas.totalGastos)} className="text-danger" /></div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card-soft p-3 p-md-4 h-100 bg-dark text-white border-0">
            <div className="d-flex flex-wrap justify-content-between gap-3">
              <div>
                <div className="text-white-50 small text-uppercase fw-semibold">Efectivo esperado en caja</div>
                <div className="display-5 fw-bold text-warning">{money(finanzas.totalCaja)}</div>
                <div className="small text-white-50">Ventas en efectivo − gastos</div>
              </div>
              <button onClick={handleCerrarCaja} className="btn btn-warning fw-bold px-4 align-self-center">
                <i className="bi bi-lock-fill me-2"></i>Arqueo y cierre
              </button>
            </div>
            <hr className="border-secondary" />
            <div className="row g-2 small">
              {Object.keys(finanzas.ventasPorMetodo || {}).length === 0 && <div className="text-white-50">Aún no hay ventas en este turno.</div>}
              {Object.entries(finanzas.ventasPorMetodo || {}).map(([m, v]) => (
                <div key={m} className="col-6 col-md-3">
                  <div className="text-white-50">{m}</div>
                  <div className="fw-bold fs-6">{money(v)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card-soft p-3 h-100">
            <h6 className="fw-bold"><i className="bi bi-wallet2 me-2 text-danger"></i>Salidas de efectivo</h6>
            <form onSubmit={handleRegistrarGasto} className="d-flex gap-2 mb-2">
              <input className="form-control" placeholder="Concepto (ej. hielo)" maxLength={120}
                value={nuevoGasto.descripcion} onChange={e => setNuevoGasto({ ...nuevoGasto, descripcion: e.target.value })} />
              <input type="number" inputMode="numeric" min="1" className="form-control" placeholder="$" style={{ width: 110 }}
                value={nuevoGasto.monto} onChange={e => setNuevoGasto({ ...nuevoGasto, monto: e.target.value })} />
              <button type="submit" className="btn btn-danger" disabled={guardando} aria-label="Registrar gasto"><i className="bi bi-plus-lg"></i></button>
            </form>
            <ul className="list-group list-group-flush small overflow-auto" style={{ maxHeight: 220 }}>
              {gastos.map(g => (
                <li key={g._id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span className="text-truncate me-2">{g.descripcion} <span className="text-muted">· {hora(g.fecha)} · {g.usuario}</span></span>
                  <span className="text-nowrap">
                    <b className="text-danger me-2">-{money(g.monto)}</b>
                    <button className="btn btn-sm btn-link text-muted p-0" onClick={() => handleBorrarGasto(g)} aria-label="Eliminar"><i className="bi bi-trash"></i></button>
                  </span>
                </li>
              ))}
              {gastos.length === 0 && <li className="list-group-item text-center text-muted fst-italic px-0">Sin movimientos</li>}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
