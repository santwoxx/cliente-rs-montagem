/* ==========================================================================
   RS MONTAGENS - NOTIFICAÇÕES LOCAIS
   1) Resumo da manhã: "você tem X montagens hoje", em horário fixo.
   2) Lembrete de cada montagem, X minutos antes.

   LIMITE HONESTO DESTA VERSÃO (notificação local, sem servidor):
   quem conta o tempo é a própria página. Enquanto o app está aberto ou
   em segundo plano recente, o aviso sai. Se o Android tiver encerrado o
   app por completo, o lembrete daquele horário não dispara — o resumo do
   dia é recuperado na próxima vez que ele abrir, o lembrete de 30 min não.
   Para disparo garantido com o app fechado seria preciso push de servidor.
   ========================================================================== */

const NOTIF_PADRAO = {
  notifyEnabled: false,
  notifyDailyEnabled: true,
  notifyDailyTime: '07:00',
  notifyReminderEnabled: true,
  notifyBeforeMinutes: 30
};

class NotificationsController {
  constructor() {
    this.timer = null;
    this.ultimaFaxina = null;
    this.INTERVALO_MS = 30 * 1000;   // confere a cada 30 segundos
    this.JANELA_ATRASO_MIN = 10;     // tolera até 10 min de atraso no lembrete
  }

