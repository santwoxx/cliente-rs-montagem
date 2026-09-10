/* ==========================================================================
   RS MONTAGENS - FOTOS DO SERVIÇO
   O cliente manda foto do móvel no WhatsApp; a foto fica presa ao
   agendamento e a galeria do celular pode ser limpa.

   POR QUE CADA SERVIÇO TEM SEU PRÓPRIO DOCUMENTO:
   o app inteiro guarda os serviços num único documento do Firestore, e
   documento do Firestore estoura em 1 MB. Se as fotos fossem junto, meia
   dúzia de agendamentos derrubaria a sincronização de TUDO. Por isso cada
   serviço tem o seu 'app_data/service_photos_<id>', com orçamento próprio.
   ========================================================================== */

const FOTOS_CONFIG = {
  maxPorServico: 6,
  // Orçamento por foto já em base64 (que é ~33% maior que o arquivo original).
  // 6 x 130 KB = 780 KB, com folga dentro do limite de 1 MB do documento.
  maxBytesPorFoto: 130 * 1024,
  larguraMaxima: 1100,
  qualidades: [0.72, 0.62, 0.52, 0.44, 0.36],
  reducoes: [1, 0.8, 0.65, 0.5]
};

class PhotoStore {
  constructor() {
    // serviceId -> array de fotos já carregadas nesta sessão
    this.cache = {};
  }

  chaveLocal(serviceId) {
    return `movelpro_fotos_${serviceId}`;
  }

  docNuvem(serviceId) {
    return `service_photos_${serviceId}`;
  }

  /* ---------- Leitura ---------- */

  /** Fotos que já estão no aparelho (não vai à rede). */
  getLocal(serviceId) {
    if (this.cache[serviceId]) return this.cache[serviceId];
    try {
      const bruto = localStorage.getItem(this.chaveLocal(serviceId));
      const lista = bruto ? JSON.parse(bruto) : [];
      this.cache[serviceId] = Array.isArray(lista) ? lista : [];
    } catch (e) {
      this.cache[serviceId] = [];
    }
    return this.cache[serviceId];
  }

  /**
   * Busca as fotos na nuvem quando este aparelho ainda não as tem.
   * É o caso do montador abrindo no celular dele um serviço que o dono criou.
   */
  async carregarDaNuvem(serviceId) {
    if (!window.firestoreDb || !window.firebaseAuth || !window.firebaseAuth.currentUser) {
      return this.getLocal(serviceId);
    }

    try {
      const doc = await window.firestoreDb
        .collection('app_data')
        .doc(this.docNuvem(serviceId))
        .get();

      if (doc.exists) {
        const dados = doc.data();
        const lista = Array.isArray(dados.fotos) ? dados.fotos : [];
        this.cache[serviceId] = lista;
        this.gravarLocal(serviceId, lista);
        return lista;
      }
    } catch (e) {
      console.warn('[fotos] não consegui buscar na nuvem:', e.message);
    }

    return this.getLocal(serviceId);
  }

  /* ---------- Escrita ---------- */

  gravarLocal(serviceId, fotos) {
    this.cache[serviceId] = fotos;
    try {
      if (fotos.length === 0) {
        localStorage.removeItem(this.chaveLocal(serviceId));
      } else {
        localStorage.setItem(this.chaveLocal(serviceId), JSON.stringify(fotos));
      }
      return true;
    } catch (e) {
      // Aparelho sem espaço: avisa em vez de perder a foto em silêncio.
      console.warn('[fotos] localStorage cheio:', e.message);
      if (window.app) {
        window.app.showToast(
          'Memória do navegador cheia. Apague fotos de serviços antigos.',
          'danger'
        );
      }
      return false;
    }
  }

  async salvar(serviceId, fotos) {
    this.gravarLocal(serviceId, fotos);

    if (!window.firestoreDb || !window.firebaseAuth || !window.firebaseAuth.currentUser) return;

    try {
      const ref = window.firestoreDb.collection('app_data').doc(this.docNuvem(serviceId));
      if (fotos.length === 0) {
        await ref.delete();
      } else {
        await ref.set({
          serviceId,
          fotos,
          updatedAt: new Date().toISOString(),
          updatedBy: window.firebaseAuth.currentUser.email
        });
      }
    } catch (e) {
      console.warn('[fotos] não consegui sincronizar:', e.message);
      if (window.app) {
        window.app.showToast('Foto salva no aparelho, mas ainda não subiu para a nuvem.', 'warning');
      }
    }
  }

