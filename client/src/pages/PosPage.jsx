import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';

// IMPORTACIONES
import ProductSidebar from '../components/ProductSidebar';
import PosCartSidebar from '../components/PosCartSidebar';
import HomeContent from '../components/HomeContent'; // <--- ESTA ES LA ÚNICA QUE DEBE ESTAR

// --- NAVBAR EXCLUSIVO PARA CAJA ---
const PosNavbar = ({ onOpenCart, totalItems }) => (
    <nav className="navbar navbar-dark bg-dark sticky-top px-3 shadow">
      <div className="d-flex align-items-center gap-3">
        <Link to="/admin" className="btn btn-outline-light btn-sm">Ir a Admin</Link>
        <span className="navbar-brand mb-0 h1 fw-bold">🖥️ SISTEMA POS</span>
      </div>
      <button onClick={onOpenCart} className="btn btn-success fw-bold">
        <i className="bi bi-receipt"></i> Ver Cuenta ({totalItems})
      </button>
    </nav>
);

export default function PosPage() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { cart } = useCart();
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const showNotification = (msg) => console.log(msg); 

  return (
    <div style={{backgroundColor: '#e9ecef', minHeight: '100vh'}}>
      <PosNavbar onOpenCart={() => setIsCartOpen(true)} totalItems={totalItems} />
      
      {/* Reutilizamos el contenido del Home (Grilla de productos) */}
      <HomeContent onSelectProduct={setSelectedProduct} />

      {/* Carrito especial de Mesero */}
      <PosCartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Sidebar para agregar productos */}
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