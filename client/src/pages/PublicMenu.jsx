import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useProducts } from '../hooks/useProducts';
import { NEGOCIO } from '../config';
import { money } from '../utils/format';
import MenuBrowser from '../components/MenuBrowser';
import ProductSidebar from '../components/ProductSidebar';
import CartSidebar from '../components/CartSidebar';

export default function PublicMenu() {
  const { productos, loading } = useProducts();
  const { totalItems, total } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  return (
    <>
      <nav className="navbar navbar-dark navbar-custom">
        <div className="container d-flex justify-content-between align-items-center">
          <Link to="/" className="navbar-brand d-flex align-items-center gap-2 m-0">
            <img src="/images/logo.png" alt="Logo" className="brand-logo" width="46" height="46" />
            <span className="d-flex flex-column">
              <span className="brand-text">{NEGOCIO.nombre}</span>
              <span className="brand-subtext">{NEGOCIO.subtitulo}</span>
            </span>
          </Link>
          <div className="d-flex align-items-center gap-2">
            <button onClick={() => setIsCartOpen(true)} className="btn btn-warning rounded-pill fw-bold d-flex align-items-center gap-2 px-3 border-0">
              <i className="bi bi-bag-check-fill"></i>
              <span className="d-none d-sm-inline">Ver pedido</span>
              {totalItems > 0 && <span className="badge bg-dark rounded-pill">{totalItems}</span>}
            </button>
          </div>
        </div>
      </nav>

      <main style={{ paddingBottom: totalItems > 0 ? 90 : 20 }}>
        <MenuBrowser productos={productos} loading={loading} onSelect={setSelected} />
      </main>

      {totalItems > 0 && !isCartOpen && (
        <button className="btn btn-success fab-cart fw-bold d-flex justify-content-between align-items-center d-md-none" onClick={() => setIsCartOpen(true)}>
          <span><span className="badge bg-light text-success me-2">{totalItems}</span>Ver pedido</span>
          <span>{money(total)}</span>
        </button>
      )}

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <ProductSidebar key={selected?.id ?? 'none'} product={selected} onClose={() => setSelected(null)} />
    </>
  );
}
