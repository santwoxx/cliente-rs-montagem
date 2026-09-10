/* ==========================================================================
   MOVELPRO - QUOTES & RECEIPT GENERATOR
   Pricing calculator, WhatsApp quote builder & printable receipts
   ========================================================================== */

// Largura do palco de exportacao, em pixels. 760 px corresponde a uma A4
// retrato de 96 dpi (794 px) menos as margens de 10 mm dos dois lados.
const PDF_LARGURA_PALCO = 760;

class QuotesController {
  constructor() {
    this.selectedItems = {}; // { id: quantity }
    this.materialCost = 0; // gasto com material: sai do lucro, nao do bolso do cliente
    this.discount = 0;
    this.currentReceiptContext = null; // { type: 'service' | 'store', id }
  }

  init() {
    this.renderCatalog();
    this.bindEvents();
  }

  bindEvents() {
    const costInput = document.getElementById('calc-cost');
    if (costInput) {
      costInput.addEventListener('input', (e) => {
        this.materialCost = Utils.toNumber(e.target.value);
        this.updateTotal();
      });
    }

    const descInput = document.getElementById('calc-discount');
    if (descInput) {
      descInput.addEventListener('input', (e) => {
        this.discount = Utils.toNumber(e.target.value);
        this.updateTotal();
      });
    }

    // Copy WhatsApp quote button
    const copyBtn = document.getElementById('calc-copy-whatsapp-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        this.copyWhatsAppQuote();
      });
    }

    // Direct WhatsApp send button
    const sendBtn = document.getElementById('calc-send-whatsapp-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        this.sendWhatsAppQuote();
      });
    }

    // Convert to service
    const scheduleBtn = document.getElementById('calc-schedule-btn');
    if (scheduleBtn) {
      scheduleBtn.addEventListener('click', () => {
        this.convertQuoteToService();
      });
    }

    // Envio da nota aberta direto para o cliente / loja
    const sendReceiptBtn = document.getElementById('btn-send-receipt-whatsapp');
    if (sendReceiptBtn) {
      sendReceiptBtn.addEventListener('click', () => this.sendCurrentReceipt());
    }

    // Gera o arquivo PDF da nota
    const pdfBtn = document.getElementById('btn-baixar-pdf');
    if (pdfBtn) pdfBtn.addEventListener('click', () => this.gerarPDF());

    // Impressão continua disponível como alternativa
    const printBtn = document.getElementById('btn-imprimir-nota');
    if (printBtn) printBtn.addEventListener('click', () => window.print());
  }

  /* ---------- PDF da nota ---------- */

  /** Nome do arquivo a partir do que está na nota aberta. */
  nomeDoArquivoPDF() {
    const ctx = this.currentReceiptContext;
    const limpar = (t) => String(t || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

    if (ctx && ctx.type === 'service') {
      const s = window.storageManager.getServices().find(item => item.id === ctx.id);
      if (s) return `nota-${limpar(s.clientName)}-${s.date || Utils.todayISO()}.pdf`;
    }
    if (ctx && ctx.type === 'store') {
      const loja = window.storageManager.getStores().find(item => item.id === ctx.id);
      if (loja) return `nota-${limpar(loja.name)}-${Utils.todayISO()}.pdf`;
    }
    return `nota-de-servico-${Utils.todayISO()}.pdf`;
  }

  /**
   * Monta o PDF a partir da nota que está na tela.
   * Antes isto era window.print(), que no celular abre a tela de impressão do
   * Android e nem sempre chega a um arquivo. Agora o arquivo é gerado aqui:
   * no Android cai no menu de compartilhar (dá para mandar no WhatsApp na hora),
   * e onde isso não existir vira download normal.
   */
  async gerarPDF() {
    const nota = document.querySelector('#receipt-modal-body .printable-receipt');
    if (!nota) {
      window.app.showToast('Abra uma nota antes de gerar o PDF.', 'warning');
      return;
    }

    // Biblioteca não carregou (offline na primeira vez): volta para a impressão.
    if (typeof html2pdf === 'undefined') {
      window.app.showToast('Gerador de PDF indisponível. Abrindo a impressão.', 'warning');
      window.print();
      return;
    }

    const btn = document.getElementById('btn-baixar-pdf');
    const rotuloOriginal = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...';
    }

    const nomeArquivo = this.nomeDoArquivoPDF();
    const palco = this.montarPalcoDeExportacao(nota);

    try {
      const blob = await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: nomeArquivo,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#FFFFFF',
            // O palco tem largura fixa e conhecida, então a captura é
            // determinística: nada de herdar rolagem ou zoom da tela.
            width: PDF_LARGURA_PALCO,
            windowWidth: PDF_LARGURA_PALCO,
            scrollX: 0,
            scrollY: 0
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css'] }
        })
        .from(palco.alvo)
        .outputPdf('blob');

      await this.entregarPDF(blob, nomeArquivo);
    } catch (e) {
      console.error('[pdf] falhou:', e);
      window.app.showToast('Não consegui gerar o PDF. Abrindo a impressão.', 'danger');
      window.print();
    } finally {
      palco.desmontar();
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = rotuloOriginal;
      }
    }
  }

  /**
   * Copia a nota para fora do modal antes de virar PDF.
   *
   * Dentro do modal a nota está sob um `position: fixed` com `transform:
   * scale()` e `overflow: hidden`, e o html2canvas calcula a origem errado
   * nesse contexto — foi o que cortou a lateral esquerda da nota do cliente.
   * Aqui ela é clonada para um palco solto no corpo da página, com largura
   * fixa, sem transform, sem rolagem e sem altura máxima.
   */
  montarPalcoDeExportacao(nota) {
    const palco = document.createElement('div');
    palco.className = 'pdf-export-stage';

    const copia = nota.cloneNode(true);
    palco.appendChild(copia);
    document.body.appendChild(palco);

    return {
      alvo: copia,
      desmontar: () => palco.remove()
    };
  }

  /** Compartilha no Android quando dá; se não, baixa o arquivo. */
  async entregarPDF(blob, nomeArquivo) {
    const arquivo = new File([blob], nomeArquivo, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      try {
        await navigator.share({
          files: [arquivo],
          title: 'Nota de Serviço',
          text: 'Segue a nota de serviço.'
        });
        return;
      } catch (e) {
        // Cancelou o menu de compartilhar: não é erro, só cai no download.
        if (e && e.name === 'AbortError') return;
      }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    window.app.showToast('PDF salvo em Downloads.', 'success');
  }

  renderCatalog() {
    const container = document.getElementById('calc-catalog-items');
    if (!container) return;

    const settings = window.storageManager.getSettings();
    const prices = settings.defaultPrices || [];

    container.innerHTML = prices.map(item => {
      const qty = this.selectedItems[item.id] || 0;
      return `
        <div class="calc-item-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-app); border-radius: var(--radius-md); margin-bottom: 10px; border: 1px solid var(--border-color);">
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 0.95rem;">${item.name}</div>
            <div style="font-size: 0.85rem; color: var(--primary); font-weight: 800;">R$ ${item.price.toFixed(2).replace('.', ',')} / un</div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <button type="button" class="btn btn-outline btn-icon" style="width: 32px; height: 32px;" onclick="window.quotesController.changeItemQty(${item.id}, -1)">
              <i class="fa-solid fa-minus"></i>
            </button>
            <span id="qty-item-${item.id}" style="font-size: 1rem; font-weight: 800; min-width: 24px; text-align: center;">${qty}</span>
            <button type="button" class="btn btn-outline btn-icon" style="width: 32px; height: 32px;" onclick="window.quotesController.changeItemQty(${item.id}, 1)">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.updateTotal();
  }

  changeItemQty(itemId, delta) {
    const current = this.selectedItems[itemId] || 0;
    const updated = Math.max(0, current + delta);
    if (updated === 0) {
      delete this.selectedItems[itemId];
    } else {
      this.selectedItems[itemId] = updated;
    }

    const qtySpan = document.getElementById(`qty-item-${itemId}`);
    if (qtySpan) qtySpan.textContent = updated;

    this.updateTotal();
  }

  calculateSummary() {
    const settings = window.storageManager.getSettings();
    const prices = settings.defaultPrices || [];
    let itemsSubtotal = 0;
    const itemList = [];

    for (const [idStr, qty] of Object.entries(this.selectedItems)) {
      if (qty > 0) {
        const item = prices.find(p => p.id === parseInt(idStr));
        if (item) {
          const itemTotal = item.price * qty;
          itemsSubtotal += itemTotal;
          itemList.push({
            name: item.name,
            qty,
            unitPrice: item.price,
            totalPrice: itemTotal
          });
        }
      }
    }

    // O cliente paga os itens menos o desconto. O material sai do lucro do montador.
    const total = Math.max(0, itemsSubtotal - this.discount);
    const profit = total - this.materialCost;

    return {
      items: itemList,
      subtotal: itemsSubtotal,
      materialCost: this.materialCost,
      discount: this.discount,
      total,
      profit
    };
  }

  updateTotal() {
    const summary = this.calculateSummary();

    const subtotalEl = document.getElementById('calc-subtotal-val');
    const totalEl = document.getElementById('calc-total-val');
    const previewEl = document.getElementById('calc-preview-text');

    const costEl = document.getElementById('calc-cost-val');
    const profitEl = document.getElementById('calc-profit-val');

    if (subtotalEl) subtotalEl.textContent = Utils.formatBRL(summary.subtotal);
    if (totalEl) totalEl.textContent = Utils.formatBRL(summary.total);
    if (costEl) costEl.textContent = Utils.formatBRL(summary.materialCost);
    if (profitEl) {
      profitEl.textContent = Utils.formatBRL(summary.profit);
      profitEl.classList.toggle('is-negative', summary.profit < 0);
    }

    if (previewEl) {
      previewEl.value = this.generateWhatsAppMessage(summary);
    }
  }

  generateWhatsAppMessage(summary) {
    const settings = window.storageManager.getSettings();
    const clientName = document.getElementById('calc-client-name')?.value.trim() || 'Cliente';

    let msg = `🛠️ *ORÇAMENTO DE MONTAGEM DE MÓVEIS*\n`;
    msg += `*Profissional:* ${settings.companyName || 'RS Montagens'}\n`;
    msg += `*Cliente:* ${clientName}\n`;
    msg += `------------------------------------\n`;
    msg += `📋 *ITENS:* \n`;

    if (summary.items.length === 0) {
      msg += `• Serviços sob consulta / regulagem\n`;
    } else {
      summary.items.forEach(it => {
        msg += `• ${it.qty}x ${it.name} - R$ ${it.totalPrice.toFixed(2).replace('.', ',')}\n`;
      });
    }

    msg += `------------------------------------\n`;
    if (summary.discount > 0) {
      msg += `🏷️ *Desconto Especial:* - R$ ${summary.discount.toFixed(2).replace('.', ',')}\n`;
    }
    msg += `💰 *VALOR TOTAL:* R$ ${summary.total.toFixed(2).replace('.', ',')}\n`;
    msg += `💳 *Formas de Pagamento:* PIX, Dinheiro, Cartão\n`;
    if (settings.pixKey) {
      msg += `🔑 *Chave PIX:* ${settings.pixKey} (${settings.pixType || 'Chave'})\n`;
      if (settings.bankName) msg += `🏦 *Banco:* ${settings.bankName}\n`;
      if (settings.pixHolder) msg += `👤 *Titular:* ${settings.pixHolder}\n`;
    }
    msg += `------------------------------------\n`;
    msg += `⭐ _Montador profissional com ferramentas especializadas e garantia de serviço!_\n`;
    msg += `_Podemos confirmar sua data na agenda?_`;

    return msg;
  }

  copyWhatsAppQuote() {
    const previewEl = document.getElementById('calc-preview-text');
    if (!previewEl) return;

    navigator.clipboard.writeText(previewEl.value).then(() => {
      window.app.showToast('Orçamento copiado para a área de transferência!', 'success');
    }).catch(() => {
      window.app.showToast('Selecione e copie o texto manualmente.', 'warning');
    });
  }

  sendWhatsAppQuote() {
    const clientPhone = document.getElementById('calc-client-phone')?.value.replace(/\D/g, '') || '';
    const previewEl = document.getElementById('calc-preview-text');
    if (!previewEl) return;

    const encoded = encodeURIComponent(previewEl.value);
    const url = clientPhone ? `https://wa.me/55${clientPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  }

  convertQuoteToService() {
    const summary = this.calculateSummary();
    if (summary.total <= 0 && summary.items.length === 0) {
      window.app.showToast('Selecione ao menos um item ou defina um valor.', 'danger');
      return;
    }

    const clientName = document.getElementById('calc-client-name')?.value.trim() || '';
    const clientPhone = document.getElementById('calc-client-phone')?.value.trim() || '';
    const clientAddress = document.getElementById('calc-client-address')?.value.trim() || '';

    const description = summary.items.map(it => `${it.qty}x ${it.name}`).join(' + ') || 'Montagem de Móveis';

    window.servicesController.openNewServiceModal();

    // O modal já está montado; preencher direto evita o race do setTimeout
    if (clientName) document.getElementById('service-client-name').value = clientName;
    if (clientPhone) document.getElementById('service-phone').value = clientPhone;
    if (clientAddress) document.getElementById('service-address').value = clientAddress;
    document.getElementById('service-description').value = description;
    document.getElementById('service-type').value = 'Montagem';
    document.getElementById('service-value').value = summary.total;
    document.getElementById('service-cost').value = summary.materialCost;
    window.servicesController.highlightTypeChip('Montagem');
    window.servicesController.updateProfitPreview();
  }

  generateReceiptFromService(serviceId) {
    const services = window.storageManager.getServices();
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const settings = window.storageManager.getSettings();
    const modalBody = document.getElementById('receipt-modal-body');
    if (!modalBody) return;

    // O botão "Enviar nota" do rodapé precisa saber de quem é esta nota.
    this.currentReceiptContext = { type: 'service', id: serviceId };

    const esc = (v) => Utils.escapeHtml(v);
    const travelFee = Utils.toNumber(service.travelFee);
    const total = Utils.serviceTotal(service);

    modalBody.innerHTML = `
      <div class="printable-receipt">
        <div class="receipt-header">
          ${settings.logo ? `<img src="${esc(settings.logo)}" alt="Logo" class="receipt-logo">` : ''}
          <h2>${esc(settings.companyName || 'RS Montagens')}</h2>
          <p>${esc(settings.profession || 'Montador de Móveis')}</p>
          ${settings.cnpj ? `<p>CNPJ/MEI: ${esc(settings.cnpj)}</p>` : ''}
          ${settings.phone ? `<p>WhatsApp: ${esc(settings.phone)}</p>` : ''}
          ${settings.address ? `<p>${esc(settings.address)}${settings.city ? ' &mdash; ' + esc(settings.city) : ''}</p>` : ''}
          <div class="receipt-doc-title">NOTA DE PRESTAÇÃO DE SERVIÇOS</div>
        </div>

        <div class="receipt-block">
          <p><strong>Cliente:</strong> ${esc(service.clientName)}</p>
          ${service.clientPhone ? `<p><strong>Telefone:</strong> ${esc(service.clientPhone)}</p>` : ''}
          <p><strong>Endereço:</strong> ${esc(service.clientAddress || 'Local do cliente')}</p>
          <p><strong>Data de execução:</strong> ${Utils.formatDateBR(service.date)} às ${esc(service.time)}</p>
          ${service.assemblerName ? `<p><strong>Montador responsável:</strong> ${esc(service.assemblerName)}</p>` : ''}
        </div>

        <table class="receipt-table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th style="text-align: right;">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${esc(service.serviceType || 'Montagem')} &mdash; ${esc(service.description)}</td>
              <td style="text-align: right;">${Utils.formatBRL(service.value)}</td>
            </tr>
            ${travelFee > 0 ? `
              <tr>
                <td>Deslocamento</td>
                <td style="text-align: right;">${Utils.formatBRL(travelFee)}</td>
              </tr>` : ''}
          </tbody>
          <tfoot>
            <tr>
              <td style="text-align: right;"><strong>TOTAL</strong></td>
              <td style="text-align: right;"><strong>${Utils.formatBRL(total)}</strong></td>
            </tr>
          </tfoot>
        </table>

        ${service.notes ? `
          <div class="receipt-block">
            <p><strong>Observações:</strong> ${esc(service.notes)}</p>
          </div>` : ''}

        <div class="receipt-block">
          <p><strong>Forma de pagamento:</strong> ${esc(service.paymentMethod || 'PIX')} (${service.paymentStatus === 'pago' ? 'Quitado' : 'Pendente'})</p>
        </div>

        ${settings.pixKey ? `
          <div class="receipt-block receipt-pix">
            <p><strong>Dados para pagamento via PIX</strong></p>
            <p>Chave (${esc(settings.pixType || 'Chave')}): ${esc(settings.pixKey)}</p>
            ${settings.bankName ? `<p>Banco: ${esc(settings.bankName)}</p>` : ''}
            ${settings.pixHolder ? `<p>Titular: ${esc(settings.pixHolder)}</p>` : ''}
          </div>` : ''}

        <div class="receipt-signatures">
          <div>
            ${esc(service.clientName)}<br><span>Cliente</span>
          </div>
          <div>
            ${esc(settings.montadorName || 'Montador Responsável')}<br><span>${esc(settings.companyName || 'RS Montagens')}</span>
          </div>
        </div>
      </div>
    `;

    window.app.openModal('receipt-modal');
  }

  /**
   * Botão "Enviar nota" do rodapé do modal: manda a nota aberta
   * direto para o cliente ou para a loja, conforme o contexto.
   */
  sendCurrentReceipt() {
    const ctx = this.currentReceiptContext;
    if (!ctx) {
      window.app.showToast('Abra uma nota antes de enviar.', 'warning');
      return;
    }

    if (ctx.type === 'store') {
      window.storesController.sendInvoiceToStore(ctx.id);
    } else {
      window.servicesController.sendReceiptToClient(ctx.id);
    }
  }
}

window.quotesController = new QuotesController();
