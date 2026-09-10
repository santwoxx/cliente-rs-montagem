/* ==========================================================================
   MOVELPRO - CUSTOMERS CONTROLLER
   Customer management, ViaCEP auto-fill, service history & direct WhatsApp
   ========================================================================== */

class CustomersController {
  constructor() {
    this.currentEditingId = null;
    this.searchQuery = '';
  }

  init() {
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('customer-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.render();
      });
    }

    // Customer form submit
    const custForm = document.getElementById('customer-form');
    if (custForm) {
      custForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // CEP input auto-lookup
    const cepInput = document.getElementById('cust-cep');
    if (cepInput) {
      cepInput.addEventListener('blur', (e) => {
        this.lookupCEP(e.target.value);
      });
    }
  }

  async lookupCEP(cepValue) {
    const cleanCep = (cepValue || '').replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    const cepStatus = document.getElementById('cep-status');
    if (cepStatus) cepStatus.textContent = 'Buscando CEP...';

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        document.getElementById('cust-address').value = data.logradouro || '';
        document.getElementById('cust-neighborhood').value = data.bairro || '';
        document.getElementById('cust-city').value = `${data.localidade} - ${data.uf}`;
        if (cepStatus) cepStatus.textContent = 'CEP preenchido!';
        document.getElementById('cust-complement').focus();
      } else {
        if (cepStatus) cepStatus.textContent = 'CEP não encontrado.';
      }
    } catch (e) {
      if (cepStatus) cepStatus.textContent = 'Erro ao consultar CEP.';
    }
  }

  openCustomerModal(customerId = null) {
    this.currentEditingId = customerId;
    const form = document.getElementById('customer-form');
    if (form) form.reset();

    const title = document.getElementById('cust-modal-title');
    const cepStatus = document.getElementById('cep-status');
    if (cepStatus) cepStatus.textContent = '';

    if (customerId) {
      title.innerHTML = '<i class="fa-solid fa-user-pen"></i> Editar Cliente';
      const customers = window.storageManager.getCustomers();
      const c = customers.find(item => item.id === customerId);
      if (c) {
        document.getElementById('cust-name').value = c.name || '';
        document.getElementById('cust-phone').value = c.phone || '';
        document.getElementById('cust-cep').value = c.cep || '';
        document.getElementById('cust-address').value = c.address || '';
        document.getElementById('cust-complement').value = c.complement || '';
        document.getElementById('cust-neighborhood').value = c.neighborhood || '';
        document.getElementById('cust-city').value = c.city || '';
        document.getElementById('cust-notes').value = c.notes || '';
      }
    } else {
      title.innerHTML = '<i class="fa-solid fa-user-plus"></i> Novo Cliente';
    }

    window.app.openModal('customer-modal');
  }

  handleFormSubmit() {
    const name = document.getElementById('cust-name').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const cep = document.getElementById('cust-cep').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    const complement = document.getElementById('cust-complement').value.trim();
    const neighborhood = document.getElementById('cust-neighborhood').value.trim();
    const city = document.getElementById('cust-city').value.trim();
    const notes = document.getElementById('cust-notes').value.trim();

    if (!name) {
      window.app.showToast('Informe o nome do cliente.', 'danger');
      return;
    }

    const customers = window.storageManager.getCustomers();

    if (this.currentEditingId) {
      const idx = customers.findIndex(c => c.id === this.currentEditingId);
      if (idx !== -1) {
        customers[idx] = {
          ...customers[idx],
          name, phone, cep, address, complement, neighborhood, city, notes
        };
        window.storageManager.saveCustomers(customers);
        window.app.showToast('Cliente atualizado com sucesso!', 'success');
      }
    } else {
      const newCustomer = {
        id: 'c_' + Date.now(),
        name, phone, cep, address, complement, neighborhood, city, notes,
        createdAt: new Date().toISOString()
      };
      customers.push(newCustomer);
      window.storageManager.saveCustomers(customers);
      window.app.showToast('Cliente cadastrado com sucesso!', 'success');
    }

    window.app.closeModal('customer-modal');
    this.render();
    window.app.updateAllViews();
  }

  deleteCustomer(customerId) {
    if (!confirm('Deseja excluir este cliente?')) return;
    let customers = window.storageManager.getCustomers();
    customers = customers.filter(c => c.id !== customerId);
    window.storageManager.saveCustomers(customers);

    window.app.showToast('Cliente removido.', 'warning');
    this.render();
    window.app.updateAllViews();
  }

  /** Endereço completo do cliente em uma linha (para Maps e agendamento). */
  buildFullAddress(c) {
    return [
      c.address,
      c.complement,
      c.neighborhood ? '- ' + c.neighborhood : '',
      c.city ? '- ' + c.city : ''
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }

  /** Todos os serviços do cliente, do mais recente para o mais antigo. */
  getCustomerServices(customer) {
    // Serviços antigos foram gravados só com o nome do cliente, sem id;
    // por isso as duas chaves precisam ser consultadas.
    const porId = window.storageManager.servicesOf('clientId', customer.id);
    const porNome = window.storageManager.servicesOf('clientName', customer.name);

    const vistos = new Set();
    return porId.concat(porNome)
      .filter(s => (vistos.has(s.id) ? false : vistos.add(s.id)))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  /**
   * Ficha do cliente: contato clicável + histórico completo de serviços.
   */
  openCustomerDetailModal(customerId) {
    const customer = window.storageManager.getCustomers().find(c => c.id === customerId);
    if (!customer) return;

    const body = document.getElementById('customer-detail-body');
    if (!body) return;

    const esc = (v) => Utils.escapeHtml(v);
    const idArg = Utils.escapeJsString(customer.id);

    const services = this.getCustomerServices(customer);
    const fullAddress = this.buildFullAddress(customer);
    const phone = Utils.cleanPhone(customer.phone);

    const totalRecebido = services
      .filter(s => s.paymentStatus === 'pago')
      .reduce((sum, s) => sum + Utils.serviceTotal(s), 0);
    const totalLucro = services
      .filter(s => s.paymentStatus === 'pago')
      .reduce((sum, s) => sum + Utils.serviceProfit(s), 0);
    const concluidos = services.filter(s => s.status === 'concluido').length;

    const whatsUrl = Utils.whatsappUrl(
      customer.phone,
      `Olá ${customer.name}, tudo bem? Sou o montador de móveis da RS Montagens!`
    );

    body.innerHTML = `
      <div class="customer-detail-head">
        <div class="client-avatar avatar-orange customer-detail-avatar">${esc((customer.name || 'C').charAt(0).toUpperCase())}</div>
        <h3>${esc(customer.name)}</h3>
        ${phone ? `<a class="detail-link" href="${Utils.telUrl(phone)}"><i class="fa-solid fa-phone"></i> ${esc(customer.phone)}</a>` : ''}
        ${fullAddress ? `<a class="detail-link" href="${Utils.mapsUrl(fullAddress)}" target="_blank" rel="noopener"><i class="fa-solid fa-location-dot"></i> ${esc(fullAddress)}</a>` : ''}
      </div>

      <div class="customer-stats">
        <div>
          <strong>${Utils.formatBRL(totalRecebido)}</strong>
          <span>Total recebido</span>
        </div>
        <div>
          <strong>${services.length}</strong>
          <span>Serviços</span>
        </div>
        <div>
          <strong>${concluidos}</strong>
          <span>Concluídos</span>
        </div>
        <div>
          <strong class="text-success">${Utils.formatBRL(totalLucro)}</strong>
          <span>Lucro líquido</span>
        </div>
      </div>

      <div class="detail-actions">
        ${phone ? `<a href="${whatsUrl}" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>` : ''}
        ${fullAddress ? `<a href="${Utils.mapsUrl(fullAddress)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><i class="fa-solid fa-map-location-dot"></i> Google Maps</a>` : ''}
        <button class="btn btn-primary btn-sm" onclick="window.customersController.scheduleForCustomer('${idArg}')">
          <i class="fa-solid fa-calendar-plus"></i> Novo serviço
        </button>
      </div>

      <span class="detail-section-label">Histórico de serviços</span>
      <div class="customer-history">
        ${services.length === 0 ? `
          <div class="empty-day-state">
            <i class="fa-regular fa-folder-open"></i>
            <p>Nenhum serviço registrado para este cliente ainda.</p>
          </div>
        ` : services.map(s => {
          const sCost = Utils.toNumber(s.cost);
          const label = s.status === 'concluido' ? 'Concluído'
            : (s.status === 'cancelado' ? 'Cancelado' : 'Agendado');
          const badgeClass = s.status === 'concluido' ? 'badge-concluido'
            : (s.status === 'cancelado' ? 'badge-cancelado' : 'badge-agendado');
          return `
          <button class="history-item" onclick="window.customersController.openServiceFromHistory('${Utils.escapeJsString(s.id)}')">
            <div class="history-main">
              <h5><span class="type-tag">${esc(s.serviceType || 'Montagem')}</span> ${esc(s.description)}</h5>
              <span class="history-date">${Utils.formatDateBR(s.date)} às ${esc(s.time)}h</span>
              <span class="badge ${badgeClass}">${label}</span>
            </div>
            <div class="history-money">
              <strong>${Utils.formatBRL(Utils.serviceTotal(s))}</strong>
              ${sCost > 0 ? `<span class="history-net">líquido ${Utils.formatBRL(Utils.serviceProfit(s))}</span>` : ''}
            </div>
          </button>`;
        }).join('')}
      </div>

      <div class="detail-footer">
        <button class="btn btn-danger btn-sm" onclick="window.customersController.deleteCustomer('${idArg}')">
          <i class="fa-solid fa-trash"></i> Excluir
        </button>
        <button class="btn btn-outline btn-sm" onclick="window.customersController.openCustomerModal('${idArg}')">
          <i class="fa-solid fa-pen-to-square"></i> Editar
        </button>
      </div>
    `;

    window.app.openModal('customer-detail-modal');
  }

  /** Abre a ficha do serviço a partir do histórico do cliente. */
  openServiceFromHistory(serviceId) {
    window.app.closeModal('customer-detail-modal');
    window.servicesController.openServiceDetailModal(serviceId);
  }

  /** Abre o modal de novo serviço já preenchido com os dados do cliente. */
  scheduleForCustomer(customerId) {
    const customer = window.storageManager.getCustomers().find(c => c.id === customerId);
    if (!customer) return;

    window.app.closeModal('customer-detail-modal');
    window.servicesController.openNewServiceModal(null);

    // Preenche após o modal montar os campos
    window.servicesController.populateClientSelect(customer.id);
    const phoneInput = document.getElementById('service-phone');
    const addressInput = document.getElementById('service-address');
    if (phoneInput) phoneInput.value = customer.phone || '';
    if (addressInput) addressInput.value = this.buildFullAddress(customer);
  }

  render() {
    const container = document.getElementById('customers-list-container');
    if (!container) return;

    let customers = window.storageManager.getCustomers();

    if (this.searchQuery) {
      customers = customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(this.searchQuery)) ||
        (c.phone && c.phone.includes(this.searchQuery)) ||
        (c.address && c.address.toLowerCase().includes(this.searchQuery))
      );
    }

    const countHeader = document.getElementById('customer-count-badge');
    if (countHeader) countHeader.textContent = `${customers.length} cadastrados`;

    if (customers.length === 0) {
      container.innerHTML = `
        <div class="empty-day-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-users-slash"></i>
          <p>Nenhum cliente encontrado.</p>
          <button class="btn btn-primary btn-sm" onclick="window.customersController.openCustomerModal()">
            <i class="fa-solid fa-plus"></i> Cadastrar Novo Cliente
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = customers.map(c => {
      // Índice em vez de varrer todos os serviços por linha da lista.
      const clientServices = this.getCustomerServices(c);
      const totalSpent = clientServices
        .filter(s => s.paymentStatus === 'pago')
        .reduce((sum, s) => sum + Utils.serviceTotal(s), 0);

      const esc = (v) => Utils.escapeHtml(v);
      const idArg = Utils.escapeJsString(c.id);
      const initial = c.name ? c.name.charAt(0).toUpperCase() : 'C';
      const cleanPhone = Utils.cleanPhone(c.phone);
      const whatsUrl = Utils.whatsappUrl(c.phone, `Olá ${c.name}, tudo bem? Sou o montador de móveis da RS Montagens!`);

      const fullAddress = this.buildFullAddress(c);
      const mapsUrl = Utils.mapsUrl(fullAddress);
      const servicesCount = clientServices.length;

      return `
        <div class="stat-card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <button class="customer-open-btn" onclick="window.customersController.openCustomerDetailModal('${idArg}')" title="Ver ficha e histórico de serviços">
                <div class="client-avatar avatar-orange" style="width: 44px; height: 44px; font-size: 1rem;">
                  ${initial}
                </div>
                <div>
                  <h4 style="font-size: 1.05rem; font-weight: 800;">${esc(c.name)}</h4>
                  <span style="font-size: 0.8rem; color: var(--text-muted);">${esc(c.phone || 'Sem telefone')}</span>
                </div>
              </button>
              <div style="display: flex; gap: 6px;">
                ${cleanPhone ? `
                  <a href="${whatsUrl}" target="_blank" class="btn btn-whatsapp btn-icon" style="width: 34px; height: 34px;" title="Conversar no WhatsApp">
                    <i class="fa-brands fa-whatsapp"></i>
                  </a>
                ` : ''}
                <button class="btn btn-outline btn-icon" style="width: 34px; height: 34px;" onclick="window.customersController.openCustomerModal('${idArg}')" title="Editar">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-outline btn-icon" style="width: 34px; height: 34px;" onclick="window.customersController.deleteCustomer('${idArg}')" title="Excluir">
                  <i class="fa-solid fa-trash" style="color: var(--danger);"></i>
                </button>
              </div>
            </div>

            ${fullAddress ? `
              <p style="font-size: 0.83rem; color: var(--text-muted); margin-bottom: 10px;">
                <i class="fa-solid fa-location-dot" style="color: var(--primary);"></i> 
                <a href="${mapsUrl}" target="_blank" rel="noopener" style="color: inherit; text-decoration: none;">${esc(fullAddress)}</a>
              </p>
            ` : ''}

            ${c.notes ? `
              <p style="font-size: 0.8rem; background: var(--bg-app); padding: 8px 10px; border-radius: var(--radius-sm); color: var(--text-muted); margin-bottom: 12px;">
                <i class="fa-solid fa-circle-info"></i> ${esc(c.notes)}
              </p>
            ` : ''}
          </div>

          <div style="padding-top: 12px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Total Recebido</span>
              <div style="font-size: 1.1rem; font-weight: 800; color: var(--success-dark);">${Utils.formatBRL(totalSpent)}</div>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${servicesCount} serviço${servicesCount === 1 ? '' : 's'} registrado${servicesCount === 1 ? '' : 's'}</span>
            </div>
            <button class="btn btn-primary btn-sm" onclick="window.customersController.scheduleForCustomer('${idArg}')">
              <i class="fa-solid fa-calendar-plus"></i> Agendar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.customersController = new CustomersController();
