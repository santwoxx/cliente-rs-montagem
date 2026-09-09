/* ==========================================================================
   MOVELPRO - SERVICES CONTROLLER
   CRUD for assemblies, status workflow & financial integration
   ========================================================================== */

class ServicesController {
  constructor() {
    this.currentEditingId = null;
  }

  init() {
    this.bindModalEvents();
  }

  bindModalEvents() {
    const form = document.getElementById('service-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // Prévia do lucro líquido em tempo real (valor - gastos com material)
    ['service-value', 'service-cost'].forEach(id => {
      const input = document.getElementById(id);
      if (input) input.addEventListener('input', () => this.updateProfitPreview());
    });

    // Client select auto-filling address & phone
    const clientSelect = document.getElementById('service-client-select');
    if (clientSelect) {
      clientSelect.addEventListener('change', (e) => {
        const clientId = e.target.value;
        if (!clientId) return;
        const customers = window.storageManager.getCustomers();
        const client = customers.find(c => c.id === clientId);
        if (client) {
          const phoneInput = document.getElementById('service-phone');
          const addressInput = document.getElementById('service-address');
          if (phoneInput) phoneInput.value = client.phone || '';
          if (addressInput) addressInput.value = `${client.address || ''} ${client.complement || ''} - ${client.neighborhood || ''}, ${client.city || ''}`.trim();
        }
      });
    }
  }

  updateProfitPreview() {
    const el = document.getElementById('service-profit-preview');
    if (!el) return;

    const value = Utils.toNumber(document.getElementById('service-value')?.value);
    const cost = Utils.toNumber(document.getElementById('service-cost')?.value);
    const profit = value - cost;

    el.textContent = Utils.formatBRL(profit);
    el.classList.toggle('is-negative', profit < 0);
  }

  openNewServiceModal(defaultDate = null) {
    this.currentEditingId = null;
    const form = document.getElementById('service-form');
    if (form) form.reset();

    const modalTitle = document.getElementById('service-modal-title');
    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Novo Agendamento de Montagem';

    // Populate clients dropdown
    this.populateClientSelect();

    // Set default date if passed
    const dateInput = document.getElementById('service-date');
    if (dateInput) {
      dateInput.value = defaultDate || window.calendarController.selectedDate || new Date().toISOString().slice(0, 10);
    }

    const timeInput = document.getElementById('service-time');
    if (timeInput && !timeInput.value) {
      timeInput.value = '10:00';
    }

    const costInput = document.getElementById('service-cost');
    if (costInput) costInput.value = '0';
    this.updateProfitPreview();

    window.app.openModal('service-modal');
  }

  populateClientSelect(selectedClientId = null) {
    const select = document.getElementById('service-client-select');
    if (!select) return;
    const customers = window.storageManager.getCustomers();

    select.innerHTML = '<option value="">-- Selecione ou digite abaixo --</option>';
    customers.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.phone || 'Sem telefone'})`;
      if (selectedClientId && selectedClientId === c.id) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  }

  handleFormSubmit() {
    const clientSelect = document.getElementById('service-client-select');
    const customClientName = document.getElementById('service-client-name').value.trim();
    const phone = document.getElementById('service-phone').value.trim();
    const address = document.getElementById('service-address').value.trim();
    const date = document.getElementById('service-date').value;
    const time = document.getElementById('service-time').value || '09:00';
    const description = document.getElementById('service-description').value.trim();
    const value = Utils.toNumber(document.getElementById('service-value').value);
    const cost = Utils.toNumber(document.getElementById('service-cost').value);
    const paymentMethod = document.getElementById('service-payment-method').value;
    const status = document.getElementById('service-status').value;
    const paymentStatus = document.getElementById('service-payment-status').value;
    const notes = document.getElementById('service-notes').value.trim();

    let clientName = customClientName;
    let clientId = clientSelect.value || null;

    if (clientId && !customClientName) {
      const customers = window.storageManager.getCustomers();
      const found = customers.find(c => c.id === clientId);
      if (found) clientName = found.name;
    }

    if (!clientName) {
      window.app.showToast('Por favor, informe o nome do cliente.', 'danger');
      return;
    }

    if (!description) {
      window.app.showToast('Por favor, informe a descrição do serviço.', 'danger');
      return;
    }

    if (!date) {
      window.app.showToast('Por favor, informe a data.', 'danger');
      return;
    }

    const services = window.storageManager.getServices();

    if (this.currentEditingId) {
      // Update existing
      const index = services.findIndex(s => s.id === this.currentEditingId);
      if (index !== -1) {
        services[index] = {
          ...services[index],
          clientId,
          clientName,
          clientPhone: phone,
          clientAddress: address,
          date,
          time,
          description,
          value,
          cost,
          paymentMethod,
          status,
          paymentStatus,
          notes
        };
        window.storageManager.saveServices(services);

        // Mantem o financeiro em sincronia com o que foi editado
        if (services[index].status === 'concluido') {
          this.recordIncomeTransaction(services[index]);
        }
        this.recordMaterialExpense(services[index]);

        window.app.showToast('Serviço atualizado com sucesso!', 'success');
      }
    } else {
      // New service
      const newService = {
        id: 's_' + Date.now(),
        clientId,
        clientName,
        clientPhone: phone,
        clientAddress: address,
        date,
        time,
        description,
        value,
        cost,
        status,
        paymentStatus,
        paymentMethod,
        notes,
        createdAt: new Date().toISOString()
      };

      services.push(newService);
      window.storageManager.saveServices(services);

      // If already marked as concluído and pago, create transaction automatically
      if (status === 'concluido' && paymentStatus === 'pago' && value > 0) {
        this.recordIncomeTransaction(newService);
        this.recordMaterialExpense(newService);
      }

      window.app.showToast('Novo serviço agendado com sucesso!', 'success');
    }

    window.app.closeModal('service-modal');
    window.calendarController.render();
    window.calendarController.renderDayServices(date);
    window.app.updateAllViews();
  }

  toggleServiceStatus(serviceId) {
    const services = window.storageManager.getServices();
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    if (service.status === 'concluido') {
      service.status = 'agendado';
      service.paymentStatus = 'pendente';
      window.app.showToast('Serviço reaberto como agendado.', 'warning');
    } else {
      service.status = 'concluido';
      service.paymentStatus = 'pago';
      // Record transaction if not already existing
      this.recordIncomeTransaction(service);
      this.recordMaterialExpense(service);
      window.app.showToast('Parabéns! Montagem concluída e pagamento registrado.', 'success');
    }

    window.storageManager.saveServices(services);
    window.calendarController.render();
    window.calendarController.renderDayServices(service.date);
    window.app.updateAllViews();
  }

  recordIncomeTransaction(service) {
    const transactions = window.storageManager.getTransactions();
    // Check if transaction already exists for this service
    const existing = transactions.find(t => t.serviceId === service.id);
    if (existing) {
      existing.value = service.value;
      existing.status = 'pago';
      existing.date = service.date;
      window.storageManager.saveTransactions(transactions);
      return;
    }

    const newTx = {
      id: 'tx_' + Date.now(),
      type: 'receita',
      category: 'Montagem de Móveis',
      description: `Montagem: ${service.description} (${service.clientName})`,
      value: service.value,
      date: service.date,
      paymentMethod: service.paymentMethod || 'PIX',
      status: 'pago',
      serviceId: service.id,
      createdAt: new Date().toISOString()
    };

    transactions.push(newTx);
    window.storageManager.saveTransactions(transactions);
  }

  /**
   * Lança (ou atualiza) a despesa do material gasto no serviço.
   * Assim o lucro líquido do mes já sai descontado no Financeiro.
   * Se o gasto voltar a zero, a despesa antiga é removida.
   */
  recordMaterialExpense(service) {
    const transactions = window.storageManager.getTransactions();
    const cost = Utils.toNumber(service.cost);
    const expenseId = 'mat_' + service.id;
    const index = transactions.findIndex(t => t.id === expenseId);

    if (cost <= 0) {
      if (index !== -1) {
        transactions.splice(index, 1);
        window.storageManager.saveTransactions(transactions);
      }
      return;
    }

    const expense = {
      id: expenseId,
      type: 'despesa',
      category: 'Ferramentas / Ferragens',
      description: `Material: ${service.description} (${service.clientName})`,
      value: cost,
      date: service.date,
      paymentMethod: service.paymentMethod || 'PIX',
      status: 'pago',
      serviceId: service.id,
      createdAt: new Date().toISOString()
    };

    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...expense };
    } else {
      transactions.push(expense);
    }

    window.storageManager.saveTransactions(transactions);
  }

  openServiceDetailModal(serviceId) {
    const services = window.storageManager.getServices();
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const modalBody = document.getElementById('service-detail-body');
    if (!modalBody) return;

    const esc = (v) => Utils.escapeHtml(v);
    const idArg = Utils.escapeJsString(service.id);

    const settings = window.storageManager.getSettings();
    const value = Utils.toNumber(service.value);
    const cost = Utils.toNumber(service.cost);
    const profit = value - cost;

    const address = service.clientAddress || '';
    const phone = Utils.cleanPhone(service.clientPhone);
    const isConcluido = service.status === 'concluido';

    const whatsUrl = Utils.whatsappUrl(
      service.clientPhone,
      `Olá ${service.clientName}, tudo bem? Sou o montador da RS Montagens. Estou em contato a respeito da montagem de "${service.description}".`
    );

    modalBody.innerHTML = `
      <div class="detail-head">
        <h3 class="detail-title">${esc(service.description)}</h3>
        <div class="detail-badges">
          <span class="badge ${isConcluido ? 'badge-concluido' : 'badge-agendado'}">
            ${isConcluido ? 'Concluído' : 'Agendado'}
          </span>
          <span class="badge ${service.paymentStatus === 'pago' ? 'badge-pago' : 'badge-pendente'}">
            ${service.paymentStatus === 'pago' ? 'Pago' : 'Pendente'}
          </span>
        </div>
      </div>

