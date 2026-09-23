import { DESECHABLES } from '../config';

export const DESECHABLES_VACIO = { cucharas: 0, platos: 0 };

/** Costo de los desechables elegidos (sólo para mostrar; el servidor calcula el real). */
export const costoDesechables = (cant) => DESECHABLES.reduce((a, d) => a + d.precio * (cant[d.key] || 0), 0);
