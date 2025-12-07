export const printReceipt = (cart, total, client, type = 'cliente', ordenInfo = {}) => {
    // type puede ser: 'cliente' o 'cocina'
    // ordenInfo trae: { tipo: 'Mesa'/'Domicilio', numero: '5'/'Barra', id: '...' }

    const receiptWindow = window.open('', '', 'width=300,height=600');
    const date = new Date().toLocaleString('es-CO');
    
    // --- ESTILOS TÉRMICOS OPTIMIZADOS ---
    const styles = `
        <style>
            @page { margin: 0; }
            body { 
                font-family: 'Courier New', monospace; 
                margin: 0; 
                padding: 5px; 
                color: black;
                width: 100%;
                max-width: 280px; /* Ancho seguro para 58mm y 80mm */
            }
            
            /* UTILIDADES */
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .fw-bold { font-weight: bold; }
            .fs-big { font-size: 16px; }
            .fs-huge { font-size: 22px; }
            .uppercase { text-transform: uppercase; }
            .dashed-line { border-bottom: 1px dashed black; margin: 5px 0; }
            .solid-line { border-bottom: 2px solid black; margin: 5px 0; }
            
            /* SECCIONES */
            .header { margin-bottom: 10px; }
            .logo { width: 60px; height: 60px; object-fit: contain; margin-bottom: 5px; }
            
            /* ITEMS */
            .item-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
            .qty { width: 15%; font-weight: bold; }
            .desc { width: 60%; }
            .price { width: 25%; text-align: right; }
            
            /* COCINA ESPECÍFICO */
            .kitchen-item { font-size: 18px; font-weight: bold; line-height: 1.2; margin-bottom: 15px; }
            .kitchen-note { 
                background-color: black; 
                color: white; 
                padding: 2px 5px; 
                font-size: 14px; 
                display: inline-block; 
                margin-top: 3px;
                border-radius: 3px;
            }
            .order-type-box {
                border: 2px solid black;
                padding: 5px;
                font-size: 20px;
                font-weight: 900;
                margin: 10px 0;
            }
        </style>
    `;

    // --- PLANTILLA CLIENTE (FACTURA) ---
    const customerTemplate = `
        <div class="header text-center">
            <img src="/images/logo.png" class="logo" alt="Logo"><br/>
            <div class="fs-big fw-bold">PUNTO CHINO</div>
            <div style="font-size: 12px;">Calle 45 # 38-21</div>
            <div style="font-size: 12px;">Tel: 324 223 3760</div>
            <div class="dashed-line"></div>
            <div class="text-left" style="font-size: 12px;">
                Fecha: ${date}<br/>
                Cliente: ${client.nombre}<br/>
                Dir: ${client.direccion || 'En sitio'}<br/>
                Tel: ${client.telefono || '-'}
            </div>
            <div class="dashed-line"></div>
        </div>

        <div class="items">
            ${cart.map(item => `
                <div class="item-row">
                    <div class="qty">${item.quantity}</div>
                    <div class="desc">
                        ${item.nombre} <br/>
                        <small>(${item.selectedSize})</small>
                        ${item.nota ? `<br/><small style="font-style:italic; font-weight:bold;">Nota: ${item.nota}</small>` : ''}
                    </div>
                    <div class="price">$${(item.selectedPrice * item.quantity).toLocaleString()}</div>
                </div>
            `).join('')}
        </div>

        <div class="solid-line"></div>
        
        <div class="total-section text-right fs-big fw-bold">
            TOTAL: $${Number(total).toLocaleString()}
        </div>
        
        <div class="text-center" style="margin-top: 20px; font-size: 12px;">
            *** GRACIAS POR SU COMPRA ***
        </div>
    `;

    // --- PLANTILLA COCINA (COMANDA) ---
    const kitchenTemplate = `
        <div class="text-center">
            <div style="font-size: 12px;">${date}</div>
            
            <div class="order-type-box uppercase">
                ${ordenInfo.tipo === 'Mesa' ? `MESA ${ordenInfo.numero}` : 'DOMICILIO'}
            </div>
            
            <div class="text-left fw-bold" style="font-size: 14px; margin-bottom: 10px;">
                Cliente: ${client.nombre}
            </div>
            
            <div class="solid-line"></div>
        </div>

        <div class="items" style="margin-top: 10px;">
            ${cart.map(item => `
                <div class="kitchen-item">
                    <span style="font-size: 24px;">${item.quantity}</span> x ${item.nombre} 
                    <span style="font-size: 14px; font-weight: normal;">(${item.selectedSize})</span>
                    
                    ${item.nota ? `<br/><span class="kitchen-note">OJO: ${item.nota.toUpperCase()}</span>` : ''}
                </div>
                <div class="dashed-line" style="opacity: 0.3;"></div>
            `).join('')}
        </div>
        
        <div class="text-center fw-bold" style="margin-top: 20px; border-top: 2px solid black; padding-top: 5px;">
            *** FIN COMANDA ***
        </div>
    `;

    // ELEGIR PLANTILLA
    const bodyContent = type === 'cocina' ? kitchenTemplate : customerTemplate;

    const html = `
        <html>
            <head><title>Imprimir</title>${styles}</head>
            <body>${bodyContent}</body>
        </html>
    `;

    receiptWindow.document.write(html);
    receiptWindow.document.close();
    
    setTimeout(() => {
        receiptWindow.focus();
        receiptWindow.print();
        // receiptWindow.close(); // Descomentar si quieres que se cierre sola
    }, 500);
};