      <div class="money-grid">
        <div class="money-card">
          <div class="money-icon icon-green"><i class="fa-solid fa-dollar-sign"></i></div>
          <span class="money-label">Valor do serviço</span>
          <strong class="money-value">${Utils.formatBRL(value)}</strong>
        </div>
        <div class="money-card">
          <div class="money-icon icon-orange"><i class="fa-solid fa-basket-shopping"></i></div>
          <span class="money-label">Gastos com material</span>
          <strong class="money-value">${Utils.formatBRL(cost)}</strong>
        </div>
        <div class="money-card">
          <span class="money-label">Total (cliente paga)</span>
          <strong class="money-value">${Utils.formatBRL(value)}</strong>
        </div>
        <div class="money-card money-card-primary ${profit < 0 ? 'is-negative' : ''}">
          <div class="money-icon"><i class="fa-solid fa-wallet"></i></div>
          <span class="money-label">Lucro líquido</span>
          <strong class="money-value">${Utils.formatBRL(profit)}</strong>
        </div>
      </div>

      <div class="detail-block">
        <div class="detail-client">
          <div class="client-avatar avatar-orange">${esc((service.clientName || 'C').charAt(0).toUpperCase())}</div>
          <div class="detail-client-info">
            <h4>${esc(service.clientName)}</h4>
            ${phone ? `<a class="detail-link" href="${Utils.telUrl(phone)}"><i class="fa-solid fa-phone"></i> ${esc(service.clientPhone)}</a>` : ''}
            ${address ? `<a class="detail-link" href="${Utils.mapsUrl(address)}" target="_blank" rel="noopener"><i class="fa-solid fa-location-dot"></i> ${esc(address)}</a>` : ''}
          </div>
        </div>
      </div>

