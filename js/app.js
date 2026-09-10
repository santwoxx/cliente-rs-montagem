/* ==========================================================================
   MOVELPRO - MAIN APP & ROUTING ORCHESTRATOR
   SPA Navigation, Modals, Toasts, Settings & Synchronization
   ========================================================================== */

class App {
  constructor() {
    this.currentView = 'view-agenda'; // Start directly in Agenda or Dashboard

    // Como cada tela se redesenha. Só é chamado para a tela que está à vista.
    this.RENDERIZADORES = {
      'view-inicio': () => this.updateDashboardKPIs(),
      'view-agenda': () => {
        window.calendarController.render();
        window.calendarController.renderDayServices(window.calendarController.selectedDate);
      },
      'view-financeiro': () => window.financeController.render(),
      'view-clientes': () => window.customersController.render(),
      'view-montadores': () => window.assemblersController.render(),
      'view-lojas': () => window.storesController.render()
    };

    // Telas que mudaram e ainda não foram redesenhadas.
    this.viewsDesatualizadas = new Set();
  }

  init() {
    this.applyTheme(window.storageManager.getSettings().theme);

    this.bindNavigation();
    this.bindModals();
    this.bindSettings();
    this.bindGlobalFAB();

    // Initialize license & paywall controller
    if (window.licenseController) window.licenseController.init();

    // Initialize all sub-modules
    if (window.authController) window.authController.init();
    window.calendarController.init();
    window.servicesController.init();
    window.financeController.init();
    window.customersController.init();
    window.storesController.init();
    window.assemblersController.init();
    window.quotesController.init();
    window.notificationsController.init();
    window.pwaController.init();

    // Fotos de agendamentos que nunca chegaram a ser salvos não podem
    // ficar ocupando a memória do celular.
    window.photoStore.limparOrfas();

    // Default start view is Agenda (matching user's screenshot) or Início
    this.navigateTo('view-agenda');
    this.updateDashboardKPIs();
    this.loadSettingsForm();
  }

