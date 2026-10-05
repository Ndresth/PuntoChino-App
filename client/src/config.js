import { RESTAURANTE as R, ruta } from './utils/restaurante';

/** Datos del negocio: vienen de restaurantes/<id>/config.json. Edite allá, no en los componentes. */
export const NEGOCIO = {
  nombre: R.nombre,
  subtitulo: R.subtitulo,
  nit: R.nit,
  direccion: R.direccion,
  telefono: R.telefono,
  whatsapp: R.whatsapp
};

export const CATEGORIAS = R.categorias;

/** Categorías que se venden en el POS pero no salen en el menú web. */
export const CATEGORIAS_SOLO_POS = R.categoriasSoloPos;

export const TOTAL_MESAS = 20;

const h12 = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};
const { normal, domingoFestivo } = R.horario;

/** Texto informativo del horario (configuración del restaurante). El servidor lo valida. */
export const HORARIO_TEXTO = normal.abre === domingoFestivo.abre && normal.cierra === domingoFestivo.cierra
  ? `Todos los días ${h12(normal.abre)} – ${h12(normal.cierra)}`
  : `Lun a sáb ${h12(normal.abre)} – ${h12(normal.cierra)} · Domingos y festivos ${h12(domingoFestivo.abre)} – ${h12(domingoFestivo.cierra)}`;

export const METODOS_PAGO = [
  { id: 'Efectivo', icon: 'bi-cash-coin' },
  { id: 'Nequi', icon: 'bi-phone' },
  { id: 'Transferencia', icon: 'bi-bank' },
  { id: 'Tarjeta', icon: 'bi-credit-card' }
];

/** Cómo se muestra el tamaño en pedidos, cocina, facturas y botones: familiar = 1x, mediano = 1/2, personal = 1/4. */
export const TAMANO_LABEL = { familiar: '1x', mediano: '1/2', personal: '1/4', unico: 'Único' };
export const TAMANO_CORTO = { familiar: '1x', mediano: '1/2', personal: '1/4', unico: '' };
/** Nombre del campo de precio en el formulario de productos. */
export const TAMANO_NOMBRE = { familiar: 'Familiar (1x)', mediano: 'Mediano (1/2)', personal: 'Personal (1/4)', unico: 'Único' };

export const PLACEHOLDER_IMG = ruta('/images/placeholder.svg');

/** Pantalla de inicio de cada rol después del login. */
export const HOME_BY_ROLE = { admin: '/admin', cajero: '/admin', mesera: '/pos', cocina: '/cocina' };

/** Colores fijos por método de pago (validados para daltonismo; siempre van con etiqueta). */
export const COLOR_METODO = { Efectivo: '#2a78d6', Nequi: '#eb6834', Transferencia: '#1baf7a', Tarjeta: '#eda100' };


/** Desechables por pedido. El servidor valida precio y límites. */
export const DESECHABLES = R.desechables;

/** Categoría que habilita los vasos. */
export const CATEGORIA_BEBIDAS = R.categoriaBebidas;
