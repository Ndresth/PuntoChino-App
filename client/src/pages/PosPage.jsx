import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom'; // Importamos useNavigate

// IMPORTACIONES
import ProductSidebar from '../components/ProductSidebar';
import PosCartSidebar from '../components/PosCartSidebar';
import HomeContent from '../components/HomeContent';

// --- NAVBAR EXCLUSIVO PARA CAJA (CON BOTÓN SALIR) ---
const PosNavbar = ({ onOpenCart, totalItems, onLogout }) => (
    <nav className="navbar navbar-dark bg-dark sticky-top px-3 shadow">
      <div className="d-flex align-items-center gap-3">
        {/* Botón Admin solo visible si eres Admin (opcional, pero útil) */}
        <Link to="/admin" className="btn btn-outline-light btn-sm">
            <i className="bi bi-gear-fill me-1"></i> Admin
        </Link>
        
        <span className="navbar-brand mb-0 h1 fw-bold d-none d-md-block">🖥️ SISTEMA POS</span>
      </div>

      <div className="d-flex gap-2">
          {/* Botón Ver Cuenta */}
          <button onClick={onOpenCart} className="btn btn-success fw-bold">
            <i className="bi bi-receipt me-1"></i> Cuenta ({totalItems})
          </button>

          {/* NUEVO BOTÓN SALIR */}
          <button onClick={onLogout} className="btn btn-danger fw-bold">
            <i className="bi bi-box-arrow-right"></i> Salir
          </button>
      </div>
    </nav>
);

export default function PosPage() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { cart } = useCart();
  const navigate = useNavigate(); // Hook para redirigir

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const showNotification = (msg) => console.log(msg); 

  // Función para cerrar sesión
  const handleLogout = () => {
    if(window.confirm("¿Cerrar sesión de caja?")) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('isAdmin');
        navigate('/login');
    }
  };

  return (
    <div style={{backgroundColor: '#e9ecef', minHeight: '100vh'}}>
      <PosNavbar 
        onOpenCart={() => setIsCartOpen(true)} 
        totalItems={totalItems} 
        onLogout={handleLogout} // Pasamos la función al Navbar
      />
      
      <HomeContent onSelectProduct={setSelectedProduct} />

      <PosCartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <ProductSidebar 
        key={selectedProduct ? selectedProduct.id : 'empty'} 
        product={selectedProduct} 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        onNotify={showNotification}
      />
    </div>
  );
}