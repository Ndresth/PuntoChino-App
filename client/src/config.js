/** Datos del negocio y parámetros de operación. Edite aquí, no en los componentes. */
export const NEGOCIO = {
  nombre: 'PUNTO CHINO',
  subtitulo: 'Restaurante Oriental',
  nit: '1044604619-2',
  direccion: 'Calle 45 # 38-21',
  telefono: '324 223 3760',
  whatsapp: '573242233760'
};

export const CATEGORIAS = [
  'Arroz Frito', 'Chop Suey', 'Espaguetes', 'Agridulce',
  'Platos Especiales', 'Comidas Corrientes', 'Porciones', 'Bebidas'
];

export const TOTAL_MESAS = 20;

export const METODOS_PAGO = [
  { id: 'Efectivo', icon: 'bi-cash-coin' },
  { id: 'Nequi', icon: 'bi-phone' },
  { id: 'Transferencia', icon: 'bi-bank' },
  { id: 'Tarjeta', icon: 'bi-credit-card' }
];

export const TAMANO_LABEL = { familiar: 'Familiar', mediano: 'Mediano', personal: 'Personal', unico: 'Único' };
export const TAMANO_CORTO = { familiar: 'F', mediano: 'M', personal: 'P', unico: '' };

export const PLACEHOLDER_IMG = '/images/placeholder.svg';

/** Pantalla de inicio de cada rol después del login. */
export const HOME_BY_ROLE = { admin: '/admin', cajero: '/admin', mesera: '/pos', cocina: '/cocina' };

/** Colores fijos por método de pago (validados para daltonismo; siempre van con etiqueta). */
export const COLOR_METODO = { Efectivo: '#2a78d6', Nequi: '#eb6834', Transferencia: '#1baf7a', Tarjeta: '#eda100' };

