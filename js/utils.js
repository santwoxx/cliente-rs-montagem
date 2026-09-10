/* ==========================================================================
   MOVELPRO - UTILITÁRIOS COMPARTILHADOS
   Escape seguro, formatação BR, datas dinâmicas e deep links (Maps/Waze/Zap)
   ========================================================================== */

const Utils = {
  /* ---------- Segurança: escape para HTML e atributos ---------- */
  // Evita que nomes/endereços com aspas, & ou < quebrem o HTML gerado.
  escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // Para valores injetados dentro de onclick="...('AQUI')"
  escapeJsString(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, ' ');
  },

  /* ---------- Dinheiro ---------- */
  toNumber(value) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  },

  formatBRL(value) {
    return 'R$ ' + this.toNumber(value).toFixed(2).replace('.', ',');
  },

  /* ---------- Datas dinâmicas (sem fuso UTC atrapalhando) ---------- */
  today() {
    return new Date();
  },

  todayISO() {
    return this.toISO(new Date());
  },

  toISO(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  // Prefixo "YYYY-MM" do mês atual, usado nos filtros do mês
  currentMonthPrefix() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },

  monthPrefixOf(isoDate) {
    return (isoDate || '').slice(0, 7);
  },

  // "2026-09-09" -> "09/09/2026" (sem criar Date, evita erro de fuso)
  formatDateBR(isoDate) {
    if (!isoDate) return '';
    const parts = String(isoDate).split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  },

  /* ---------- Deep links ---------- */
  mapsUrl(address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
  },

  wazeUrl(address) {
    return `https://waze.com/ul?q=${encodeURIComponent(address || '')}&navigate=yes`;
  },

  cleanPhone(phone) {
    return String(phone || '').replace(/\D/g, '');
  },

  telUrl(phone) {
    return `tel:+55${this.cleanPhone(phone)}`;
  },

  whatsappUrl(phone, message) {
    const clean = this.cleanPhone(phone);
    const text = encodeURIComponent(message || '');
    return clean ? `https://wa.me/55${clean}?text=${text}` : `https://wa.me/?text=${text}`;
  },

  /* ---------- Financeiro do serviço ---------- */
  // Regra: o cliente paga o VALOR + o DESLOCAMENTO.
  // Total (cliente paga) = valor do serviço + deslocamento.
  serviceTotal(service) {
    return this.toNumber(service && service.value) + this.toNumber(service && service.travelFee);
  },

  /* ---------- Pagamento do montador ---------- */
  // O cliente paga o total; desse total sai a parte do montador que executou.
  // Guardamos sempre o VALOR em reais (assemblerPay). A porcentagem é só um
  // atalho de digitação no formulário.
  assemblerPay(service) {
    if (!service) return 0;
    return this.toNumber(service.assemblerPay);
  },

  /* ---------- O que cada um enxerga ---------- */

  /**
   * Serviços que o usuário logado pode ver.
   *
   * O administrador vê a operação inteira. O montador vê apenas as montagens
   * em que foi escalado — nem a agenda, nem o início, nem o financeiro dele
   * podem mostrar serviço de outro montador.
   *
   * Montador sem vínculo de e-mail não vê nada, de propósito: é mais seguro
   * que a tela fique vazia com um aviso do que abrir a operação toda.
   */
  servicosVisiveis() {
    const auth = window.authController;
    if (!auth || auth.podeVerValoresCheios()) {
      return window.storageManager.getServices() || [];
    }

    const meuId = auth.getCurrentAssemblerId();
    if (!meuId) return [];

    return window.storageManager.servicesOf('assemblerId', meuId);
  },

  // O montador que executou é o próprio dono? Então não há repasse a pagar.
  isOwnerAssembler(service) {
    if (!service || !service.assemblerId) return false;
    const assembler = (window.storageManager.getAssemblers() || [])
      .find(a => a.id === service.assemblerId);
    return !!(assembler && assembler.isOwner);
  },

  // Quanto sobra para o dono: total cobrado - gastos com material - repasse do montador.
  // Se quem executou foi o próprio dono, o repasse a terceiros é zero.
  ownerNet(service) {
    const total = this.serviceTotal(service);
    const cost = this.toNumber(service && service.cost);
    const pay = this.isOwnerAssembler(service) ? 0 : this.assemblerPay(service);
    return total - cost - pay;
  },

  // Lucro líquido do dono/empresa neste serviço
  serviceProfit(service) {
    return this.ownerNet(service);
  },

  // 30% de 574 = 172,20 -> vira 172. Número redondo, do jeito que ele pediu.
  roundPay(value) {
    return Math.round(this.toNumber(value));
  },

  /* ---------- Texto ---------- */
  // Primeira letra maiúscula para as iniciais dos avatares.
  initialOf(name, fallback = 'C') {
    const clean = String(name || '').trim();
    return (clean.charAt(0) || fallback).toUpperCase();
  },

  /* ---------- Agenda / Contatos do Celular (Contact Picker API) ---------- */
  formatContactPhone(rawPhone) {
    if (!rawPhone) return '';
    let digits = String(rawPhone).replace(/\D/g, '');
    // Se começa com 55 e tem 12 ou 13 dígitos (DDI Brasil), remove o 55
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      digits = digits.slice(2);
    }
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return rawPhone;
  },

  async importContact(nameInputId, phoneInputId) {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      if (window.app && window.app.showToast) {
        window.app.showToast('A importação da agenda nativa funciona no Chrome para Android. Digite os dados manualmente.', 'warning');
      } else {
        alert('A importação da agenda nativa funciona no Chrome para Android.');
      }
      return;
    }

    try {
      const props = ['name', 'tel'];
      const opts = { multiple: false };
      const contacts = await navigator.contacts.select(props, opts);

      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        const nameInput = typeof nameInputId === 'string' ? document.getElementById(nameInputId) : nameInputId;
        const phoneInput = typeof phoneInputId === 'string' ? document.getElementById(phoneInputId) : phoneInputId;

        if (contact.name && contact.name.length > 0 && nameInput) {
          nameInput.value = contact.name[0];
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (contact.tel && contact.tel.length > 0 && phoneInput) {
          const rawPhone = contact.tel[0];
          phoneInput.value = this.formatContactPhone(rawPhone);
          phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
          phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (window.app && window.app.showToast) {
          window.app.showToast('Contato importado com sucesso!', 'success');
        }
      }
    } catch (err) {
      if (err.name !== 'InvalidStateError' && !String(err).includes('canceled') && !String(err).includes('cancelled')) {
        console.error('Erro ao importar contato:', err);
      }
    }
  }
};

window.Utils = Utils;

