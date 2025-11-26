import { createContext, useState, useContext } from 'react';

// 1. Crear el contexto
const CartContext = createContext();

// 2. Crear el proveedor
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Función para agregar al carrito 
  const addToCart = (product, size, price, quantity = 1) => {
    setCart(prevCart => {
      // Buscamos si ya existe el producto con ese MISMO tamaño
      const existingItem = prevCart.find(item => item.id === product.id && item.selectedSize === size);
      
      if (existingItem) {
        // Sumamos lo que ya había + la nueva cantidad
        return prevCart.map(item => 
          (item.id === product.id && item.selectedSize === size)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Si es nuevo, entra con la cantidad elegida
        return [...prevCart, { ...product, selectedSize: size, selectedPrice: price, quantity: quantity }];
      }
    });
  };

  // Función para eliminar del carrito
  const removeFromCart = (productId, size) => {
    setCart(prevCart => prevCart.filter(item => !(item.id === productId && item.selectedSize === size)));
  };

  // Calcular total
  const total = cart.reduce((acc, item) => acc + (item.selectedPrice * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, total }}>
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);