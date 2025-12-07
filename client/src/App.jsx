import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { CartProvider, useCart } from './context/CartContext'
import CartSidebar from './components/CartSidebar'
import ProductSidebar from './components/ProductSidebar'
import AdminDashboard from './components/AdminDashboard'
import Login from './components/LoginT'
import PosPage from './pages/PosPage'
import OrdersPanel from './components/OrdersPanel'
import HomeContent from './components/HomeContent' // <--- IMPORTANTE: Importamos el componente aislado

// --- COMPONENTE DE SEGURIDAD BLINDADO ---
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const location = useLocation(); // Necesitamos saber dónde estamos

  // 1. Si no hay token, fuera.
  if (!token) return <Navigate to="/login" />;

  // 2. Verificación de Roles
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // ¡AQUÍ ESTABA EL ERROR! 
    // Si ya estamos en /pos y fallamos, no podemos redirigir a /pos otra vez (bucle).
    // Solución: Si fallas en /pos, te mandamos al Login.
    if (location.pathname.startsWith('/pos')) {
        localStorage.clear(); // Borramos credenciales corruptas
        return <Navigate to="/login" />;
    }
    
    // Si fallas en /admin (ej: eres mesera), te mandamos al POS.
    return <Navigate to="/pos" />;
  }

  return children;
};

const ToastNotification = ({ message, show, onClose }) => {
  return (
    <div className={`toast-container position-fixed bottom-0 end-0 p-3`} style={{zIndex: 2000}}>
      <div className={`toast ${show ? 'show' : ''} align-items-center text-white bg-success border-0 shadow`}>
        <div className="d-flex">
          <div className="toast-body fs-6 fw-bold"><i className="bi bi-check-circle me-2"></i>{message}</div>
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
  
  // Ocultamos el Navbar normal en estas rutas especiales
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
      {/* Navbar y Sidebar de CLIENTE (Solo visible en la Home pública) */}
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
        {/* RUTA PÚBLICA (Menú Digital) */}
        <Route path="/" element={<HomeContent onSelectProduct={setSelectedProduct} />} />
        
        {/* LOGIN */}
        <Route path="/login" element={<Login />} />
        
        {/* --- RUTAS PROTEGIDAS (Solo personal autorizado) --- */}
        
        {/* ADMIN: Panel de control total (Solo Jefe) */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* POS: Caja Registradora (Jefe y Meseras) */}
        <Route 
          path="/pos" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'mesera']}>
              <PosPage />
            </ProtectedRoute>
          } 
        />

        {/* COCINA: Pantalla de Pedidos (Jefe y Meseras) */}
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
          <i className="bi bi-cart-fill"></i> <span className="d-none d-sm-inline">Tu Pedido</span>
          {totalItems > 0 && (<span className="badge bg-dark text-white rounded-pill ms-1">{totalItems}</span>)}
        </button>
      </div>
    </nav>
  );
}

export default App;