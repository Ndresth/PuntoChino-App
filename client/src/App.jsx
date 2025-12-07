import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { CartProvider, useCart } from './context/CartContext'
import CartSidebar from './components/CartSidebar'
import ProductSidebar from './components/ProductSidebar'
import AdminDashboard from './components/AdminDashboard'
import Login from './components/LoginT'
import PosPage from './pages/PosPage'
import OrdersPanel from './components/OrdersPanel'

// --- COMPONENTE DE SEGURIDAD MEJORADO ---
// Verifica si tienes Token Y si tu rol está permitido
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  // 1. Si no hay llave, a login
  if (!token) return <Navigate to="/login" />;

  // 2. Si hay llave, pero tu rol no está en la lista permitida, te sacamos
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Si una mesera intenta ir a admin, la mandamos al POS
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
        {/* Ruta Pública */}
        <Route path="/" element={<HomeContent onSelectProduct={setSelectedProduct} />} />
        <Route path="/login" element={<Login />} />
        
        {/* --- RUTAS PROTEGIDAS POR ROL --- */}
        
        {/* 1. SOLO ADMIN: Puede ver el dashboard, cerrar caja y editar productos */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* 2. ADMIN Y MESERA: Pueden entrar al POS para cobrar */}
        <Route 
          path="/pos" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'mesera']}>
              <PosPage />
            </ProtectedRoute>
          } 
        />

        {/* 3. ADMIN Y MESERA: Pueden ver la pantalla de cocina/pedidos */}
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

export function HomeContent({ onSelectProduct }) {
  const [menu, setMenu] = useState([])
  const [filtro, setFiltro] = useState("Todos"); 

  useEffect(() => {
    fetch('/api/productos')
      .then(res => res.json())
      .then(data => setMenu(data))
      .catch(err => console.error("Error:", err))
  }, [])

  const ordenCategorias = ["Todos", "Arroz Frito", "Chop Suey", "Espaguetes", "Agridulce", "Platos Especiales", "Comidas Corrientes", "Porciones", "Bebidas"];

  let productosParaMostrar = [];
  if (filtro === "Todos") {
    productosParaMostrar = [...menu].sort((a, b) => {
      const indexA = ordenCategorias.indexOf(a.categoria);
      const indexB = ordenCategorias.indexOf(b.categoria);
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      return posA - posB;
    });
  } else {
    productosParaMostrar = menu.filter(p => p.categoria === filtro);
  }

  return (
    <div>
      <div className="filter-container">
        <div className="container">
            <div className="filter-scroll">
                {ordenCategorias.map(cat => (
                <button key={cat} className={`filter-btn ${filtro === cat ? 'active' : ''}`} onClick={() => setFiltro(cat)}>{cat}</button>
                ))}
            </div>
        </div>
      </div>
      <div className="container py-4">
        <div className="row g-3">
            {productosParaMostrar.map((plato) => (
            <div key={plato.id} className="col-12 col-lg-6">
                <div className="card product-card h-100 p-2 d-flex flex-row align-items-center">
                <div style={{width: '120px', height: '120px', flexShrink: 0}} className="rounded overflow-hidden border">
                    <img src={plato.imagen || "https://via.placeholder.com/150"} alt={plato.nombre} style={{width: '100%', height: '100%', objectFit:'cover'}} onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=Sin+Foto"; }}/>
                </div>
                <div className="card-body p-2 ps-3 w-100 d-flex flex-column justify-content-center">
                    <h5 className="card-title fw-bold mb-1 text-dark" style={{fontSize: '1.1rem'}}>{plato.nombre}</h5>
                    <small className="text-muted d-block mb-2 text-truncate" style={{maxWidth: '250px'}}>{plato.descripcion}</small>
                    <div className="d-flex justify-content-between align-items-end mt-1">
                        <span className="fw-bold text-danger fs-5">
                          ${(Object.values(plato.precios).find(p => p > 0) || 0).toLocaleString()}
                        </span>
                        <button className="btn btn-sm btn-add" onClick={() => onSelectProduct(plato)}>Agregar</button>
                    </div>
                </div>
                </div>
            </div>
            ))}
        </div>
      </div>
    </div>
  )
}

export default App