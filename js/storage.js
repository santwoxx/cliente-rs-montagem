/* ==========================================================================
   MOVELPRO - STORAGE & DATA LAYER
   LocalStorage management, initial seed matching screenshot & backup tools
   ========================================================================== */

const STORAGE_KEYS = {
  SERVICES: 'movelpro_services',
  TRANSACTIONS: 'movelpro_transactions',
  CUSTOMERS: 'movelpro_customers',
  SETTINGS: 'movelpro_settings',
  STORES: 'movelpro_stores',
  ASSEMBLERS: 'movelpro_assemblers'
};

// Tipos de serviço pré-programados (chips do modal de agendamento).
// O detalhe livre do serviço vai no campo de descrição/observações.
const DEFAULT_SERVICE_TYPES = [
  'Montagem',
  'Instalação',
  'Reparo',
  'Manutenção',
  'Consulta',
  'Atendimento',
  'Visita técnica',
  'Diária'
];

const DEFAULT_SETTINGS = {
  montadorName: 'Rodrigo Silva',
  companyName: 'RS Montagens de Móveis',
  phone: '11987654321',
  profession: 'Montador de Móveis',
  cnpj: '',
  address: '',
  city: '',
  pixKey: '11987654321',
  pixType: 'Telefone',
  bankName: '',
  pixHolder: '',
  logo: '',
  monthlyGoal: 5000,
  theme: 'light',
  reviewLink: '',
  facebookLink: '',
  instagramLink: '',
  serviceTypes: DEFAULT_SERVICE_TYPES.slice(),
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
// O cliente paga 'value' + 'travelFee'; o lucro líquido é esse total - cost.
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
    serviceType: 'Montagem',
    value: 350.00,
    travelFee: 0.00,
    cost: 0.00,
    status: 'concluido',
    paymentStatus: 'pago',
    paymentMethod: 'PIX',
    notes: 'Serviço finalizado com sucesso. Cliente avaliou 5 estrelas.',
    assemblerId: 'a1',
    assemblerName: 'Rodrigo Silva',
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
    serviceType: 'Montagem',
    value: 220.00,
    travelFee: 0.00,
    cost: 0.00,
    status: 'concluido',
    paymentStatus: 'pago',
    paymentMethod: 'Dinheiro',
    notes: 'Cliente pagou em espécie ao término.',
    assemblerId: 'a1',
    assemblerName: 'Rodrigo Silva',
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
    serviceType: 'Reparo',
    value: 90.00,
    travelFee: 20.00,
    cost: 30.00,
    status: 'agendado',
    paymentStatus: 'pendente',
    paymentMethod: 'PIX',
    notes: 'Levar parafusos adicionais e corrediças telescópicas de 40cm.',
    assemblerId: 'a1',
    assemblerName: 'Rodrigo Silva',
    createdAt: '2026-09-05T14:30:00Z'
  },
  {
    id: 's4',
    clientId: 'c4',
    clientName: 'Patrícia Lima (via Loja TokLar)',
    clientPhone: '11966554433',
    clientAddress: 'Rua Vergueiro, 2500 - Vila Mariana, SP',
    date: '2026-09-12',
    time: '14:00',
    description: 'Montagem Quarto de Bebê Completo (Berço + Cômoda + Roupeiro)',
    serviceType: 'Montagem',
    storeId: 'st1',
    value: 380.00,
    travelFee: 40.00,
    cost: 45.00,
    status: 'agendado',
    paymentStatus: 'pendente',
    paymentMethod: 'PIX',
    notes: 'Ordem de serviço entregue pela loja.',
    assemblerId: 'a1',
    assemblerName: 'Rodrigo Silva',
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
    serviceType: 'Instalação',
    value: 180.00,
    travelFee: 0.00,
    cost: 60.00,
    status: 'agendado',
    paymentStatus: 'pendente',
    paymentMethod: 'Cartão de Crédito',
    notes: 'Cliente quer passar no cartão.',
    assemblerId: 'a1',
    assemblerName: 'Rodrigo Silva',
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

// Lojas parceiras: agrupam as montagens repassadas por cada loja e permitem
// emitir uma nota única somando todos os serviços do período.
const SEED_STORES = [
  {
    id: 'st1',
    name: 'Loja TokLar Móveis',
    contactName: 'Setor de Entregas',
    phone: '11966554433',
    cnpj: '',
    address: 'Rua do Gasômetro, 300 - Brás, São Paulo - SP',
    notes: 'Repassa montagens semanais em domicílio.',
    createdAt: '2026-08-15T14:00:00Z'
  }
];

// Montadores da equipe. O primeiro é o próprio dono, que também executa serviços.
const SEED_ASSEMBLERS = [
  {
    id: 'a1',
    name: 'Rodrigo Silva',
    phone: '11987654321',
    isOwner: true,
    createdAt: '2026-08-01T09:00:00Z'
  }
];

class StorageManager {
  constructor() {
    // Cópia já interpretada dos dados. Sem ela cada leitura refazia o
    // JSON.parse da base inteira, e uma única atualização de tela chegava a
    // fazer 174 dessas — era o que travava o celular.
    this.cache = {};

    // Serviços agrupados por loja, montador, cliente e data. Evita varrer os
    // 900 serviços uma vez por linha da lista.
    this.indices = {};

    // Escrita na nuvem agrupada: várias alterações seguidas viram um envio só.
    this.pendentesNuvem = {};
    this.timerNuvem = null;
    this.ATRASO_NUVEM_MS = 2500;

    // Documento do Firestore trava em 1 MB. Avisamos em 750 KB para dar tempo
    // de agir antes de a nuvem começar a recusar a gravação.
    this.LIMITE_ALERTA_BYTES = 750 * 1024;
    this.avisosDeTamanho = new Set();

    this.init();
    this.protegerContraFechamento();
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
    if (!localStorage.getItem(STORAGE_KEYS.STORES)) {
      this.save(STORAGE_KEYS.STORES, SEED_STORES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ASSEMBLERS)) {
      this.save(STORAGE_KEYS.ASSEMBLERS, SEED_ASSEMBLERS);
    }

    this.runMigrations();
  }

  /**
   * Ajusta dados já salvos no navegador para o formato atual.
   * Roda sempre no boot e é idempotente (só grava se algo mudou).
   */
  runMigrations() {
    // v2: campo "cost" (gastos com material) passou a existir em cada serviço.
    // v3: tipo de serviço, deslocamento, montador responsável e loja parceira.
    const services = this.get(STORAGE_KEYS.SERVICES) || [];
    let changed = false;

    services.forEach(s => {
      if (typeof s.cost !== 'number') {
        s.cost = 0;
        changed = true;
      }
      if (typeof s.travelFee !== 'number') {
        s.travelFee = 0;
        changed = true;
      }
      if (typeof s.serviceType !== 'string') {
        s.serviceType = 'Montagem';
        changed = true;
      }
      if (s.assemblerId === undefined) {
        s.assemblerId = null;
        s.assemblerName = '';
        changed = true;
      }
      if (s.storeId === undefined) {
        s.storeId = null;
        changed = true;
      }
    });

    if (changed) {
      this.save(STORAGE_KEYS.SERVICES, services);
    }

    // v3: campos novos do perfil profissional e das redes sociais.
    const settings = this.get(STORAGE_KEYS.SETTINGS);
    if (settings) {
      let settingsChanged = false;
      const defaults = {
        profession: 'Montador de Móveis',
        cnpj: '',
        address: '',
        city: '',
        bankName: '',
        pixHolder: '',
        logo: '',
        theme: 'light',
        facebookLink: '',
        instagramLink: ''
      };

      Object.entries(defaults).forEach(([key, value]) => {
        if (settings[key] === undefined) {
          settings[key] = value;
          settingsChanged = true;
        }
      });

      if (!Array.isArray(settings.serviceTypes) || settings.serviceTypes.length === 0) {
        settings.serviceTypes = DEFAULT_SERVICE_TYPES.slice();
        settingsChanged = true;
      }

      if (settingsChanged) {
        this.save(STORAGE_KEYS.SETTINGS, settings);
      }
    }
  }

  get(key) {
    if (Object.prototype.hasOwnProperty.call(this.cache, key)) {
      return this.cache[key];
    }

    try {
      const data = localStorage.getItem(key);
      const interpretado = data ? JSON.parse(data) : null;
      this.cache[key] = interpretado;
      return interpretado;
    } catch (e) {
      console.error(`Erro ao ler ${key}:`, e);
      this.cache[key] = null;
      return null;
    }
  }

  save(key, data) {
    // A memória é a fonte da verdade durante a sessão; o localStorage é a cópia.
    this.cache[key] = data;
    if (key === STORAGE_KEYS.SERVICES) this.indices = {};

    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`Erro ao salvar ${key}:`, e);
      if (window.app && e.name === 'QuotaExceededError') {
        window.app.showToast(
          'Memória do navegador cheia. Apague fotos de serviços antigos.',
          'danger'
        );
      }
      return false;
    }
  }

  /**
   * Serviços agrupados por um campo ('storeId', 'assemblerId', 'clientId'...).
   * Antes cada loja e cada montador varria a lista inteira de serviços dentro
   * do próprio laço de renderização — 60 lojas x 900 serviços por tela.
   * O índice é montado uma vez e jogado fora quando os serviços mudam.
   */
  servicesIndexedBy(campo) {
    if (this.indices[campo]) return this.indices[campo];

    const mapa = new Map();
    (this.getServices() || []).forEach(s => {
      const chave = s[campo];
      if (chave === undefined || chave === null || chave === '') return;
      const lista = mapa.get(chave);
      if (lista) lista.push(s);
      else mapa.set(chave, [s]);
    });

    this.indices[campo] = mapa;
    return mapa;
  }

  /** Atalho: lista (nunca nula) de serviços de uma chave. */
  servicesOf(campo, valor) {
    return this.servicesIndexedBy(campo).get(valor) || [];
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

  getStores() {
    return this.get(STORAGE_KEYS.STORES) || [];
  }

  saveStores(stores) {
    const res = this.save(STORAGE_KEYS.STORES, stores);
    this.syncToFirestore('stores', stores);
    return res;
  }

  getAssemblers() {
    return this.get(STORAGE_KEYS.ASSEMBLERS) || [];
  }

  saveAssemblers(assemblers) {
    const res = this.save(STORAGE_KEYS.ASSEMBLERS, assemblers);
    this.syncToFirestore('assemblers', assemblers);
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

  /**
   * Agenda o envio em vez de disparar na hora.
   *
   * Concluir uma montagem grava serviço + receita + despesa de material +
   * repasse do montador: eram 4 gravações na nuvem em menos de um segundo,
   * cada uma subindo a base inteira. Agora as alterações se acumulam por
   * alguns segundos e sobem de uma vez — menos espera no celular e menos
   * operações contra a cota gratuita do Firebase.
   */
  syncToFirestore(collectionKey, data) {
    if (!window.firestoreDb || !window.firebaseAuth || !window.firebaseAuth.currentUser) return;

    this.pendentesNuvem[collectionKey] = data;

    if (this.timerNuvem) clearTimeout(this.timerNuvem);
    this.timerNuvem = setTimeout(() => this.enviarPendentes(), this.ATRASO_NUVEM_MS);
  }

  async enviarPendentes() {
    if (this.timerNuvem) {
      clearTimeout(this.timerNuvem);
      this.timerNuvem = null;
    }

    const aEnviar = this.pendentesNuvem;
    this.pendentesNuvem = {};

    const chaves = Object.keys(aEnviar);
    if (chaves.length === 0) return;
    if (!window.firestoreDb || !window.firebaseAuth || !window.firebaseAuth.currentUser) return;

    const quem = window.firebaseAuth.currentUser.email;
    const quando = new Date().toISOString();

    await Promise.all(chaves.map(async (collectionKey) => {
      try {
        const corpo = JSON.stringify(aEnviar[collectionKey]);

        // Cada coleção inteira vive num documento só, e documento do Firestore
        // para de aceitar gravação em 1 MB. Sem esta checagem a sincronização
        // simplesmente pararia um dia, sem aviso, e o montador só descobriria
        // ao trocar de celular e não achar os dados.
        if (corpo.length > this.LIMITE_ALERTA_BYTES) {
          this.avisarBaseGrande(collectionKey, corpo.length);
        }

        await window.firestoreDb.collection('app_data').doc(collectionKey).set({
          data: aEnviar[collectionKey],
          updatedAt: quando,
          updatedBy: quem
        }, { merge: true });
      } catch (e) {
        console.warn(`Aviso: salvo no aparelho, mas falhou ao sincronizar ${collectionKey}:`, e.message);
        // Devolve para a fila para tentar de novo na próxima alteração.
        if (this.pendentesNuvem[collectionKey] === undefined) {
          this.pendentesNuvem[collectionKey] = aEnviar[collectionKey];
        }
      }
    }));
  }

  /** Avisa uma vez por sessão, sem transformar o alerta em incômodo. */
  avisarBaseGrande(collectionKey, bytes) {
    if (this.avisosDeTamanho.has(collectionKey)) return;
    this.avisosDeTamanho.add(collectionKey);

    const kb = Math.round(bytes / 1024);
    console.warn(`[nuvem] "${collectionKey}" está em ${kb} KB; o limite do Firestore é 1024 KB.`);

    if (window.app) {
      window.app.showToast(
        `Sua base de ${collectionKey} está em ${kb} KB e o limite da nuvem é 1024 KB. ` +
        'Faça o backup e arquive os serviços mais antigos.',
        'warning'
      );
    }
  }

  /** Quanto o app ocupa neste aparelho, em KB, por chave. */
  usoDeMemoria() {
    let total = 0;
    let fotos = 0;
    let gruposDeFotos = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (!chave) continue;
      const tamanho = (localStorage.getItem(chave) || '').length;
      total += tamanho;
      if (chave.startsWith('movelpro_fotos_')) {
        fotos += tamanho;
        gruposDeFotos++;
      }
    }

    return {
      totalKB: Math.round(total / 1024),
      fotosKB: Math.round(fotos / 1024),
      gruposDeFotos
    };
  }

  /**
   * Fechar o app com envio pendente não pode perder dado.
   * O 'pagehide' é o único evento confiável no Chrome do Android — 'unload'
   * não dispara quando o app volta pela lista de recentes.
   */
  protegerContraFechamento() {
    const despejar = () => {
      if (Object.keys(this.pendentesNuvem).length > 0) this.enviarPendentes();
    };

    window.addEventListener('pagehide', despejar);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') despejar();
    });
  }

  async syncFromFirestore() {
    if (!window.firestoreDb || !window.firebaseAuth || !window.firebaseAuth.currentUser) return;
    try {
      const collections = ['services', 'customers', 'transactions', 'settings', 'stores', 'assemblers'];
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
      transactions: this.getTransactions(),
      stores: this.getStores(),
      assemblers: this.getAssemblers()
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
      if (data.stores) this.saveStores(data.stores);
      if (data.assemblers) this.saveAssemblers(data.assemblers);
      this.runMigrations();
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
    localStorage.removeItem(STORAGE_KEYS.STORES);
    localStorage.removeItem(STORAGE_KEYS.ASSEMBLERS);
    this.init();
  }
}

// Global singleton instance
window.storageManager = new StorageManager();
