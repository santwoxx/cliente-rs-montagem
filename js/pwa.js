/* ==========================================================================
   RS MONTAGENS - PWA CONTROLLER
   Registro do service worker, convite de instalação, aviso de versão nova
   e atalhos de entrada (?acao=... vindo dos ícones da tela inicial).
   ========================================================================== */

class PWAController {
  constructor() {
    this.registro = null;
    this.promptInstalacao = null;   // evento beforeinstallprompt guardado
    this.instalado = false;
  }

  init() {
    this.instalado = this.rodandoInstalado();
    this.registrarServiceWorker();
    this.escutarConviteDeInstalacao();
    this.escutarMensagensDoServiceWorker();
    this.bindBotoes();
    this.tratarAtalhoDeEntrada();
    this.atualizarCartaoDeInstalacao();
  }

  /** true quando aberto pelo ícone da tela inicial, não pela aba do navegador. */
  rodandoInstalado() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.startsWith('android-app://');
  }

  /* ---------- Service worker ---------- */

  async registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] navegador sem suporte a service worker.');
      return;
    }

    // file:// não aceita service worker — evita erro no preview local.
    if (location.protocol === 'file:') {
      console.warn('[PWA] service worker exige http/https. Abra por um servidor.');
      return;
    }

    try {
      this.registro = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // Chegou versão nova enquanto o app estava aberto.
      this.registro.addEventListener('updatefound', () => {
        const novo = this.registro.installing;
        if (!novo) return;
        novo.addEventListener('statechange', () => {
          if (novo.state === 'installed' && navigator.serviceWorker.controller) {
            this.avisarVersaoNova(novo);
          }
        });
      });

      // Procura atualização toda vez que o app volta para a frente.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.registro) {
          this.registro.update().catch(() => {});
        }
      });
    } catch (e) {
      console.warn('[PWA] falha ao registrar service worker:', e.message);
    }
  }

  avisarVersaoNova(workerNovo) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast info';
    toast.style.cursor = 'pointer';
    toast.innerHTML = `
      <i class="fa-solid fa-arrows-rotate"></i>
      <span style="flex: 1;"><strong>Versão nova disponível.</strong><br>Toque aqui para atualizar.</span>
    `;
    toast.addEventListener('click', () => {
      workerNovo.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      }, { once: true });
    });

    container.appendChild(toast);
  }

  escutarMensagensDoServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const dados = event.data || {};
      if (dados.type === 'ABRIR_SERVICO' && dados.serviceId) {
        this.abrirServico(dados.serviceId);
      }
    });
  }

  abrirServico(serviceId) {
    const existe = window.storageManager.getServices().some(s => s.id === serviceId);
    if (existe && window.servicesController) {
      window.app.navigateTo('view-agenda');
      window.servicesController.openServiceDetailModal(serviceId);
    } else {
      window.app.navigateTo('view-agenda');
    }
  }

  /* ---------- Convite de instalação ---------- */

  escutarConviteDeInstalacao() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Segura o convite do Chrome para disparar no nosso botão.
      e.preventDefault();
      this.promptInstalacao = e;
      this.atualizarCartaoDeInstalacao();
      this.mostrarFaixaDeInstalacao();
    });

    window.addEventListener('appinstalled', () => {
      this.instalado = true;
      this.promptInstalacao = null;
      this.esconderFaixaDeInstalacao();
      this.atualizarCartaoDeInstalacao();
      if (window.app) {
        window.app.showToast('App instalado! Agora abra pelo ícone RS na tela inicial.', 'success');
      }
    });
  }

  /** Faixa discreta no rodapé, só na primeira vez e só se der para instalar. */
  mostrarFaixaDeInstalacao() {
    if (this.instalado) return;
    if (localStorage.getItem('rs_convite_instalacao_dispensado') === '1') return;
    if (document.getElementById('pwa-install-banner')) return;

    const faixa = document.createElement('div');
    faixa.id = 'pwa-install-banner';
    faixa.className = 'pwa-install-banner';
    faixa.innerHTML = `
      <div class="pwa-banner-icon"><i class="fa-solid fa-mobile-screen-button"></i></div>
      <div class="pwa-banner-text">
        <strong>Instalar o RS Montagens</strong>
        <span>Vira app de verdade: abre pelo ícone e funciona sem internet.</span>
      </div>
      <div class="pwa-banner-actions">
        <button type="button" class="btn btn-primary btn-sm" id="pwa-banner-install">Instalar</button>
        <button type="button" class="btn-banner-dismiss" id="pwa-banner-dismiss" aria-label="Agora não">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
    document.body.appendChild(faixa);

    document.getElementById('pwa-banner-install').addEventListener('click', () => this.instalar());
    document.getElementById('pwa-banner-dismiss').addEventListener('click', () => {
      localStorage.setItem('rs_convite_instalacao_dispensado', '1');
      this.esconderFaixaDeInstalacao();
    });

    requestAnimationFrame(() => faixa.classList.add('visivel'));
  }

  esconderFaixaDeInstalacao() {
    const faixa = document.getElementById('pwa-install-banner');
    if (faixa) faixa.remove();
  }

  async instalar() {
    if (!this.promptInstalacao) {
      if (window.app) {
        window.app.showToast(
          'Use o menu do Chrome (⋮) e toque em "Instalar app" ou "Adicionar à tela inicial".',
          'info'
        );
      }
      return;
    }

    this.promptInstalacao.prompt();
    const { outcome } = await this.promptInstalacao.userChoice;
    this.promptInstalacao = null;
    this.esconderFaixaDeInstalacao();

    if (outcome !== 'accepted' && window.app) {
      window.app.showToast('Instalação cancelada. Dá para instalar depois em Ajustes.', 'info');
    }
    this.atualizarCartaoDeInstalacao();
  }

  bindBotoes() {
    const btn = document.getElementById('btn-instalar-app');
    if (btn) btn.addEventListener('click', () => this.instalar());
  }

  /** Cartão em Ajustes mostrando o estado da instalação. */
  atualizarCartaoDeInstalacao() {
    const status = document.getElementById('pwa-status-texto');
    const btn = document.getElementById('btn-instalar-app');
    if (!status || !btn) return;

    if (this.instalado) {
      status.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--success);"></i> App instalado neste aparelho.';
      btn.style.display = 'none';
      return;
    }

    if (this.promptInstalacao) {
      status.textContent = 'Pronto para instalar neste aparelho.';
      btn.style.display = '';
      btn.disabled = false;
      return;
    }

    status.innerHTML = 'Se o botão não funcionar, abra o menu do Chrome (⋮) e toque em <strong>"Instalar app"</strong>.';
    btn.style.display = '';
  }

  /* ---------- Atalhos de entrada (?acao= / ?servico=) ---------- */

  tratarAtalhoDeEntrada() {
    const params = new URLSearchParams(window.location.search);
    const acao = params.get('acao');
    const servico = params.get('servico');

    if (!acao && !servico) return;

    // Espera o app terminar de montar as telas antes de navegar.
    setTimeout(() => {
      if (servico) {
        this.abrirServico(servico);
      } else if (acao === 'novo-servico') {
        window.app.navigateTo('view-agenda');
        window.servicesController.openNewServiceModal(Utils.todayISO());
      } else if (acao === 'novo-cliente') {
        window.app.navigateTo('view-clientes');
        window.customersController.openCustomerModal();
      } else if (acao === 'agenda') {
        window.app.navigateTo('view-agenda');
      }

      // Limpa a URL para não repetir a ação se ele recarregar a tela.
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 400);
  }
}

window.pwaController = new PWAController();
