// Service Worker for Claudio FM PWA
// Version 1.0.1 - 修复缓存更新问题

const CACHE_VERSION = '1.0.1';
const CACHE_NAME = `claudio-fm-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `claudio-runtime-v${CACHE_VERSION}`;

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 安装中... 版本:', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 缓存静态资源');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] 安装完成，跳过等待');
        return self.skipWaiting(); // 立即激活，不等待旧 SW 关闭
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 激活中... 版本:', CACHE_VERSION);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 删除所有不匹配当前版本的缓存
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[Service Worker] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] 激活完成，立即控制所有页面');
        return self.clients.claim(); // 立即控制所有页面
      })
  );
});

// 拦截请求 - 缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过 Chrome 扩展请求
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // API 请求 - 网络优先策略
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 音频文件 - 网络优先策略
  if (url.pathname.includes('/cache/') || url.pathname.includes('.mp3')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 静态资源 - 缓存优先策略
  event.respondWith(cacheFirst(request));
});

// 缓存优先策略（改为网络优先，带缓存回退）
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    // 先尝试从网络获取最新版本
    const response = await fetch(request);

    // 缓存成功的响应
    if (response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // 网络失败时才使用缓存
    console.log('[Service Worker] 网络失败，使用缓存:', request.url);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // 返回离线页面
    if (request.destination === 'document') {
      return cache.match('/');
    }

    throw error;
  }
}

// 网络优先策略
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);

    // 缓存成功的响应
    if (response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[Service Worker] 网络请求失败，尝试缓存:', request.url);

    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    throw error;
  }
}

// 后台同步
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] 后台同步:', event.tag);

  if (event.tag === 'sync-playlist') {
    event.waitUntil(syncPlaylist());
  }
});

async function syncPlaylist() {
  try {
    // 同步播放列表逻辑
    console.log('[Service Worker] 同步播放列表');
  } catch (error) {
    console.error('[Service Worker] 同步失败:', error);
  }
}

// 推送通知
self.addEventListener('push', (event) => {
  console.log('[Service Worker] 收到推送通知');

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Claudio FM';
  const options = {
    body: data.body || '有新的音乐推荐！',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      {
        action: 'open',
        title: '打开'
      },
      {
        action: 'close',
        title: '关闭'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 通知点击
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] 通知被点击:', event.action);

  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});

// 消息通信
self.addEventListener('message', (event) => {
  console.log('[Service Worker] 收到消息:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[Service Worker] 已加载');