  bindNavigation() {
    // Desktop & Mobile nav triggers
    const navTriggers = document.querySelectorAll('[data-view-target]');
    navTriggers.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.viewTarget;
        if (target) {
          this.navigateTo(target);
        }
      });
    });
  }

  navigateTo(viewId) {
    const auth = window.authController;
    if (auth && !auth.podeVerValoresCheios()) {
      // Ajustes fica de fora desta lista de propósito: é lá que o montador
      // troca o tema, instala o app e libera as notificações. O que é do dono
      // dentro da tela (perfil, chave PIX, backup, equipe) está marcado como
      // data-admin-only e some para ele.
      const adminViews = ['view-financeiro', 'view-orcamentos', 'view-montadores', 'view-lojas'];
      if (adminViews.includes(viewId)) {
        this.navigateTo('view-agenda');
        this.showToast('Esta área é de acesso exclusivo do administrador.', 'warning');
        return;
      }
    }

    this.currentView = viewId;

    // Toggle view elements
    const views = document.querySelectorAll('.app-view');
    views.forEach(v => {
      v.classList.toggle('active', v.id === viewId);
    });

    // Update active state in Desktop Sidebar
    const sidebarLinks = document.querySelectorAll('.sidebar-nav .nav-item');
    sidebarLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.viewTarget === viewId);
    });

    // Update active state in Mobile Bottom Nav
    const bottomLinks = document.querySelectorAll('.mobile-bottom-nav .bottom-nav-item');
    bottomLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.viewTarget === viewId);
    });

    // Update Header Title
    this.updateHeaderTitle(viewId);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Recarrega a tela de destino só se ela ficou desatualizada.
    this.renderViewSeNecessario(viewId);

    if (viewId === 'view-ajustes') this.renderUsoDeMemoria();
  }

  /** Mostra em Ajustes quanto o app já ocupa no aparelho. */
  renderUsoDeMemoria() {
    const el = document.getElementById('uso-memoria');
    if (!el) return;

    const uso = window.storageManager.usoDeMemoria();
    const partes = [`<i class="fa-solid fa-database"></i> Ocupando <strong>${uso.totalKB} KB</strong> neste aparelho`];

    if (uso.gruposDeFotos > 0) {
      partes.push(`${uso.fotosKB} KB são fotos de ${uso.gruposDeFotos} serviço(s)`);
    }

    el.innerHTML = partes.join(' &bull; ');
  }

  updateHeaderTitle(viewId) {
    const titleEl = document.getElementById('header-title');
    const subtitleEl = document.getElementById('header-subtitle');

    const titles = {
      'view-inicio': { title: '<i class="fa-solid fa-house" style="color: var(--primary);"></i> Início', subtitle: 'Visão geral do seu negócio de montagem' },
      'view-agenda': { title: '<i class="fa-regular fa-calendar-days" style="color: var(--primary);"></i> Agenda', subtitle: 'Visualize seus serviços por data' },
      'view-financeiro': { title: '<i class="fa-solid fa-wallet" style="color: var(--primary);"></i> Controle Financeiro', subtitle: 'Fluxo de caixa, receitas, despesas e metas' },
      'view-clientes': { title: '<i class="fa-solid fa-users" style="color: var(--primary);"></i> Clientes', subtitle: 'Gestão da sua carteira de clientes' },
      'view-montadores': { title: '<i class="fa-solid fa-helmet-safety" style="color: var(--primary);"></i> Painel dos Montadores', subtitle: 'Escolha um montador e veja as montagens que ele fez' },
      'view-lojas': { title: '<i class="fa-solid fa-store" style="color: var(--primary);"></i> Lojas Parceiras', subtitle: 'Montagens por loja e nota única somando todos os serviços' },
      'view-orcamentos': { title: '<i class="fa-solid fa-calculator" style="color: var(--primary);"></i> Orçamentos & Preços', subtitle: 'Calculadora de montagem rápida e orçamentos para WhatsApp' },
      'view-ajustes': { title: '<i class="fa-solid fa-gear" style="color: var(--primary);"></i> Configurações', subtitle: 'Perfil, Chave PIX, Metas e Backup dos dados' }
    };

    const info = titles[viewId] || { title: 'MovelPRO', subtitle: 'RS Montagens' };
    if (titleEl) titleEl.innerHTML = info.title;

    let subtitulo = info.subtitle;

    // Para o montador, Ajustes só tem tema, instalação e avisos — prometer
    // "Perfil, Chave PIX e Backup" seria propaganda enganosa.
    const auth = window.authController;
    if (viewId === 'view-ajustes' && auth && !auth.podeVerValoresCheios()) {
      subtitulo = 'Tema do app, instalação no celular e avisos de montagem';
    }

    if (subtitleEl) subtitleEl.textContent = subtitulo;
  }

  bindGlobalFAB() {
    const fabBtn = document.getElementById('global-fab-btn');
    if (fabBtn) {
      fabBtn.addEventListener('click', () => {
        const auth = window.authController;
        if (auth && !auth.podeVerValoresCheios()) {
          return;
        }

        if (this.currentView === 'view-financeiro') {
          window.financeController.openTransactionModal('receita');
        } else if (this.currentView === 'view-clientes') {
          window.customersController.openCustomerModal();
        } else if (this.currentView === 'view-lojas') {
          window.storesController.openStoreModal();
        } else if (this.currentView === 'view-montadores') {
          window.assemblersController.openAssemblerModal();
        } else {
          window.servicesController.openNewServiceModal(window.calendarController.selectedDate);
        }
      });
    }
  }

  bindModals() {
    // Close buttons
    const closeButtons = document.querySelectorAll('[data-modal-close]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal) {
          modal.classList.remove('active');
        }
      });
    });

    // Close on click backdrop
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) activeModal.classList.remove('active');
      }
    });
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'danger') icon = 'fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span style="flex: 1;">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  updateDashboardKPIs() {
    const services = window.storageManager.getServices();
    const transactions = window.storageManager.getTransactions();

    // Mês corrente, calculado na hora (nada de data fixa no código)
    const monthPrefix = Utils.currentMonthPrefix();
    const todayStr = Utils.todayISO();

    const auth = window.authController;
    const ehAdmin = !auth || auth.podeVerValoresCheios();

    // Render Today list on Dashboard
    const todayServices = services.filter(s => s.date === todayStr && s.status !== 'cancelado');
    const todayContainer = document.getElementById('dash-today-services');
    if (todayContainer) {
      if (todayServices.length === 0) {
        todayContainer.innerHTML = `
          <div class="empty-day-state">
            <i class="fa-regular fa-calendar-check"></i>
            <p>Nenhuma montagem agendada para hoje.</p>
            ${ehAdmin ? `
              <button class="btn btn-primary btn-sm" onclick="window.servicesController.openNewServiceModal('${todayStr}')">
                <i class="fa-solid fa-plus"></i> Agendar para hoje
              </button>
            ` : ''}
          </div>
        `;
      } else {
        todayContainer.innerHTML = '';
        todayServices.forEach(s => {
          todayContainer.appendChild(window.calendarController.createServiceCard(s));
        });
      }
    }

    // Update KPI cards
    const kpiFaturamento = document.getElementById('dash-kpi-faturamento');
    const kpiPendente = document.getElementById('dash-kpi-pendente');
    const kpiConcluidos = document.getElementById('dash-kpi-concluidos');
    const kpiAgendados = document.getElementById('dash-kpi-agendados');
    const kpiLucro = document.getElementById('dash-kpi-lucro');
    const kpiGastos = document.getElementById('dash-kpi-gastos');
    const headerPill = document.getElementById('header-quick-stat');

    if (!ehAdmin) {
      // Montador / Funcionário logado: vê apenas os números pessoais dele
      const meuId = auth.getCurrentAssemblerId();
      let meusGanhosRecebidos = 0;
      let meusGanhosPendentes = 0;
      let meusConcluidos = 0;
      let meusAgendados = 0;

      services.forEach(s => {
        if (s.assemblerId === meuId && (s.date || '').startsWith(monthPrefix)) {
          const pay = Utils.assemblerPay(s);
          if (s.status === 'concluido') {
            meusConcluidos++;
            meusGanhosRecebidos += pay;
          } else if (s.status === 'agendado') {
            meusAgendados++;
            meusGanhosPendentes += pay;
          }
        }
      });

      if (kpiFaturamento) {
        kpiFaturamento.textContent = Utils.formatBRL(meusGanhosRecebidos);
        const cardTitle = kpiFaturamento.closest('.stat-card')?.querySelector('.stat-title');
        if (cardTitle) cardTitle.textContent = 'Você Recebeu';
      }
      if (kpiLucro) {
        kpiLucro.textContent = Utils.formatBRL(meusGanhosPendentes);
        const cardTitle = kpiLucro.closest('.stat-card')?.querySelector('.stat-title');
        if (cardTitle) cardTitle.textContent = 'A Receber';
        const cardSub = kpiLucro.closest('.stat-card')?.querySelector('.stat-subtitle');
        if (cardSub) cardSub.textContent = 'Montagens agendadas para você';
      }
      if (kpiPendente) {
        kpiPendente.textContent = Utils.formatBRL(meusGanhosRecebidos + meusGanhosPendentes);
        const cardTitle = kpiPendente.closest('.stat-card')?.querySelector('.stat-title');
        if (cardTitle) cardTitle.textContent = 'Total no Mês';
      }
      if (kpiConcluidos) kpiConcluidos.textContent = meusConcluidos;
      if (kpiAgendados) kpiAgendados.textContent = meusAgendados;
      if (kpiGastos) kpiGastos.textContent = 'R$ 0,00';

      if (headerPill) {
        headerPill.innerHTML = `<span class="dot"></span> ${todayServices.length} hoje &bull; ${Utils.formatBRL(meusGanhosRecebidos)} recebido no mês`;
      }
      return;
    }

    // Administrador: cálculo correto e transparente da empresa
    let faturamento = 0;
    let pendente = 0;
    let concluidos = 0;
    let agendados = 0;
    let gastosMaterial = 0;
    let repassesMontadores = 0;
    let totalDespesasPagas = 0;

    services.forEach(s => {
      if ((s.date || '').startsWith(monthPrefix)) {
        if (s.status === 'concluido') {
          concluidos++;
          gastosMaterial += Utils.toNumber(s.cost);
          if (!Utils.isOwnerAssembler(s)) {
            repassesMontadores += Utils.assemblerPay(s);
          }
        } else if (s.status === 'agendado') {
          agendados++;
          pendente += Utils.serviceTotal(s);
        }
      }
    });

    transactions.forEach(t => {
      if ((t.date || '').startsWith(monthPrefix) && t.status === 'pago') {
        if (t.type === 'receita') {
          faturamento += Utils.toNumber(t.value);
        } else if (t.type === 'despesa') {
          totalDespesasPagas += Utils.toNumber(t.value);
        }
      }
    });

    // Se houver transações de despesa lançadas, usa o maior entre elas e a soma direta
    // dos custos de material + repasses aos montadores concluídos do mês.
    const despesasTotais = Math.max(totalDespesasPagas, gastosMaterial + repassesMontadores);
    const lucroLiquido = faturamento - despesasTotais;

    if (kpiFaturamento) {
      kpiFaturamento.textContent = Utils.formatBRL(faturamento);
      const cardTitle = kpiFaturamento.closest('.stat-card')?.querySelector('.stat-title');
      if (cardTitle) cardTitle.textContent = 'Faturamento Mês';
    }
    if (kpiPendente) {
      kpiPendente.textContent = Utils.formatBRL(pendente);
      const cardTitle = kpiPendente.closest('.stat-card')?.querySelector('.stat-title');
      if (cardTitle) cardTitle.textContent = 'A Receber';
    }
    if (kpiConcluidos) kpiConcluidos.textContent = concluidos;
    if (kpiAgendados) kpiAgendados.textContent = agendados;
    if (kpiLucro) {
      kpiLucro.textContent = Utils.formatBRL(lucroLiquido);
      const cardTitle = kpiLucro.closest('.stat-card')?.querySelector('.stat-title');
      if (cardTitle) cardTitle.textContent = 'Lucro Líquido Mês';
    }
    if (kpiGastos) kpiGastos.textContent = Utils.formatBRL(despesasTotais);

    // Header Quick Pill
    if (headerPill) {
      headerPill.innerHTML = `<span class="dot"></span> ${todayServices.length} hoje &bull; ${Utils.formatBRL(lucroLiquido)} líquido no mês`;
    }
  }

  /**
   * Chamado depois de qualquer alteração nos dados.
   *
   * Antes redesenhava as seis telas de uma vez, inclusive as que estavam
   * escondidas: ~470 ms de tela congelada a cada montagem salva num celular
   * mediano. Agora só a tela visível é refeita na hora; as outras ficam
   * marcadas e se atualizam quando ele abrir cada uma.
   */
  updateAllViews() {
    // Os KPIs alimentam também a pílula do cabeçalho, que está sempre à vista.
    this.updateDashboardKPIs();

    this.viewsDesatualizadas = new Set(Object.keys(this.RENDERIZADORES));
    this.viewsDesatualizadas.delete('view-inicio'); // acabou de ser recalculado

    this.renderViewSeNecessario(this.currentView);
  }

  /** Redesenha a tela só se ela ficou para trás. */
  renderViewSeNecessario(viewId) {
    if (!this.viewsDesatualizadas.has(viewId)) return;
    this.viewsDesatualizadas.delete(viewId);

    const renderizar = this.RENDERIZADORES[viewId];
    if (renderizar) renderizar();
  }

  /* ---------- Tema claro / escuro ---------- */

  applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0F172A' : '#FF5E1E');

    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';

    const subtitle = document.getElementById('theme-subtitle');
    if (subtitle) subtitle.textContent = isDark ? 'Modo escuro ativo' : 'Modo claro ativo';

    const toggle = document.getElementById('btn-toggle-theme');
    if (toggle) {
      toggle.classList.toggle('is-on', isDark);
      toggle.setAttribute('aria-checked', String(isDark));
    }
  }

  toggleTheme() {
    const settings = window.storageManager.getSettings();
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    window.storageManager.saveSettings(settings);
    this.applyTheme(settings.theme);

    // Os gráficos precisam ser redesenhados com as cores do novo tema.
    window.financeController.render();
  }

  bindSettings() {
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSettings();
      });
    }

    // Alternância de tema
    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Upload da logo usada na nota de serviço
    const logoInput = document.getElementById('set-logo-input');
    if (logoInput) {
      logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          this.showToast('Selecione um arquivo de imagem.', 'danger');
          return;
        }

        // A logo é guardada como data URL, então precisa caber no localStorage.
        if (file.size > 900 * 1024) {
          this.showToast('Imagem muito grande. Use uma logo de até 900 KB.', 'danger');
          e.target.value = '';
          return;
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
          const settings = window.storageManager.getSettings();
          settings.logo = evt.target.result;
          window.storageManager.saveSettings(settings);
          this.renderLogoPreview(settings.logo);
          this.showToast('Logo atualizada com sucesso!', 'success');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      });
    }

    const removeLogoBtn = document.getElementById('btn-remove-logo');
    if (removeLogoBtn) {
      removeLogoBtn.addEventListener('click', () => {
        const settings = window.storageManager.getSettings();
        settings.logo = '';
        window.storageManager.saveSettings(settings);
        this.renderLogoPreview('');
        this.showToast('Logo removida.', 'warning');
      });
    }

    // Export backup button
    const exportBtn = document.getElementById('btn-export-backup');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        window.storageManager.exportBackup();
        this.showToast('Backup exportado com sucesso!', 'success');
      });
    }

    // Import backup
    const importInput = document.getElementById('input-import-backup');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const res = window.storageManager.importBackup(evt.target.result);
          if (res.success) {
            this.showToast('Backup restaurado com sucesso!', 'success');
            setTimeout(() => window.location.reload(), 1000);
          } else {
            this.showToast('Erro ao restaurar backup: ' + res.error, 'danger');
          }
        };
        reader.readAsText(file);
      });
    }

    // Reset default data button
    const resetBtn = document.getElementById('btn-reset-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        // Duas confirmações: some com o histórico inteiro, inclusive na nuvem.
        if (!confirm(
          'Apagar TODAS as montagens, clientes, lançamentos, lojas, montadores e fotos?\n\n' +
          'Isso vale também para a nuvem e não tem como desfazer.'
        )) return;

        if (!confirm('Última confirmação: você já baixou o backup?')) return;

        window.storageManager.apagarTudo();
        this.showToast('Tudo apagado. O sistema está zerado.', 'success');
        setTimeout(() => window.location.reload(), 1200);
      });
    }
  }

  loadSettingsForm() {
    const s = window.storageManager.getSettings();
    if (!s) return;

    const setField = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setField('set-montador-name', s.montadorName);
    setField('set-company-name', s.companyName);
    setField('set-profession', s.profession);
    setField('set-cnpj', s.cnpj);
    setField('set-phone', s.phone);
    setField('set-address', s.address);
    setField('set-city', s.city);
    setField('set-pix-key', s.pixKey);
    setField('set-pix-type', s.pixType);
    setField('set-bank-name', s.bankName);
    setField('set-pix-holder', s.pixHolder);
    setField('set-review-link', s.reviewLink);
    setField('set-facebook-link', s.facebookLink);
    setField('set-instagram-link', s.instagramLink);
    setField('set-monthly-goal', s.monthlyGoal);

    this.renderLogoPreview(s.logo);

    // Update sidebar pro name
    const proName = document.querySelector('.pro-name');
    if (proName) proName.textContent = s.montadorName || 'RS Montagens';
  }

  renderLogoPreview(logo) {
    const preview = document.getElementById('set-logo-preview');
    if (!preview) return;

    preview.innerHTML = logo
      ? `<img src="${Utils.escapeHtml(logo)}" alt="Logo da empresa">`
      : '<i class="fa-regular fa-image"></i>';
  }

  saveSettings() {
    const s = window.storageManager.getSettings();
    const readField = (id) => (document.getElementById(id)?.value || '').trim();

    s.montadorName = readField('set-montador-name');
    s.companyName = readField('set-company-name');
    s.profession = readField('set-profession');
    s.cnpj = readField('set-cnpj');
    s.phone = readField('set-phone');
    s.address = readField('set-address');
    s.city = readField('set-city');
    s.pixKey = readField('set-pix-key');
    s.pixType = document.getElementById('set-pix-type').value;
    s.bankName = readField('set-bank-name');
    s.pixHolder = readField('set-pix-holder');
    s.reviewLink = readField('set-review-link');
    s.facebookLink = readField('set-facebook-link');
    s.instagramLink = readField('set-instagram-link');
    s.monthlyGoal = parseFloat(document.getElementById('set-monthly-goal').value) || 5000;

    window.storageManager.saveSettings(s);
    this.loadSettingsForm();
    this.showToast('Configurações salvas com sucesso!', 'success');
    this.updateAllViews();
  }
}

// Bootstrap on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
