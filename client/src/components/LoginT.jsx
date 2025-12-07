import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok) {
        // 1. Guardamos el Token (La llave)
        localStorage.setItem('token', data.token);
        // 2. Guardamos el Rol (La etiqueta de quién es)
        localStorage.setItem('role', data.role);
        
        // 3. Redirigimos según quién sea
        if (data.role === 'admin') {
            navigate('/admin'); // El jefe va al panel
        } else {
            navigate('/pos');   // La mesera va directo a la caja
        }
      } else {
        setError(data.message || 'Error de acceso');
      }
    } catch {
      setError('Error de conexión con el servidor');
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow p-4" style={{maxWidth: '400px', width: '100%'}}>
        <h3 className="text-center mb-4 fw-bold text-danger">Ingreso al Sistema</h3>
        
        {error && <div className="alert alert-danger text-center">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">Contraseña</label>
            <input 
              type="password" 
              className="form-control" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu clave asignada..."
            />
          </div>
          <button type="submit" className="btn btn-danger w-100 fw-bold">Entrar</button>
          <a href="/" className="d-block text-center mt-3 text-muted text-decoration-none">← Volver a la Carta Digital</a>
        </form>
      </div>
    </div>
  );
}