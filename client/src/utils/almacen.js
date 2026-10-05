import { RESTAURANTE } from './restaurante';

/**
 * localStorage con prefijo por restaurante ("puntochino:token", "yahnhong:token"...).
 * Los restaurantes comparten dirección web, así que sin prefijo se mezclarían sesiones,
 * carritos y ajustes de un restaurante con los del otro.
 */
const PREFIJO = `${RESTAURANTE.id}:`;

export const almacen = {
  getItem: (clave) => localStorage.getItem(PREFIJO + clave),
  setItem: (clave, valor) => localStorage.setItem(PREFIJO + clave, valor),
  removeItem: (clave) => localStorage.removeItem(PREFIJO + clave),
  /** Nombre real de la clave en localStorage (para el evento "storage" entre pestañas). */
  clave: (clave) => PREFIJO + clave
};

// Claves que el restaurante principal guardaba sin prefijo cuando vivía solo en la raíz del sitio
const CLAVES_ANTIGUAS = ['token', 'role', 'nombre', 'ultimoNombre', 'cartWeb', 'cartPos', 'menuCache', 'tema', 'posVista', 'clienteWeb', 'printSettings', 'cierrePendienteExcel'];

/** Una sola vez: pasa las claves sin prefijo al prefijo del restaurante principal (no se pierde la sesión ni el carrito). */
export function migrarClavesAntiguas() {
  if (!RESTAURANTE.principal) return;
  try {
    for (const c of CLAVES_ANTIGUAS) {
      const viejo = localStorage.getItem(c);
      if (viejo === null) continue;
      if (localStorage.getItem(PREFIJO + c) === null) localStorage.setItem(PREFIJO + c, viejo);
      localStorage.removeItem(c);
    }
  } catch { /* sin almacenamiento */ }
}
