import { Hono } from 'hono'
import type { AppEnv } from '@/app/Env'
import { renderApp } from '@/views/index'

const web = new Hono<AppEnv>()

// Laman Web Utama & Skrin Log Masuk
web.get('/', (c) => c.html(renderApp('/login')))
web.get('/login', (c) => c.html(renderApp('/login')))

// Laluan Laman Guru (Teacher Pages)
web.get('/teacher/dashboard', (c) => c.html(renderApp('/teacher/dashboard')))
web.get('/teacher/classes', (c) => c.html(renderApp('/teacher/classes')))
web.get('/teacher/segak', (c) => c.html(renderApp('/teacher/segak')))
web.get('/teacher/training', (c) => c.html(renderApp('/teacher/training')))
web.get('/teacher/daily-log', (c) => c.html(renderApp('/teacher/daily-log')))

// Laluan Laman Murid (Student Pages)
web.get('/student/dashboard', (c) => c.html(renderApp('/student/dashboard')))
web.get('/student/daily-log', (c) => c.html(renderApp('/student/daily-log')))

// Laluan Laman Pentadbir (Admin Pages)
web.get('/admin/dashboard', (c) => c.html(renderApp('/admin/dashboard')))
web.get('/profile', (c) => c.html(renderApp('/profile')))

// PWA Manifest & Service Worker Routes
web.get('/favicon.ico', (c) => {
  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="SEGAK">
    <rect width="64" height="64" rx="14" fill="#153b36"/>
    <path d="M18 34c0-10 7-18 16-18 5 0 9 2 12 6l-6 5c-2-2-4-3-7-3-5 0-8 4-8 10s3 10 8 10c3 0 5-1 7-3l6 5c-3 4-7 6-12 6-9 0-16-8-16-18Z" fill="#e3f2ec"/>
  </svg>`

  return c.body(favicon, 200, {
    'Content-Type': 'image/svg+xml; charset=UTF-8',
    'Cache-Control': 'public, max-age=86400'
  })
})

web.get('/manifest.json', (c) => {
  return c.json({
    name: 'Sistem Pengurusan Ujian SEGAK',
    short_name: 'Ujian SEGAK',
    description: 'Aplikasi Pengurusan Ujian SEGAK & Rekod Latihan Harian Kecergasan Sekolah',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    orientation: 'portrait',
    icons: [
      {
        src: 'https://cdn-icons-png.flaticon.com/512/2964/2964514.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: 'https://cdn-icons-png.flaticon.com/512/2964/2964514.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }, 200, {
    'Content-Type': 'application/manifest+json'
  })
})

web.get('/sw.js', (c) => {
  const swScript = `
    const CACHE_NAME = 'segak-pwa-v1';
    const urlsToCache = ['/', '/login', '/manifest.json'];

    self.addEventListener('install', (event) => {
      event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
          return cache.addAll(urlsToCache);
        })
      );
      self.skipWaiting();
    });

    self.addEventListener('activate', (event) => {
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== CACHE_NAME) {
                return caches.delete(cacheName);
              }
            })
          );
        })
      );
      self.clients.claim();
    });

    self.addEventListener('fetch', (event) => {
      event.respondWith(
        fetch(event.request).catch(() => {
          return caches.match(event.request);
        })
      );
    });
  `;
  return c.text(swScript, 200, {
    'Content-Type': 'application/javascript'
  })
})

// Health Check API
web.get('/health', (c) => c.json({ status: 'ok', app: 'Sistem Pengurusan Ujian SEGAK' }))

export default web
