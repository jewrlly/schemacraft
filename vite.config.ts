/// <reference types="vitest/config" />

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

/**
 * Політика безпеки вмісту (Content Security Policy) — лише для готової збірки:
 * браузер виконуватиме тільки скрипти з нашого сайту і заблокує сторонні та вбудовані.
 * У режимі розробки її немає, бо Vite вставляє на сторінку свій службовий скрипт.
 */
function contentSecurityPolicy(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ')
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`),
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), contentSecurityPolicy()],
  build: {
    // Підтримувані браузери: Chrome, Edge, Firefox, Safari приблизно з 2022 року
    target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})