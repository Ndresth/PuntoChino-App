export const printReceipt = (cart, total, client, type = 'cliente', ordenInfo = {}) => {
    // type puede ser: 'cliente' o 'cocina'
    
    const receiptWindow = window.open('', '', 'width=300,height=600');
    const date = new Date().toLocaleString('es-CO');
    
    // --- ESTILOS COMPARTIDOS ---
    const styles = `
        <style>
            @page { margin: 0; }
            body { 
                font-family: 'Courier New', monospace; 
                margin: 0; 
                padding: 5px; 
                color: black;
                width: 100%;
                max-width: 280px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .fw-bold { font-weight: bold; }
            .fs-big { font-size: 16px; }
            .dashed-line { border-bottom: 1px dashed black; margin: 5px 0; }
            .solid-line { border-bottom: 2px solid black; margin: 5px 0; }
            
            /* ESTILOS DE COCINA */
            .kitchen-item { font-size: 18px; font-weight: bold; line-height: 1.2; margin-bottom: 10px; }
            .kitchen-note { background: #eee; border: 1px solid #000; padding: 2px; display: block; font-size: 14px; margin-top: 2px;}
            .order-type-box { border: 2px solid black; padding: 5px; font-size: 20px; font-weight: 900; margin: 10px 0; text-transform: uppercase; }
            .delivery-info { font-size: 14px; margin: 10px 0; border: 1px dashed black; padding: 5px; }

            /* ESTILOS DE CLIENTE */
            .logo { width: 60px; height: 60px; object-fit: contain; margin-bottom: 5px; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; }
        </style>
    `;

    // --- DISEÑO PARA CLIENTE (FACTURA) ---
    const customerTemplate = `
        <div class="header text-center">
            <img src="/images/logo.png" class="logo" alt="Logo"><br/>
            <div class="fs-big fw-bold">PUNTO CHINO</div>
            <div style="font-size: 12px;">Calle 45 # 38-21</div>
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
                    <div style="width:15%">${item.quantity}</div>
                    <div style="width:60%">
                        ${item.nombre} <br/>
                        <small>(${item.selectedSize})</small>
                        ${item.nota ? `<br/><small style="font-style:italic;">Nota: ${item.nota}</small>` : ''}
                    </div>
                    <div style="width:25%" class="text-right">$${(item.selectedPrice * item.quantity).toLocaleString()}</div>
                </div>
            `).join('')}
        </div>
        <div class="solid-line"></div>
        <div class="text-right fs-big fw-bold">TOTAL: $${Number(total).toLocaleString()}</div>
        <div class="text-center" style="margin-top: 20px; font-size: 12px;">*** GRACIAS ***</div>
    `;

    // --- DISEÑO PARA COCINA (COMANDA MEJORADA) ---
    const kitchenTemplate = `
        <div class="text-center">
            <div style="font-size: 12px;">${date}</div>
            <div class="order-type-box">
                ${ordenInfo.tipo === 'Mesa' ? `MESA ${ordenInfo.numero}` : 'DOMICILIO'}
            </div>
            
            <div class="text-left fw-bold" style="font-size: 16px;">Cliente: ${client.nombre}</div>

            ${ordenInfo.tipo !== 'Mesa' ? `
                <div class="delivery-info text-left">
                    <div><strong>📍 Dir:</strong> ${client.direccion || 'Sin dirección'}</div>
                    <div><strong>📞 Tel:</strong> ${client.telefono || 'Sin teléfono'}</div>
                    <div><strong>💰 Pago:</strong> ${client.metodoPago || 'Efectivo'}</div>
                </div>
            ` : ''}

            <div class="solid-line"></div>
        </div>
        <div class="items" style="margin-top: 10px;">
            ${cart.map(item => `
                <div class="kitchen-item">
                    <span style="font-size: 24px;">${item.quantity}</span> ${item.nombre} 
                    <span style="font-size: 14px; font-weight: normal;">(${item.selectedSize})</span>
                    ${item.nota ? `<span class="kitchen-note">OJO: ${item.nota.toUpperCase()}</span>` : ''}
                </div>
                <div class="dashed-line" style="opacity: 0.3;"></div>
            `).join('')}
        </div>
        <div class="text-center fw-bold" style="margin-top: 20px; border-top: 2px solid black;">*** FIN COMANDA ***</div>
    `;

    // ELEGIR CUÁL USAR
    const bodyContent = type === 'cocina' ? kitchenTemplate : customerTemplate;

    const html = `<html><head><title>Print</title>${styles}</head><body>${bodyContent}</body></html>`;

    receiptWindow.document.write(html);
    receiptWindow.document.close();
    
    setTimeout(() => {
        receiptWindow.focus();
        receiptWindow.print();
    }, 500);
};