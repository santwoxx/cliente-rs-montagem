/* ==========================================================================
   MOVELPRO - QUOTES & RECEIPT GENERATOR
   Pricing calculator, WhatsApp quote builder & printable receipts
   ========================================================================== */

class QuotesController {
  constructor() {
    this.selectedItems = {}; // { id: quantity }
    this.materialCost = 0; // gasto com material: sai do lucro, nao do bolso do cliente
    this.discount = 0;
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
    document.getElementById('service-value').value = summary.total;
    document.getElementById('service-cost').value = summary.materialCost;
    window.servicesController.updateProfitPreview();
  }

  generateReceiptFromService(serviceId) {
    const services = window.storageManager.getServices();
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const settings = window.storageManager.getSettings();
    const modalBody = document.getElementById('receipt-modal-body');
    if (!modalBody) return;

    const esc = (v) => Utils.escapeHtml(v);

    modalBody.innerHTML = `
      <div class="printable-receipt" style="padding: 24px; border: 2px solid var(--border-color); border-radius: var(--radius-md); background: #fff;">
        <div class="receipt-header" style="text-align: center; border-bottom: 2px dashed #CBD5E1; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--primary);">${esc(settings.companyName || 'RS Montagens')}</h2>
          <p style="font-size: 0.9rem; color: var(--text-muted);">${esc(settings.montadorName || 'Montador de Móveis Profissional')}</p>
          <p style="font-size: 0.85rem; color: var(--text-muted);">WhatsApp: ${esc(settings.phone || '')}</p>
          <div style="margin-top: 8px; font-weight: 800; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em;">
            RECIBO DE PRESTAÇÃO DE SERVIÇOS
          </div>
        </div>

        <div style="margin-bottom: 20px; line-height: 1.8;">
          <p>Recebi de <strong>${esc(service.clientName)}</strong> a quantia de <strong style="font-size: 1.15rem; color: var(--success-dark);">${Utils.formatBRL(service.value)}</strong> referente aos serviços de montagem e regulagem descritos abaixo:</p>
        </div>

        <div style="background: #F8FAFC; border: 1px solid var(--border-color); padding: 14px; border-radius: var(--radius-sm); margin-bottom: 20px;">
          <p><strong>Descrição do Serviço:</strong> ${esc(service.description)}</p>
          <p><strong>Data de Execução:</strong> ${Utils.formatDateBR(service.date)}</p>
          <p><strong>Endereço:</strong> ${esc(service.clientAddress || 'Local do cliente')}</p>
          <p><strong>Forma de Pagamento:</strong> ${esc(service.paymentMethod)} (${service.paymentStatus === 'pago' ? 'Quitado' : 'Pendente'})</p>
          ${settings.pixKey ? `<p><strong>Chave PIX:</strong> ${esc(settings.pixKey)}</p>` : ''}
        </div>

        <div style="margin-top: 40px; display: flex; justify-content: space-between;">
          <div style="width: 45%; border-top: 1px solid #94A3B8; text-align: center; padding-top: 8px; font-size: 0.85rem;">
            ${esc(service.clientName)}<br><span style="color: #64748B;">Cliente</span>
          </div>
          <div style="width: 45%; border-top: 1px solid #94A3B8; text-align: center; padding-top: 8px; font-size: 0.85rem;">
            ${esc(settings.montadorName || 'Montador Responsável')}<br><span style="color: #64748B;">RS Montagens</span>
          </div>
        </div>
      </div>
    `;

    window.app.openModal('receipt-modal');
  }
}

window.quotesController = new QuotesController();
