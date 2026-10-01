// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/content',
  ],
  css: ['~/assets/css/account.css'],
  telemetry: false,
  vite: {
    optimizeDeps: {
      include: ['@prysel/auth']
    }
  },
  routeRules: {
    '/account': { redirect: '/profile' },
    '/apps': { redirect: '/dashboard' },
    '/dashboard': { ssr: false },
    '/profile': { ssr: false },
    '/security': { ssr: false },
    '/auth/callback': { ssr: false },
    '/login': { ssr: false }
  },
  devtools: { enabled: true },
  compatibilityDate: '2024-04-03',
})
