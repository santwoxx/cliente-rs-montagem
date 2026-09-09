/* ==========================================================================
   MOVELPRO - STORAGE & DATA LAYER
   LocalStorage management, initial seed matching screenshot & backup tools
   ========================================================================== */

const STORAGE_KEYS = {
  SERVICES: 'movelpro_services',
  TRANSACTIONS: 'movelpro_transactions',
  CUSTOMERS: 'movelpro_customers',
  SETTINGS: 'movelpro_settings'
};

const DEFAULT_SETTINGS = {
  montadorName: 'Rodrigo Silva',
  companyName: 'RS Montagens de Móveis',
  phone: '11987654321',
  pixKey: '11987654321',
  pixType: 'Telefone',
  monthlyGoal: 5000,
  reviewLink: '',
  defaultPrices: [
    { id: 1, name: 'Guarda-Roupa 2 Portas', price: 120 },
    { id: 2, name: 'Guarda-Roupa 4 Portas', price: 180 },
    { id: 3, name: 'Guarda-Roupa 6 Portas', price: 250 },
    { id: 4, name: 'Guarda-Roupa com Espelho (+)', price: 40 },
    { id: 5, name: 'Cômoda / Gaveteiro', price: 90 },
    { id: 6, name: 'Painel de TV até 55"', price: 100 },
    { id: 7, name: 'Painel de TV 65"+ ou Ripado', price: 150 },
    { id: 8, name: 'Rack com Painel Integrado', price: 140 },
    { id: 9, name: 'Cozinha Modulada (por módulo)', price: 60 },
    { id: 10, name: 'Cama Casal / Queen / Box', price: 100 },
    { id: 11, name: 'Mesa de Jantar com 4 a 6 cadeiras', price: 120 },
    { id: 12, name: 'Berço Americano / Infantil', price: 110 },
    { id: 13, name: 'Instalação na Parede (por furo/suporte)', price: 30 },
    { id: 14, name: 'Reparo / Regulagem de Portas e Gavetas', price: 60 },
    { id: 15, name: 'Desmontagem de Móvel', price: 80 }
  ]
};

const SEED_CUSTOMERS = [
  {
    id: 'c1',
    name: 'Eder Oliveira',
    phone: '11991234567',
    cep: '01310-100',
    address: 'Av. Paulista, 1000',
    complement: 'Apto 42',
    neighborhood: 'Bela Vista',
    city: 'São Paulo - SP',
    notes: 'Cliente pontual, apartamento com portaria e elevador de serviço.',
    createdAt: '2026-09-01T10:00:00Z'
  },
  {
    id: 'c2',
    name: 'Mariana Santos',
    phone: '11988776655',
    cep: '04538-133',
    address: 'Rua Joaquim Floriano, 550',
    complement: 'Bloco B, 71',
    neighborhood: 'Itaim Bibi',
    city: 'São Paulo - SP',
    notes: 'Solicitou montagem de guarda-roupa 6 portas novo.',
    createdAt: '2026-09-02T11:30:00Z'
  },
  {
    id: 'c3',
    name: 'Carlos Alberto Souza',
    phone: '11977665544',
    cep: '02012-000',
    address: 'Rua Voluntários da Pátria, 1200',
    complement: 'Casa 2',
    neighborhood: 'Santana',
    city: 'São Paulo - SP',
    notes: 'Montagem de cozinha modulada e mesa com 6 cadeiras.',
    createdAt: '2026-09-03T09:00:00Z'
  },
  {
    id: 'c4',
    name: 'Loja TokLar Móveis',
    phone: '11966554433',
    cep: '03001-000',
    address: 'Rua do Gasômetro, 300',
    complement: '',
    neighborhood: 'Brás',
    city: 'São Paulo - SP',
    notes: 'Parceiro lojista - repassa montagens semanais em domicílio.',
    createdAt: '2026-08-15T14:00:00Z'
  }
];

