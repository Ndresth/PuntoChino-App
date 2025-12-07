import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function Reportes() {
  const [cierres, setCierres] = useState([]);
  
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/cierres', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    .then(res => res.json())
    .then(data => {
        // Formateamos la fecha para que se vea bonita en el gráfico
        const formattedData = data.map(item => ({
            ...item,
            fechaCorta: new Date(item.fechaFin).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })
        })).reverse(); // Le damos la vuelta para que el gráfico vaya de izquierda a derecha (pasado -> presente)
        
        setCierres(formattedData);
    })
    .catch(err => console.error(err));
  }, []);

  return (
    <div className="card shadow border-0">
      <div className="card-header bg-white fw-bold py-3">
        📊 Rendimiento de los últimos 30 turnos
      </div>
      <div className="card-body">
        
        {/* GRÁFICO DE BARRAS */}
        <div style={{ height: 300, width: '100%', marginBottom: '40px' }}>
            <ResponsiveContainer>
                <BarChart data={cierres}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="fechaCorta" />
                    <YAxis />
                    <Tooltip 
                        formatter={(value) => `$${value.toLocaleString()}`}
                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <ReferenceLine y={0} stroke="#000" />
                    <Bar dataKey="totalVentasSistema" fill="#c62828" name="Ventas" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>

        {/* TABLA DE AUDITORÍA */}
        <h5 className="fw-bold mb-3">📂 Historial de Auditoría</h5>
        <div className="table-responsive">
            <table className="table table-hover align-middle small">
                <thead className="table-light">
                    <tr>
                        <th>Fecha Cierre</th>
                        <th>Ventas</th>
                        <th>Gastos</th>
                        <th>Efectivo Real</th>
                        <th>Cuadre (Diferencia)</th>
                        <th>Usuario</th>
                    </tr>
                </thead>
                <tbody>
                    {cierres.length === 0 ? (
                        <tr><td colSpan="6" className="text-center text-muted">No hay registros aún</td></tr>
                    ) : (
                        // Mostramos la lista original (del más reciente primero)
                        [...cierres].reverse().map(cierre => (
                            <tr key={cierre._id}>
                                <td>
                                    {new Date(cierre.fechaFin).toLocaleDateString()} 
                                    <br/><small className="text-muted">{new Date(cierre.fechaFin).toLocaleTimeString()}</small>
                                </td>
                                <td className="fw-bold">${cierre.totalVentasSistema.toLocaleString()}</td>
                                <td className="text-danger">-${cierre.totalGastos.toLocaleString()}</td>
                                <td className="fw-bold text-primary">${cierre.totalEfectivoReal.toLocaleString()}</td>
                                <td>
                                    {cierre.diferencia === 0 ? (
                                        <span className="badge bg-success">Perfecto</span>
                                    ) : cierre.diferencia > 0 ? (
                                        <span className="badge bg-info text-dark">Sobró ${cierre.diferencia.toLocaleString()}</span>
                                    ) : (
                                        <span className="badge bg-danger">Faltó ${Math.abs(cierre.diferencia).toLocaleString()}</span>
                                    )}
                                </td>
                                <td>{cierre.usuario}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

      </div>
    </div>
  );
}