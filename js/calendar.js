/* ==========================================================================
   MOVELPRO - CALENDAR ENGINE
   Faithful recreation & enhancement of user screenshot with interactive logic
   ========================================================================== */

class CalendarController {
  constructor() {
    // Abre sempre no mês corrente, com o dia de hoje já selecionado
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
    this.selectedDate = Utils.todayISO();
    
    this.monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
  }

  init() {
    this.render();
    this.bindEvents();
    this.renderDayServices(this.selectedDate);
  }

  bindEvents() {
    const prevBtn = document.getElementById('cal-prev-month');
    const nextBtn = document.getElementById('cal-next-month');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.currentMonth--;
        if (this.currentMonth < 0) {
          this.currentMonth = 11;
          this.currentYear--;
        }
        this.render();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentMonth++;
        if (this.currentMonth > 11) {
          this.currentMonth = 0;
          this.currentYear++;
        }
        this.render();
      });
    }
  }

  render() {
    const monthHeader = document.getElementById('cal-month-title');
    if (monthHeader) {
      monthHeader.textContent = `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
    }

    const grid = document.getElementById('cal-days-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Calculate days in month and starting day of week
    const firstDayIndex = new Date(this.currentYear, this.currentMonth, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    // Get all services
    const services = window.storageManager.getServices();

    // Group services by date string "YYYY-MM-DD"
    const servicesByDate = {};
    services.forEach(s => {
      if (!servicesByDate[s.date]) {
        servicesByDate[s.date] = [];
      }
      servicesByDate[s.date].push(s);
    });

    // Render empty prefix slots
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'calendar-day empty';
      grid.appendChild(emptyDiv);
    }

    // Render each day of the month
    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(this.currentMonth + 1).padStart(2, '0');
      const dateKey = `${this.currentYear}-${monthStr}-${dayStr}`;

      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day';
      dayCell.textContent = day;
      dayCell.dataset.date = dateKey;

      // Check status of services on this date
      const dayServices = servicesByDate[dateKey] || [];
      if (dayServices.length > 0) {
        const hasConcluido = dayServices.some(s => s.status === 'concluido');
        const hasAgendado = dayServices.some(s => s.status === 'agendado');

        if (hasConcluido && hasAgendado) {
          dayCell.classList.add('has-ambos');
        } else if (hasConcluido) {
          dayCell.classList.add('has-concluido');
        } else if (hasAgendado) {
          dayCell.classList.add('has-agendado');
        }
      }

      // Check if this is the selected date
      if (dateKey === this.selectedDate) {
        dayCell.classList.add('is-selected');
      }

      // Click event to select date
      dayCell.addEventListener('click', () => {
        this.selectDate(dateKey);
      });

      grid.appendChild(dayCell);
    }
  }

  selectDate(dateKey) {
    this.selectedDate = dateKey;

    // Update active highlight in DOM
    const allDays = document.querySelectorAll('.calendar-day');
    allDays.forEach(cell => {
      if (cell.dataset.date === dateKey) {
        cell.classList.add('is-selected');
      } else {
        cell.classList.remove('is-selected');
      }
    });

    // Render services for this date
    this.renderDayServices(dateKey);
  }

  renderDayServices(dateKey) {
    const container = document.getElementById('cal-day-services-list');
    const headerDate = document.getElementById('cal-selected-date-text');
    const headerCount = document.getElementById('cal-selected-date-count');

    if (!container) return;

    // Format display date: DD/MM/YYYY
    const [y, m, d] = dateKey.split('-');
    const formattedDate = `${d}/${m}/${y}`;

    if (headerDate) {
      headerDate.textContent = formattedDate;
    }

    const services = window.storageManager.getServices();
    const dayServices = services.filter(s => s.date === dateKey);

    if (headerCount) {
      headerCount.textContent = `${dayServices.length} serviço${dayServices.length === 1 ? '' : 's'}`;
    }

    if (dayServices.length === 0) {
      container.innerHTML = `
        <div class="empty-day-state">
          <i class="fa-regular fa-calendar-xmark"></i>
          <p>Nenhum serviço agendado para este dia.</p>
          <button class="btn btn-primary btn-sm" onclick="window.servicesController.openNewServiceModal('${dateKey}')">
            <i class="fa-solid fa-plus"></i> Agendar neste dia
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    dayServices.forEach(s => {
      const card = this.createServiceCard(s);
      container.appendChild(card);
    });
  }

  createServiceCard(service) {
    const card = document.createElement('div');
    card.className = `service-item-card is-${service.status}`;
    card.dataset.id = service.id;

    // First letter avatar
    const initial = service.clientName ? service.clientName.charAt(0).toUpperCase() : 'M';
    
    // Avatar color classes
    const colors = ['avatar-purple', 'avatar-green', 'avatar-blue', 'avatar-orange'];
    const colorClass = colors[(service.clientName || 'M').charCodeAt(0) % colors.length];

    const esc = (v) => Utils.escapeHtml(v);
    const idArg = Utils.escapeJsString(service.id);
    const cost = Utils.toNumber(service.cost);
    const profit = Utils.serviceProfit(service);

    const isConcluido = service.status === 'concluido';
    const isPago = service.paymentStatus === 'pago';

    const cleanPhone = (service.clientPhone || '').replace(/\D/g, '');
    const whatsMsg = encodeURIComponent(
      `Olá ${service.clientName}, tudo bem? Sou o montador de móveis da RS Montagens.\nEstou confirmando o serviço: "${service.description}" agendado para ${this.formatDateBR(service.date)} às ${service.time}h.`
    );
    const whatsUrl = `https://wa.me/55${cleanPhone}?text=${whatsMsg}`;

    const encodedAddress = encodeURIComponent(service.clientAddress || '');
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    const wazeUrl = `https://waze.com/ul?q=${encodedAddress}`;

    card.innerHTML = `
      <div class="service-item-left">
        <div class="client-avatar ${colorClass}">
          ${initial}
        </div>
        <div class="service-info">
          <h4>${esc(service.clientName)}</h4>
          <p class="service-desc">${esc(service.description)}</p>
          <div class="service-meta">
            <span><i class="fa-regular fa-clock"></i> ${esc(service.time)}h</span>
            ${service.clientAddress ? `<a class="service-address-link" href="${mapsUrl}" target="_blank" rel="noopener" title="Abrir no Google Maps"><i class="fa-solid fa-location-dot"></i> ${esc(service.clientAddress)}</a>` : ''}
          </div>
        </div>
      </div>
      <div class="service-item-right">
        <div class="service-price">
          <div class="service-price-val">${Utils.formatBRL(service.value)}</div>
          ${cost > 0 ? `<div class="service-price-net" title="Valor cobrado menos os gastos com material">líquido ${Utils.formatBRL(profit)}</div>` : ''}
          <div style="display: flex; gap: 4px; justify-content: flex-end; margin-top: 4px;">
            <span class="badge ${isConcluido ? 'badge-concluido' : 'badge-agendado'}">
              ${isConcluido ? 'Concluído' : 'Agendado'}
            </span>
            <span class="badge ${isPago ? 'badge-pago' : 'badge-pendente'}">
              ${isPago ? 'Pago' : 'Pendente'}
            </span>
          </div>
        </div>
        <div class="service-actions">
          ${cleanPhone ? `
            <a href="${whatsUrl}" target="_blank" class="btn btn-whatsapp btn-icon" title="Enviar WhatsApp">
              <i class="fa-brands fa-whatsapp"></i>
            </a>
          ` : ''}
          ${service.clientAddress ? `
            <a href="${mapsUrl}" target="_blank" rel="noopener" class="btn btn-outline btn-icon" title="Abrir no Google Maps">
              <i class="fa-solid fa-map-location-dot"></i>
            </a>
          ` : ''}
          <button class="btn ${isConcluido ? 'btn-outline' : 'btn-success'} btn-icon" 
                  title="${isConcluido ? 'Reabrir Serviço' : 'Marcar como Concluído'}"
                  onclick="window.servicesController.toggleServiceStatus('${idArg}')">
            <i class="fa-solid ${isConcluido ? 'fa-arrow-rotate-left' : 'fa-check'}"></i>
          </button>
          <button class="btn btn-outline btn-icon" title="Mais Opções" onclick="window.servicesController.openServiceDetailModal('${idArg}')">
            <i class="fa-solid fa-ellipsis-vertical"></i>
          </button>
        </div>
      </div>
    `;

    return card;
  }

  formatDateBR(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
}

window.calendarController = new CalendarController();