// Seed services matching the user's screenshot:
// Setembro 2026: Dia 07 = Concluído, Dia 08 = Concluído, Dia 09 = Agendado (Eder)
// cost = gastos com material do serviço (corrediça, dobradiça, parafuso...).
// O cliente paga 'value'; o lucro líquido do montador é value - cost.
const SEED_SERVICES = [
  {
    id: 's1',
    clientId: 'c2',
    clientName: 'Mariana Santos',
    clientPhone: '11988776655',
    clientAddress: 'Rua Joaquim Floriano, 550 - Itaim Bibi, SP',
    date: '2026-09-07',
    time: '09:00',
    description: 'Montagem Guarda-Roupa Casal 6 Portas + Painel TV',
    value: 350.00,
    cost: 0.00,
    status: 'concluido',
    paymentStatus: 'pago',
    paymentMethod: 'PIX',
    notes: 'Serviço finalizado com sucesso. Cliente avaliou 5 estrelas.',
    createdAt: '2026-09-01T10:00:00Z'
  },
  {
    id: 's2',
    clientId: 'c3',
    clientName: 'Carlos Alberto Souza',
    clientPhone: '11977665544',
    clientAddress: 'Rua Voluntários da Pátria, 1200 - Santana, SP',
    date: '2026-09-08',
    time: '13:30',
    description: 'Montagem Mesa de Jantar 6 cadeiras + Buffet',
    value: 220.00,
    cost: 0.00,
    status: 'concluido',
    paymentStatus: 'pago',
    paymentMethod: 'Dinheiro',
    notes: 'Cliente pagou em espécie ao término.',
    createdAt: '2026-09-02T12:00:00Z'
  },
  {
    id: 's3',
    clientId: 'c1',
    clientName: 'Eder',
    clientPhone: '11991234567',
    clientAddress: 'Av. Paulista, 1000 - Apto 42, Bela Vista, SP',
    date: '2026-09-09',
    time: '10:00',
    description: 'Reparo e regulagem gavetas e dobradiças guarda-roupa',
    value: 90.00,
    cost: 30.00,
    status: 'agendado',
    paymentStatus: 'pendente',
    paymentMethod: 'PIX',
    notes: 'Levar parafusos adicionais e corrediças telescópicas de 40cm.',
    createdAt: '2026-09-05T14:30:00Z'
  },
  {
    id: 's4',
    clientId: 'c4',
    clientName: 'Loja TokLar Móveis (Cliente: Patrícia)',
    clientPhone: '11966554433',
    clientAddress: 'Rua Vergueiro, 2500 - Vila Mariana, SP',
    date: '2026-09-12',
    time: '14:00',
    description: 'Montagem Quarto de Bebê Completo (Berço + Cômoda + Roupeiro)',
    value: 380.00,
    cost: 45.00,
    status: 'agendado',
    paymentStatus: 'pendente',
    paymentMethod: 'PIX',
    notes: 'Ordem de serviço entregue pela loja.',
    createdAt: '2026-09-06T16:00:00Z'
  },
  {
    id: 's5',
    clientId: 'c1',
    clientName: 'Eder',
    clientPhone: '11991234567',
    clientAddress: 'Av. Paulista, 1000 - Apto 42, Bela Vista, SP',
    date: '2026-09-16',
    time: '11:00',
    description: 'Instalação de Painel Ripado com Suporte TV articulado',
    value: 180.00,
    cost: 60.00,
    status: 'agendado',
    paymentStatus: 'pendente',
    paymentMethod: 'Cartão de Crédito',
    notes: 'Cliente quer passar no cartão.',
    createdAt: '2026-09-07T18:00:00Z'
  }
];

// Financial transactions (Receitas e Despesas)
const SEED_TRANSACTIONS = [
  {
    id: 't1',
    type: 'receita',
    category: 'Montagem Particular',
    description: 'Montagem Guarda-Roupa - Mariana Santos',
    value: 350.00,
    date: '2026-09-07',
    paymentMethod: 'PIX',
    status: 'pago',
    serviceId: 's1',
    createdAt: '2026-09-07T12:00:00Z'
  },
  {
    id: 't2',
    type: 'despesa',
    category: 'Combustível',
    description: 'Abastecimento Gasolina Moto/Carro',
    value: 80.00,
    date: '2026-09-07',
    paymentMethod: 'Cartão Débito',
    status: 'pago',
    createdAt: '2026-09-07T08:30:00Z'
  },
  {
    id: 't3',
    type: 'receita',
    category: 'Montagem Particular',
    description: 'Montagem Mesa e Buffet - Carlos Alberto',
    value: 220.00,
    date: '2026-09-08',
    paymentMethod: 'Dinheiro',
    status: 'pago',
    serviceId: 's2',
    createdAt: '2026-09-08T16:00:00Z'
  },
  {
    id: 't4',
    type: 'despesa',
    category: 'Ferramentas / Ferragens',
    description: 'Jogo de Brocas, Parafusos e Buchas 8mm',
    value: 65.00,
    date: '2026-09-08',
    paymentMethod: 'PIX',
    status: 'pago',
    createdAt: '2026-09-08T11:00:00Z'
  },
  {
    id: 't5',
    type: 'despesa',
    category: 'Alimentação',
    description: 'Almoço em trânsito',
    value: 32.50,
    date: '2026-09-08',
    paymentMethod: 'Cartão Débito',
    status: 'pago',
    createdAt: '2026-09-08T13:00:00Z'
  }
];

