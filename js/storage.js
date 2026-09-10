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

// Perfil em branco: quem usa preenche em Ajustes na primeira vez.
// Nome e PIX de exemplo não podem sobrar aqui — eles vão impressos na nota
// que o cliente final recebe.
const DEFAULT_SETTINGS = {
  montadorName: '',
  companyName: 'RS Montagens de Móveis',
  phone: '',
  profession: 'Montador de Móveis',
  cnpj: '',
  address: '',
  city: '',
  pixKey: '',
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

// Sistema entregue limpo: o montador cadastra os proprios clientes.
const SEED_CUSTOMERS = [];

// Agenda comeca vazia.
const SEED_SERVICES = [];

// Livro caixa comeca zerado.
const SEED_TRANSACTIONS = [];

// Lojas parceiras: cadastradas por ele conforme fecha parceria.
const SEED_STORES = [];

// Equipe: ele cadastra a si mesmo como dono e depois os montadores.
const SEED_ASSEMBLERS = [];

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

    // Inscrições ativas do Firestore onSnapshot para sincronização em tempo real
    this.unsubscribers = [];
    this.storageListenerAtivo = false;

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

    this.limparDadosDeDemonstracao();
    this.limparParaProducao();
  }

  /**
   * Tira do ar os dados de exemplo que acompanhavam as primeiras versões.
   *
   * Esvaziar as sementes só resolve para quem instala agora: quem já abriu o
   * sistema tem os exemplos gravados no aparelho e no Firestore. Esta limpeza
   * roda uma vez e apaga exatamente os registros de exemplo, pelos ids que
   * eles sempre tiveram — nada que o montador tenha cadastrado é tocado.
   */
  limparDadosDeDemonstracao() {
    const settings = this.get(STORAGE_KEYS.SETTINGS) || {};
    if (settings.demoRemovidaEm) return;

    const DEMO = {
      clientes: ['c1', 'c2', 'c3', 'c4'],
      servicos: ['s1', 's2', 's3', 's4', 's5'],
      lancamentos: ['t1', 't2', 't3', 't4', 't5'],
      lojas: ['st1'],
      montadores: ['a1']
    };

    const servicosDemo = new Set(DEMO.servicos);
    let mexeu = false;

    const clientes = this.get(STORAGE_KEYS.CUSTOMERS) || [];
    const clientesLimpos = clientes.filter(c => !DEMO.clientes.includes(c.id));
    if (clientesLimpos.length !== clientes.length) {
      this.save(STORAGE_KEYS.CUSTOMERS, clientesLimpos);
      mexeu = true;
    }

    const servicos = this.get(STORAGE_KEYS.SERVICES) || [];
    const servicosLimpos = servicos.filter(s => !servicosDemo.has(s.id));
    if (servicosLimpos.length !== servicos.length) {
      this.save(STORAGE_KEYS.SERVICES, servicosLimpos);
      mexeu = true;
    }

    // Além dos lançamentos de exemplo, saem também os que o próprio sistema
    // gerou a partir dos serviços de exemplo (receita, material e repasse).
    const lancamentos = this.get(STORAGE_KEYS.TRANSACTIONS) || [];
    const lancamentosLimpos = lancamentos.filter(t =>
      !DEMO.lancamentos.includes(t.id) && !servicosDemo.has(t.serviceId)
    );
    if (lancamentosLimpos.length !== lancamentos.length) {
      this.save(STORAGE_KEYS.TRANSACTIONS, lancamentosLimpos);
      mexeu = true;
    }

    const lojas = this.get(STORAGE_KEYS.STORES) || [];
    const lojasLimpas = lojas.filter(l => !DEMO.lojas.includes(l.id));
    if (lojasLimpas.length !== lojas.length) {
      this.save(STORAGE_KEYS.STORES, lojasLimpas);
      mexeu = true;
    }

    const montadores = this.get(STORAGE_KEYS.ASSEMBLERS) || [];
    const montadoresLimpos = montadores.filter(m => !DEMO.montadores.includes(m.id));
    if (montadoresLimpos.length !== montadores.length) {
      this.save(STORAGE_KEYS.ASSEMBLERS, montadoresLimpos);
      mexeu = true;
    }

    // Fotos que estivessem presas aos serviços de exemplo.
    servicosDemo.forEach(id => {
      try { localStorage.removeItem(`movelpro_fotos_${id}`); } catch (e) { /* ok */ }
    });

    // O perfil de exemplo (Rodrigo Silva e o PIX fictício) sai junto, mas só
    // se ainda estiver intocado — se ele já preencheu o próprio, fica o dele.
    const perfilDeExemplo = { montadorName: 'Rodrigo Silva', phone: '11987654321', pixKey: '11987654321' };
    Object.entries(perfilDeExemplo).forEach(([campo, valorDeExemplo]) => {
      if (settings[campo] === valorDeExemplo) {
        settings[campo] = '';
        mexeu = true;
      }
    });

    settings.demoRemovidaEm = new Date().toISOString();
    this.save(STORAGE_KEYS.SETTINGS, settings);

    if (mexeu) console.info('[dados] Registros de demonstração removidos.');
  }

  /**
   * Limpeza definitiva para entrada em produção:
   * Zera todos os serviços de teste ("Mae", "Maria", "Mariaa", etc.), clientes e transações do financeiro.
   * Roda uma única vez (controlada por settings.limpezaProducaoV1), garantindo base 100% zerada para o cliente.
   */
  async limparParaProducao() {
    const settings = this.get(STORAGE_KEYS.SETTINGS) || {};
    if (settings.limpezaProducaoV1) return;

    console.info('[producao] Limpando dados de teste (serviços, clientes, financeiro e fotos) para produção...');

    // 1. Limpa fotos de montagens antigas
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const chave = localStorage.key(i);
      if (chave && chave.startsWith('movelpro_fotos_')) {
        try { localStorage.removeItem(chave); } catch (e) { /* ok */ }
      }
    }

    // 2. Zera as entidades de teste solicitadas
    this.save(STORAGE_KEYS.SERVICES, []);
    this.save(STORAGE_KEYS.CUSTOMERS, []);
    this.save(STORAGE_KEYS.TRANSACTIONS, []);

    // 3. Marca que a limpeza para produção foi concluída
    settings.limpezaProducaoV1 = true;
    settings.limpezaProducaoData = Utils.todayISO();
    this.save(STORAGE_KEYS.SETTINGS, settings);

    // 4. Sincroniza imediatamente com a nuvem (Firestore)
    this.syncToFirestore('services', [], true);
    this.syncToFirestore('customers', [], true);
    this.syncToFirestore('transactions', [], true);
    this.syncToFirestore('settings', settings, true);

    await this.enviarPendentes();

    if (window.app && window.app.updateAllViews) {
      window.app.updateAllViews();
    }
    if (window.calendarController && window.calendarController.render) {
      window.calendarController.render();
      if (window.calendarController.selectedDate) {
        window.calendarController.renderDayServices(window.calendarController.selectedDate);
      }
    }

    console.info('[producao] Base zerada com sucesso para entrada em produção.');
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

  saveServices(services, immediate = true) {
    const res = this.save(STORAGE_KEYS.SERVICES, services);
    this.syncToFirestore('services', services, immediate);
    return res;
  }

  getTransactions() {
    return this.get(STORAGE_KEYS.TRANSACTIONS) || [];
  }

  saveTransactions(transactions, immediate = true) {
    const res = this.save(STORAGE_KEYS.TRANSACTIONS, transactions);
    this.syncToFirestore('transactions', transactions, immediate);
    return res;
  }

  getCustomers() {
    return this.get(STORAGE_KEYS.CUSTOMERS) || [];
  }

  saveCustomers(customers, immediate = true) {
    const res = this.save(STORAGE_KEYS.CUSTOMERS, customers);
    this.syncToFirestore('customers', customers, immediate);
    return res;
  }

  getStores() {
    return this.get(STORAGE_KEYS.STORES) || [];
  }

  saveStores(stores, immediate = true) {
    const res = this.save(STORAGE_KEYS.STORES, stores);
    this.syncToFirestore('stores', stores, immediate);
    return res;
  }

  getAssemblers() {
    return this.get(STORAGE_KEYS.ASSEMBLERS) || [];
  }

  saveAssemblers(assemblers, immediate = true) {
    const res = this.save(STORAGE_KEYS.ASSEMBLERS, assemblers);
    this.syncToFirestore('assemblers', assemblers, immediate);
    return res;
  }

  getSettings() {
    return this.get(STORAGE_KEYS.SETTINGS) || DEFAULT_SETTINGS;
  }

  saveSettings(settings, immediate = true) {
    const res = this.save(STORAGE_KEYS.SETTINGS, settings);
    this.syncToFirestore('settings', settings, immediate);
    return res;
  }

  // Cloud Firestore Sync Helpers

  /**
   * Envia os dados para a nuvem. Por padrão alterações operacionais importantes
   * (serviços, clientes, etc.) sobem imediatamente para sincronizar na hora com
   * outros aparelhos. Modificações em lote podem usar atraso agrupado.
   */
  syncToFirestore(collectionKey, data, immediate = false) {
    if (!window.firestoreDb || !window.firebaseAuth || !window.firebaseAuth.currentUser) return;

    this.pendentesNuvem[collectionKey] = data;

    if (immediate) {
      this.enviarPendentes();
      return;
    }

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

      // A nuvem pode devolver os exemplos que a limpeza do boot tirou daqui —
      // naquele momento ainda não havia login, então a remoção não subiu.
      // Agora, autenticado, a limpeza roda de novo e vai junto para o Firestore.
      this.limparDadosDeDemonstracao();

      // Se os dados baixados da nuvem ainda contiverem os testes de homologação,
      // executa a limpeza para produção com a sessão autenticada:
      const currentSettings = this.get(STORAGE_KEYS.SETTINGS) || {};
      if (!currentSettings.limpezaProducaoV1) {
        await this.limparParaProducao();
      }

      if (hasUpdates && window.app) {
        window.app.updateAllViews();
        window.app.showToast('Dados sincronizados com a nuvem.', 'info');
      }
    } catch (e) {
      console.warn('Erro ao sincronizar do Firestore:', e.message);
    }
  }

  /**
   * Escuta em tempo real todas as alterações na nuvem via Firestore onSnapshot.
   * Toda vez que qualquer usuário cadastrar, alterar ou excluir um serviço, cliente,
   * financeiro, loja ou montador, todos os outros aparelhos conectados atualizam
   * a tela automaticamente, na mesma hora, mesmo sem recarregar a página.
   */
  iniciarEscutaEmTempoReal() {
    if (!window.firestoreDb || !window.firebaseAuth) return;

    this.pararEscutaEmTempoReal();
    this.unsubscribers = [];

    const colecoes = ['services', 'customers', 'transactions', 'settings', 'stores', 'assemblers'];

    colecoes.forEach((col) => {
      const storageKey = STORAGE_KEYS[col.toUpperCase()];
      if (!storageKey) return;

      try {
        const unsub = window.firestoreDb.collection('app_data').doc(col)
          .onSnapshot((docSnapshot) => {
            // Ignora escritas que foram geradas localmente e ainda aguardam confirmação do servidor
            if (docSnapshot.metadata && docSnapshot.metadata.hasPendingWrites) {
              return;
            }

            if (!docSnapshot.exists) return;

            const payload = docSnapshot.data();
            if (!payload || payload.data === undefined) return;

            const dadosNuvem = payload.data;
            const dadosAtuais = this.get(storageKey);

            // Compara para saber se houve real alteração nos dados
            const strNuvem = JSON.stringify(dadosNuvem);
            const strAtual = JSON.stringify(dadosAtuais);

            if (strNuvem !== strAtual) {
              console.log(`[TempoReal] Atualização recebida da nuvem para: ${col}`);

              // Salva no cache local e no localStorage
              this.save(storageKey, dadosNuvem);

              // Atualiza todas as visualizações do app
              if (window.app && window.app.updateAllViews) {
                window.app.updateAllViews();
              }
              if (window.calendarController && window.calendarController.render) {
                window.calendarController.render();
                if (window.calendarController.selectedDate) {
                  window.calendarController.renderDayServices(window.calendarController.selectedDate);
                }
              }

              // Se a alteração veio de outro usuário, exibe aviso suave
              const eu = window.firebaseAuth.currentUser ? (window.firebaseAuth.currentUser.email || '').toLowerCase() : '';
              const quemAtualizou = (payload.updatedBy || '').toLowerCase();
              if (quemAtualizou && quemAtualizou !== eu && window.app && window.app.showToast) {
                const nomes = {
                  services: 'Agenda de montagens',
                  customers: 'Cadastro de clientes',
                  transactions: 'Financeiro',
                  stores: 'Lojas parceiras',
                  assemblers: 'Equipe de montadores',
                  settings: 'Configurações'
                };
                window.app.showToast(`${nomes[col] || 'Dados'} atualizado(s) em tempo real!`, 'info');
              }
            }
          }, (erro) => {
            console.warn(`[TempoReal] Aviso ao escutar ${col}:`, erro.message);
          });

        this.unsubscribers.push(unsub);
      } catch (e) {
        console.warn(`[TempoReal] Falha ao iniciar escuta de ${col}:`, e.message);
      }
    });

    // Sincronização entre abas abertas no mesmo navegador
    if (!this.storageListenerAtivo) {
      window.addEventListener('storage', (e) => {
        if (Object.values(STORAGE_KEYS).includes(e.key)) {
          delete this.cache[e.key];
          if (e.key === STORAGE_KEYS.SERVICES) {
            this.indices = {};
          }
          if (window.app && window.app.updateAllViews) {
            window.app.updateAllViews();
          }
          if (window.calendarController && window.calendarController.render) {
            window.calendarController.render();
            if (window.calendarController.selectedDate) {
              window.calendarController.renderDayServices(window.calendarController.selectedDate);
            }
          }
        }
      });
      this.storageListenerAtivo = true;
    }
  }

  pararEscutaEmTempoReal() {
    if (this.unsubscribers && this.unsubscribers.length > 0) {
      this.unsubscribers.forEach((unsub) => {
        try {
          if (typeof unsub === 'function') unsub();
        } catch (e) {}
      });
      this.unsubscribers = [];
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
    a.download = `movelpro_backup_${Utils.todayISO()}.json`;
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

  /**
   * Zera a agenda, os clientes, o financeiro, as lojas e a equipe — no
   * aparelho e na nuvem. As configurações do perfil (nome, PIX, logo, tabela
   * de preços) continuam, porque apagá-las obrigaria a recadastrar tudo.
   */
  async apagarTudo() {
    // As fotos saem primeiro, senão ficam ocupando espaço sem serviço dono.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const chave = localStorage.key(i);
      if (chave && chave.startsWith('movelpro_fotos_')) localStorage.removeItem(chave);
    }

    this.saveServices([]);
    this.saveTransactions([]);
    this.saveCustomers([]);
    this.saveStores([]);
    this.saveAssemblers([]);

    // Sobe agora, sem esperar os 2,5 s de agrupamento: a tela vai recarregar.
    await this.enviarPendentes();
  }
}

// Global singleton instance
window.storageManager = new StorageManager();
