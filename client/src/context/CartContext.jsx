import { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Agregar (Ahora inicializa la nota vacía)
  const addToCart = (product, size, price, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id && item.selectedSize === size);
      if (existingItem) {
        return prevCart.map(item => 
          (item.id === product.id && item.selectedSize === size)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Inicializamos la nota en blanco
        return [...prevCart, { ...product, selectedSize: size, selectedPrice: price, quantity: quantity, nota: '' }];
      }
    });
  };

  // NUEVA FUNCIÓN: Guardar lo que escriban en el input
  const updateItemNote = (productId, size, note) => {
    setCart(prevCart => prevCart.map(item => 
        (item.id === productId && item.selectedSize === size)
          ? { ...item, nota: note }
          : item
    ));
  };

  const removeFromCart = (productId, size) => {
    setCart(prevCart => prevCart.filter(item => !(item.id === productId && item.selectedSize === size)));
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((acc, item) => acc + (item.selectedPrice * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, updateItemNote, total }}>
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);