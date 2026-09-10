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
  // Regra do vídeo: o cliente paga o VALOR + o DESLOCAMENTO;
  // o material sai do bolso do montador.
  // Total (cliente paga) = valor do serviço + deslocamento.
  serviceTotal(service) {
    return this.toNumber(service && service.value) + this.toNumber(service && service.travelFee);
  },

  // Lucro líquido = total cobrado - gastos com material.
  serviceProfit(service) {
    return this.serviceTotal(service) - this.toNumber(service && service.cost);
  },

  /* ---------- Pagamento do montador ---------- */
  // O cliente paga o total; desse total sai a parte do montador que executou.
  // Guardamos sempre o VALOR em reais (assemblerPay). A porcentagem é só um
  // atalho de digitação: ao escolher 30% o campo já vira número redondo,
  // porque o montador arredonda tudo na hora de pagar.
  assemblerPay(service) {
    if (!service) return 0;
    return this.toNumber(service.assemblerPay);
  },

  // Quanto sobra para o dono: total - material - pagamento do montador.
  ownerNet(service) {
    return this.serviceProfit(service) - this.assemblerPay(service);
  },

  // 30% de 574 = 172,20 -> vira 172. Número redondo, do jeito que ele pediu.
  roundPay(value) {
    return Math.round(this.toNumber(value));
  },

  // O montador que executou é o próprio dono? Então não há repasse a pagar.
  isOwnerAssembler(service) {
    if (!service || !service.assemblerId) return false;
    const assembler = (window.storageManager.getAssemblers() || [])
      .find(a => a.id === service.assemblerId);
    return !!(assembler && assembler.isOwner);
  },

  /* ---------- Texto ---------- */
  // Primeira letra maiúscula para as iniciais dos avatares.
  initialOf(name, fallback = 'C') {
    const clean = String(name || '').trim();
    return (clean.charAt(0) || fallback).toUpperCase();
  }
};

window.Utils = Utils;
