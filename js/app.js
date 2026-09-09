/* ==========================================================================
   MOVELPRO - MAIN APP & ROUTING ORCHESTRATOR
   SPA Navigation, Modals, Toasts, Settings & Synchronization
   ========================================================================== */

class App {
  constructor() {
    this.currentView = 'view-agenda'; // Start directly in Agenda or Dashboard
  }

  init() {
    this.bindNavigation();
    this.bindModals();
    this.bindSettings();
    this.bindGlobalFAB();

    // Initialize all sub-modules
    if (window.authController) window.authController.init();
    window.calendarController.init();
    window.servicesController.init();
    window.financeController.init();
    window.customersController.init();
    window.quotesController.init();

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

    // Refresh charts if entering financeiro
    if (viewId === 'view-financeiro') {
      window.financeController.render();
    } else if (viewId === 'view-dashboard') {
      this.updateDashboardKPIs();
    }
  }

  updateHeaderTitle(viewId) {
    const titleEl = document.getElementById('header-title');
    const subtitleEl = document.getElementById('header-subtitle');

    const titles = {
      'view-inicio': { title: '<i class="fa-solid fa-house" style="color: var(--primary);"></i> Início', subtitle: 'Visão geral do seu negócio de montagem' },
      'view-agenda': { title: '<i class="fa-regular fa-calendar-days" style="color: var(--primary);"></i> Agenda', subtitle: 'Visualize seus serviços por data' },
      'view-financeiro': { title: '<i class="fa-solid fa-wallet" style="color: var(--primary);"></i> Controle Financeiro', subtitle: 'Fluxo de caixa, receitas, despesas e metas' },
      'view-clientes': { title: '<i class="fa-solid fa-users" style="color: var(--primary);"></i> Clientes', subtitle: 'Gestão da sua carteira de clientes' },
      'view-orcamentos': { title: '<i class="fa-solid fa-calculator" style="color: var(--primary);"></i> Orçamentos & Preços', subtitle: 'Calculadora de montagem rápida e orçamentos para WhatsApp' },
      'view-ajustes': { title: '<i class="fa-solid fa-gear" style="color: var(--primary);"></i> Configurações', subtitle: 'Perfil, Chave PIX, Metas e Backup dos dados' }
    };

    const info = titles[viewId] || { title: 'MovelPRO', subtitle: 'RS Montagens' };
    if (titleEl) titleEl.innerHTML = info.title;
    if (subtitleEl) subtitleEl.textContent = info.subtitle;
  }

  bindGlobalFAB() {
    const fabBtn = document.getElementById('global-fab-btn');
    if (fabBtn) {
      fabBtn.addEventListener('click', () => {
        if (this.currentView === 'view-financeiro') {
          window.financeController.openTransactionModal('receita');
        } else if (this.currentView === 'view-clientes') {
          window.customersController.openCustomerModal();
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

    let faturamento = 0;
    let pendente = 0;
    let concluidos = 0;
    let agendados = 0;
    let gastosMaterial = 0;

    services.forEach(s => {
      if ((s.date || '').startsWith(monthPrefix)) {
        if (s.status === 'concluido') {
          concluidos++;
          gastosMaterial += Utils.toNumber(s.cost);
        } else if (s.status === 'agendado') {
          agendados++;
          pendente += Utils.toNumber(s.value);
        }
      }
    });

    transactions.forEach(t => {
      if ((t.date || '').startsWith(monthPrefix) && t.type === 'receita' && t.status === 'pago') {
        faturamento += Utils.toNumber(t.value);
      }
    });

    // Lucro líquido = o que entrou menos o material que saiu do bolso
    const lucroLiquido = faturamento - gastosMaterial;

    // Render Today list on Dashboard
    const todayServices = services.filter(s => s.date === todayStr);
    const todayContainer = document.getElementById('dash-today-services');
    if (todayContainer) {
      if (todayServices.length === 0) {
        todayContainer.innerHTML = `
          <div class="empty-day-state">
            <i class="fa-regular fa-calendar-check"></i>
            <p>Nenhuma montagem agendada para hoje.</p>
            <button class="btn btn-primary btn-sm" onclick="window.servicesController.openNewServiceModal('${todayStr}')">
              <i class="fa-solid fa-plus"></i> Agendar para hoje
            </button>
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

    if (kpiFaturamento) kpiFaturamento.textContent = Utils.formatBRL(faturamento);
    if (kpiPendente) kpiPendente.textContent = Utils.formatBRL(pendente);
    if (kpiConcluidos) kpiConcluidos.textContent = concluidos;
    if (kpiAgendados) kpiAgendados.textContent = agendados;
    if (kpiLucro) kpiLucro.textContent = Utils.formatBRL(lucroLiquido);
    if (kpiGastos) kpiGastos.textContent = Utils.formatBRL(gastosMaterial);

    // Header Quick Pill
    const headerPill = document.getElementById('header-quick-stat');
    if (headerPill) {
      headerPill.innerHTML = `<span class="dot"></span> ${todayServices.length} hoje &bull; ${Utils.formatBRL(lucroLiquido)} líquido no mês`;
    }
  }

  updateAllViews() {
    this.updateDashboardKPIs();
    window.calendarController.render();
    window.financeController.render();
    window.customersController.render();
  }

  bindSettings() {
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSettings();
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
        if (confirm('Tem certeza? Isso restaurará os dados de demonstração originais.')) {
          window.storageManager.resetToDefault();
          this.showToast('Dados restaurados para o padrão de demonstração!', 'success');
          setTimeout(() => window.location.reload(), 1000);
        }
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
    setField('set-phone', s.phone);
    setField('set-pix-key', s.pixKey);
    setField('set-review-link', s.reviewLink || '');
    setField('set-pix-type', s.pixType);
    setField('set-monthly-goal', s.monthlyGoal);

    // Update sidebar pro name
    const proName = document.querySelector('.pro-name');
    if (proName) proName.textContent = s.montadorName || 'RS Montagens';
  }

  saveSettings() {
    const s = window.storageManager.getSettings();
    s.montadorName = document.getElementById('set-montador-name').value.trim();
    s.companyName = document.getElementById('set-company-name').value.trim();
    s.phone = document.getElementById('set-phone').value.trim();
    s.pixKey = document.getElementById('set-pix-key').value.trim();
    s.reviewLink = document.getElementById('set-review-link').value.trim();
    s.pixType = document.getElementById('set-pix-type').value;
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
