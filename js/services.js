/* ==========================================================================
   MOVELPRO - SERVICES CONTROLLER
   CRUD for assemblies, status workflow & financial integration
   ========================================================================== */

class ServicesController {
  constructor() {
    this.currentEditingId = null;
    // Id usado para amarrar as fotos. Num serviço novo ele já nasce aqui,
    // antes de salvar, senão não haveria onde pendurar a foto escolhida.
    this.fotoServiceId = null;
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

    // Prévia do total e do lucro em tempo real
    // (total = valor + deslocamento; lucro = total - material)
    ['service-value', 'service-travel', 'service-cost'].forEach(id => {
      const input = document.getElementById(id);
      if (input) input.addEventListener('input', () => this.updateProfitPreview());
    });

    // Chips de tipo de serviço pré-programados
    const chipsContainer = document.getElementById('service-type-chips');
    if (chipsContainer) {
      chipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const typeInput = document.getElementById('service-type');
        if (typeInput) typeInput.value = chip.dataset.type;
        this.highlightTypeChip(chip.dataset.type);
      });
    }

    const typeInput = document.getElementById('service-type');
    if (typeInput) {
      typeInput.addEventListener('input', () => this.highlightTypeChip(typeInput.value));
    }

    // Pagamento do montador digitado na mão
    const payInput = document.getElementById('service-assembler-pay');
    if (payInput) payInput.addEventListener('input', () => this.updateProfitPreview());

    // Atalhos de porcentagem: viram valor redondo na hora
    const payChips = document.getElementById('service-pay-chips');
    if (payChips) {
      payChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.pay-chip');
        if (!chip) return;
        this.aplicarPorcentagemDoMontador(Number(chip.dataset.payPercent));
      });
    }

    // Fotos: galeria e câmera caem no mesmo tratamento
    ['service-fotos-galeria', 'service-fotos-camera'].forEach(id => {
      const input = document.getElementById(id);
      if (!input) return;
      input.addEventListener('change', async (e) => {
        const arquivos = e.target.files;
        if (arquivos && arquivos.length) await this.adicionarFotos(arquivos);
        e.target.value = ''; // permite escolher a mesma foto de novo
      });
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

  /** Renderiza os chips de tipo de serviço vindos das configurações. */
  renderTypeChips() {
    const container = document.getElementById('service-type-chips');
    if (!container) return;

    const types = window.storageManager.getSettings().serviceTypes || [];
    container.innerHTML = types.map(t => `
      <button type="button" class="chip" data-type="${Utils.escapeHtml(t)}">${Utils.escapeHtml(t)}</button>
    `).join('');
  }

  /** Marca visualmente o chip que corresponde ao texto digitado. */
  highlightTypeChip(value) {
    const normalized = String(value || '').trim().toLowerCase();
    document.querySelectorAll('#service-type-chips .chip').forEach(chip => {
      chip.classList.toggle('is-active', chip.dataset.type.toLowerCase() === normalized);
    });
  }

  updateProfitPreview() {
    const value = Utils.toNumber(document.getElementById('service-value')?.value);
    const travelFee = Utils.toNumber(document.getElementById('service-travel')?.value);
    const cost = Utils.toNumber(document.getElementById('service-cost')?.value);

    const total = value + travelFee;
    const profit = total - cost;

    const totalEl = document.getElementById('service-total-preview');
    if (totalEl) totalEl.textContent = Utils.formatBRL(total);

    const el = document.getElementById('service-profit-preview');
    if (el) {
      el.textContent = Utils.formatBRL(profit);
      el.classList.toggle('is-negative', profit < 0);
    }

    // Sobra para o dono = lucro - o que vai para o montador
    const pay = Utils.toNumber(document.getElementById('service-assembler-pay')?.value);
    const sobra = profit - pay;
    const ownerEl = document.getElementById('service-owner-preview');
    if (ownerEl) {
      ownerEl.textContent = Utils.formatBRL(sobra);
      ownerEl.classList.toggle('is-negative', sobra < 0);
    }
  }

  /** Chip de porcentagem: calcula sobre o total e arredonda para real cheio. */
  aplicarPorcentagemDoMontador(percentual) {
    const input = document.getElementById('service-assembler-pay');
    if (!input) return;

    if (!percentual) {
      input.value = '0';
      this.updateProfitPreview();
      return;
    }

    const value = Utils.toNumber(document.getElementById('service-value')?.value);
    const travelFee = Utils.toNumber(document.getElementById('service-travel')?.value);
    const total = value + travelFee;

    if (total <= 0) {
      window.app.showToast('Informe primeiro o valor do serviço.', 'warning');
      return;
    }

    input.value = String(Utils.roundPay((total * percentual) / 100));
    this.updateProfitPreview();
  }

  /** Popula o seletor de montador responsável. */
  populateAssemblerSelect(selectedId = null) {
    const select = document.getElementById('service-assembler');
    if (!select) return;

    const assemblers = window.storageManager.getAssemblers();
    select.innerHTML = '<option value="">-- Não definido --</option>';
    assemblers.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.isOwner ? `${a.name} (eu)` : a.name;
      if (selectedId && selectedId === a.id) opt.selected = true;
      select.appendChild(opt);
    });

    // Sem seleção explícita, já sugere o dono da empresa.
    if (!selectedId) {
      const owner = assemblers.find(a => a.isOwner);
      if (owner) select.value = owner.id;
    }
  }

  /** Popula o seletor de loja parceira. */
  populateStoreSelect(selectedId = null) {
    const select = document.getElementById('service-store');
    if (!select) return;

    const stores = window.storageManager.getStores();
    select.innerHTML = '<option value="">-- Cliente particular --</option>';
    stores.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st.id;
      opt.textContent = st.name;
      if (selectedId && selectedId === st.id) opt.selected = true;
      select.appendChild(opt);
    });
  }

  openNewServiceModal(defaultDate = null) {
    const auth = window.authController;
    if (auth && !auth.podeVerValoresCheios()) {
      window.app.showToast('Apenas o administrador pode agendar novos serviços.', 'warning');
      return;
    }

    this.currentEditingId = null;
    const form = document.getElementById('service-form');
    if (form) form.reset();

    const modalTitle = document.getElementById('service-modal-title');
    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Novo Agendamento de Montagem';
    const submitBtn = document.getElementById('service-submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Agendar Montagem';

    // Populate clients dropdown
    this.populateClientSelect();
    this.renderTypeChips();
    this.populateAssemblerSelect();
    this.populateStoreSelect();

    // Set default date if passed
    const dateInput = document.getElementById('service-date');
    if (dateInput) {
      dateInput.value = defaultDate || window.calendarController.selectedDate || Utils.todayISO();
    }

    const timeInput = document.getElementById('service-time');
    if (timeInput && !timeInput.value) {
      timeInput.value = '10:00';
    }

    const costInput = document.getElementById('service-cost');
    if (costInput) costInput.value = '0';
    const travelInput = document.getElementById('service-travel');
    if (travelInput) travelInput.value = '0';
    const payInput = document.getElementById('service-assembler-pay');
    if (payInput) payInput.value = '0';

    // O serviço já nasce com id para as fotos terem onde se prender
    // antes mesmo de o formulário ser salvo.
    this.fotoServiceId = 's_' + Date.now();
    this.renderFotosDoFormulario(this.fotoServiceId, []);

    this.highlightTypeChip('');
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
    const serviceType = document.getElementById('service-type').value.trim();
    const value = Utils.toNumber(document.getElementById('service-value').value);
    const travelFee = Utils.toNumber(document.getElementById('service-travel').value);
    const cost = Utils.toNumber(document.getElementById('service-cost').value);
    const assemblerPay = Utils.roundPay(document.getElementById('service-assembler-pay').value);
    const paymentMethod = document.getElementById('service-payment-method').value;
    const status = document.getElementById('service-status').value;
    const paymentStatus = document.getElementById('service-payment-status').value;
    const notes = document.getElementById('service-notes').value.trim();

    const assemblerId = document.getElementById('service-assembler').value || null;
    const assembler = window.storageManager.getAssemblers().find(a => a.id === assemblerId);
    const assemblerName = assembler ? assembler.name : '';
    const storeId = document.getElementById('service-store').value || null;

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

    if (!serviceType) {
      window.app.showToast('Por favor, informe o tipo de serviço.', 'danger');
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
          serviceType,
          value,
          travelFee,
          cost,
          assemblerPay,
          assemblerId,
          assemblerName,
          storeId,
          paymentMethod,
          status,
          paymentStatus,
          notes
        };
        window.storageManager.saveServices(services);

        // Mantem o financeiro em sincronia com o que foi editado
        if (services[index].status === 'concluido') {
          this.recordIncomeTransaction(services[index]);
        } else {
          this.removeIncomeTransaction(services[index].id);
        }
        this.recordMaterialExpense(services[index]);
        this.recordAssemblerExpense(services[index]);

        window.app.showToast('Serviço atualizado com sucesso!', 'success');
      }
    } else {
      // New service
      const newService = {
        // Reaproveita o id criado na abertura do modal: é nele que as fotos
        // escolhidas antes de salvar já foram guardadas.
        id: this.fotoServiceId || ('s_' + Date.now()),
        clientId,
        clientName,
        clientPhone: phone,
        clientAddress: address,
        date,
        time,
        description,
        serviceType,
        value,
        travelFee,
        cost,
        assemblerPay,
        assemblerId,
        assemblerName,
        storeId,
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
      this.recordAssemblerExpense(newService);

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
      this.removeIncomeTransaction(service.id);
      window.app.showToast('Serviço reaberto como agendado.', 'warning');
    } else {
      service.status = 'concluido';
      service.paymentStatus = 'pago';
      // Record transaction if not already existing
      this.recordIncomeTransaction(service);
      this.recordMaterialExpense(service);
      this.recordAssemblerExpense(service);
      window.app.showToast('Parabéns! Montagem concluída e pagamento registrado.', 'success');
    }

    window.storageManager.saveServices(services);
    window.calendarController.render();
    window.calendarController.renderDayServices(service.date);
    window.app.updateAllViews();
  }

  recordIncomeTransaction(service) {
    const transactions = window.storageManager.getTransactions();
    const total = Utils.serviceTotal(service);

    // A receita é o total pago pelo cliente (serviço + deslocamento).
    // A despesa do material tem id próprio ('mat_...') e não entra aqui.
    const existing = transactions.find(t => t.serviceId === service.id && t.type === 'receita');
    if (existing) {
      existing.value = total;
      existing.status = 'pago';
      existing.date = service.date;
      existing.description = `${service.serviceType || 'Montagem'}: ${service.description} (${service.clientName})`;
      window.storageManager.saveTransactions(transactions);
      return;
    }

    const newTx = {
      id: 'tx_' + Date.now(),
      type: 'receita',
      category: service.storeId ? 'Montagem Loja / Parceria' : 'Montagem Particular',
      description: `${service.serviceType || 'Montagem'}: ${service.description} (${service.clientName})`,
      value: total,
      date: service.date,
      paymentMethod: service.paymentMethod || 'PIX',
      status: 'pago',
      serviceId: service.id,
      createdAt: new Date().toISOString()
    };

    transactions.push(newTx);
    window.storageManager.saveTransactions(transactions);
  }

  /** Remove a receita lançada quando o serviço deixa de estar concluído. */
  /* ---------- Fotos do móvel ---------- */

  /** Recebe os arquivos escolhidos, comprime e devolve a grade atualizada. */
  async adicionarFotos(arquivos) {
    const serviceId = this.fotoServiceId;
    if (!serviceId) return;

    const aviso = document.getElementById('service-fotos-aviso');
    if (aviso) aviso.textContent = 'Preparando as fotos...';

    const resultado = await window.photoStore.adicionar(serviceId, arquivos);
    this.renderFotosDoFormulario(serviceId, resultado.fotos);

    if (resultado.adicionadas > 0) {
      window.app.showToast(
        resultado.adicionadas === 1 ? 'Foto adicionada.' : `${resultado.adicionadas} fotos adicionadas.`,
        'success'
      );
    }
    if (resultado.motivo === 'limite') {
      window.app.showToast(
        `Cabem no máximo ${window.FOTOS_CONFIG.maxPorServico} fotos por serviço.`,
        'warning'
      );
    }
    if (resultado.falhas) {
      window.app.showToast(
        `${resultado.falhas} foto(s) não entraram: arquivo grande demais.`,
        'danger'
      );
    }
  }

  /** Grade de miniaturas dentro do formulário, com o X para remover. */
  renderFotosDoFormulario(serviceId, fotos) {
    const alvo = document.getElementById('service-fotos-preview');
    const contador = document.getElementById('service-fotos-contador');
    const aviso = document.getElementById('service-fotos-aviso');
    if (!alvo) return;

    const lista = fotos || window.photoStore.getLocal(serviceId);
    alvo.innerHTML = window.photoStore.renderMiniaturas(lista, { podeRemover: true, serviceId });

    if (contador) contador.textContent = `${lista.length} de ${window.FOTOS_CONFIG.maxPorServico}`;
    if (aviso) {
      aviso.textContent = `Até ${window.FOTOS_CONFIG.maxPorServico} fotos por serviço. Elas são reduzidas automaticamente para não pesar.`;
    }
  }

  /** Grade de miniaturas dentro da ficha do serviço. */
  renderFotosDaFicha(serviceId, fotos) {
    const alvo = document.getElementById('detail-fotos');
    if (!alvo) return;

    const lista = fotos || window.photoStore.getLocal(serviceId);
    const podeRemover = !window.authController || window.authController.podeVerValoresCheios();

    if (lista.length === 0) {
      alvo.innerHTML = '<p class="foto-vazio">Nenhuma foto neste serviço.</p>';
      return;
    }

    alvo.innerHTML = window.photoStore.renderMiniaturas(lista, { podeRemover, serviceId });
  }

  /**
   * Painel de valores da ficha, montado conforme quem está olhando.
   * O administrador vê o dinheiro todo. O montador vê só o que ele recebe:
   * nunca o valor cobrado do cliente, nem o lucro do dono.
   */
  renderPainelDeValores(service) {
    const auth = window.authController;
    const ehAdmin = !auth || auth.podeVerValoresCheios();

    if (!ehAdmin) {
      if (!auth.servicoEhMeu(service)) {
        return `
          <div class="money-grid">
            <div class="money-card">
              <div class="money-icon icon-blue"><i class="fa-solid fa-user-lock"></i></div>
              <span class="money-label">Valores</span>
              <strong class="money-value" style="font-size: 1rem;">Montagem de outro montador</strong>
            </div>
          </div>
        `;
      }

      const pay = Utils.assemblerPay(service);
      return `
        <div class="money-grid">
          <div class="money-card money-card-primary">
            <div class="money-icon"><i class="fa-solid fa-hand-holding-dollar"></i></div>
            <span class="money-label">Você recebe por esta montagem</span>
            <strong class="money-value">${Utils.formatBRL(pay)}</strong>
          </div>
          ${pay <= 0 ? `
            <div class="money-card">
              <span class="money-label">Combinado</span>
              <strong class="money-value" style="font-size: 0.95rem;">Ainda não definido</strong>
            </div>
          ` : ''}
        </div>
      `;
    }

    const value = Utils.toNumber(service.value);
    const travelFee = Utils.toNumber(service.travelFee);
    const cost = Utils.toNumber(service.cost);
    const total = Utils.serviceTotal(service);
    const profit = Utils.serviceProfit(service);
    const pay = Utils.assemblerPay(service);
    const sobra = Utils.ownerNet(service);
    const ehDono = Utils.isOwnerAssembler(service);

    return `
      <div class="money-grid">
        <div class="money-card">
          <div class="money-icon icon-green"><i class="fa-solid fa-dollar-sign"></i></div>
          <span class="money-label">Valor do serviço</span>
          <strong class="money-value">${Utils.formatBRL(value)}</strong>
        </div>
        <div class="money-card">
          <div class="money-icon icon-blue"><i class="fa-solid fa-car"></i></div>
          <span class="money-label">Deslocamento</span>
          <strong class="money-value">${Utils.formatBRL(travelFee)}</strong>
        </div>
        <div class="money-card">
          <div class="money-icon icon-orange"><i class="fa-solid fa-basket-shopping"></i></div>
          <span class="money-label">Gastos com material</span>
          <strong class="money-value">${Utils.formatBRL(cost)}</strong>
        </div>
        <div class="money-card">
          <span class="money-label">Total (cliente paga)</span>
          <strong class="money-value">${Utils.formatBRL(total)}</strong>
        </div>
        ${pay > 0 && !ehDono ? `
          <div class="money-card">
            <div class="money-icon icon-orange"><i class="fa-solid fa-helmet-safety"></i></div>
            <span class="money-label">Montador recebe</span>
            <strong class="money-value">${Utils.formatBRL(pay)}</strong>
          </div>
          <div class="money-card money-card-primary ${sobra < 0 ? 'is-negative' : ''}">
            <div class="money-icon"><i class="fa-solid fa-wallet"></i></div>
            <span class="money-label">Sobra para você</span>
            <strong class="money-value">${Utils.formatBRL(sobra)}</strong>
          </div>
        ` : `
          <div class="money-card money-card-primary ${profit < 0 ? 'is-negative' : ''}">
            <div class="money-icon"><i class="fa-solid fa-wallet"></i></div>
            <span class="money-label">Lucro líquido</span>
            <strong class="money-value">${Utils.formatBRL(profit)}</strong>
          </div>
        `}
      </div>
    `;
  }

  removeIncomeTransaction(serviceId) {
    const transactions = window.storageManager.getTransactions();
    const filtered = transactions.filter(t => !(t.serviceId === serviceId && t.type === 'receita'));
    if (filtered.length !== transactions.length) {
      window.storageManager.saveTransactions(filtered);
    }
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

  /**
   * Lança o repasse ao montador como despesa, para o caixa bater com a
   * realidade: entrou o valor cheio do cliente, saiu a parte do montador.
   * Quando quem monta é o próprio dono não há repasse — o dinheiro fica com ele.
   */
  recordAssemblerExpense(service) {
    const transactions = window.storageManager.getTransactions();
    const expenseId = 'mont_' + service.id;
    const index = transactions.findIndex(t => t.id === expenseId);

    const pay = Utils.assemblerPay(service);
    const ehDono = Utils.isOwnerAssembler(service);
    const cancelado = service.status === 'cancelado';

    // Sem repasse a fazer: se havia lançamento antigo, tira do caixa.
    if (pay <= 0 || ehDono || cancelado) {
      if (index !== -1) {
        transactions.splice(index, 1);
        window.storageManager.saveTransactions(transactions);
      }
      return;
    }

    const expense = {
      id: expenseId,
      type: 'despesa',
      category: 'Pagamento de Montador',
      description: `Montador ${service.assemblerName || ''}: ${service.description} (${service.clientName})`.trim(),
      value: pay,
      date: service.date,
      paymentMethod: service.paymentMethod || 'PIX',
      status: service.status === 'concluido' ? 'pago' : 'pendente',
      serviceId: service.id,
      assemblerId: service.assemblerId || null,
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

    const auth = window.authController;
    const ehAdmin = !auth || auth.podeVerValoresCheios();

    const esc = (v) => Utils.escapeHtml(v);
    const idArg = Utils.escapeJsString(service.id);

    const settings = window.storageManager.getSettings();
    const value = Utils.toNumber(service.value);
    const travelFee = Utils.toNumber(service.travelFee);
    const cost = Utils.toNumber(service.cost);
    const total = Utils.serviceTotal(service);
    const profit = Utils.serviceProfit(service);

    const address = service.clientAddress || '';
    const phone = Utils.cleanPhone(service.clientPhone);
    const isConcluido = service.status === 'concluido';
    const isCancelado = service.status === 'cancelado';
    const statusLabel = isConcluido ? 'Concluído' : (isCancelado ? 'Cancelado' : 'Agendado');
    const statusBadge = isConcluido ? 'badge-concluido' : (isCancelado ? 'badge-cancelado' : 'badge-agendado');

    const store = service.storeId
      ? window.storageManager.getStores().find(st => st.id === service.storeId)
      : null;

    const whatsUrl = Utils.whatsappUrl(
      service.clientPhone,
      `Olá ${service.clientName}, tudo bem? Sou o montador da ${settings.companyName || 'RS Montagens'}. Estou em contato a respeito de "${service.description}".`
    );

    modalBody.innerHTML = `
      <div class="detail-head">
        <span class="detail-type-tag">${esc(service.serviceType || 'Montagem')}</span>
        <h3 class="detail-title">${esc(service.description)}</h3>
        <div class="detail-badges">
          <span class="badge ${statusBadge}">
            ${statusLabel}
          </span>
          <span class="badge ${service.paymentStatus === 'pago' ? 'badge-pago' : 'badge-pendente'}">
            ${service.paymentStatus === 'pago' ? 'Pago' : 'Pendente'}
          </span>
        </div>
      </div>

      ${this.renderPainelDeValores(service)}

      <span class="detail-section-label"><i class="fa-solid fa-camera"></i> Fotos do móvel</span>
      <div id="detail-fotos" class="detail-fotos">
        <p class="foto-vazio">Carregando fotos...</p>
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
        <div class="detail-row">
          <span><i class="fa-solid fa-helmet-safety"></i> Montador</span>
          <strong>${esc(service.assemblerName || 'Não definido')}</strong>
        </div>
        ${store ? `
          <div class="detail-row">
            <span><i class="fa-solid fa-store"></i> Loja parceira</span>
            <strong>${esc(store.name)}</strong>
          </div>
        ` : ''}
      </div>

      ${service.notes ? `
        <div class="detail-block">
          <span class="detail-section-label"><i class="fa-solid fa-note-sticky"></i> Observações</span>
          <p style="margin-top: 6px;">${esc(service.notes)}</p>
        </div>
      ` : ''}

      ${ehAdmin ? `
        <span class="detail-section-label">Nota de serviço</span>
        <div class="detail-actions">
          <button class="btn btn-primary btn-sm" onclick="window.quotesController.generateReceiptFromService('${idArg}')">
            <i class="fa-solid fa-file-pdf"></i> Gerar PDF
          </button>
          <button class="btn btn-whatsapp btn-sm" onclick="window.servicesController.sendReceiptToClient('${idArg}')" ${phone ? '' : 'disabled title="Cadastre o telefone do cliente"'}>
            <i class="fa-brands fa-whatsapp"></i> Enviar nota ao cliente
          </button>
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
          ${ehAdmin ? `
            <button class="msg-item" onclick="window.servicesController.sendMessage('${idArg}', 'pix')">
              <span class="msg-icon icon-green"><i class="fa-solid fa-money-check-dollar"></i></span>
              <span class="msg-text">
                <strong>Enviar dados do PIX</strong>
                <small>${settings.pixKey ? 'Chave PIX configurada' : 'Cadastre a chave em Ajustes'}</small>
              </span>
              <i class="fa-solid fa-chevron-right msg-arrow"></i>
            </button>
          ` : ''}
          <button class="msg-item" onclick="window.servicesController.sendMessage('${idArg}', 'avaliacao')">
            <span class="msg-icon icon-orange"><i class="fa-regular fa-star"></i></span>
            <span class="msg-text">
              <strong>Pedir avaliação no Google</strong>
              <small>${settings.reviewLink ? 'Link configurado' : 'Cadastre o link em Ajustes'}</small>
            </span>
            <i class="fa-solid fa-chevron-right msg-arrow"></i>
          </button>
          <button class="msg-item" onclick="window.servicesController.sendMessage('${idArg}', 'facebook')">
            <span class="msg-icon icon-blue"><i class="fa-brands fa-facebook"></i></span>
            <span class="msg-text">
              <strong>Seguir no Facebook</strong>
              <small>${settings.facebookLink ? 'Link configurado' : 'Cadastre o link em Ajustes'}</small>
            </span>
            <i class="fa-solid fa-chevron-right msg-arrow"></i>
          </button>
          <button class="msg-item" onclick="window.servicesController.sendMessage('${idArg}', 'instagram')">
            <span class="msg-icon icon-pink"><i class="fa-brands fa-instagram"></i></span>
            <span class="msg-text">
              <strong>Seguir no Instagram</strong>
              <small>${settings.instagramLink ? 'Link configurado' : 'Cadastre o link em Ajustes'}</small>
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
      </div>

      <span class="detail-section-label">Alterar status</span>
      <div class="status-switch">
        <button class="status-option ${(!isConcluido && !isCancelado) ? 'is-active status-agendado' : ''}"
                onclick="window.servicesController.setServiceStatus('${idArg}', 'agendado')">
          <i class="fa-regular fa-circle"></i> Agendado
        </button>
        <button class="status-option ${isConcluido ? 'is-active status-concluido' : ''}"
                onclick="window.servicesController.setServiceStatus('${idArg}', 'concluido')">
          <i class="fa-solid fa-circle-check"></i> Concluído
        </button>
        <button class="status-option ${isCancelado ? 'is-active status-cancelado' : ''}"
                onclick="window.servicesController.setServiceStatus('${idArg}', 'cancelado')">
          <i class="fa-solid fa-circle-xmark"></i> Cancelado
        </button>
      </div>

      ${ehAdmin ? `
        <div class="detail-footer">
          <button class="btn btn-danger btn-sm" onclick="window.servicesController.deleteService('${idArg}')">
            <i class="fa-solid fa-trash"></i> Excluir
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.servicesController.editService('${idArg}')">
            <i class="fa-solid fa-pen-to-square"></i> Editar
          </button>
        </div>
      ` : ''}
    `;

    window.app.openModal('service-detail-modal');

    // Mostra na hora o que já está no aparelho e busca o resto na nuvem —
    // é assim que o montador vê no celular dele a foto que o dono anexou.
    this.renderFotosDaFicha(serviceId, window.photoStore.getLocal(serviceId));
    window.photoStore.carregarDaNuvem(serviceId).then(fotos => {
      const modalAberto = document.getElementById('service-detail-modal');
      if (modalAberto && modalAberto.classList.contains('active')) {
        this.renderFotosDaFicha(serviceId, fotos);
      }
    });
  }

  /**
   * Monta a mensagem pronta e abre o WhatsApp do cliente.
   * Tipos: 'confirmar' | 'pix' | 'avaliacao'
   */
  sendMessage(serviceId, tipo) {
    const service = window.storageManager.getServices().find(s => s.id === serviceId);
    if (!service) return;

    const auth = window.authController;
    const ehAdmin = !auth || auth.podeVerValoresCheios();

    if (tipo === 'pix' && !ehAdmin) {
      window.app.showToast('Apenas o administrador pode enviar dados de cobrança.', 'warning');
      return;
    }

    const settings = window.storageManager.getSettings();
    const empresa = settings.companyName || 'RS Montagens';
    const nome = service.clientName || 'tudo bem';
    let msg = '';

    if (tipo === 'confirmar') {
      msg = `Olá ${nome}! Este é a ${empresa} confirmando seu agendamento.\n\n`
          + `Serviço: ${service.serviceType || 'Montagem'}\n`
          + `Data: ${Utils.formatDateBR(service.date)} às ${service.time}\n`
          + (ehAdmin ? `Valor: ${Utils.formatBRL(Utils.serviceTotal(service))}\n\n` : '\n')
          + `Qualquer dúvida, estou à disposição. Até logo!`;

    } else if (tipo === 'pix') {
      if (!settings.pixKey) {
        window.app.showToast('Cadastre sua chave PIX em Ajustes primeiro.', 'warning');
        return;
      }
      msg = this.buildPixMessage(service, settings);

    } else if (tipo === 'avaliacao') {
      if (!settings.reviewLink) {
        window.app.showToast('Cadastre o link de avaliação do Google em Ajustes.', 'warning');
        return;
      }
      msg = `Olá ${nome}! Espero que tenha gostado do serviço.\n\n`
          + `Se puder deixar uma avaliação, ajuda muito o meu trabalho:\n`
          + `${settings.reviewLink}\n\n`
          + `Muito obrigado! - ${empresa}`;

    } else if (tipo === 'facebook') {
      if (!settings.facebookLink) {
        window.app.showToast('Cadastre o link do Facebook em Ajustes.', 'warning');
        return;
      }
      msg = `Olá ${nome}! Aqui é da ${empresa}.\n\n`
          + `Me segue lá no Facebook para acompanhar os trabalhos:\n`
          + `${settings.facebookLink}\n\n`
          + `Obrigado pela confiança!`;

    } else if (tipo === 'instagram') {
      if (!settings.instagramLink) {
        window.app.showToast('Cadastre o link do Instagram em Ajustes.', 'warning');
        return;
      }
      msg = `Olá ${nome}! Aqui é da ${empresa}.\n\n`
          + `Me segue lá no Instagram para ver as montagens do dia a dia:\n`
          + `${settings.instagramLink}\n\n`
          + `Obrigado pela confiança!`;
    }

    window.open(Utils.whatsappUrl(service.clientPhone, msg), '_blank');
  }

  /** Bloco de dados do PIX usado na cobrança e na nota. */
  buildPixMessage(service, settings) {
    const empresa = settings.companyName || 'RS Montagens';
    let msg = `Olá ${service.clientName}! O serviço de ${service.serviceType || 'Montagem'} foi concluído.\n\n`;
    msg += `Valor total: ${Utils.formatBRL(Utils.serviceTotal(service))}\n\n`;
    msg += `Dados para pagamento via PIX:\n`;
    msg += `• Chave: ${settings.pixKey}\n`;
    if (settings.bankName) msg += `• Banco: ${settings.bankName}\n`;
    if (settings.pixHolder) msg += `• Titular: ${settings.pixHolder}\n`;
    msg += `\nObrigado pela confiança! — ${empresa}`;
    return msg;
  }

  /**
   * Monta a nota de serviço em texto e abre direto a conversa do cliente.
   * Pedido do vídeo: a nota tem que ir direto para a pessoa, sem passo extra.
   */
  buildReceiptMessage(service) {
    const settings = window.storageManager.getSettings();
    const empresa = settings.companyName || 'RS Montagens';
    const total = Utils.serviceTotal(service);
    const travelFee = Utils.toNumber(service.travelFee);

    let msg = `*NOTA DE SERVIÇO*\n`;
    msg += `${empresa}\n`;
    if (settings.profession) msg += `${settings.profession}\n`;
    if (settings.cnpj) msg += `CNPJ/MEI: ${settings.cnpj}\n`;
    if (settings.phone) msg += `WhatsApp: ${settings.phone}\n`;
    msg += `------------------------------------\n`;
    msg += `*Cliente:* ${service.clientName}\n`;
    if (service.clientAddress) msg += `*Endereço:* ${service.clientAddress}\n`;
    msg += `*Data:* ${Utils.formatDateBR(service.date)} às ${service.time}\n`;
    msg += `------------------------------------\n`;
    msg += `*Serviço:* ${service.serviceType || 'Montagem'}\n`;
    msg += `${service.description}\n`;
    if (service.notes) msg += `_Obs.: ${service.notes}_\n`;
    msg += `------------------------------------\n`;
    msg += `Valor do serviço: ${Utils.formatBRL(service.value)}\n`;
    if (travelFee > 0) msg += `Deslocamento: ${Utils.formatBRL(travelFee)}\n`;
    msg += `*TOTAL: ${Utils.formatBRL(total)}*\n`;
    msg += `Pagamento: ${service.paymentMethod || 'PIX'} (${service.paymentStatus === 'pago' ? 'Quitado' : 'Pendente'})\n`;

    if (service.paymentStatus !== 'pago' && settings.pixKey) {
      msg += `------------------------------------\n`;
      msg += `Dados para pagamento via PIX:\n`;
      msg += `• Chave: ${settings.pixKey}\n`;
      if (settings.bankName) msg += `• Banco: ${settings.bankName}\n`;
      if (settings.pixHolder) msg += `• Titular: ${settings.pixHolder}\n`;
    }

    msg += `------------------------------------\n`;
    msg += `Obrigado pela confiança! — ${empresa}`;
    return msg;
  }

  /** Envia a nota de serviço direto na conversa do cliente. */
  sendReceiptToClient(serviceId) {
    const auth = window.authController;
    if (auth && !auth.podeVerValoresCheios()) {
      window.app.showToast('Apenas o administrador pode enviar notas de serviço.', 'warning');
      return;
    }

    const service = window.storageManager.getServices().find(s => s.id === serviceId);
    if (!service) return;

    if (!Utils.cleanPhone(service.clientPhone)) {
      window.app.showToast('Cadastre o telefone do cliente para enviar a nota.', 'warning');
      return;
    }

    window.open(Utils.whatsappUrl(service.clientPhone, this.buildReceiptMessage(service)), '_blank');
    window.app.showToast('Nota aberta no WhatsApp do cliente.', 'success');
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
      this.recordAssemblerExpense(service);
      window.app.showToast('Montagem concluída e lançada no financeiro.', 'success');
    } else if (status === 'cancelado') {
      service.paymentStatus = 'pendente';
      // Serviço cancelado não pode continuar contando como receita nem custo.
      this.removeIncomeTransaction(service.id);
      service.cost = 0;
      this.recordMaterialExpense(service);
      this.recordAssemblerExpense(service);
      window.app.showToast('Serviço cancelado e retirado do financeiro.', 'warning');
    } else {
      service.paymentStatus = 'pendente';
      this.removeIncomeTransaction(service.id);
      window.app.showToast('Serviço reaberto como agendado.', 'warning');
    }

    window.storageManager.saveServices(services);
    window.calendarController.render();
    window.calendarController.renderDayServices(service.date);
    window.app.updateAllViews();
    this.openServiceDetailModal(serviceId);
  }

  editService(serviceId) {
    const auth = window.authController;
    if (auth && !auth.podeVerValoresCheios()) {
      window.app.showToast('Apenas o administrador pode editar montagens.', 'warning');
      return;
    }

    const services = window.storageManager.getServices();
    const s = services.find(item => item.id === serviceId);
    if (!s) return;

    this.currentEditingId = serviceId;
    window.app.closeModal('service-detail-modal');

    this.populateClientSelect(s.clientId);
    this.renderTypeChips();
    this.populateAssemblerSelect(s.assemblerId);
    this.populateStoreSelect(s.storeId);

    document.getElementById('service-client-name').value = s.clientName || '';
    document.getElementById('service-phone').value = s.clientPhone || '';
    document.getElementById('service-address').value = s.clientAddress || '';
    document.getElementById('service-type').value = s.serviceType || 'Montagem';
    document.getElementById('service-date').value = s.date || '';
    document.getElementById('service-time').value = s.time || '09:00';
    document.getElementById('service-description').value = s.description || '';
    document.getElementById('service-value').value = s.value || '';
    document.getElementById('service-travel').value = Utils.toNumber(s.travelFee);
    document.getElementById('service-cost').value = Utils.toNumber(s.cost);
    document.getElementById('service-assembler-pay').value = Utils.toNumber(s.assemblerPay);
    document.getElementById('service-payment-method').value = s.paymentMethod || 'PIX';
    document.getElementById('service-status').value = s.status || 'agendado';
    document.getElementById('service-payment-status').value = s.paymentStatus || 'pendente';
    document.getElementById('service-notes').value = s.notes || '';

    this.highlightTypeChip(s.serviceType || 'Montagem');
    this.updateProfitPreview();

    // Fotos deste serviço: mostra o que já está no aparelho e, em paralelo,
    // busca na nuvem (caso tenham sido tiradas em outro celular).
    this.fotoServiceId = serviceId;
    this.renderFotosDoFormulario(serviceId, window.photoStore.getLocal(serviceId));
    window.photoStore.carregarDaNuvem(serviceId).then(fotos => {
      if (this.fotoServiceId === serviceId) this.renderFotosDoFormulario(serviceId, fotos);
    });

    const modalTitle = document.getElementById('service-modal-title');
    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Montagem';
    const submitBtn = document.getElementById('service-submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Alterações';

    window.app.openModal('service-modal');
  }

  deleteService(serviceId) {
    const auth = window.authController;
    if (auth && !auth.podeVerValoresCheios()) {
      window.app.showToast('Apenas o administrador pode excluir montagens.', 'warning');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta montagem da sua agenda?')) return;

    let services = window.storageManager.getServices();
    const service = services.find(s => s.id === serviceId);
    services = services.filter(s => s.id !== serviceId);
    window.storageManager.saveServices(services);

    // Tira do financeiro a receita e as despesas (material e montador) deste serviço.
    const transactions = window.storageManager.getTransactions()
      .filter(t => t.serviceId !== serviceId);
    window.storageManager.saveTransactions(transactions);

    // As fotos vão junto, senão ficam ocupando espaço sem dono.
    window.photoStore.apagarTudo(serviceId);

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
