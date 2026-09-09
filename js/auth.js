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

    // Employee creation form (Admin only)
    const employeeForm = document.getElementById('employee-form');
    if (employeeForm) {
      employeeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateEmployee();
      });
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

    // Sync cloud data with Firestore
    if (window.storageManager && window.storageManager.syncFromFirestore) {
      window.storageManager.syncFromFirestore();
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
    // Hide or show admin-only elements
    const adminElements = document.querySelectorAll('[data-admin-only="true"]');
    adminElements.forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });

    // In finance tab, if funcionario, restrict sensitive overall business actions
    const financeNav = document.querySelectorAll('[data-view-target="view-financeiro"]');
    financeNav.forEach(nav => {
      if (!isAdmin) {
        // Can still view services or have an indicator
        nav.setAttribute('title', 'Acesso operacional');
      }
    });
  }

  // Admin Function: Create new employee account without logging out admin
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
      // Create secondary Firebase App instance so Admin session is NOT interrupted
      const tempAppName = 'SecondaryAuthApp_' + Date.now();
      const tempApp = firebase.initializeApp(window.firebaseConfig, tempAppName);
      const userCredential = await tempApp.auth().createUserWithEmailAndPassword(email, password);
      
      // Update display name
      if (userCredential.user) {
        await userCredential.user.updateProfile({ displayName: name });
      }

      await tempApp.auth().signOut();
      await tempApp.delete();

      // Save employee record in Firestore
      const employeeData = {
        uid: userCredential.user.uid,
        name,
        email,
        role: 'funcionario',
        createdAt: new Date().toISOString(),
        createdBy: this.currentUser.email
      };

      if (window.firestoreDb) {
        await window.firestoreDb.collection('users').doc(userCredential.user.uid).set(employeeData);
      }

      // Also save in local storage team cache
      const localTeam = JSON.parse(localStorage.getItem('movelpro_team') || '[]');
      localTeam.push(employeeData);
      localStorage.setItem('movelpro_team', JSON.stringify(localTeam));

      window.app.showToast(`Funcionário ${name} cadastrado com sucesso! Ele já pode fazer login.`, 'success');

      // Reset form
      document.getElementById('employee-form').reset();
      this.loadTeamMembers();
    } catch (e) {
      console.error('Erro ao cadastrar funcionário:', e);
      let errMsg = e.message;
      if (e.code === 'auth/email-already-in-use') {
        errMsg = 'Este e-mail já está cadastrado no sistema.';
      }
      window.app.showToast('Erro ao cadastrar funcionário: ' + errMsg, 'danger');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Cadastrar Funcionário';
      }
    }
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