  init() {
    this.bindEvents();
    this.renderPainel();

    if (this.ativo()) this.iniciarRelogio();

    // Ao voltar para o app, confere na hora se ficou algo para trás.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ativo()) this.conferir();
    });
  }

  /* ---------- Configuração ---------- */

  config() {
    const s = window.storageManager.getSettings();
    return { ...NOTIF_PADRAO, ...s };
  }

  salvarConfig(mudancas) {
    const atual = window.storageManager.getSettings();
    window.storageManager.saveSettings({ ...atual, ...mudancas });
  }

  suportado() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  permitido() {
    return this.suportado() && Notification.permission === 'granted';
  }

  ativo() {
    return this.permitido() && this.config().notifyEnabled;
  }

  /* ---------- Permissão ---------- */

  async pedirPermissao() {
    if (!this.suportado()) {
      window.app.showToast('Este navegador não trabalha com notificações.', 'danger');
      return false;
    }

    if (Notification.permission === 'denied') {
      window.app.showToast(
        'As notificações estão bloqueadas. Libere em Configurações do site no Chrome.',
        'danger'
      );
      return false;
    }

    let permissao = Notification.permission;
    if (permissao !== 'granted') permissao = await Notification.requestPermission();

    if (permissao === 'granted') {
      this.salvarConfig({ notifyEnabled: true });
      this.iniciarRelogio();
      this.renderPainel();
      await this.enviar(
        'Notificações ligadas',
        'Vou te avisar do resumo do dia e antes de cada montagem.',
        'rs-teste'
      );
      return true;
    }

    window.app.showToast('Permissão de notificação negada.', 'warning');
    this.renderPainel();
    return false;
  }

  /* ---------- Disparo ---------- */

  /**
   * Manda pelo service worker quando dá — assim o aviso sobrevive ao app
   * ir para segundo plano. Sem SW registrado, usa a notificação da página.
   */
  async enviar(titulo, corpo, tag, dadosExtra = {}) {
    if (!this.permitido()) return;

    try {
      const registro = await navigator.serviceWorker.getRegistration();
      if (registro) {
        await registro.showNotification(titulo, {
          body: corpo,
          tag,
          renotify: true,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          lang: 'pt-BR',
          vibrate: [200, 100, 200],
          data: dadosExtra
        });
        return;
      }
    } catch (e) {
      console.warn('[notif] SW indisponível, usando notificação simples:', e.message);
    }

    try {
      new Notification(titulo, { body: corpo, tag, icon: '/icons/icon-192.png' });
    } catch (e) {
      console.warn('[notif] falhou:', e.message);
    }
  }

  /* ---------- Relógio ---------- */

  iniciarRelogio() {
    this.pararRelogio();
    this.conferir();
    this.timer = setInterval(() => this.conferir(), this.INTERVALO_MS);
  }

  pararRelogio() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Marca o que já foi avisado, para não repetir o mesmo aviso. */
  jaAvisado(chave) {
    return localStorage.getItem('rs_notif_' + chave) === '1';
  }

  marcarAvisado(chave) {
    try {
      localStorage.setItem('rs_notif_' + chave, '1');
    } catch (e) { /* memória cheia: no pior caso avisa duas vezes */ }
  }

  conferir() {
    if (!this.ativo()) return;
    const cfg = this.config();
    const agora = new Date();

    if (cfg.notifyDailyEnabled) this.conferirResumoDoDia(agora, cfg);
    if (cfg.notifyReminderEnabled) this.conferirLembretes(agora, cfg);

    // A faxina varre o localStorage inteiro; uma vez por dia basta.
    const hoje = Utils.toISO(agora);
    if (this.ultimaFaxina !== hoje) {
      this.ultimaFaxina = hoje;
      this.limparMarcasAntigas();
    }
  }

  /* ---------- 1. Resumo da manhã ---------- */

  conferirResumoDoDia(agora, cfg) {
    const hoje = Utils.toISO(agora);
    const chave = 'resumo_' + hoje;
    if (this.jaAvisado(chave)) return;

    const [hora, minuto] = String(cfg.notifyDailyTime || '07:00').split(':').map(Number);
    const horarioResumo = new Date(agora);
    horarioResumo.setHours(hora || 7, minuto || 0, 0, 0);

    // Ainda não deu a hora.
    if (agora < horarioResumo) return;

    const doDia = window.storageManager.getServices()
      .filter(s => s.date === hoje && s.status === 'agendado')
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));

    this.marcarAvisado(chave);

    if (doDia.length === 0) {
      this.enviar('Bom dia! Agenda livre hoje', 'Nenhuma montagem marcada para hoje.', chave);
      return;
    }

    const primeira = doDia[0];
    const linhas = doDia
      .slice(0, 4)
      .map(s => `${s.time}h — ${s.clientName}`)
      .join('\n');
    const sobra = doDia.length > 4 ? `\n+${doDia.length - 4} depois` : '';

    const titulo = doDia.length === 1
      ? 'Bom dia! 1 montagem hoje'
      : `Bom dia! ${doDia.length} montagens hoje`;

    this.enviar(
      titulo,
      `Começa ${primeira.time}h\n${linhas}${sobra}`,
      chave,
      { serviceId: primeira.id }
    );
  }

  /* ---------- 2. Lembrete antes de cada montagem ---------- */

  conferirLembretes(agora, cfg) {
    const hoje = Utils.toISO(agora);
    const antecedencia = Number(cfg.notifyBeforeMinutes) || 30;

    window.storageManager.getServices()
      .filter(s => s.date === hoje && s.status === 'agendado')
      .forEach(servico => {
        const chave = `lembrete_${servico.id}_${hoje}`;
        if (this.jaAvisado(chave)) return;

        const horario = this.horarioDoServico(servico);
        if (!horario) return;

        const aviso = new Date(horario.getTime() - antecedencia * 60 * 1000);
        const atrasoMin = (agora - aviso) / 60000;

        // Fora da janela: ou ainda não chegou, ou passou tempo demais
        // (não adianta avisar "30 min antes" com a montagem já em andamento).
        if (atrasoMin < 0 || atrasoMin > this.JANELA_ATRASO_MIN) return;

        this.marcarAvisado(chave);

        const partes = [`${servico.time}h — ${servico.clientName}`];
        if (servico.clientAddress) partes.push(servico.clientAddress);
        if (servico.description) partes.push(servico.description);

        this.enviar(
          `Montagem em ${antecedencia} min`,
          partes.join('\n'),
          chave,
          { serviceId: servico.id }
        );
      });
  }

  /** Junta data e hora do serviço num Date do fuso local. */
  horarioDoServico(servico) {
    const partesData = String(servico.date || '').split('-');
    if (partesData.length !== 3) return null;
    const [h, m] = String(servico.time || '09:00').split(':').map(Number);
    return new Date(
      Number(partesData[0]),
      Number(partesData[1]) - 1,
      Number(partesData[2]),
      Number.isFinite(h) ? h : 9,
      Number.isFinite(m) ? m : 0,
      0, 0
    );
  }

  /** Some com as marcas de dias passados para não entupir o localStorage. */
  limparMarcasAntigas() {
    const hoje = Utils.todayISO();
    const limite = new Date();
    limite.setDate(limite.getDate() - 3);
    const corte = Utils.toISO(limite);

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const chave = localStorage.key(i);
      if (!chave || !chave.startsWith('rs_notif_')) continue;
      const data = chave.slice(-10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(data) && data < corte && data !== hoje) {
        localStorage.removeItem(chave);
      }
    }
  }

  /* ---------- Painel em Ajustes ---------- */

  bindEvents() {
    const btnLigar = document.getElementById('btn-ativar-notificacoes');
    if (btnLigar) btnLigar.addEventListener('click', () => this.pedirPermissao());

    const btnDesligar = document.getElementById('btn-desativar-notificacoes');
    if (btnDesligar) {
      btnDesligar.addEventListener('click', () => {
        this.salvarConfig({ notifyEnabled: false });
        this.pararRelogio();
        this.renderPainel();
        window.app.showToast('Notificações desligadas.', 'warning');
      });
    }

    const horaResumo = document.getElementById('notif-hora-resumo');
    if (horaResumo) {
      horaResumo.addEventListener('change', (e) => {
        this.salvarConfig({ notifyDailyTime: e.target.value || '07:00' });
        window.app.showToast(`Resumo do dia às ${e.target.value}.`, 'success');
      });
    }

    const antecedencia = document.getElementById('notif-antecedencia');
    if (antecedencia) {
      antecedencia.addEventListener('change', (e) => {
        this.salvarConfig({ notifyBeforeMinutes: Number(e.target.value) || 30 });
        window.app.showToast(`Aviso ${e.target.value} min antes da montagem.`, 'success');
      });
    }

    const chkResumo = document.getElementById('notif-chk-resumo');
    if (chkResumo) {
      chkResumo.addEventListener('change', (e) => {
        this.salvarConfig({ notifyDailyEnabled: e.target.checked });
      });
    }

    const chkLembrete = document.getElementById('notif-chk-lembrete');
    if (chkLembrete) {
      chkLembrete.addEventListener('change', (e) => {
        this.salvarConfig({ notifyReminderEnabled: e.target.checked });
      });
    }

    const btnTeste = document.getElementById('btn-testar-notificacao');
    if (btnTeste) {
      btnTeste.addEventListener('click', () => {
        if (!this.permitido()) {
          window.app.showToast('Ligue as notificações primeiro.', 'warning');
          return;
        }
        this.enviar(
          'Assim que vai chegar',
          'Montagem em 30 min\n14:00h — Eder Oliveira\nAv. Paulista, 1000',
          'rs-teste'
        );
      });
    }
  }

  renderPainel() {
    const status = document.getElementById('notif-status');
    const corpo = document.getElementById('notif-configuracoes');
    const btnLigar = document.getElementById('btn-ativar-notificacoes');
    const btnDesligar = document.getElementById('btn-desativar-notificacoes');
    if (!status) return;

    const cfg = this.config();

    // Preenche os controles com o que está salvo.
    const horaResumo = document.getElementById('notif-hora-resumo');
    if (horaResumo) horaResumo.value = cfg.notifyDailyTime;
    const antecedencia = document.getElementById('notif-antecedencia');
    if (antecedencia) antecedencia.value = String(cfg.notifyBeforeMinutes);
    const chkResumo = document.getElementById('notif-chk-resumo');
    if (chkResumo) chkResumo.checked = !!cfg.notifyDailyEnabled;
    const chkLembrete = document.getElementById('notif-chk-lembrete');
    if (chkLembrete) chkLembrete.checked = !!cfg.notifyReminderEnabled;

    if (!this.suportado()) {
      status.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: var(--danger);"></i> Este navegador não trabalha com notificações.';
      if (corpo) corpo.style.display = 'none';
      if (btnLigar) btnLigar.style.display = 'none';
      if (btnDesligar) btnDesligar.style.display = 'none';
      return;
    }

    if (Notification.permission === 'denied') {
      status.innerHTML = '<i class="fa-solid fa-ban" style="color: var(--danger);"></i> Bloqueadas no navegador. Libere em Configurações do site &rsaquo; Notificações.';
      if (corpo) corpo.style.display = 'none';
      if (btnLigar) btnLigar.style.display = 'none';
      if (btnDesligar) btnDesligar.style.display = 'none';
      return;
    }

    const ligado = this.ativo();
    status.innerHTML = ligado
      ? '<i class="fa-solid fa-circle-check" style="color: var(--success);"></i> Ligadas neste aparelho.'
      : '<i class="fa-regular fa-bell-slash"></i> Desligadas.';

    if (corpo) corpo.style.display = ligado ? '' : 'none';
    if (btnLigar) btnLigar.style.display = ligado ? 'none' : '';
    if (btnDesligar) btnDesligar.style.display = ligado ? '' : 'none';
  }
}

window.notificationsController = new NotificationsController();
