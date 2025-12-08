import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { CartProvider, useCart } from './context/CartContext';
import CartSidebar from './components/CartSidebar';
import ProductSidebar from './components/ProductSidebar';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/LoginT';
import PosPage from './pages/PosPage';
import OrdersPanel from './components/OrdersPanel';
import HomeContent from './components/HomeContent';

// --- COMPONENTE DE SEGURIDAD (CONTROL DE ACCESO) ---
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const location = useLocation();

  if (!token) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (location.pathname.startsWith('/pos')) {
        localStorage.clear();
        return <Navigate to="/login" />;
    }
    return <Navigate to="/pos" />;
  }

  return children;
};

// --- NOTIFICACIONES DEL SISTEMA ---
const ToastNotification = ({ message, show, onClose }) => {
  return (
    <div className={`toast-container position-fixed bottom-0 end-0 p-3`} style={{zIndex: 2000}}>
      <div className={`toast ${show ? 'show' : ''} align-items-center text-white bg-success border-0 shadow`}>
        <div className="d-flex">
          <div className="toast-body fs-6 fw-bold">
            <i className="bi bi-check-circle-fill me-2"></i>{message}
          </div>
          <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={onClose}></button>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </CartProvider>
  )
}

function MainLayout() {
  const location = useLocation();
  
  const isSpecialPage = 
    location.pathname.startsWith('/pos') || 
    location.pathname.startsWith('/login') || 
    location.pathname.startsWith('/admin') || 
    location.pathname.startsWith('/cocina'); 

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  const showNotification = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  return (
    <>
      {!isSpecialPage && (
        <>
          <Navbar onOpenCart={() => setIsCartOpen(true)} />
          <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
          <ProductSidebar 
            key={selectedProduct ? selectedProduct.id : 'empty'} 
            product={selectedProduct} 
            isOpen={!!selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
            onNotify={showNotification}
          />
          <ToastNotification show={toast.show} message={toast.message} onClose={() => setToast({...toast, show: false})} />
        </>
      )}

      <Routes>
        <Route path="/" element={<HomeContent onSelectProduct={setSelectedProduct} />} />
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/pos" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'mesera']}>
              <PosPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cocina" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'mesera']}>
              <OrdersPanel />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </>
  );
}

function Navbar({ onOpenCart }) {
  const { cart } = useCart();
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  return (
    <nav className="navbar navbar-expand-lg navbar-dark navbar-custom">
      <div className="container-fluid d-flex justify-content-between align-items-center">
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2">
          <div className="bg-white rounded-circle d-flex justify-content-center align-items-center shadow-sm" style={{width:'50px', height:'50px', padding:'3px'}}>
             <img src="/images/logo.png" alt="Logo" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
          </div>
          <div className="d-flex flex-column">
            <span className="brand-text">PUNTO CHINO</span>
            <span className="brand-subtext">Comida Oriental</span>
          </div>
        </Link>
        <button onClick={onOpenCart} className="btn btn-warning rounded-pill fw-bold shadow-sm d-flex align-items-center gap-2 px-3 border-0" style={{background: '#FFC107', color: '#212121'}}>
          <i className="bi bi-cart-check-fill"></i> 
          <span className="d-none d-sm-inline ms-1">Carrito de Compras</span>
          {totalItems > 0 && (<span className="badge bg-dark text-white rounded-pill ms-2">{totalItems}</span>)}
        </button>
      </div>
    </nav>
  );
}

export default App;