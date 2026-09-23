import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api, downloadFile } from '../../utils/api';
import { money } from '../../utils/format';

const kFmt = (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v);

export default function Reportes() {
  const [cierres, setCierres] = useState(null);

  useEffect(() => {
    api('/api/cierres').then(setCierres).catch(e => { toast.error(e.message); setCierres([]); });
  }, []);

  const descargar = (id) => toast.promise(
    downloadFile(`/api/ventas/excel/${id}`, `Reporte_${id}.xlsx`),
    { loading: 'Generando Excel…', success: 'Reporte descargado', error: 'Error al descargar' }
  );

  if (cierres === null) return <div className="text-center py-5"><div className="spinner-border text-danger"></div></div>;

  const chart = [...cierres].reverse().map(c => ({
    fecha: new Date(c.fechaFin).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }),
    Ventas: c.totalVentasSistema,
    Gastos: c.totalGastos
  }));
  const ultimos = cierres.slice(0, 7);
  const suma = (k) => ultimos.reduce((a, c) => a + (c[k] || 0), 0);

  return (
    <div className="d-grid gap-3">
      <div className="row g-3">
        <div className="col-6 col-md-3"><div className="stat-card"><div className="stat-label">Ventas últimos 7 cierres</div><div className="stat-value text-success">{money(suma('totalVentasSistema'))}</div></div></div>
        <div className="col-6 col-md-3"><div className="stat-card"><div className="stat-label">Gastos últimos 7</div><div className="stat-value text-danger">{money(suma('totalGastos'))}</div></div></div>
        <div className="col-6 col-md-3"><div className="stat-card"><div className="stat-label">Pedidos últimos 7</div><div className="stat-value">{suma('cantidadPedidos')}</div></div></div>
        <div className="col-6 col-md-3"><div className="stat-card"><div className="stat-label">Diferencias de caja</div><div className={`stat-value ${suma('diferencia') < 0 ? 'text-danger' : ''}`}>{money(suma('diferencia'))}</div></div></div>
      </div>

      <div className="card-soft p-3">
        <h6 className="fw-bold"><i className="bi bi-graph-up-arrow me-2"></i>Ventas por cierre</h6>
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="fecha" fontSize={12} />
              <YAxis tickFormatter={kFmt} fontSize={12} width={40} />
              <Tooltip formatter={(v) => money(v)} />
              <Legend />
              <Bar dataKey="Ventas" fill="#198754" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="#dc3545" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-soft">
        <h6 className="fw-bold p-3 m-0 border-bottom"><i className="bi bi-clock-history me-2"></i>Historial de cierres</h6>
        <div className="table-responsive">
          <table className="table table-hover align-middle small mb-0">
            <thead className="table-light">
              <tr><th className="ps-3">Cierre</th><th>Ventas</th><th>Gastos</th><th>Esperado</th><th>Contado</th><th>Balance</th><th>Por</th><th></th></tr>
            </thead>
            <tbody>
              {cierres.map(c => (
                <tr key={c._id}>
                  <td className="ps-3">{new Date(c.fechaFin).toLocaleDateString('es-CO')}<br /><span className="text-muted">{new Date(c.fechaFin).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} · {c.cantidadPedidos} pedidos</span></td>
                  <td className="fw-bold">{money(c.totalVentasSistema)}</td>
                  <td className="text-danger">-{money(c.totalGastos)}</td>
                  <td>{money(c.totalCajaTeorico)}</td>
                  <td className="fw-bold text-primary">{money(c.totalEfectivoReal)}</td>
                  <td>
                    {c.diferencia === 0 ? <span className="badge bg-success">OK</span>
                      : c.diferencia > 0 ? <span className="badge bg-info text-dark">+{money(c.diferencia)}</span>
                        : <span className="badge bg-danger">-{money(-c.diferencia)}</span>}
                  </td>
                  <td>{c.usuario}</td>
                  <td className="pe-3"><button className="btn btn-sm btn-outline-success" onClick={() => descargar(c._id)} title="Descargar Excel"><i className="bi bi-download"></i></button></td>
                </tr>
              ))}
              {cierres.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-4">Aún no hay cierres</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
