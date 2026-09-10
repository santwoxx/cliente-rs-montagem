/* ==========================================================================
   MOVELPRO - PAINEL DOS MONTADORES
   Cadastro da equipe de montadores e visão por montador:
   escolhe o montador e vê exatamente quais montagens ele fez.
   ========================================================================== */

class AssemblersController {
  constructor() {
    this.currentEditingId = null;
    this.selectedAssemblerId = null;
    this.periodFilter = 'all'; // 'month' | 'year' | 'all'
  }

  init() {
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    const newBtn = document.getElementById('btn-new-assembler');
    if (newBtn) {
      newBtn.addEventListener('click', () => this.openAssemblerModal());
    }

    const form = document.getElementById('assembler-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    const periodPills = document.querySelectorAll('[data-assembler-period]');
    periodPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        periodPills.forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.periodFilter = e.currentTarget.dataset.assemblerPeriod;
        this.render();
      });
    });
  }

  /** Montagens de um montador no período, da mais recente para a mais antiga. */
  getAssemblerServices(assemblerId) {
    const monthPrefix = Utils.currentMonthPrefix();
    const yearPrefix = String(new Date().getFullYear());

    return window.storageManager.getServices()
      .filter(s => s.assemblerId === assemblerId)
      .filter(s => {
        const date = s.date || '';
        if (this.periodFilter === 'month') return date.startsWith(monthPrefix);
        if (this.periodFilter === 'year') return date.startsWith(yearPrefix);
        return true;
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  summarize(services) {
    let total = 0;
    let profit = 0;
    let concluidos = 0;
    let agendados = 0;

    services.forEach(s => {
      if (s.status === 'cancelado') return;
      total += Utils.serviceTotal(s);
      profit += Utils.serviceProfit(s);
      if (s.status === 'concluido') concluidos++;
      if (s.status === 'agendado') agendados++;
    });

    return { total, profit, concluidos, agendados, count: services.length };
  }

  openAssemblerModal(assemblerId = null) {
    this.currentEditingId = assemblerId;
    const form = document.getElementById('assembler-form');
    if (form) form.reset();

    const title = document.getElementById('assembler-modal-title');

    if (assemblerId) {
      if (title) title.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Montador';
      const a = window.storageManager.getAssemblers().find(item => item.id === assemblerId);
      if (a) {
        document.getElementById('assembler-name').value = a.name || '';
        document.getElementById('assembler-phone').value = a.phone || '';
        document.getElementById('assembler-is-owner').checked = !!a.isOwner;
      }
    } else if (title) {
      title.innerHTML = '<i class="fa-solid fa-helmet-safety"></i> Novo Montador';
    }

    window.app.openModal('assembler-modal');
  }

  handleFormSubmit() {
    const name = document.getElementById('assembler-name').value.trim();
    const phone = document.getElementById('assembler-phone').value.trim();
    const isOwner = document.getElementById('assembler-is-owner').checked;

    if (!name) {
      window.app.showToast('Informe o nome do montador.', 'danger');
      return;
    }

    const assemblers = window.storageManager.getAssemblers();

    // Só um montador pode ser marcado como dono.
    if (isOwner) {
      assemblers.forEach(a => {
        if (a.id !== this.currentEditingId) a.isOwner = false;
      });
    }

    if (this.currentEditingId) {
      const idx = assemblers.findIndex(a => a.id === this.currentEditingId);
      if (idx !== -1) {
        const previousName = assemblers[idx].name;
        assemblers[idx] = { ...assemblers[idx], name, phone, isOwner };
        window.storageManager.saveAssemblers(assemblers);

        // Mantém o nome gravado nos serviços em sincronia com o cadastro.
        if (previousName !== name) {
          const services = window.storageManager.getServices();
          let changed = false;
          services.forEach(s => {
            if (s.assemblerId === this.currentEditingId) {
              s.assemblerName = name;
              changed = true;
            }
          });
          if (changed) window.storageManager.saveServices(services);
        }

        window.app.showToast('Montador atualizado com sucesso!', 'success');
      }
    } else {
      assemblers.push({
        id: 'a_' + Date.now(),
        name, phone, isOwner,
        createdAt: new Date().toISOString()
      });
      window.storageManager.saveAssemblers(assemblers);
      window.app.showToast('Montador cadastrado com sucesso!', 'success');
    }

    window.app.closeModal('assembler-modal');
    this.render();
  }

  deleteAssembler(assemblerId) {
    const services = window.storageManager.getServices().filter(s => s.assemblerId === assemblerId);
    const aviso = services.length
      ? `Este montador tem ${services.length} montagem(ns) no histórico. Elas continuarão na agenda, mas ficarão sem responsável. Excluir mesmo assim?`
      : 'Deseja excluir este montador da equipe?';

    if (!confirm(aviso)) return;

    const assemblers = window.storageManager.getAssemblers().filter(a => a.id !== assemblerId);
    window.storageManager.saveAssemblers(assemblers);

    if (services.length) {
      const all = window.storageManager.getServices();
      all.forEach(s => {
        if (s.assemblerId === assemblerId) {
          s.assemblerId = null;
          s.assemblerName = '';
        }
      });
      window.storageManager.saveServices(all);
    }

    if (this.selectedAssemblerId === assemblerId) this.selectedAssemblerId = null;

    window.app.showToast('Montador removido da equipe.', 'warning');
    this.render();
    window.app.updateAllViews();
  }

  selectAssembler(assemblerId) {
    this.selectedAssemblerId = assemblerId;
    this.render();
  }

  render() {
    this.renderPicker();
    this.renderDetail();
  }

  renderPicker() {
    const container = document.getElementById('assembler-picker');
    if (!container) return;

    const assemblers = window.storageManager.getAssemblers();

    if (assemblers.length === 0) {
      container.innerHTML = `
        <div class="empty-day-state">
          <i class="fa-solid fa-user-slash"></i>
          <p>Nenhum montador cadastrado ainda.</p>
          <button class="btn btn-primary btn-sm" onclick="window.assemblersController.openAssemblerModal()">
            <i class="fa-solid fa-plus"></i> Cadastrar Montador
          </button>
        </div>
      `;
      return;
    }

    // Abre já com alguém selecionado para a tela não nascer vazia.
    if (!this.selectedAssemblerId) {
      const owner = assemblers.find(a => a.isOwner) || assemblers[0];
      this.selectedAssemblerId = owner.id;
    }

    const esc = (v) => Utils.escapeHtml(v);
    const colors = ['avatar-purple', 'avatar-green', 'avatar-blue', 'avatar-orange'];

    container.innerHTML = assemblers.map((a, i) => {
      const idArg = Utils.escapeJsString(a.id);
      const stats = this.summarize(this.getAssemblerServices(a.id));
      const isSelected = this.selectedAssemblerId === a.id;

      return `
        <button class="assembler-chip ${isSelected ? 'is-selected' : ''}"
                onclick="window.assemblersController.selectAssembler('${idArg}')">
          <div class="client-avatar ${colors[i % colors.length]}">${esc(Utils.initialOf(a.name, 'M'))}</div>
          <div class="assembler-chip-info">
            <strong>${esc(a.name)}${a.isOwner ? ' <span class="owner-tag">eu</span>' : ''}</strong>
            <span>${stats.count} montagem${stats.count === 1 ? '' : 's'} &bull; ${Utils.formatBRL(stats.total)}</span>
          </div>
        </button>
      `;
    }).join('');
  }

  renderDetail() {
    const panel = document.getElementById('assembler-detail-panel');
    if (!panel) return;

    const assembler = window.storageManager.getAssemblers()
      .find(a => a.id === this.selectedAssemblerId);

    if (!assembler) {
      panel.innerHTML = '';
      return;
    }

    const esc = (v) => Utils.escapeHtml(v);
    const idArg = Utils.escapeJsString(assembler.id);
    const services = this.getAssemblerServices(assembler.id);
    const stats = this.summarize(services);
    const stores = window.storageManager.getStores();

    panel.innerHTML = `
      <div class="grid-4" style="margin-bottom: 24px;">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Total produzido</span>
            <div class="stat-icon icon-green"><i class="fa-solid fa-sack-dollar"></i></div>
          </div>
          <div class="stat-value">${Utils.formatBRL(stats.total)}</div>
          <div class="stat-subtitle">Serviço + deslocamento</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Lucro líquido</span>
            <div class="stat-icon icon-blue"><i class="fa-solid fa-wallet"></i></div>
          </div>
          <div class="stat-value">${Utils.formatBRL(stats.profit)}</div>
          <div class="stat-subtitle">Já sem os gastos de material</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Concluídas</span>
            <div class="stat-icon icon-green"><i class="fa-solid fa-circle-check"></i></div>
          </div>
          <div class="stat-value">${stats.concluidos}</div>
          <div class="stat-subtitle">Montagens finalizadas</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Agendadas</span>
            <div class="stat-icon icon-red"><i class="fa-solid fa-calendar-check"></i></div>
          </div>
          <div class="stat-value">${stats.agendados}</div>
          <div class="stat-subtitle">Ainda por fazer</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">
            <i class="fa-solid fa-clipboard-list"></i> Montagens de ${esc(assembler.name)}
          </h3>
          <div class="detail-actions" style="margin: 0;">
            <button class="btn btn-outline btn-sm" onclick="window.assemblersController.openAssemblerModal('${idArg}')">
              <i class="fa-solid fa-pen"></i> Editar
            </button>
            <button class="btn btn-outline btn-sm" onclick="window.assemblersController.deleteAssembler('${idArg}')">
              <i class="fa-solid fa-trash" style="color: var(--danger);"></i> Excluir
            </button>
          </div>
        </div>

        ${services.length === 0 ? `
          <div class="empty-day-state">
            <i class="fa-regular fa-folder-open"></i>
            <p>Nenhuma montagem registrada para ${esc(assembler.name)} no período.</p>
          </div>
        ` : `
          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Origem</th>
                  <th>Status</th>
                  <th style="text-align: right;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${services.map(s => {
                  const store = stores.find(st => st.id === s.storeId);
                  const statusLabel = s.status === 'concluido' ? 'Concluído'
                    : (s.status === 'cancelado' ? 'Cancelado' : 'Agendado');
                  const statusClass = s.status === 'concluido' ? 'badge-concluido'
                    : (s.status === 'cancelado' ? 'badge-cancelado' : 'badge-agendado');

                  return `
                    <tr class="clickable-row" onclick="window.servicesController.openServiceDetailModal('${Utils.escapeJsString(s.id)}')">
                      <td><strong>${Utils.formatDateBR(s.date)}</strong></td>
                      <td>${esc(s.clientName)}</td>
                      <td>
                        <span class="type-tag">${esc(s.serviceType || 'Montagem')}</span>
                        <div class="table-subtext">${esc(s.description)}</div>
                      </td>
                      <td>${store ? esc(store.name) : 'Particular'}</td>
                      <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                      <td style="text-align: right; font-weight: 800;">${Utils.formatBRL(Utils.serviceTotal(s))}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }
}

window.assemblersController = new AssemblersController();
