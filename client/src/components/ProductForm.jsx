import React, { useState } from 'react'; // <--- AQUÍ QUITAMOS useEffect

export default function ProductForm({ productToEdit, onClose, onSave }) {
  
  // Inicializamos el estado UNA SOLA VEZ al principio.
  const [formData, setFormData] = useState(() => {
    if (productToEdit) {
      return { ...productToEdit };
    } 
    return {
      id: Date.now(),
      nombre: '',
      categoria: 'Arroz Frito',
      descripcion: '',
      imagen: '',
      precios: {
        familiar: 0,
        mediano: 0,
        personal: 0,
        unico: 0
      }
    };
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      precios: { ...formData.precios, [name]: Number(value) }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <>
      {/* Fondo Oscuro */}
      <div className="modal-backdrop fade show" style={{zIndex: 1050}}></div>
      
      {/* Modal Principal */}
      <div className="modal fade show d-block" style={{zIndex: 1060}}>
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            
            {/* Encabezado del Modal */}
            <div className="modal-header bg-dark text-white">
              <h5 className="modal-title">
                {productToEdit ? 'Editar Plato' : 'Nuevo Plato'}
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
            
            {/* Cuerpo del Modal */}
            <div className="modal-body">
              <form id="productForm" onSubmit={handleSubmit}>
                <div className="row g-3">
                  
                  {/* Nombre */}
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Nombre del Plato</label>
                    <input type="text" name="nombre" className="form-control" required value={formData.nombre} onChange={handleChange} />
                  </div>

                  {/* Categoría */}
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Categoría</label>
                    <select name="categoria" className="form-select" value={formData.categoria} onChange={handleChange}>
                        <option>Arroz Frito</option>
                        <option>Chop Suey</option>
                        <option>Espaguetes</option>
                        <option>Agridulce</option>
                        <option>Platos Especiales</option>
                        <option>Comidas Corrientes</option>
                        <option>Porciones</option>
                        <option>Bebidas</option>
                    </select>
                  </div>

                  {/* Descripción */}
                  <div className="col-12">
                    <label className="form-label">Descripción</label>
                    <textarea name="descripcion" className="form-control" rows="2" value={formData.descripcion} onChange={handleChange}></textarea>
                  </div>

                  {/* Imagen URL */}
                  <div className="col-12">
                    <label className="form-label fw-bold">Imagen (URL)</label>
                    <div className="input-group">
                        <span className="input-group-text"><i className="bi bi-link-45deg"></i></span>
                        <input 
                            type="text" 
                            name="imagen" 
                            className="form-control" 
                            placeholder="Ej: https://misitio.com/foto.jpg" 
                            value={formData.imagen} 
                            onChange={handleChange} 
                        />
                    </div>
                    
                    {/* Vista Previa */}
                    {formData.imagen && (
                        <div className="mt-3 text-center p-2 border rounded bg-light">
                            <small className="d-block mb-1 text-secondary">Vista Previa:</small>
                            <img 
                                src={formData.imagen} 
                                alt="Vista previa" 
                                style={{maxHeight: '150px', maxWidth: '100%', borderRadius: '10px'}}
                                onError={(e) => e.target.style.display = 'none'} 
                            />
                        </div>
                    )}
                  </div>

                  {/* Precios */}
                  <div className="col-12"><hr/><h6 className="fw-bold text-danger">Precios (Deja en 0 si no aplica)</h6></div>
                  
                  <div className="col-6 col-md-3">
                    <label className="form-label small">Familiar</label>
                    <div className="input-group input-group-sm">
                        <span className="input-group-text">$</span>
                        <input type="number" name="familiar" className="form-control" value={formData.precios.familiar || 0} onChange={handlePriceChange} />
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small">Mediano</label>
                    <div className="input-group input-group-sm">
                        <span className="input-group-text">$</span>
                        <input type="number" name="mediano" className="form-control" value={formData.precios.mediano || 0} onChange={handlePriceChange} />
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small">Personal</label>
                    <div className="input-group input-group-sm">
                        <span className="input-group-text">$</span>
                        <input type="number" name="personal" className="form-control" value={formData.precios.personal || 0} onChange={handlePriceChange} />
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small">Único</label>
                    <div className="input-group input-group-sm">
                        <span className="input-group-text">$</span>
                        <input type="number" name="unico" className="form-control" value={formData.precios.unico || 0} onChange={handlePriceChange} />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Pie del Modal (Botones) */}
            <div className="modal-footer bg-light">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" form="productForm" className="btn btn-success fw-bold px-4">Guardar Plato</button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}