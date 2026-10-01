<script setup lang="ts">
useHead({
  title: 'AI Data Agent',
  titleTemplate: (pageTitle) => (pageTitle ? `Prysel | ${pageTitle}` : 'Prysel'),
  meta: [
    { name: 'description', content: 'Prysel Ai is an AI data agent powered by sovereign cloud infrastructure.' }
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }
  ]
})
</script>

<template>
  <div class="font-sans antialiased text-gray-900 bg-white">
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<style>
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #ffffff;
}
</style>