      <div class="detail-block detail-rows">
        <div class="detail-row">
          <span><i class="fa-regular fa-calendar"></i> Data</span>
          <strong>${Utils.formatDateBR(service.date)}</strong>
        </div>
        <div class="detail-row">
          <span><i class="fa-regular fa-clock"></i> Hora</span>
          <strong>${esc(service.time)}h</strong>
        </div>
        <div class="detail-row">
          <span><i class="fa-solid fa-money-bill-wave"></i> Pagamento</span>
          <strong>${esc(service.paymentMethod || 'PIX')}</strong>
        </div>
      </div>

      ${service.notes ? `
        <div class="detail-block">
          <span class="detail-section-label"><i class="fa-solid fa-note-sticky"></i> Observações</span>
          <p style="margin-top: 6px;">${esc(service.notes)}</p>
        </div>
      ` : ''}

      <span class="detail-section-label">Mensagens para o cliente</span>
      <div class="msg-list">
        ${phone ? `
          <button class="msg-item" onclick="window.servicesController.sendMessage('${idArg}', 'confirmar')">
            <span class="msg-icon icon-green"><i class="fa-regular fa-comment"></i></span>
            <span class="msg-text">
              <strong>Confirmar agendamento</strong>
              <small>Envia data, hora e tipo do serviço</small>
            </span>
            <i class="fa-solid fa-chevron-right msg-arrow"></i>
          </button>
          <button class="msg-item" onclick="window.servicesController.sendMessage('${idArg}', 'pix')">
            <span class="msg-icon icon-green"><i class="fa-solid fa-money-check-dollar"></i></span>
            <span class="msg-text">
              <strong>Enviar dados do PIX</strong>
              <small>${settings.pixKey ? 'Chave PIX configurada' : 'Cadastre a chave em Ajustes'}</small>
            </span>
            <i class="fa-solid fa-chevron-right msg-arrow"></i>
          </button>
          <button class="msg-item" onclick="window.servicesController.sendMessage('${idArg}', 'avaliacao')">
            <span class="msg-icon icon-orange"><i class="fa-regular fa-star"></i></span>
            <span class="msg-text">
              <strong>Pedir avaliação no Google</strong>
              <small>${settings.reviewLink ? 'Link configurado' : 'Cadastre o link em Ajustes'}</small>
            </span>
            <i class="fa-solid fa-chevron-right msg-arrow"></i>
          </button>
        ` : '<p class="msg-empty">Cadastre o telefone do cliente para enviar mensagens.</p>'}
      </div>