class StorageManager {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.save(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      this.save(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) {
      this.save(STORAGE_KEYS.SERVICES, SEED_SERVICES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      this.save(STORAGE_KEYS.TRANSACTIONS, SEED_TRANSACTIONS);
    }

    this.runMigrations();
  }

  /**
   * Ajusta dados já salvos no navegador para o formato atual.
   * Roda sempre no boot e é idempotente (só grava se algo mudou).
   */
  runMigrations() {
    // v2: campo "cost" (gastos com material) passou a existir em cada serviço.
    const services = this.get(STORAGE_KEYS.SERVICES) || [];
    let changed = false;

    services.forEach(s => {
      if (typeof s.cost !== 'number') {
        s.cost = 0;
        changed = true;
      }
    });

    if (changed) {
      this.save(STORAGE_KEYS.SERVICES, services);
    }
  }

  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Erro ao ler ${key}:`, e);
      return null;
    }
  }

  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`Erro ao salvar ${key}:`, e);
      return false;
    }
  }

  // Entities Accessors com Sincronização Cloud Firestore
  getServices() {
    return this.get(STORAGE_KEYS.SERVICES) || [];
  }

  saveServices(services) {
    const res = this.save(STORAGE_KEYS.SERVICES, services);
    this.syncToFirestore('services', services);
    return res;
  }

  getTransactions() {
    return this.get(STORAGE_KEYS.TRANSACTIONS) || [];
  }

  saveTransactions(transactions) {
    const res = this.save(STORAGE_KEYS.TRANSACTIONS, transactions);
    this.syncToFirestore('transactions', transactions);
    return res;
  }

  getCustomers() {
    return this.get(STORAGE_KEYS.CUSTOMERS) || [];
  }

  saveCustomers(customers) {
    const res = this.save(STORAGE_KEYS.CUSTOMERS, customers);
    this.syncToFirestore('customers', customers);
    return res;
  }

  getSettings() {
    return this.get(STORAGE_KEYS.SETTINGS) || DEFAULT_SETTINGS;
  }

  saveSettings(settings) {
    const res = this.save(STORAGE_KEYS.SETTINGS, settings);
    this.syncToFirestore('settings', settings);
    return res;
  }

  // Cloud Firestore Sync Helpers
  async syncToFirestore(collectionKey, data) {
    if (!window.firestoreDb || !window.firebaseAuth || !window.firebaseAuth.currentUser) return;
    try {
      await window.firestoreDb.collection('app_data').doc(collectionKey).set({
        data,
        updatedAt: new Date().toISOString(),
        updatedBy: window.firebaseAuth.currentUser.email
      }, { merge: true });
    } catch (e) {
      console.warn(`Aviso: salvando localmente. Erro ao sincronizar ${collectionKey} no Firestore:`, e.message);
    }
  }

  async syncFromFirestore() {
    if (!window.firestoreDb || !window.firebaseAuth || !window.firebaseAuth.currentUser) return;
    try {
      const collections = ['services', 'customers', 'transactions', 'settings'];
      let hasUpdates = false;

      for (const col of collections) {
        const docRef = await window.firestoreDb.collection('app_data').doc(col).get();
        if (docRef.exists && docRef.data().data) {
          const cloudData = docRef.data().data;
          const storageKey = STORAGE_KEYS[col.toUpperCase()];
          if (storageKey) {
            this.save(storageKey, cloudData);
            hasUpdates = true;
          }
        } else {
          // Se não existir na nuvem ainda, faz o upload do estado inicial
          const localData = this.get(STORAGE_KEYS[col.toUpperCase()]);
          if (localData) {
            this.syncToFirestore(col, localData);
          }
        }
      }

      if (hasUpdates && window.app) {
        window.app.updateAllViews();
        window.app.showToast('Dados sincronizados com a nuvem.', 'info');
      }
    } catch (e) {
      console.warn('Erro ao sincronizar do Firestore:', e.message);
    }
  }

  // Backup and Restore
  exportBackup() {
    const backupData = {
      app: 'MovelPRO - Sistema do Montador',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      customers: this.getCustomers(),
      services: this.getServices(),
      transactions: this.getTransactions()
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movelpro_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importBackup(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      if (data.settings) this.saveSettings(data.settings);
      if (data.customers) this.saveCustomers(data.customers);
      if (data.services) this.saveServices(data.services);
      if (data.transactions) this.saveTransactions(data.transactions);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  resetToDefault() {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.SERVICES);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    this.init();
  }
}

// Global singleton instance
window.storageManager = new StorageManager();
