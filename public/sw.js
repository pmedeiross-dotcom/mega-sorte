/**
 * Service Worker - Mega Sorte PWA & Offline Engine
 * Versão: v2-offline-first
 */

const CACHE_NAME = 'mega-sorte-offline-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/manifest.json'
];

// Instalação: Pré-cache de recursos vitais
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Aviso ao pré-carregar alguns assets:', err);
      });
    })
  );
});

// Ativação: Limpeza de caches obsoletos e controle imediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições: Cache-First para assets estáticos e Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Não intercepta requisições não-GET ou extensões do navegador
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Não faz cache de requisições do Firebase Firestore WebSocket ou autenticação direta
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com/identitytoolkit')) {
    return;
  }

  // 1. Recursos estáticos locais, fontes e scripts (Cache First com fallback de rede)
  if (
    url.origin === location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.tailwindcss.com') ||
    url.hostname.includes('esm.sh')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Atualiza em background de forma silenciosa se online
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
            }
          }).catch(() => {
            // Offline - mantém a resposta do cache sem erros
          });
          return cachedResponse;
        }

        // Se não estava no cache, busca na rede e guarda
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        }).catch(() => {
          // Fallback para página raiz caso seja navegação HTML
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // 2. APIs de Loterias e Resultados (Network First com Fallback para Cache)
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Quando offline, busca a última resposta válida em cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(JSON.stringify({ error: 'offline_fallback', offline: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
  );
});
