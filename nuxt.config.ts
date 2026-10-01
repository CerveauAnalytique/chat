// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/content',
  ],
  css: ['~/assets/css/account.css'],
  routeRules: {
    '/account': { redirect: '/profile' },
    '/apps': { redirect: '/dashboard' }
  },
  devtools: { enabled: true },
  compatibilityDate: '2024-04-03',
})
