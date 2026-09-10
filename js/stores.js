/* ==========================================================================
   MOVELPRO - LOJAS PARCEIRAS
   Cadastro das lojas que repassam montagens, agrupamento dos serviços por loja
   e emissão da nota única somando todos os itens do período.
   ========================================================================== */

class StoresController {
  constructor() {
    this.currentEditingId = null;
    this.selectedStoreId = null;
    this.periodFilter = 'all'; // 'month' | 'year' | 'all'
  }

  init() {
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    const newBtn = document.getElementById('btn-new-store');
    if (newBtn) {
      newBtn.addEventListener('click', () => this.openStoreModal());
    }

    const form = document.getElementById('store-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    const periodPills = document.querySelectorAll('[data-store-period]');
    periodPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        periodPills.forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.periodFilter = e.currentTarget.dataset.storePeriod;
        this.render();
      });
    });
  }

  /** Serviços de uma loja dentro do período selecionado, do mais novo ao mais antigo. */
  getStoreServices(storeId) {
    const monthPrefix = Utils.currentMonthPrefix();
    const yearPrefix = String(new Date().getFullYear());

    // Índice pronto por loja: antes cada uma das lojas varria a lista inteira
    // de serviços dentro do laço que desenha a tela.
    return window.storageManager.servicesOf('storeId', storeId)
      .filter(s => s.status !== 'cancelado')
      .filter(s => {
        const date = s.date || '';
        if (this.periodFilter === 'month') return date.startsWith(monthPrefix);
        if (this.periodFilter === 'year') return date.startsWith(yearPrefix);
        return true;
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  /** Totais da loja no período: quanto foi feito, quanto já entrou e quanto falta. */
  summarize(services) {
    let total = 0;
    let pago = 0;
    let pendente = 0;
    let concluidos = 0;

    services.forEach(s => {
      const value = Utils.serviceTotal(s);
      total += value;
      if (s.paymentStatus === 'pago') {
        pago += value;
      } else {
        pendente += value;
      }
      if (s.status === 'concluido') concluidos++;
    });

    return { total, pago, pendente, concluidos, count: services.length };
  }

  openStoreModal(storeId = null) {
    this.currentEditingId = storeId;
    const form = document.getElementById('store-form');
    if (form) form.reset();

    const title = document.getElementById('store-modal-title');

    if (storeId) {
      if (title) title.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Loja Parceira';
      const store = window.storageManager.getStores().find(s => s.id === storeId);
      if (store) {
        document.getElementById('store-name').value = store.name || '';
        document.getElementById('store-contact').value = store.contactName || '';
        document.getElementById('store-phone').value = store.phone || '';
        document.getElementById('store-cnpj').value = store.cnpj || '';
        document.getElementById('store-address').value = store.address || '';
        document.getElementById('store-notes').value = store.notes || '';
      }
    } else if (title) {
      title.innerHTML = '<i class="fa-solid fa-store"></i> Nova Loja Parceira';
    }

    window.app.openModal('store-modal');
  }

  handleFormSubmit() {
    const name = document.getElementById('store-name').value.trim();
    const contactName = document.getElementById('store-contact').value.trim();
    const phone = document.getElementById('store-phone').value.trim();
    const cnpj = document.getElementById('store-cnpj').value.trim();
    const address = document.getElementById('store-address').value.trim();
    const notes = document.getElementById('store-notes').value.trim();

    if (!name) {
      window.app.showToast('Informe o nome da loja.', 'danger');
      return;
    }

    const stores = window.storageManager.getStores();

    if (this.currentEditingId) {
      const idx = stores.findIndex(s => s.id === this.currentEditingId);
      if (idx !== -1) {
        stores[idx] = { ...stores[idx], name, contactName, phone, cnpj, address, notes };
        window.storageManager.saveStores(stores);
        window.app.showToast('Loja atualizada com sucesso!', 'success');
      }
    } else {
      stores.push({
        id: 'st_' + Date.now(),
        name, contactName, phone, cnpj, address, notes,
        createdAt: new Date().toISOString()
      });
      window.storageManager.saveStores(stores);
      window.app.showToast('Loja cadastrada com sucesso!', 'success');
    }

    window.app.closeModal('store-modal');
    this.render();
  }

  deleteStore(storeId) {
    const services = window.storageManager.getServices().filter(s => s.storeId === storeId);
    const aviso = services.length
      ? `Esta loja tem ${services.length} serviço(s) vinculado(s). Eles continuarão na agenda, mas ficarão sem loja. Excluir mesmo assim?`
      : 'Deseja excluir esta loja parceira?';

    if (!confirm(aviso)) return;

    const stores = window.storageManager.getStores().filter(s => s.id !== storeId);
    window.storageManager.saveStores(stores);

    if (services.length) {
      const all = window.storageManager.getServices();
      all.forEach(s => {
        if (s.storeId === storeId) s.storeId = null;
      });
      window.storageManager.saveServices(all);
    }

    if (this.selectedStoreId === storeId) this.selectedStoreId = null;

    window.app.showToast('Loja removida.', 'warning');
    this.render();
    window.app.updateAllViews();
  }

  selectStore(storeId) {
    this.selectedStoreId = this.selectedStoreId === storeId ? null : storeId;
    this.render();
  }

  render() {
    this.renderList();
    this.renderDetail();
  }

  renderList() {
    const container = document.getElementById('stores-list-container');
    if (!container) return;

    const stores = window.storageManager.getStores();

    if (stores.length === 0) {
      container.innerHTML = `
        <div class="empty-day-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-store-slash"></i>
          <p>Nenhuma loja parceira cadastrada ainda.</p>
          <button class="btn btn-primary btn-sm" onclick="window.storesController.openStoreModal()">
            <i class="fa-solid fa-plus"></i> Cadastrar Primeira Loja
          </button>
        </div>
      `;
      return;
    }

    const esc = (v) => Utils.escapeHtml(v);

    container.innerHTML = stores.map(store => {
      const idArg = Utils.escapeJsString(store.id);
      const services = this.getStoreServices(store.id);
      const stats = this.summarize(services);
      const isSelected = this.selectedStoreId === store.id;

      return `
        <div class="stat-card store-card ${isSelected ? 'is-selected' : ''}">
          <div class="store-card-head">
            <button class="store-open-btn" onclick="window.storesController.selectStore('${idArg}')" title="Ver montagens desta loja">
              <div class="store-avatar"><i class="fa-solid fa-store"></i></div>
              <div class="store-open-text">
                <h4 title="${esc(store.name)}">${esc(store.name)}</h4>
                <span>${esc(store.contactName || store.phone || 'Sem contato')}</span>
              </div>
            </button>
            <div class="store-card-actions">
              ${Utils.cleanPhone(store.phone) ? `
                <a href="${Utils.whatsappUrl(store.phone, `Olá! Aqui é da ${esc(window.storageManager.getSettings().companyName || 'RS Montagens')}.`)}"
                   target="_blank" rel="noopener" class="btn btn-whatsapp btn-icon" style="width: 34px; height: 34px;" title="WhatsApp da loja">
                  <i class="fa-brands fa-whatsapp"></i>
                </a>` : ''}
              <button class="btn btn-outline btn-icon" style="width: 34px; height: 34px;" onclick="window.storesController.openStoreModal('${idArg}')" title="Editar">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn btn-outline btn-icon" style="width: 34px; height: 34px;" onclick="window.storesController.deleteStore('${idArg}')" title="Excluir">
                <i class="fa-solid fa-trash" style="color: var(--danger);"></i>
              </button>
            </div>
          </div>

          ${store.address ? `
            <p class="store-address">
              <i class="fa-solid fa-location-dot"></i>
              <a href="${Utils.mapsUrl(store.address)}" target="_blank" rel="noopener">${esc(store.address)}</a>
            </p>` : ''}

          <div class="store-card-footer">
            <div>
              <span class="store-metric-label">Total no período</span>
              <div class="store-metric-value">${Utils.formatBRL(stats.total)}</div>
              <span class="store-metric-hint">${stats.count} montagem${stats.count === 1 ? '' : 's'} &bull; ${Utils.formatBRL(stats.pendente)} a receber</span>
            </div>
            <button class="btn btn-primary btn-sm" onclick="window.storesController.selectStore('${idArg}')">
              <i class="fa-solid fa-list-check"></i> ${isSelected ? 'Fechar' : 'Abrir'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderDetail() {
    const panel = document.getElementById('store-detail-panel');
    if (!panel) return;

    if (!this.selectedStoreId) {
      panel.innerHTML = '';
      return;
    }

    const store = window.storageManager.getStores().find(s => s.id === this.selectedStoreId);
    if (!store) {
      panel.innerHTML = '';
      return;
    }

    const esc = (v) => Utils.escapeHtml(v);
    const idArg = Utils.escapeJsString(store.id);
    const services = this.getStoreServices(store.id);
    const stats = this.summarize(services);

    panel.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-file-invoice-dollar"></i> Montagens de ${esc(store.name)}</h3>
          <div class="detail-actions" style="margin: 0;">
            <button class="btn btn-primary btn-sm" onclick="window.storesController.openConsolidatedInvoice('${idArg}')" ${services.length ? '' : 'disabled'}>
              <i class="fa-solid fa-receipt"></i> Gerar nota única
            </button>
            <button class="btn btn-whatsapp btn-sm" onclick="window.storesController.sendInvoiceToStore('${idArg}')" ${services.length && Utils.cleanPhone(store.phone) ? '' : 'disabled'}>
              <i class="fa-brands fa-whatsapp"></i> Enviar nota à loja
            </button>
          </div>
        </div>

        <div class="grid-4" style="margin-bottom: 20px;">
          <div class="stat-card">
            <span class="stat-title">Total do período</span>
            <div class="stat-value">${Utils.formatBRL(stats.total)}</div>
          </div>
          <div class="stat-card">
            <span class="stat-title">Já recebido</span>
            <div class="stat-value" style="color: var(--success-dark);">${Utils.formatBRL(stats.pago)}</div>
          </div>
          <div class="stat-card">
            <span class="stat-title">A receber</span>
            <div class="stat-value" style="color: var(--primary);">${Utils.formatBRL(stats.pendente)}</div>
          </div>
          <div class="stat-card">
            <span class="stat-title">Montagens</span>
            <div class="stat-value">${stats.count}</div>
          </div>
        </div>

        ${services.length === 0 ? `
          <div class="empty-day-state">
            <i class="fa-regular fa-folder-open"></i>
            <p>Nenhuma montagem desta loja no período selecionado.</p>
          </div>
        ` : `
          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Montador</th>
                  <th>Status</th>
                  <th style="text-align: right;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${services.map(s => `
                  <tr class="clickable-row" onclick="window.servicesController.openServiceDetailModal('${Utils.escapeJsString(s.id)}')">
                    <td><strong>${Utils.formatDateBR(s.date)}</strong></td>
                    <td>${esc(s.clientName)}</td>
                    <td>
                      <span class="type-tag">${esc(s.serviceType || 'Montagem')}</span>
                      <div class="table-subtext">${esc(s.description)}</div>
                    </td>
                    <td>${esc(s.assemblerName || '—')}</td>
                    <td>
                      <span class="badge ${s.status === 'concluido' ? 'badge-concluido' : 'badge-agendado'}">
                        ${s.status === 'concluido' ? 'Concluído' : 'Agendado'}
                      </span>
                    </td>
                    <td style="text-align: right; font-weight: 800;">${Utils.formatBRL(Utils.serviceTotal(s))}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="5" style="text-align: right; font-weight: 800;">TOTAL DA NOTA</td>
                  <td style="text-align: right; font-weight: 800; font-size: 1.05rem; color: var(--primary);">
                    ${Utils.formatBRL(stats.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        `}
      </div>
    `;
  }

  /** Rótulo legível do período em uso, para o cabeçalho da nota. */
  periodLabel() {
    if (this.periodFilter === 'month') {
      const now = new Date();
      return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    }
    if (this.periodFilter === 'year') return String(new Date().getFullYear());
    return 'Todo o período';
  }

  /**
   * Nota única da loja: soma todos os serviços do período em um documento só,
   * pronto para imprimir ou salvar em PDF.
   */
  openConsolidatedInvoice(storeId) {
    const store = window.storageManager.getStores().find(s => s.id === storeId);
    if (!store) return;

    const services = this.getStoreServices(storeId);
    if (services.length === 0) {
      window.app.showToast('Nenhuma montagem desta loja no período.', 'warning');
      return;
    }

    const settings = window.storageManager.getSettings();
    const stats = this.summarize(services);
    const esc = (v) => Utils.escapeHtml(v);
    const modalBody = document.getElementById('receipt-modal-body');
    if (!modalBody) return;

    // A nota da loja é enviada para a loja, não para um cliente final.
    window.quotesController.currentReceiptContext = { type: 'store', id: storeId };

    modalBody.innerHTML = `
      <div class="printable-receipt">
        <div class="receipt-header">
          ${settings.logo ? `<img src="${esc(settings.logo)}" alt="Logo" class="receipt-logo">` : ''}
          <h2>${esc(settings.companyName || 'RS Montagens')}</h2>
          <p>${esc(settings.profession || 'Montador de Móveis')}</p>
          ${settings.cnpj ? `<p>CNPJ/MEI: ${esc(settings.cnpj)}</p>` : ''}
          ${settings.phone ? `<p>WhatsApp: ${esc(settings.phone)}</p>` : ''}
          <div class="receipt-doc-title">NOTA DE SERVIÇOS &mdash; LOJA PARCEIRA</div>
        </div>

        <div class="receipt-block">
          <p><strong>Loja:</strong> ${esc(store.name)}</p>
          ${store.cnpj ? `<p><strong>CNPJ:</strong> ${esc(store.cnpj)}</p>` : ''}
          ${store.address ? `<p><strong>Endereço:</strong> ${esc(store.address)}</p>` : ''}
          <p><strong>Período:</strong> ${esc(this.periodLabel())}</p>
          <p><strong>Emitida em:</strong> ${Utils.formatDateBR(Utils.todayISO())}</p>
        </div>

        <table class="receipt-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Serviço realizado</th>
              <th style="text-align: right;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${services.map(s => `
              <tr>
                <td>${Utils.formatDateBR(s.date)}</td>
                <td>${esc(s.clientName)}</td>
                <td>${esc(s.serviceType || 'Montagem')} &mdash; ${esc(s.description)}</td>
                <td style="text-align: right;">${Utils.formatBRL(Utils.serviceTotal(s))}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align: right;"><strong>TOTAL (${stats.count} serviço${stats.count === 1 ? '' : 's'})</strong></td>
              <td style="text-align: right;"><strong>${Utils.formatBRL(stats.total)}</strong></td>
            </tr>
          </tfoot>
        </table>

        ${settings.pixKey ? `
          <div class="receipt-block receipt-pix">
            <p><strong>Dados para pagamento via PIX</strong></p>
            <p>Chave (${esc(settings.pixType || 'Chave')}): ${esc(settings.pixKey)}</p>
            ${settings.bankName ? `<p>Banco: ${esc(settings.bankName)}</p>` : ''}
            ${settings.pixHolder ? `<p>Titular: ${esc(settings.pixHolder)}</p>` : ''}
          </div>` : ''}

        <div class="receipt-signatures">
          <div>
            ${esc(store.name)}<br><span>Loja parceira</span>
          </div>
          <div>
            ${esc(settings.montadorName || 'Montador Responsável')}<br><span>${esc(settings.companyName || 'RS Montagens')}</span>
          </div>
        </div>
      </div>
    `;

    window.app.openModal('receipt-modal');
  }

  /** Nota consolidada em texto, aberta direto na conversa da loja. */
  sendInvoiceToStore(storeId) {
    const store = window.storageManager.getStores().find(s => s.id === storeId);
    if (!store) return;

    if (!Utils.cleanPhone(store.phone)) {
      window.app.showToast('Cadastre o WhatsApp da loja para enviar a nota.', 'warning');
      return;
    }

    const services = this.getStoreServices(storeId);
    if (services.length === 0) {
      window.app.showToast('Nenhuma montagem desta loja no período.', 'warning');
      return;
    }

    const settings = window.storageManager.getSettings();
    const stats = this.summarize(services);
    const empresa = settings.companyName || 'RS Montagens';

    let msg = `*NOTA DE SERVIÇOS*\n${empresa}\n`;
    if (settings.cnpj) msg += `CNPJ/MEI: ${settings.cnpj}\n`;
    msg += `------------------------------------\n`;
    msg += `*Loja:* ${store.name}\n`;
    msg += `*Período:* ${this.periodLabel()}\n`;
    msg += `------------------------------------\n`;

    services.forEach(s => {
      msg += `• ${Utils.formatDateBR(s.date)} — ${s.clientName}\n`;
      msg += `  ${s.serviceType || 'Montagem'}: ${s.description}\n`;
      msg += `  ${Utils.formatBRL(Utils.serviceTotal(s))}\n`;
    });

    msg += `------------------------------------\n`;
    msg += `*TOTAL (${stats.count} serviço${stats.count === 1 ? '' : 's'}): ${Utils.formatBRL(stats.total)}*\n`;

    if (settings.pixKey) {
      msg += `\nDados para pagamento via PIX:\n`;
      msg += `• Chave: ${settings.pixKey}\n`;
      if (settings.bankName) msg += `• Banco: ${settings.bankName}\n`;
      if (settings.pixHolder) msg += `• Titular: ${settings.pixHolder}\n`;
    }

    msg += `\nObrigado pela parceria! — ${empresa}`;

    window.open(Utils.whatsappUrl(store.phone, msg), '_blank');
    window.app.showToast('Nota da loja aberta no WhatsApp.', 'success');
  }
}

window.storesController = new StoresController();
