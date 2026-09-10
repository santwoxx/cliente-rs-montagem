/* ==========================================================================
   MOVELPRO - AUTHENTICATION & ROLE MANAGEMENT
   Firebase Auth, Role-based Access (Admin vs Funcionário) & Team Management
   ========================================================================== */

class AuthController {
  constructor() {
    this.currentUser = null;
    this.isAdmin = false;
    this.teamMembers = [];
  }

  init() {
    this.bindEvents();
    this.listenAuthState();
  }

  bindEvents() {
    // Login form submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Forgot password button
    const forgotBtn = document.getElementById('btn-forgot-password');
    if (forgotBtn) {
      forgotBtn.addEventListener('click', () => {
        this.handleForgotPassword();
      });
    }

    // Logout buttons (desktop sidebar & mobile adjustments)
    const logoutBtns = document.querySelectorAll('.btn-logout-trigger');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleLogout();
      });
    });

    // Google Login button (Admins)
    const googleBtn = document.getElementById('btn-google-login');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => {
        this.handleGoogleLogin();
      });
    }

    // Employee creation form (Admin only)
    const employeeForm = document.getElementById('employee-form');
    if (employeeForm) {
      employeeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateEmployee();
      });
    }
  }

  async handleGoogleLogin() {
    const errorAlert = document.getElementById('login-error-alert');
    const googleBtn = document.getElementById('btn-google-login');
    if (errorAlert) errorAlert.style.display = 'none';

    if (!window.firebaseAuth) {
      this.showLoginError('Serviço de autenticação Firebase indisponível.');
      return;
    }

    if (googleBtn) {
      googleBtn.disabled = true;
      googleBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Conectando ao Google...';
    }

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await window.firebaseAuth.signInWithPopup(provider);
      const email = (result.user.email || '').toLowerCase().trim();

      // Check if user email is registered as an admin
      const isAdmin = window.ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email);

      if (!isAdmin) {
        // Sign out immediately if not an admin email
        await window.firebaseAuth.signOut();
        this.showLoginError(`O e-mail "${email}" não está na lista de Administradores (${window.ADMIN_EMAILS.join(', ')}). Funcionários devem entrar usando seu e-mail e senha cadastrados pelo administrador.`);
        return;
      }
      // If admin, onAuthStateChanged takes over automatically!
    } catch (error) {
      console.error('Erro no login com Google:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        this.showLoginError('Erro ao entrar com Google: ' + error.message);
      }
    } finally {
      if (googleBtn) {
        googleBtn.disabled = false;
        googleBtn.innerHTML = `
          <svg class="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Entrar com Google (Administrador)</span>
        `;
      }
    }
  }

  listenAuthState() {
    if (!window.firebaseAuth) {
      console.warn('Firebase Auth não disponível, modo offline ativo.');
      this.hideLoginScreen();
      return;
    }

    window.firebaseAuth.onAuthStateChanged(async (user) => {
      if (user) {
        this.currentUser = user;
        const normalizedEmail = (user.email || '').toLowerCase().trim();

        // Check if admin by email or by firestore role
        let isAdmin = window.ADMIN_EMAILS.map(e => e.toLowerCase()).includes(normalizedEmail);

        if (!isAdmin && window.firestoreDb) {
          try {
            const userDoc = await window.firestoreDb.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().role === 'admin') {
              isAdmin = true;
            }
          } catch (e) {
            console.error('Erro ao verificar papel do usuário no Firestore:', e);
          }
        }

        this.isAdmin = isAdmin;
        this.onUserAuthenticated(user, isAdmin);
      } else {
        this.currentUser = null;
        this.isAdmin = false;
        if (window.storageManager && window.storageManager.pararEscutaEmTempoReal) {
          window.storageManager.pararEscutaEmTempoReal();
        }
        this.showLoginScreen();
      }
    });
  }

  showLoginScreen() {
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) {
      loginOverlay.style.display = 'flex';
      loginOverlay.classList.add('active');
    }
  }

  hideLoginScreen() {
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) {
      loginOverlay.style.display = 'none';
      loginOverlay.classList.remove('active');
    }
  }

  async handleLogin() {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('btn-login-submit');
    const errorAlert = document.getElementById('login-error-alert');

    if (!emailInput || !passInput) return;

    const email = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !password) {
      this.showLoginError('Preencha seu e-mail e sua senha de acesso.');
      return;
    }

    if (errorAlert) errorAlert.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';
    }

    try {
      if (!window.firebaseAuth) {
        throw new Error('Serviço de autenticação offline.');
      }

      await window.firebaseAuth.signInWithEmailAndPassword(email, password);
      // Auth state listener handles the rest
    } catch (error) {
      console.error('Erro no login:', error);
      let msg = 'Erro ao realizar login.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        msg = 'E-mail ou senha incorretos. Verifique suas credenciais.';
      } else if (error.code === 'auth/too-many-requests') {
        msg = 'Muitas tentativas sem sucesso. Aguarde alguns minutos ou redefina sua senha.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Formato de e-mail inválido.';
      } else {
        msg = error.message;
      }
      this.showLoginError(msg);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar no Sistema';
      }
    }
  }

  showLoginError(message) {
    const errorAlert = document.getElementById('login-error-alert');
    if (errorAlert) {
      errorAlert.textContent = message;
      errorAlert.style.display = 'block';
    } else {
      alert(message);
    }
  }

  async handleForgotPassword() {
    const emailInput = document.getElementById('login-email');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
      this.showLoginError('Digite seu e-mail no campo acima para redefinir a senha.');
      return;
    }

    try {
      await window.firebaseAuth.sendPasswordResetEmail(email);
      alert(`Link de redefinição de senha enviado para: ${email}. Verifique sua caixa de entrada e spam.`);
    } catch (e) {
      this.showLoginError('Erro ao enviar e-mail de recuperação: ' + e.message);
    }
  }

  async handleLogout() {
    if (confirm('Deseja realmente sair da sua conta?')) {
      if (window.storageManager && window.storageManager.pararEscutaEmTempoReal) {
        window.storageManager.pararEscutaEmTempoReal();
      }
      if (window.firebaseAuth) {
        await window.firebaseAuth.signOut();
      }
      window.location.reload();
    }
  }

  onUserAuthenticated(user, isAdmin) {
    this.hideLoginScreen();

    const roleName = isAdmin ? 'Administrador' : 'Funcionário';
    const roleClass = isAdmin ? 'badge-admin' : 'badge-funcionario';

    // Update user info in sidebar & profile
    const proNameEl = document.querySelector('.pro-name');
    const proRoleEl = document.querySelector('.pro-role');
    const proAvatarEl = document.querySelector('.pro-avatar');

    if (proNameEl) proNameEl.textContent = user.displayName || user.email.split('@')[0];
    if (proRoleEl) {
      proRoleEl.innerHTML = `<span class="badge ${roleClass}" style="font-size: 0.68rem; padding: 2px 8px;">${roleName}</span>`;
    }
    if (proAvatarEl) {
      proAvatarEl.textContent = (user.email.charAt(0) || 'U').toUpperCase();
    }

    // Apply UI role permissions
    this.applyRolePermissions(isAdmin);

    if (!isAdmin && window.app) {
      const adminOnlyViews = ['view-financeiro', 'view-ajustes', 'view-orcamentos', 'view-montadores', 'view-lojas'];
      if (adminOnlyViews.includes(window.app.currentView)) {
        window.app.navigateTo('view-agenda');
      }
    }

    // Sync cloud data with Firestore and start real-time listener
    if (window.storageManager) {
      if (window.storageManager.syncFromFirestore) {
        window.storageManager.syncFromFirestore();
      }
      if (window.storageManager.iniciarEscutaEmTempoReal) {
        window.storageManager.iniciarEscutaEmTempoReal();
      }
    }

    // Load team list for admins
    if (isAdmin) {
      this.loadTeamMembers();
    }

    if (window.app) {
      window.app.showToast(`Bem-vindo, ${user.email} (${roleName})!`, 'success');
      window.app.updateAllViews();
    }
  }

  applyRolePermissions(isAdmin) {
    document.body.classList.toggle('is-admin', !!isAdmin);
    document.body.classList.toggle('is-montador', !isAdmin);

    // Hide or show admin-only elements
    const adminElements = document.querySelectorAll('[data-admin-only="true"]');
    adminElements.forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });

    // Recados que só fazem sentido para o funcionário.
    document.querySelectorAll('[data-funcionario-only="true"]').forEach(el => {
      el.style.display = isAdmin ? 'none' : '';
    });

    // Agora que se sabe quem entrou, as notificações se ajustam ao papel.
    if (window.notificationsController) window.notificationsController.aoTrocarDeUsuario();

    // Ajustes continua aberto ao montador, mas enxuto: lá dentro ele tem
    // tema, instalação do app e notificações. Perfil, PIX, backup, financeiro
    // e equipe são marcados como data-admin-only e somem para ele.
    const adminNavTargets = ['view-clientes', 'view-orcamentos', 'view-montadores', 'view-lojas'];
    adminNavTargets.forEach(target => {
      const navEls = document.querySelectorAll(`[data-view-target="${target}"]`);
      navEls.forEach(el => {
        const parentLi = el.closest('li');
        if (parentLi && parentLi.closest('.mobile-bottom-nav')) {
          parentLi.style.display = isAdmin ? '' : 'none';
        } else {
          el.style.display = isAdmin ? '' : 'none';
        }
      });
    });
  }

  // Admin Function: Create new employee account without logging out admin
  async criarContaFuncionario(name, email, password, phone = '') {
    if (!this.isAdmin) {
      throw new Error('Apenas administradores podem cadastrar funcionários.');
    }

    const nomeTratado = String(name || '').trim();
    const emailTratado = String(email || '').trim().toLowerCase();

    if (!nomeTratado || !emailTratado || !password) {
      throw new Error('Preencha nome, e-mail e senha do funcionário.');
    }

    if (password.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    let tempApp = null;

    try {
      // Cria instância secundária do Firebase App para NÃO deslogar o Admin
      const tempAppName = 'SecondaryAuthApp_' + Date.now();
      tempApp = firebase.initializeApp(window.firebaseConfig, tempAppName);
      const userCredential = await tempApp.auth().createUserWithEmailAndPassword(emailTratado, password);

      const uid = userCredential.user.uid;

      if (userCredential.user) {
        await userCredential.user.updateProfile({ displayName: nomeTratado });
      }

      await tempApp.auth().signOut();
      await tempApp.delete();
      tempApp = null;

      // Salva no Firestore
      const employeeData = {
        uid,
        name: nomeTratado,
        email: emailTratado,
        phone: phone || '',
        role: 'funcionario',
        createdAt: new Date().toISOString(),
        createdBy: this.currentUser ? this.currentUser.email : 'admin'
      };

      if (window.firestoreDb) {
        await window.firestoreDb.collection('users').doc(uid).set(employeeData);
      }

      // Salva no cache da equipe
      const localTeam = JSON.parse(localStorage.getItem('movelpro_team') || '[]');
      const semDuplicados = localTeam.filter(m => m.email !== emailTratado && m.uid !== uid);
      semDuplicados.push(employeeData);
      localStorage.setItem('movelpro_team', JSON.stringify(semDuplicados));

      // Vincula no cadastro de montadores
      this.vincularMontador(nomeTratado, emailTratado, phone);

      if (this.loadTeamMembers) this.loadTeamMembers();

      return { success: true, uid };
    } catch (e) {
      if (tempApp) {
        try { await tempApp.delete(); } catch (_) {}
      }
      throw e;
    }
  }

  async handleCreateEmployee() {
    if (!this.isAdmin) {
      window.app.showToast('Apenas administradores podem cadastrar funcionários.', 'danger');
      return;
    }

    const nameInput = document.getElementById('emp-name');
    const emailInput = document.getElementById('emp-email');
    const passInput = document.getElementById('emp-password');
    const submitBtn = document.getElementById('btn-create-emp');

    if (!nameInput || !emailInput || !passInput) return;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passInput.value;

    if (!name || !email || !password) {
      window.app.showToast('Preencha todos os campos do funcionário.', 'danger');
      return;
    }

    if (password.length < 6) {
      window.app.showToast('A senha deve ter no mínimo 6 caracteres.', 'danger');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cadastrando...';
    }

    try {
      await this.criarContaFuncionario(name, email, password);
      window.app.showToast(`Funcionário ${name} cadastrado com sucesso! Ele já pode fazer login.`, 'success');
      document.getElementById('employee-form').reset();
    } catch (e) {
      console.error('Erro ao cadastrar funcionário:', e);
      window.app.showToast(this.explicarErroDeCadastro(e), 'danger');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Cadastrar Funcionário';
      }
    }
  }

  /**
   * Traduz o erro do Firebase para uma frase que diz O QUE FAZER.
   * O cadastro de funcionário costuma falhar por configuração do projeto,
   * não por erro de digitação — e a mensagem crua do Firebase não ajuda.
   */
  explicarErroDeCadastro(e) {
    const codigo = (e && e.code) || '';

    const mapa = {
      'auth/email-already-in-use':
        'Este e-mail já tem conta no sistema. Use outro e-mail ou redefina a senha dele.',
      'auth/invalid-email':
        'E-mail inválido. Confira se está escrito certo, sem espaço sobrando.',
      'auth/weak-password':
        'Senha fraca. Use no mínimo 6 caracteres.',
      'auth/operation-not-allowed':
        'O login por e-mail/senha está DESLIGADO no Firebase. Abra o Console do Firebase > Authentication > Sign-in method e ative "E-mail/senha".',
      'auth/admin-restricted-operation':
        'O Firebase está bloqueando a criação de contas pelo app. Abra o Console do Firebase > Authentication > Settings > User actions e marque "Enable create (sign-up)".',
      'auth/network-request-failed':
        'Sem conexão com o Firebase. Confira a internet e tente de novo.',
      'auth/too-many-requests':
        'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
    };

    if (mapa[codigo]) return mapa[codigo];
    return `Erro ao cadastrar funcionário (${codigo || 'sem código'}): ${e.message}`;
  }

  /**
   * Garante que exista um montador com este e-mail no painel de montadores.
   * É esse vínculo que faz o funcionário abrir o app e ver só as montagens
   * dele, com o valor que ele recebe em vez do valor cheio do cliente.
   */
  vincularMontador(nome, email, phone = '') {
    if (!window.storageManager) return;

    const assemblers = window.storageManager.getAssemblers();
    const alvo = String(email || '').toLowerCase();
    const existente = assemblers.find(a => String(a.email || '').toLowerCase() === alvo);

    if (existente) {
      if (!existente.name && nome) existente.name = nome;
      if (!existente.phone && phone) existente.phone = phone;
      window.storageManager.saveAssemblers(assemblers);
      return;
    }

    // Mesmo nome já cadastrado sem e-mail? Aproveita o cadastro e só amarra o login.
    const porNome = assemblers.find(
      a => !a.email && String(a.name || '').trim().toLowerCase() === String(nome || '').trim().toLowerCase()
    );
    if (porNome) {
      porNome.email = email;
      if (!porNome.phone && phone) porNome.phone = phone;
      window.storageManager.saveAssemblers(assemblers);
      return;
    }

    assemblers.push({
      id: 'a_' + Date.now(),
      name: nome,
      email,
      phone: phone || '',
      isOwner: false,
      createdAt: new Date().toISOString()
    });
    window.storageManager.saveAssemblers(assemblers);

    if (window.assemblersController) window.assemblersController.render();
  }

  /* ---------- Quem está usando o app agora ---------- */

  /** Id do montador ligado ao login atual, ou null se não houver vínculo. */
  getCurrentAssemblerId() {
    if (!this.currentUser || !window.storageManager) return null;
    const email = String(this.currentUser.email || '').toLowerCase();
    const encontrado = (window.storageManager.getAssemblers() || [])
      .find(a => String(a.email || '').toLowerCase() === email);
    return encontrado ? encontrado.id : null;
  }

  /** Admin vê o dinheiro todo: valor cobrado, material e lucro. */
  podeVerValoresCheios() {
    return !!this.isAdmin;
  }

  /** O serviço é deste montador? Define o que ele pode ver de valor. */
  servicoEhMeu(service) {
    const meuId = this.getCurrentAssemblerId();
    return !!(meuId && service && service.assemblerId === meuId);
  }

  async loadTeamMembers() {
    const listContainer = document.getElementById('team-members-list');
    if (!listContainer) return;

    let members = [];

    // Try reading from Firestore first
    if (window.firestoreDb) {
      try {
        const snapshot = await window.firestoreDb.collection('users').get();
        snapshot.forEach(doc => {
          members.push(doc.data());
        });
      } catch (e) {
        console.warn('Erro ao carregar equipe do Firestore:', e);
      }
    }

    if (members.length === 0) {
      // Read local cache
      members = JSON.parse(localStorage.getItem('movelpro_team') || '[]');
    }

    if (members.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.88rem;">
          Nenhum funcionário cadastrado ainda. Use o formulário ao lado para criar o primeiro login de funcionário.
        </div>
      `;
      return;
    }

    listContainer.innerHTML = members.map(m => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--bg-app); border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="client-avatar avatar-blue" style="width: 38px; height: 38px; font-size: 0.9rem;">
            ${(m.name || m.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-weight: 800; font-size: 0.92rem;">${m.name || 'Funcionário'}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${m.email}</div>
          </div>
        </div>
        <div>
          <span class="badge badge-funcionario">Funcionário</span>
        </div>
      </div>
    `).join('');
  }
}

window.authController = new AuthController();
