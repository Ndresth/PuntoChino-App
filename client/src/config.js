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

/** Métodos de pago del POS. credito: nota crédito, la plataforma paga después (no entra efectivo ese día). */
export const METODOS_PAGO = [
  { id: 'Efectivo', icon: 'bi-cash-coin' },
  { id: 'Nequi', icon: 'bi-phone' },
  { id: 'Transferencia', icon: 'bi-bank' },
  { id: 'Tarjeta', icon: 'bi-credit-card' },
  { id: 'Rappi', icon: 'bi-bag-check', credito: '15 días' },
  { id: 'Didi', icon: 'bi-scooter', credito: '1 semana' }
];
export const CREDITO = Object.fromEntries(METODOS_PAGO.filter(m => m.credito).map(m => [m.id, m.credito]));

/** Tamaño en pantallas (menú, POS, carrito, reportes): F = familiar, M = mediano, P = personal. */
export const TAMANO_LABEL = { familiar: 'F', mediano: 'M', personal: 'P', unico: 'Único' };
export const TAMANO_CORTO = { familiar: 'F', mediano: 'M', personal: 'P', unico: '' };
export const TAMANO_NOMBRE = { familiar: 'Familiar', mediano: 'Mediano', personal: 'Personal', unico: 'Único' };
/** Tamaño en factura, comanda y cocina: va al inicio de la línea ("1/2 Arroz Especial"). */
export const TAMANO_FRACCION = { familiar: '1', mediano: '1/2', personal: '1/4' };

export const PLACEHOLDER_IMG = ruta('/images/placeholder.svg');

/** Pantalla de inicio de cada rol después del login. */
export const HOME_BY_ROLE = { admin: '/admin', cajero: '/admin', mesera: '/pos', cocina: '/cocina' };

/** Colores fijos por método de pago (validados para daltonismo; siempre van con etiqueta). */
export const COLOR_METODO = { Efectivo: '#2a78d6', Nequi: '#eb6834', Transferencia: '#1baf7a', Tarjeta: '#eda100', Rappi: '#4a3aa7', Didi: '#e87ba4' };


/** Desechables por pedido. El servidor valida precio y límites. */
export const DESECHABLES = R.desechables;

/** Valor mínimo del domicilio de este restaurante (el servidor también lo valida). */
export const DOMICILIO_MINIMO = R.domicilioMinimo || 0;

/** Categoría que habilita los vasos. */
export const CATEGORIA_BEBIDAS = R.categoriaBebidas;