      <span class="detail-section-label">Ações</span>
      <div class="detail-actions">
        ${phone ? `
          <a href="${whatsUrl}" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm">
            <i class="fa-brands fa-whatsapp"></i> WhatsApp
          </a>` : ''}
        ${address ? `
          <a href="${Utils.mapsUrl(address)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
            <i class="fa-solid fa-map-location-dot"></i> Google Maps
          </a>
          <a href="${Utils.wazeUrl(address)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
            <i class="fa-brands fa-waze"></i> Waze
          </a>` : ''}
        <button class="btn btn-primary btn-sm" onclick="window.quotesController.generateReceiptFromService('${idArg}')">
          <i class="fa-solid fa-receipt"></i> Recibo
        </button>
      </div>

      <span class="detail-section-label">Alterar status</span>
      <div class="status-switch">
        <button class="status-option ${!isConcluido ? 'is-active status-agendado' : ''}"
                onclick="window.servicesController.setServiceStatus('${idArg}', 'agendado')">
          <i class="fa-regular fa-circle"></i> Agendado
        </button>
        <button class="status-option ${isConcluido ? 'is-active status-concluido' : ''}"
                onclick="window.servicesController.setServiceStatus('${idArg}', 'concluido')">
          <i class="fa-solid fa-circle-check"></i> Concluído
        </button>
      </div>

