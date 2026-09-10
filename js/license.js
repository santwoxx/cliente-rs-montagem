/* ==========================================================================
   MOVELPRO - LICENSE & PAYWALL CONTROLLER
   Monthly Payment Verification (Controlled via Vercel Environment Variables)
   ========================================================================== */

class LicenseController {
  constructor() {
    this.isBlocked = false;
    this.licenseData = {
      paidUntil: '2026-10-09',
      pixKey: 'brisasofc@gmail.com',
      pixType: 'E-mail',
      whatsapp: '5511999999999',
      monthlyAmount: '150,00',
      reason: ''
    };
  }

  async init() {
    await this.checkLicense();
    this.bindEvents();
  }

  bindEvents() {
    // Copy PIX button
    const copyPixBtn = document.getElementById('btn-copy-license-pix');
    if (copyPixBtn) {
      copyPixBtn.addEventListener('click', () => {
        const pixKey = this.licenseData.pixKey;
        navigator.clipboard.writeText(pixKey).then(() => {
          copyPixBtn.innerHTML = '<i class="fa-solid fa-check"></i> Chave PIX Copiada!';
          setTimeout(() => {
            copyPixBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar Chave PIX';
          }, 3000);
        });
      });
    }

    // Re-verify payment button
    const recheckBtn = document.getElementById('btn-recheck-license');
    if (recheckBtn) {
      recheckBtn.addEventListener('click', async () => {
        recheckBtn.disabled = true;
        recheckBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando status...';
        await this.checkLicense();
        recheckBtn.disabled = false;
        recheckBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Já Efetuei o Pagamento (Verificar)';
      });
    }

    // Emergency unlock prompt for developer
    const devUnlockLink = document.getElementById('link-dev-emergency-unlock');
    if (devUnlockLink) {
      devUnlockLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.promptEmergencyUnlock();
      });
    }
  }

  async checkLicense(unlockPassword = null) {
    try {
      let url = '/api/license';
      if (unlockPassword) {
        url += `?unlockPassword=${encodeURIComponent(unlockPassword)}`;
      }

      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        this.licenseData = data;
        this.isBlocked = data.blocked;
      } else {
        // Fallback local if running outside Vercel
        this.localFallbackCheck();
      }
    } catch (e) {
      // Local fallback in case fetch /api/license fails (e.g. local file preview)
      this.localFallbackCheck();
    }

    this.renderState();
  }

  localFallbackCheck() {
    // Current simulated date: 2026-09-09.
    // Cutoff date for next month: 2026-10-09
    const cutoffDate = this.licenseData.paidUntil || '2026-10-09';
    const today = Utils.todayISO();

    // If today is equal or past cutoff date, block
    if (today >= cutoffDate) {
      this.isBlocked = true;
      this.licenseData.reason = `Acesso suspenso: A mensalidade referente ao dia ${cutoffDate} está pendente.`;
    } else {
      this.isBlocked = false;
    }
  }

  renderState() {
    const lockOverlay = document.getElementById('paywall-lock-overlay');
    const appLayout = document.querySelector('.app-layout');

    if (!lockOverlay) return;

    if (this.isBlocked) {
      lockOverlay.style.display = 'flex';
      lockOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Update lock screen info
      const pixKeyEl = document.getElementById('lock-pix-key');
      const pixTypeEl = document.getElementById('lock-pix-type');
      const reasonEl = document.getElementById('lock-reason-text');
      const whatsBtn = document.getElementById('btn-lock-whatsapp');

      if (pixKeyEl) pixKeyEl.textContent = this.licenseData.pixKey;
      if (pixTypeEl) pixTypeEl.textContent = `(${this.licenseData.pixType})`;
      if (reasonEl && this.licenseData.reason) reasonEl.textContent = this.licenseData.reason;

      if (whatsBtn) {
        const cleanWhatsapp = (this.licenseData.whatsapp || '').replace(/\D/g, '');
        const msg = encodeURIComponent(
          `Olá! Efetuei o pagamento da mensalidade do sistema de montagem de móveis (ciclo ${this.licenseData.paidUntil}). Segue o comprovante para liberação!`
        );
        whatsBtn.href = `https://wa.me/${cleanWhatsapp}?text=${msg}`;
      }

      if (appLayout) {
        appLayout.style.filter = 'blur(10px)';
        appLayout.style.pointerEvents = 'none';
      }
    } else {
      lockOverlay.style.display = 'none';
      lockOverlay.classList.remove('active');
      document.body.style.overflow = '';
      if (appLayout) {
        appLayout.style.filter = '';
        appLayout.style.pointerEvents = '';
      }
    }
  }

  async promptEmergencyUnlock() {
    const password = prompt('Área do Desenvolvedor: Digite a senha mestra para desbloqueio temporário:');
    if (!password) return;

    await this.checkLicense(password);
    if (!this.isBlocked) {
      alert('Sistema desbloqueado com sucesso com a credencial mestra!');
    } else {
      alert('Senha mestra incorreta.');
    }
  }
}

window.licenseController = new LicenseController();
