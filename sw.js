/* ============================================================
   sw.js COMPARTILHADO - deixa os apps desta pasta funcionarem offline
   (AJrPlay, Letra no Tempo, Meus Jogos Retrô, Minha Playlist, Video Tools...)

   COMO ACRESCENTAR OUTRO APP NA MESMA PASTA / MESMA PORTA (ex.: 8080, 5500):
   1) Coloque o .html do app na mesma pasta deste sw.js.
   2) Acrescente o nome dele na lista APP_FILES abaixo.
   3) Aumente CACHE_VERSION (v1 -> v2) para os aparelhos baixarem tudo de novo.
   Se você já tem um sw.js de outro app, basta copiar './AJrPLAY.html' (e/ou
   './letra_no_tempo.html') para a lista APP_FILES dele - não precisa trocar de arquivo.
   Arquivos que não existirem são ignorados, nada quebra.
   ============================================================ */
const CACHE_VERSION = 'v2';
const CACHE_NAME = 'apps-offline-' + CACHE_VERSION;
const APP_FILES = [
  './',
  './AJrPLAY.html',
  './letra_no_tempo.html',
  // './MeusJogosRetro.html',
  // './Minha_Playlist.html',
  // './video_tools_frontend.html',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_FILES.map(f => cache.add(new Request(f, { cache: 'reload' }))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys())
      if (k.startsWith('apps-offline-') && k !== CACHE_NAME) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;   // áudio/vídeo abertos pelo app não passam por aqui
  if (new URL(req.url).origin !== location.origin) return;        // só arquivos do próprio site
  e.respondWith(handle(e, req));
});

// Abre do cache na hora e atualiza em segundo plano (a versão nova vale na próxima abertura).
async function handle(e, req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req, { ignoreSearch: true });
  const net = fetch(req).then(res => {
    if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  if (cached) { e.waitUntil(net); return cached; }
  const res = await net;
  if (res) return res;
  if (req.mode === 'navigate') {
    for (const f of APP_FILES) { const hit = await cache.match(f); if (hit) return hit; }
  }
  return new Response('Sem conexão e arquivo ainda não salvo.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