      <div class="detail-footer">
        <button class="btn btn-danger btn-sm" onclick="window.servicesController.deleteService('${idArg}')">
          <i class="fa-solid fa-trash"></i> Excluir
        </button>
        <button class="btn btn-outline btn-sm" onclick="window.servicesController.editService('${idArg}')">
          <i class="fa-solid fa-pen-to-square"></i> Editar
        </button>
      </div>
    `;

    window.app.openModal('service-detail-modal');
  }

  /**
   * Monta a mensagem pronta e abre o WhatsApp do cliente.
   * Tipos: 'confirmar' | 'pix' | 'avaliacao'
   */
  sendMessage(serviceId, tipo) {
    const service = window.storageManager.getServices().find(s => s.id === serviceId);
    if (!service) return;

    const settings = window.storageManager.getSettings();
    const empresa = settings.companyName || 'RS Montagens';
    const nome = service.clientName || 'tudo bem';
    let msg = '';

    if (tipo === 'confirmar') {
      msg = `Olá ${nome}! Aqui é da ${empresa}.\n\n`
          + `Confirmando seu agendamento:\n`
          + `📅 Data: ${Utils.formatDateBR(service.date)}\n`
          + `⏰ Horário: ${service.time}h\n`
          + `🛠️ Serviço: ${service.description}\n`
          + `💰 Valor: ${Utils.formatBRL(service.value)}\n\n`
          + `Podemos confirmar?`;

    } else if (tipo === 'pix') {
      if (!settings.pixKey) {
        window.app.showToast('Cadastre sua chave PIX em Ajustes primeiro.', 'warning');
        return;
      }
      msg = `Olá ${nome}! Segue o PIX da ${empresa}:\n\n`
          + `🔑 Chave (${settings.pixType || 'Chave'}): ${settings.pixKey}\n`
          + `💰 Valor: ${Utils.formatBRL(service.value)}\n\n`
          + `Assim que pagar, é só me enviar o comprovante. Obrigado!`;

    } else if (tipo === 'avaliacao') {
      if (!settings.reviewLink) {
        window.app.showToast('Cadastre o link de avaliação do Google em Ajustes.', 'warning');
        return;
      }
      msg = `Olá ${nome}! Espero que tenha gostado do serviço.\n\n`
          + `Se puder deixar uma avaliação, ajuda muito o meu trabalho:\n`
          + `${settings.reviewLink}\n\n`
          + `Muito obrigado! - ${empresa}`;
    }

    window.open(Utils.whatsappUrl(service.clientPhone, msg), '_blank');
  }

  /**
   * Define o status direto pelos botões da ficha do serviço.
   * Concluir lança a receita e, se houver, a despesa do material.
   */
  setServiceStatus(serviceId, status) {
    const services = window.storageManager.getServices();
    const service = services.find(s => s.id === serviceId);
    if (!service || service.status === status) return;

    service.status = status;

    if (status === 'concluido') {
      service.paymentStatus = 'pago';
      this.recordIncomeTransaction(service);
      this.recordMaterialExpense(service);
      window.app.showToast('Montagem concluída e lançada no financeiro.', 'success');
    } else {
      service.paymentStatus = 'pendente';
      window.app.showToast('Serviço reaberto como agendado.', 'warning');
    }

    window.storageManager.saveServices(services);
    window.calendarController.render();
    window.calendarController.renderDayServices(service.date);
    window.app.updateAllViews();
    this.openServiceDetailModal(serviceId);
  }

  editService(serviceId) {
    const services = window.storageManager.getServices();
    const s = services.find(item => item.id === serviceId);
    if (!s) return;

    this.currentEditingId = serviceId;
    window.app.closeModal('service-detail-modal');

    this.populateClientSelect(s.clientId);

    document.getElementById('service-client-name').value = s.clientName || '';
    document.getElementById('service-phone').value = s.clientPhone || '';
    document.getElementById('service-address').value = s.clientAddress || '';
    document.getElementById('service-date').value = s.date || '';
    document.getElementById('service-time').value = s.time || '09:00';
    document.getElementById('service-description').value = s.description || '';
    document.getElementById('service-value').value = s.value || '';
    document.getElementById('service-cost').value = Utils.toNumber(s.cost);
    document.getElementById('service-payment-method').value = s.paymentMethod || 'PIX';
    document.getElementById('service-status').value = s.status || 'agendado';
    document.getElementById('service-payment-status').value = s.paymentStatus || 'pendente';
    document.getElementById('service-notes').value = s.notes || '';

    this.updateProfitPreview();

    const modalTitle = document.getElementById('service-modal-title');
    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Montagem';

    window.app.openModal('service-modal');
  }

  deleteService(serviceId) {
    if (!confirm('Tem certeza que deseja excluir esta montagem da sua agenda?')) return;

    let services = window.storageManager.getServices();
    const service = services.find(s => s.id === serviceId);
    services = services.filter(s => s.id !== serviceId);
    window.storageManager.saveServices(services);

    window.app.closeModal('service-detail-modal');
    window.app.showToast('Serviço excluído com sucesso.', 'warning');
    
    if (service) {
      window.calendarController.render();
      window.calendarController.renderDayServices(service.date);
    }
    window.app.updateAllViews();
  }
}

window.servicesController = new ServicesController();
