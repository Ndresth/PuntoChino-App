import { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Agregar (Suma cantidades)
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
        // Inicializamos la nota vacía
        return [...prevCart, { ...product, selectedSize: size, selectedPrice: price, quantity: quantity, nota: '' }];
      }
    });
  };

  // Actualizar la nota de un producto específico
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

// ESTA LÍNEA DE ABAJO ES LA QUE SOLUCIONA EL ERROR:
// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);