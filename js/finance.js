/* ==========================================================================
   MOVELPRO - FINANCIAL CONTROLLER
   Full financial control, cash flow, charts, categories & metrics
   ========================================================================== */

class FinanceController {
  constructor() {
    this.currentPeriodFilter = 'month'; // 'today', 'week', 'month', 'year', 'all'
    this.currentTypeFilter = 'all'; // 'all', 'receita', 'despesa'
    this.cashflowChart = null;
    this.categoryChart = null;
    this.montadorPeriodo = 'all'; // filtro da tela financeira do montador
  }

  init() {
    this.bindEvents();
    this.render();
  }

  /* ---------- Financeiro do montador ---------- */

  /**
   * Tela do montador: quanto ele já recebeu e quanto tem a receber pelas
   * montagens em que foi escalado.
   *
   * Trabalha sobre o repasse (assemblerPay), nunca sobre o valor cobrado do
   * cliente nem sobre os lançamentos do caixa do negócio. O que entra aqui é
   * apenas o que Utils.servicosVisiveis() devolve — as montagens dele.
   */
  renderMontador() {
    const auth = window.authController;
    const lista = document.getElementById('mont-lista');
    if (!lista) return;

    // Montador sem e-mail vinculado no cadastro não tem como ser identificado.
    if (auth && !auth.getCurrentAssemblerId()) {
      this.zerarPainelMontador();
      lista.innerHTML = `
        <div class="empty-day-state">
          <i class="fa-solid fa-user-lock"></i>
          <p>Sua conta ainda não está ligada a um montador do cadastro.</p>
          <small style="color: var(--text-muted);">
            Peça ao administrador para abrir <strong>Montadores</strong>, editar o seu
            cadastro e preencher o campo <strong>E-mail de login</strong> com este mesmo e-mail.
          </small>
        </div>
      `;
      return;
    }

    const meus = this.filtrarPeriodoMontador(Utils.servicosVisiveis())
      .filter(s => s.status !== 'cancelado')
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    let recebido = 0;
    let aReceber = 0;
    let concluidas = 0;
    let agendadas = 0;

    meus.forEach(s => {
      const pay = Utils.assemblerPay(s);
      if (s.status === 'concluido') {
        recebido += pay;
        concluidas++;
      } else {
        aReceber += pay;
        agendadas++;
      }
    });

    const def = (id, valor) => {
      const el = document.getElementById(id);
      if (el) el.textContent = valor;
    };
    def('mont-recebido', Utils.formatBRL(recebido));
    def('mont-a-receber', Utils.formatBRL(aReceber));
    def('mont-concluidas', String(concluidas));
    def('mont-agendadas', String(agendadas));
    def('mont-contador', meus.length === 1 ? '1 montagem' : `${meus.length} montagens`);

    if (meus.length === 0) {
      lista.innerHTML = `
        <div class="empty-day-state">
          <i class="fa-regular fa-folder-open"></i>
          <p>Nenhuma montagem sua neste período.</p>
        </div>
      `;
      return;
    }

    const esc = (v) => Utils.escapeHtml(v);
    lista.innerHTML = meus.map(s => {
      const pay = Utils.assemblerPay(s);
      const pago = s.status === 'concluido';
      return `
        <button class="history-item" onclick="window.servicesController.openServiceDetailModal('${Utils.escapeJsString(s.id)}')">
          <div class="history-main">
            <h5><span class="type-tag">${esc(s.serviceType || 'Montagem')}</span> ${esc(s.description)}</h5>
            <span class="history-date">${Utils.formatDateBR(s.date)} às ${esc(s.time)}h &bull; ${esc(s.clientName)}</span>
            <span class="badge ${pago ? 'badge-pago' : 'badge-pendente'}">
              ${pago ? 'Recebido' : 'A receber'}
            </span>
          </div>
          <div class="history-money">
            <strong style="color: ${pago ? 'var(--success-dark)' : 'var(--primary)'};">${Utils.formatBRL(pay)}</strong>
            <span class="history-net">${pago ? 'você recebeu' : 'você recebe'}</span>
          </div>
        </button>
      `;
    }).join('');
  }

  zerarPainelMontador() {
    [['mont-recebido', 'R$ 0,00'], ['mont-a-receber', 'R$ 0,00'],
     ['mont-concluidas', '0'], ['mont-agendadas', '0'], ['mont-contador', '0']]
      .forEach(([id, v]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
      });
  }

