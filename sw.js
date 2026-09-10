/* ==========================================================================
   RS MONTAGENS - SERVICE WORKER
   Cache offline do app + exibição das notificações locais.

   IMPORTANTE: ao mexer em qualquer arquivo de css/ ou js/, suba o CACHE_VERSION
   abaixo. É isso que faz o celular do montador baixar a versão nova.
   ========================================================================== */

const CACHE_VERSION = 'v8';
const CACHE_APP = `rs-montagens-app-${CACHE_VERSION}`;
const CACHE_CDN = `rs-montagens-cdn-${CACHE_VERSION}`;

/* Casca do app: o que precisa estar no celular para abrir sem internet. */
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/css/main.css',
  '/css/components.css',
  '/css/calendar.css',
  '/css/detail.css',
  '/css/modules.css',
  '/css/responsive.css',
  '/css/extras.css',
  '/css/print.css',
  '/js/firebase-config.js',
  '/js/auth.js',
  '/js/license.js',
  '/js/utils.js',
  '/js/storage.js',
  '/js/photos.js',
  '/js/calendar.js',
  '/js/services.js',
  '/js/finance.js',
  '/js/customers.js',
  '/js/stores.js',
  '/js/assemblers.js',
  '/js/quotes.js',
  '/js/notifications.js',
  '/js/pwa.js',
  '/js/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png'
];

/* Domínios de CDN que valem guardar para o app abrir offline. */
const CDN_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'www.gstatic.com'
];

/* Nunca passar pelo cache: licença, Firestore, login e consulta de CEP. */
const SEMPRE_REDE = [
  '/api/',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'firebase.googleapis.com',
  'viacep.com.br',
  'google-analytics.com',
  'googletagmanager.com'
];

/* -------------------------------------------------------------------------
   INSTALAÇÃO: baixa a casca do app.
   Usa allSettled para que um único arquivo faltando não derrube a instalação.
   ------------------------------------------------------------------------- */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_APP);
    await Promise.allSettled(
      APP_SHELL.map(async (url) => {
        try {
          const resp = await fetch(url, { cache: 'reload' });
          if (resp && resp.ok) await cache.put(url, resp);
        } catch (e) {
          console.warn('[SW] não consegui pré-carregar', url);
        }
      })
    );
    self.skipWaiting();
  })());
});

/* -------------------------------------------------------------------------
   ATIVAÇÃO: limpa caches de versões antigas.
   ------------------------------------------------------------------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(
      nomes
        .filter((n) => n.startsWith('rs-montagens-') && n !== CACHE_APP && n !== CACHE_CDN)
        .map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

/* -------------------------------------------------------------------------
   FETCH: estratégias de cache.
   ------------------------------------------------------------------------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Só GET entra no cache. POST do Firestore, login etc. passam direto.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Licença, Firestore, CEP: sempre rede, sem cache nenhum.
  if (SEMPRE_REDE.some((trecho) => req.url.includes(trecho))) return;

  // Navegação (abrir o app): rede primeiro, cache como rede de segurança.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const resp = await fetch(req);
        const cache = await caches.open(CACHE_APP);
        cache.put('/index.html', resp.clone());
        return resp;
      } catch (e) {
        const cache = await caches.open(CACHE_APP);
        return (await cache.match('/index.html')) || (await cache.match('/')) ||
          new Response('Sem conexão e sem cópia offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      }
    })());
    return;
  }

  // CDN (fontes, Chart.js, Font Awesome, SDK do Firebase): cache primeiro.
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_CDN);
      const guardado = await cache.match(req);
      if (guardado) return guardado;
      try {
        const resp = await fetch(req);
        // Respostas opacas (sem CORS) também servem: guardamos do mesmo jeito.
        if (resp && (resp.ok || resp.type === 'opaque')) cache.put(req, resp.clone());
        return resp;
      } catch (e) {
        return new Response('', { status: 504 });
      }
    })());
    return;
  }

  // Arquivos do próprio app: entrega o cache na hora e atualiza por trás.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_APP);
      const guardado = await cache.match(req);
      const rede = fetch(req)
        .then((resp) => {
          if (resp && resp.ok) cache.put(req, resp.clone());
          return resp;
        })
        .catch(() => null);
      return guardado || (await rede) || new Response('', { status: 504 });
    })());
  }
});

/* -------------------------------------------------------------------------
   MENSAGENS vindas da página.
   ------------------------------------------------------------------------- */
self.addEventListener('message', (event) => {
  const dados = event.data || {};

  if (dados.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // A página pede para o SW mostrar a notificação (assim ela sobrevive
  // ao app ir para segundo plano).
  if (dados.type === 'MOSTRAR_NOTIFICACAO') {
    const { titulo, corpo, tag, dadosExtra } = dados;
    self.registration.showNotification(titulo, {
      body: corpo,
      tag: tag || 'rs-montagens',
      renotify: true,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      lang: 'pt-BR',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      data: dadosExtra || {}
    });
  }
});

/* -------------------------------------------------------------------------
   CLIQUE NA NOTIFICAÇÃO: traz o app para frente e abre o serviço avisado.
   ------------------------------------------------------------------------- */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const dados = event.notification.data || {};

  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    // Já tem o app aberto? Foca nele e avisa qual serviço abrir.
    for (const janela of janelas) {
      if ('focus' in janela) {
        await janela.focus();
        janela.postMessage({ type: 'ABRIR_SERVICO', serviceId: dados.serviceId || null });
        return;
      }
    }

    // App fechado: abre já apontando para o serviço.
    const destino = dados.serviceId
      ? `/?servico=${encodeURIComponent(dados.serviceId)}`
      : '/?acao=agenda';
    if (self.clients.openWindow) await self.clients.openWindow(destino);
  })());
});
