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

    const ownerCheckbox = document.getElementById('assembler-is-owner');
    if (ownerCheckbox) {
      ownerCheckbox.addEventListener('change', (e) => {
        const loginFields = document.getElementById('assembler-login-fields');
        if (loginFields) {
          loginFields.style.display = e.target.checked ? 'none' : 'block';
        }
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

    // Índice pronto por montador, em vez de varrer todos os serviços por linha.
    return window.storageManager.servicesOf('assemblerId', assemblerId)
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
    let repasse = 0;
    let sobra = 0;
    let profit = 0;
    let concluidos = 0;
    let agendados = 0;

    services.forEach(s => {
      if (s.status === 'cancelado') return;
      total += Utils.serviceTotal(s);
      repasse += Utils.assemblerPay(s);
      const sSobra = Utils.ownerNet(s);
      sobra += sSobra;
      profit += sSobra;
      if (s.status === 'concluido') concluidos++;
      if (s.status === 'agendado') agendados++;
    });

    return { total, repasse, sobra, profit, concluidos, agendados, count: services.length };
  }

  openAssemblerModal(assemblerId = null) {
    const auth = window.authController;
    if (auth && !auth.podeVerValoresCheios()) {
      window.app.showToast('Apenas o administrador pode gerenciar a equipe de montadores.', 'warning');
      return;
    }

    this.currentEditingId = assemblerId;
    const form = document.getElementById('assembler-form');
    if (form) form.reset();

    const title = document.getElementById('assembler-modal-title');
    const pwdInput = document.getElementById('assembler-password');
    const pwdHint = document.getElementById('assembler-password-hint');
    const loginFields = document.getElementById('assembler-login-fields');

    if (assemblerId) {
      if (title) title.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Montador';
      const a = window.storageManager.getAssemblers().find(item => item.id === assemblerId);
      if (a) {
        document.getElementById('assembler-name').value = a.name || '';
        document.getElementById('assembler-phone').value = a.phone || '';
        const pixEl = document.getElementById('assembler-pix-key');
        if (pixEl) pixEl.value = a.pixKey || '';
        document.getElementById('assembler-email').value = a.email || '';
        document.getElementById('assembler-is-owner').checked = !!a.isOwner;
      }
      if (pwdInput) pwdInput.value = '';
      if (pwdHint) pwdHint.textContent = 'Deixe em branco para manter a senha atual, ou digite uma nova para alterar.';
    } else {
      if (title) title.innerHTML = '<i class="fa-solid fa-helmet-safety"></i> Novo Montador';
      if (pwdInput) pwdInput.value = '';
      if (pwdHint) pwdHint.textContent = 'Defina a senha inicial (mínimo 6 caracteres) para que o montador possa entrar no app no celular dele.';
    }

    const isOwnerChecked = document.getElementById('assembler-is-owner')?.checked;
    if (loginFields) {
      loginFields.style.display = isOwnerChecked ? 'none' : 'block';
    }

    window.app.openModal('assembler-modal');
  }

  async handleFormSubmit() {
    const name = document.getElementById('assembler-name').value.trim();
    const phone = document.getElementById('assembler-phone').value.trim();
    const pixKeyEl = document.getElementById('assembler-pix-key');
    const pixKey = pixKeyEl ? pixKeyEl.value.trim() : '';
    const email = document.getElementById('assembler-email').value.trim().toLowerCase();
    const password = (document.getElementById('assembler-password')?.value || '').trim();
    const isOwner = document.getElementById('assembler-is-owner').checked;

    if (!name) {
      window.app.showToast('Informe o nome do montador.', 'danger');
      return;
    }

    if (!isOwner && email && password && password.length < 6) {
      window.app.showToast('A senha de acesso do montador deve ter no mínimo 6 caracteres.', 'danger');
      return;
    }

    const submitBtn = document.getElementById('assembler-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    }

    try {
      let contaCriada = false;
      let loginFalhou = false;

      // Se informou e-mail e senha, provisiona a conta de login no Firebase Authentication
      if (!isOwner && email && password && window.authController) {
        try {
          await window.authController.criarContaFuncionario(name, email, password, phone);
          contaCriada = true;
        } catch (authErr) {
          if (authErr && authErr.code === 'auth/email-already-in-use') {
            console.info('Conta do Firebase já existia para este e-mail.');
          } else {
            // O cadastro do montador segue salvo, mas sem login ele nao entra
            // no sistema. Anotamos para a mensagem final nao dizer "sucesso".
            loginFalhou = true;
            console.warn('Aviso ao criar conta de acesso:', authErr);
            window.app.showToast(window.authController.explicarErroDeCadastro(authErr), 'danger');
          }
        }
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
          assemblers[idx] = { ...assemblers[idx], name, phone, email, isOwner, pixKey };
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

          if (contaCriada) {
            window.app.showToast(`Montador ${name} atualizado e conta de login criada!`, 'success');
          } else if (loginFalhou) {
            window.app.showToast(
              `${name} foi salvo na equipe, mas SEM login: ele ainda não consegue entrar no sistema.`,
              'warning'
            );
          } else {
            window.app.showToast('Montador atualizado com sucesso!', 'success');
          }
        }
      } else {
        // Se a conta acabou de ser criada por criarContaFuncionario, o vincularMontador já pode ter adicionado
        const existente = assemblers.find(a => email && String(a.email || '').toLowerCase() === email);
        if (!existente) {
          assemblers.push({
            id: 'a_' + Date.now(),
            name, phone, email, isOwner, pixKey,
            createdAt: new Date().toISOString()
          });
          window.storageManager.saveAssemblers(assemblers);
        }

        if (contaCriada) {
          window.app.showToast(`Montador ${name} cadastrado! Conta de login criada com sucesso.`, 'success');
        } else if (loginFalhou) {
          window.app.showToast(
            `${name} entrou na equipe, mas SEM login: ele ainda não consegue entrar no sistema.`,
            'warning'
          );
        } else {
          window.app.showToast('Montador cadastrado com sucesso!', 'success');
        }
      }

      window.app.closeModal('assembler-modal');
      this.render();
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Montador';
      }
    }
  }

  deleteAssembler(assemblerId) {
    const auth = window.authController;
    if (auth && !auth.podeVerValoresCheios()) {
      window.app.showToast('Apenas o administrador pode remover montadores da equipe.', 'warning');
      return;
    }

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
      const valorChip = a.isOwner
        ? Utils.formatBRL(stats.total)
        : `Repasse: ${Utils.formatBRL(stats.repasse)}`;

      return `
        <button class="assembler-chip ${isSelected ? 'is-selected' : ''}"
                onclick="window.assemblersController.selectAssembler('${idArg}')">
          <div class="client-avatar ${colors[i % colors.length]}">${esc(Utils.initialOf(a.name, 'M'))}</div>
          <div class="assembler-chip-info">
            <strong>${esc(a.name)}${a.isOwner ? ' <span class="owner-tag">eu</span>' : ''}</strong>
            <span>${stats.count} montagem${stats.count === 1 ? '' : 's'} &bull; ${valorChip}</span>
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

    const auth = window.authController;
    const ehAdmin = !auth || auth.podeVerValoresCheios();
    const esc = (v) => Utils.escapeHtml(v);
    const idArg = Utils.escapeJsString(assembler.id);
    const services = this.getAssemblerServices(assembler.id);
    const stats = this.summarize(services);
    const stores = window.storageManager.getStores();

    // Cards de indicadores no topo do painel
    let statCardsHtml = '';
    if (assembler.isOwner) {
      statCardsHtml = `
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
      `;
    } else if (!ehAdmin) {
      // Montador / Funcionário logado: vê apenas os seus próprios repasses!
      statCardsHtml = `
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Você recebe</span>
            <div class="stat-icon icon-green"><i class="fa-solid fa-hand-holding-dollar"></i></div>
          </div>
          <div class="stat-value">${Utils.formatBRL(stats.repasse)}</div>
          <div class="stat-subtitle">Total a receber no período</div>
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
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Total de Montagens</span>
            <div class="stat-icon icon-blue"><i class="fa-solid fa-clipboard-list"></i></div>
          </div>
          <div class="stat-value">${stats.count}</div>
          <div class="stat-subtitle">No período selecionado</div>
        </div>
      `;
    } else {
      // Administrador visualizando o montador parceiro / funcionário
      statCardsHtml = `
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">A pagar ao montador</span>
            <div class="stat-icon icon-orange"><i class="fa-solid fa-hand-holding-dollar"></i></div>
          </div>
          <div class="stat-value" style="color: var(--primary);">${Utils.formatBRL(stats.repasse)}</div>
          <div class="stat-subtitle">Repasse combinado ao montador</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Sobra para você</span>
            <div class="stat-icon icon-blue"><i class="fa-solid fa-wallet"></i></div>
          </div>
          <div class="stat-value" style="color: var(--success);">${Utils.formatBRL(stats.sobra)}</div>
          <div class="stat-subtitle">Lucro líquido após repasse e material</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Total cobrado</span>
            <div class="stat-icon icon-green"><i class="fa-solid fa-sack-dollar"></i></div>
          </div>
          <div class="stat-value">${Utils.formatBRL(stats.total)}</div>
          <div class="stat-subtitle">Cobrado do cliente (serviço + desloc.)</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Montagens</span>
            <div class="stat-icon icon-red"><i class="fa-solid fa-calendar-check"></i></div>
          </div>
          <div class="stat-value">${stats.concluidos} conc. / ${stats.agendados} agend.</div>
          <div class="stat-subtitle">${stats.count} serviço(s) no período</div>
        </div>
      `;
    }

    const tableValorHeader = assembler.isOwner
      ? 'Valor'
      : (ehAdmin ? 'Repasse Montador' : 'Você Recebe');

    panel.innerHTML = `
      <div class="grid-4" style="margin-bottom: 24px;">
        ${statCardsHtml}
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title" style="margin-bottom: 0;">
            <i class="fa-solid fa-clipboard-list"></i> Montagens de ${esc(assembler.name)}
          </h3>
          ${ehAdmin && assembler.pixKey ? `
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px; font-weight: normal; margin-bottom: 10px;">
              <i class="fa-brands fa-pix" style="color: #32bcad;"></i> PIX: 
              <span style="font-weight: 600;">${esc(assembler.pixKey)}</span>
              <button class="btn btn-outline btn-sm" style="padding: 2px 6px; font-size: 0.7rem; margin-left: 8px;" onclick="navigator.clipboard.writeText('${esc(assembler.pixKey)}').then(() => window.app.showToast('Chave PIX copiada!', 'success'))">
                Copiar
              </button>
            </div>
          ` : ''}
          ${ehAdmin ? `
            <div class="detail-actions" style="margin: 0;">
              <button class="btn btn-outline btn-sm" onclick="window.assemblersController.openAssemblerModal('${idArg}')">
                <i class="fa-solid fa-pen"></i> Editar
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.assemblersController.deleteAssembler('${idArg}')">
                <i class="fa-solid fa-trash" style="color: var(--danger);"></i> Excluir
              </button>
            </div>
          ` : ''}
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
                  <th style="text-align: right;">${tableValorHeader}</th>
                </tr>
              </thead>
              <tbody>
                ${services.map(s => {
                  const store = stores.find(st => st.id === s.storeId);
                  const statusLabel = s.status === 'concluido' ? 'Concluído'
                    : (s.status === 'cancelado' ? 'Cancelado' : 'Agendado');
                  const statusClass = s.status === 'concluido' ? 'badge-concluido'
                    : (s.status === 'cancelado' ? 'badge-cancelado' : 'badge-agendado');

                  const total = Utils.serviceTotal(s);
                  const pay = Utils.assemblerPay(s);
                  const sobra = Utils.ownerNet(s);

                  let valorTd = '';
                  if (assembler.isOwner) {
                    valorTd = `<div style="text-align: right; font-weight: 800;">${Utils.formatBRL(total)}</div>`;
                  } else if (!ehAdmin) {
                    // O funcionário só vê o que ele vai receber!
                    valorTd = `<div style="text-align: right; font-weight: 800; color: var(--primary);">${Utils.formatBRL(pay)}</div>`;
                  } else {
                    // Administrador vê o repasse como destaque e os totais da empresa abaixo
                    valorTd = `
                      <div style="text-align: right;">
                        <div style="font-weight: 800; color: var(--primary); font-size: 0.96rem;">${Utils.formatBRL(pay)}</div>
                        <div class="table-subtext" style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">
                          Cobrado: ${Utils.formatBRL(total)} &bull; Sobra: <strong style="color: var(--success);">${Utils.formatBRL(sobra)}</strong>
                        </div>
                      </div>
                    `;
                  }

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
                      <td>${valorTd}</td>
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