  filtrarPeriodoMontador(servicos) {
    const filtro = this.montadorPeriodo || 'all';
    if (filtro === 'all') return servicos;

    const mes = Utils.currentMonthPrefix();
    const ano = String(new Date().getFullYear());
    return servicos.filter(s => {
      const d = s.date || '';
      if (filtro === 'month') return d.startsWith(mes);
      if (filtro === 'year') return d.startsWith(ano);
      return true;
    });
  }

  bindEvents() {
    // Filtro de período da tela do montador
    const montadorPills = document.querySelectorAll('[data-montador-period]');
    montadorPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        montadorPills.forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.montadorPeriodo = e.currentTarget.dataset.montadorPeriod;
        this.renderMontador();
      });
    });

    // Period filter pills
    const periodPills = document.querySelectorAll('[data-finance-period]');
    periodPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        periodPills.forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        this.currentPeriodFilter = e.target.dataset.financePeriod;
        this.render();
      });
    });

    // Type filter pills
    const typePills = document.querySelectorAll('[data-finance-type]');
    typePills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        typePills.forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        this.currentTypeFilter = e.target.dataset.financeType;
        this.renderTable();
      });
    });

    // Transaction form submit
    const txForm = document.getElementById('transaction-form');
    if (txForm) {
      txForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTransactionSubmit();
      });
    }

    // Toggle categories based on transaction type in modal
    const typeSelect = document.getElementById('tx-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        this.updateCategoryOptions(e.target.value);
      });
    }
  }

  updateCategoryOptions(type) {
    const categorySelect = document.getElementById('tx-category');
    if (!categorySelect) return;

    if (type === 'receita') {
      categorySelect.innerHTML = `
        <option value="Montagem Particular">Montagem Particular</option>
        <option value="Montagem Loja / Parceria">Montagem Loja / Parceria</option>
        <option value="Desmontagem">Desmontagem</option>
        <option value="Reparo e Regulagem">Reparo e Regulagem</option>
        <option value="Instalação na Parede">Instalação na Parede</option>
        <option value="Outras Receitas">Outras Receitas</option>
      `;
    } else {
      categorySelect.innerHTML = `
        <option value="Combustível">Combustível</option>
        <option value="Ferramentas / Ferragens">Ferramentas / Ferragens</option>
        <option value="Alimentação">Alimentação</option>
        <option value="Manutenção do Veículo">Manutenção do Veículo</option>
        <option value="Pedágio / Estacionamento">Pedágio / Estacionamento</option>
        <option value="EPI / Segurança">EPI / Segurança</option>
        <option value="Outras Despesas">Outras Despesas</option>
      `;
    }
  }

  openTransactionModal(type = 'receita') {
    const auth = window.authController;
    if (auth && !auth.podeVerValoresCheios()) {
      window.app.showToast('Apenas o administrador pode lançar receitas ou despesas.', 'warning');
      return;
    }

    const form = document.getElementById('transaction-form');
    if (form) form.reset();

    const typeSelect = document.getElementById('tx-type');
    if (typeSelect) {
      typeSelect.value = type;
      this.updateCategoryOptions(type);
    }

    const dateInput = document.getElementById('tx-date');
    if (dateInput) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }

    const modalTitle = document.getElementById('tx-modal-title');
    if (modalTitle) {
      modalTitle.innerHTML = type === 'receita'
        ? '<i class="fa-solid fa-circle-plus" style="color: var(--success);"></i> Nova Receita (Entrada)'
        : '<i class="fa-solid fa-circle-minus" style="color: var(--danger);"></i> Nova Despesa (Saída)';
    }

    window.app.openModal('transaction-modal');
  }

  handleTransactionSubmit() {
    const type = document.getElementById('tx-type').value;
    const category = document.getElementById('tx-category').value;
    const description = document.getElementById('tx-description').value.trim();
    const value = parseFloat(document.getElementById('tx-value').value) || 0;
    const date = document.getElementById('tx-date').value;
    const paymentMethod = document.getElementById('tx-payment-method').value;
    const status = document.getElementById('tx-status').value;

    if (!description) {
      window.app.showToast('Informe uma descrição.', 'danger');
      return;
    }

    if (value <= 0) {
      window.app.showToast('Informe um valor válido maior que zero.', 'danger');
      return;
    }

    if (!date) {
      window.app.showToast('Informe a data do lançamento.', 'danger');
      return;
    }

    const transactions = window.storageManager.getTransactions();
    const newTx = {
      id: 'tx_' + Date.now(),
      type,
      category,
      description,
      value,
      date,
      paymentMethod,
      status,
      createdAt: new Date().toISOString()
    };

    transactions.push(newTx);
    window.storageManager.saveTransactions(transactions);

    window.app.closeModal('transaction-modal');
    window.app.showToast(`${type === 'receita' ? 'Receita' : 'Despesa'} lançada com sucesso!`, 'success');

    this.render();
    window.app.updateAllViews();
  }

  deleteTransaction(txId) {
    const auth = window.authController;
    if (auth && !auth.podeVerValoresCheios()) {
      window.app.showToast('Apenas o administrador pode excluir lançamentos financeiros.', 'warning');
      return;
    }

    if (!confirm('Deseja realmente excluir este lançamento financeiro?')) return;
    let transactions = window.storageManager.getTransactions();
    transactions = transactions.filter(t => t.id !== txId);
    window.storageManager.saveTransactions(transactions);

    window.app.showToast('Lançamento financeiro removido.', 'warning');
    this.render();
    window.app.updateAllViews();
  }

  filterTransactionsByPeriod(transactions) {
    const now = new Date();
    const todayStr = Utils.todayISO();
    const monthPrefix = Utils.currentMonthPrefix();
    const yearPrefix = String(now.getFullYear());

    return transactions.filter(t => {
      const date = t.date || '';
      if (this.currentPeriodFilter === 'all') return true;
      if (this.currentPeriodFilter === 'today') return date === todayStr;
      if (this.currentPeriodFilter === 'month') return date.startsWith(monthPrefix);
      if (this.currentPeriodFilter === 'year') return date.startsWith(yearPrefix);

      if (this.currentPeriodFilter === 'week') {
        const [y, m, d] = date.split('-').map(Number);
        if (!y || !m || !d) return false;
        const txDate = new Date(y, m - 1, d);
        const diffDays = Math.abs((now - txDate) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }

      return true;
    });
  }

  render() {
    // O montador tem a própria tela: só o repasse dele, nunca o caixa do
    // negócio. Sair aqui evita até montar os gráficos que ele não pode ver.
    const auth = window.authController;
    if (auth && !auth.podeVerValoresCheios()) {
      this.renderMontador();
      return;
    }

    const allTransactions = window.storageManager.getTransactions();
    const periodTransactions = this.filterTransactionsByPeriod(allTransactions);

    // Calculate metrics
    let totalReceitas = 0;
    let totalDespesas = 0;
    let totalPendente = 0;
    let countReceitas = 0;

    periodTransactions.forEach(t => {
      if (t.type === 'receita') {
        if (t.status === 'pago') {
          totalReceitas += t.value;
          countReceitas++;
        } else {
          totalPendente += t.value;
        }
      } else if (t.type === 'despesa') {
        if (t.status === 'pago') {
          totalDespesas += t.value;
        }
      }
    });

    // Also include pending services from agenda
    const services = window.storageManager.getServices();
    services.forEach(s => {
      if (s.status === 'cancelado') return;
      if (s.status === 'agendado' || s.paymentStatus === 'pendente') {
        // if date is in current period
        if (this.currentPeriodFilter === 'month' && (s.date || '').startsWith(Utils.currentMonthPrefix())) {
          totalPendente += Utils.serviceTotal(s);
        } else if (this.currentPeriodFilter === 'all') {
          totalPendente += Utils.serviceTotal(s);
        }
      }
    });

    const saldoLiquido = totalReceitas - totalDespesas;
    const ticketMedio = countReceitas > 0 ? totalReceitas / countReceitas : 0;

    // Update KPIs on DOM
    const elSaldo = document.getElementById('fin-saldo-liquido');
    const elReceitas = document.getElementById('fin-total-receitas');
    const elDespesas = document.getElementById('fin-total-despesas');
    const elPendente = document.getElementById('fin-total-pendente');
    const elTicket = document.getElementById('fin-ticket-medio');

    if (elSaldo) elSaldo.textContent = `R$ ${saldoLiquido.toFixed(2).replace('.', ',')}`;
    if (elReceitas) elReceitas.textContent = `R$ ${totalReceitas.toFixed(2).replace('.', ',')}`;
    if (elDespesas) elDespesas.textContent = `R$ ${totalDespesas.toFixed(2).replace('.', ',')}`;
    if (elPendente) elPendente.textContent = `R$ ${totalPendente.toFixed(2).replace('.', ',')}`;
    if (elTicket) elTicket.textContent = `R$ ${ticketMedio.toFixed(2).replace('.', ',')}`;

    // Update Monthly Goal Progress Bar
    const settings = window.storageManager.getSettings();
    const monthlyGoal = settings.monthlyGoal || 5000;
    const goalPercent = Math.min(100, Math.round((totalReceitas / monthlyGoal) * 100));

    const goalBar = document.getElementById('fin-goal-progress');
    const goalText = document.getElementById('fin-goal-text');
    if (goalBar) goalBar.style.width = `${goalPercent}%`;
    if (goalText) goalText.textContent = `${goalPercent}% atingido (Meta: R$ ${monthlyGoal.toFixed(2).replace('.', ',')})`;

    // Render Table and Charts
    this.renderTable();
    this.renderCharts(periodTransactions);
  }

  renderTable() {
    const container = document.getElementById('fin-transactions-table-body');
    if (!container) return;

    let transactions = this.filterTransactionsByPeriod(window.storageManager.getTransactions());

    if (this.currentTypeFilter !== 'all') {
      transactions = transactions.filter(t => t.type === this.currentTypeFilter);
    }

    // Sort descending by date
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (transactions.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 28px; color: var(--text-muted);">
            Nenhum lançamento financeiro encontrado para este período.
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = transactions.map(t => {
      const isReceita = t.type === 'receita';
      const [y, m, d] = t.date.split('-');
      const formattedDate = `${d}/${m}/${y}`;

      return `
        <tr>
          <td><strong>${formattedDate}</strong></td>
          <td>
            <span class="badge ${isReceita ? 'badge-concluido' : 'badge-agendado'}">
              <i class="fa-solid ${isReceita ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
              ${isReceita ? 'Receita' : 'Despesa'}
            </span>
          </td>
          <td><span style="font-weight: 600;">${t.category || '-'}</span></td>
          <td>${t.description}</td>
          <td><span style="font-size: 0.85rem; color: var(--text-muted);">${t.paymentMethod || 'PIX'}</span></td>
          <td style="font-weight: 800; font-size: 1rem; color: ${isReceita ? 'var(--success-dark)' : 'var(--danger-dark)'};">
            ${isReceita ? '+' : '-'} R$ ${t.value.toFixed(2).replace('.', ',')}
          </td>
          <td style="text-align: right;">
            <button class="btn btn-outline btn-icon" style="width: 32px; height: 32px; font-size: 0.8rem;" title="Excluir" onclick="window.financeController.deleteTransaction('${t.id}')">
              <i class="fa-solid fa-trash" style="color: var(--danger);"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderCharts(transactions) {
    if (typeof Chart === 'undefined') return;

    // Os gráficos seguem o tema ativo, senão o texto some no modo escuro.
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.12)';
    Chart.defaults.color = textColor;

    // 1. Cashflow Bar Chart
    const ctxCashflow = document.getElementById('chart-cashflow');
    if (ctxCashflow) {
      if (this.cashflowChart) {
        this.cashflowChart.destroy();
      }

      // Últimos 6 meses reais, direto dos lançamentos (sem números fictícios)
      const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const now = new Date();
      const months = [];
      const monthKeys = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(MONTH_LABELS[d.getMonth()]);
        monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }

      const receitasData = new Array(6).fill(0);
      const despesasData = new Array(6).fill(0);

      window.storageManager.getTransactions().forEach(t => {
        if (t.status !== 'pago') return;
        const idx = monthKeys.indexOf(Utils.monthPrefixOf(t.date));
        if (idx === -1) return;
        if (t.type === 'receita') receitasData[idx] += Utils.toNumber(t.value);
        if (t.type === 'despesa') despesasData[idx] += Utils.toNumber(t.value);
      });

      this.cashflowChart = new Chart(ctxCashflow, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Receitas (R$)',
              data: receitasData,
              backgroundColor: '#10B981',
              borderRadius: 6
            },
            {
              label: 'Despesas (R$)',
              data: despesasData,
              backgroundColor: '#EF4444',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: (c) => `${c.dataset.label}: R$ ${c.raw.toFixed(2).replace('.', ',')}`
              }
            }
          },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor }
            },
            y: {
              beginAtZero: true,
              grid: { color: gridColor },
              ticks: {
                color: textColor,
                callback: (v) => `R$ ${v}`
              }
            }
          }
        }
      });
    }

    // 2. Expenses by Category Doughnut Chart
    const ctxCategory = document.getElementById('chart-category');
    if (ctxCategory) {
      if (this.categoryChart) {
        this.categoryChart.destroy();
      }

      const catMap = {};
      transactions.forEach(t => {
        if (t.type === 'despesa') {
          catMap[t.category] = (catMap[t.category] || 0) + t.value;
        }
      });

      const labels = Object.keys(catMap);
      const data = Object.values(catMap);

      if (labels.length === 0) {
        labels.push('Sem despesas');
        data.push(1);
      }

      this.categoryChart = new Chart(ctxCategory, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: [
              '#FF5E1E', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'
            ],
            borderColor: isDark ? '#131C2E' : '#FFFFFF',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: textColor } }
          }
        }
      });
    }
  }
}

window.financeController = new FinanceController();