  async apagarTudo(serviceId) {
    await this.salvar(serviceId, []);
    delete this.cache[serviceId];
  }

  /**
   * Fotos escolhidas num agendamento que acabou não sendo salvo ficam sem dono
   * e continuam ocupando espaço. Esta faxina roda na abertura do app e some
   * com as que não pertencem a nenhum serviço existente.
   */
  limparOrfas() {
    if (!window.storageManager) return;

    const idsValidos = new Set(window.storageManager.getServices().map(s => s.id));
    const prefixo = 'movelpro_fotos_';
    let removidas = 0;

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const chave = localStorage.key(i);
      if (!chave || !chave.startsWith(prefixo)) continue;

      const serviceId = chave.slice(prefixo.length);
      if (idsValidos.has(serviceId)) continue;

      // Um rascunho aberto agora ainda não está na lista de serviços:
      // preserva o que o formulário está usando neste momento.
      if (window.servicesController && window.servicesController.fotoServiceId === serviceId) continue;

      localStorage.removeItem(chave);
      delete this.cache[serviceId];
      removidas++;
    }

    if (removidas) console.info(`[fotos] ${removidas} grupo(s) de fotos sem serviço foram apagados.`);
  }

  /* ---------- Compressão ---------- */

  /**
   * Reduz a foto até caber no orçamento. Tenta primeiro baixando a qualidade;
   * se ainda não couber, diminui também o tamanho da imagem.
   */
  async comprimir(file) {
    const bitmap = await this.lerImagem(file);

    for (const reducao of FOTOS_CONFIG.reducoes) {
      const largura = Math.round(Math.min(bitmap.width, FOTOS_CONFIG.larguraMaxima) * reducao);
      const escala = largura / bitmap.width;
      const altura = Math.round(bitmap.height * escala);

      const canvas = document.createElement('canvas');
      canvas.width = largura;
      canvas.height = altura;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, largura, altura);

      for (const qualidade of FOTOS_CONFIG.qualidades) {
        const dataUrl = canvas.toDataURL('image/jpeg', qualidade);
        if (dataUrl.length <= FOTOS_CONFIG.maxBytesPorFoto) {
          if (bitmap.close) bitmap.close();
          return dataUrl;
        }
      }
    }

    if (bitmap.close) bitmap.close();
    return null; // não coube nem no menor tamanho
  }

  /** Decodifica respeitando a rotação da câmera (EXIF). */
  async lerImagem(file) {
    if (window.createImageBitmap) {
      try {
        return await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch (e) {
        // alguns navegadores não aceitam a opção; cai no caminho de baixo
      }
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Não consegui ler a imagem.'));
      };
      img.src = url;
    });
  }

  /**
   * Adiciona arquivos escolhidos pelo montador, comprimindo cada um.
   * Devolve a lista final e quantas entraram de fato.
   */
  async adicionar(serviceId, arquivos) {
    const atuais = this.getLocal(serviceId).slice();
    const vagas = FOTOS_CONFIG.maxPorServico - atuais.length;

    if (vagas <= 0) {
      return { fotos: atuais, adicionadas: 0, motivo: 'limite' };
    }

    const entrando = Array.from(arquivos)
      .filter(f => f && f.type && f.type.startsWith('image/'))
      .slice(0, vagas);

    let adicionadas = 0;
    let falhas = 0;

    for (const arquivo of entrando) {
      try {
        const dataUrl = await this.comprimir(arquivo);
        if (!dataUrl) { falhas++; continue; }
        atuais.push({
          id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          dataUrl,
          nome: arquivo.name || 'foto.jpg',
          addedAt: new Date().toISOString()
        });
        adicionadas++;
      } catch (e) {
        falhas++;
      }
    }

    if (adicionadas > 0) await this.salvar(serviceId, atuais);

    return {
      fotos: atuais,
      adicionadas,
      falhas,
      motivo: entrando.length < Array.from(arquivos).length ? 'limite' : null
    };
  }

  async remover(serviceId, fotoId) {
    const restantes = this.getLocal(serviceId).filter(f => f.id !== fotoId);
    await this.salvar(serviceId, restantes);
    return restantes;
  }

  /* ---------- Visualização ---------- */

  /** Grade de miniaturas. Não abre nada sozinho: só abre no toque. */
  renderMiniaturas(fotos, { podeRemover = false, serviceId = null } = {}) {
    if (!fotos || fotos.length === 0) return '';

    return `
      <div class="foto-grid">
        ${fotos.map((f, i) => `
          <div class="foto-thumb">
            <img src="${f.dataUrl}" alt="Foto ${i + 1} do móvel" loading="lazy"
                 onclick="window.photoStore.abrirVisualizador('${Utils.escapeJsString(serviceId || '')}', ${i})">
            ${podeRemover ? `
              <button type="button" class="foto-remover" title="Remover foto"
                      onclick="window.photoStore.removerPelaTela('${Utils.escapeJsString(serviceId || '')}', '${Utils.escapeJsString(f.id)}')">
                <i class="fa-solid fa-xmark"></i>
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  /** Lightbox simples: foto grande, navegação e fechar. */
  abrirVisualizador(serviceId, indice) {
    const fotos = this.getLocal(serviceId);
    if (!fotos.length) return;

    let atual = Math.max(0, Math.min(indice, fotos.length - 1));

    const overlay = document.createElement('div');
    overlay.className = 'foto-viewer';
    overlay.innerHTML = `
      <button type="button" class="foto-viewer-fechar" aria-label="Fechar">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <button type="button" class="foto-viewer-nav anterior" aria-label="Foto anterior">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <img class="foto-viewer-img" src="${fotos[atual].dataUrl}" alt="Foto do móvel">
      <button type="button" class="foto-viewer-nav proxima" aria-label="Próxima foto">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
      <div class="foto-viewer-contador">${atual + 1} de ${fotos.length}</div>
    `;

    const img = overlay.querySelector('.foto-viewer-img');
    const contador = overlay.querySelector('.foto-viewer-contador');
    const mostrar = (i) => {
      atual = (i + fotos.length) % fotos.length;
      img.src = fotos[atual].dataUrl;
      contador.textContent = `${atual + 1} de ${fotos.length}`;
    };

    const fechar = () => {
      overlay.remove();
      document.removeEventListener('keydown', aoTeclar);
    };
    const aoTeclar = (e) => {
      if (e.key === 'Escape') fechar();
      if (e.key === 'ArrowRight') mostrar(atual + 1);
      if (e.key === 'ArrowLeft') mostrar(atual - 1);
    };

    overlay.querySelector('.foto-viewer-fechar').addEventListener('click', fechar);
    overlay.querySelector('.anterior').addEventListener('click', () => mostrar(atual - 1));
    overlay.querySelector('.proxima').addEventListener('click', () => mostrar(atual + 1));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(); });
    document.addEventListener('keydown', aoTeclar);

    // Uma foto só não precisa das setas.
    if (fotos.length < 2) {
      overlay.querySelectorAll('.foto-viewer-nav').forEach(b => b.remove());
      contador.remove();
    }

    document.body.appendChild(overlay);
  }

  /** Chamado pelo X da miniatura, tanto no formulário quanto na ficha. */
  async removerPelaTela(serviceId, fotoId) {
    if (!confirm('Remover esta foto?')) return;
    const restantes = await this.remover(serviceId, fotoId);

    if (window.servicesController) {
      window.servicesController.renderFotosDoFormulario(serviceId, restantes);
      window.servicesController.renderFotosDaFicha(serviceId, restantes);
    }
    if (window.app) window.app.showToast('Foto removida.', 'warning');
  }
}

window.photoStore = new PhotoStore();
window.FOTOS_CONFIG = FOTOS_CONFIG;
