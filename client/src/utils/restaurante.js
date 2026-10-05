import CONFIG from '@restaurante/config.json';

/**
 * Restaurante de este build (restaurantes/<id>/config.json, elegido con RESTAURANTE al compilar).
 * Cada restaurante vive bajo su propia ruta: /puntochino, /yahnhong...
 */
export const RESTAURANTE = CONFIG;

/** Ruta base sin barra final, p. ej. "/puntochino". */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Antepone la ruta del restaurante a una ruta absoluta ("/images/x.jpg" -> "/puntochino/images/x.jpg"). URLs externas quedan igual. */
export const ruta = (p) => (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.startsWith(`${BASE}/`) ? BASE + p : p);
