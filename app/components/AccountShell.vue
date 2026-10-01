<script setup lang="ts">
const route = useRoute()
const { corsBlocked, CORS_MESSAGE } = useAccountPortal()

const links = [
  { name: 'Applications', to: '/dashboard', exact: true },
  { name: 'Account', to: '/profile', exact: false },
  { name: 'Security', to: '/security', exact: false }
]

const isActive = (link: { to: string, exact: boolean }) => {
  return link.exact ? route.path === link.to : route.path.startsWith(link.to)
}
</script>

<template>
  <div class="acct-shell">
    <p v-if="corsBlocked" class="acct-cors" role="alert">
      {{ CORS_MESSAGE }}
    </p>
    <header class="acct-header">
      <NuxtLink to="/dashboard" class="acct-brand" aria-label="Prysel Account">
        <img src="/assets/img/prysel.svg" alt="Prysel" class="acct-wordmark" width="120" height="32">
        <span class="acct-brand-label">Account</span>
      </NuxtLink>
      <nav class="acct-nav" aria-label="Main navigation">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="acct-nav-link"
          :class="{ 'is-active': isActive(link) }"
        >
          {{ link.name }}
        </NuxtLink>
      </nav>
    </header>
    <main class="acct-main">
      <slot />
    </main>
  </div>
</template>
