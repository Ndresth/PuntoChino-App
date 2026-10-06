const TarifaDomicilio = require('../models/TarifaDomicilioModel');
const { domicilioMinimo = 0 } = require('./restaurante');

const MAXIMO = 200000;

// Abreviaturas de nomenclatura colombiana: todas las formas quedan iguales
const VIAS = [
    [/^(carrera|carre|carr|cra|kra|kr|cr|kar)$/, 'cra'],
    [/^(calle|cll|cl|cal|clle)$/, 'cl'],
    [/^(diagonal|diag|dg)$/, 'dg'],
    [/^(transversal|transv|trans|tv|tr)$/, 'tv'],
    [/^(avenida|avda|av)$/, 'av'],
    [/^(manzana|mz|mza)$/, 'mz'],
    [/^(barrio|br|bar)$/, ''],
    [/^(apartamento|apto|apt|ap)$/, 'apto'],
    [/^(numero|num|no|nro|n)$/, '']
];

/**
 * "Cra. 12 # 45-30, Barrio Centro" y "carrera 12 no 45 30 barrio centro" -> "cra124530centro"
 * (sin tildes, mayúsculas, signos ni abreviaturas distintas). Sirve para reconocer la misma dirección.
 */
const normalizarDireccion = (texto) => String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[#°º]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map(p => { const v = VIAS.find(([re]) => re.test(p)); return v ? v[1] : p; })
    .join('')
    .slice(0, 150);

/** Revisa el valor del domicilio: entero, desde el mínimo del restaurante. Devuelve el número o lanza. */
const validarValorDomicilio = (valor, HttpError) => {
    const n = Number(valor);
    if (!Number.isInteger(n) || n < domicilioMinimo || n > MAXIMO) {
        throw new HttpError(400, `El domicilio debe ser mínimo $${domicilioMinimo.toLocaleString('es-CO')}`);
    }
    return n;
};

/** Valor cobrado la última vez a esta dirección (o null si es nueva). */
const tarifaGuardada = async (direccion) => {
    const id = normalizarDireccion(direccion);
    if (!id) return null;
    const t = await TarifaDomicilio.findById(id).lean();
    return t && t.valor >= domicilioMinimo ? t.valor : null;
};

/** Guarda lo cobrado para la próxima vez. Un fallo aquí no debe tumbar el pedido. */
const aprenderTarifa = async (direccion, valor) => {
    const id = normalizarDireccion(direccion);
    if (!id) return;
    try {
        await TarifaDomicilio.updateOne(
            { _id: id },
            { $set: { valor, direccion: String(direccion).slice(0, 150), actualizado: new Date() }, $inc: { usos: 1 } },
            { upsert: true }
        );
    } catch (e) {
        console.error('[WARN] No se pudo guardar la tarifa de domicilio:', e.message);
    }
};

module.exports = { normalizarDireccion, validarValorDomicilio, tarifaGuardada, aprenderTarifa, DOMICILIO_MINIMO: domicilioMinimo };
