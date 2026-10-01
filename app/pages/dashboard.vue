<script setup lang="ts">
import { formatMediumDate, type PortalApp } from '~/composables/useAccountPortal'

useHead({ title: 'Dashboard' })
definePageMeta({ middleware: ['account-session'] })

const { session, authRedirecting, corsBlocked, getApps, recordAppAccess, logout } = useAccountPortal()

const loading = ref(true)
const apps = ref<PortalApp[]>([])

const displayName = computed(() => session.value?.user.name?.trim() || '')
const initial = computed(() => (displayName.value || session.value?.user.email || 'P').charAt(0).toUpperCase())

const icons: Record<string, string> = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  analytics: 'M3 3v18h18M7 16l4-4 4 4 5-6',
  docs: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6'
}

const iconPath = (icon?: string | null) => icons[icon || 'dashboard'] || icons.dashboard

const openApp = async (app: PortalApp, event: MouseEvent) => {
  event.preventDefault()
  await recordAppAccess(app.id)
  window.open(app.url, '_blank', 'noopener,noreferrer')
}

onMounted(async () => {
  if (corsBlocked.value || authRedirecting.value) {
    loading.value = false
    return
  }
  try {
    apps.value = await getApps()
  } catch {
    apps.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AccountShell>
    <div class="acct-page acct-page-dashboard">
      <header class="acct-dashboard-header">
        <div>
          <h1 class="acct-title">Your Applications.</h1>
          <p class="acct-lead">Access your Prysel applications with single sign on.</p>
        </div>
        <div v-if="session?.user" class="acct-badge">
          <img
            v-if="session.user.picture"
            :src="session.user.picture"
            :alt="displayName || 'Profile photo'"
            class="acct-avatar"
          >
          <div v-else class="acct-avatar-fallback" aria-hidden="true">{{ initial }}</div>
          <div>
            <div class="acct-badge-name">{{ displayName || 'None' }}</div>
            <div class="acct-badge-email">{{ session.user.email }}</div>
          </div>
        </div>
      </header>

      <div v-if="loading || authRedirecting" class="acct-state" aria-live="polite">
        <div class="acct-spinner" aria-hidden="true" />
        <p>Loading your applications...</p>
      </div>
      <div v-else-if="corsBlocked" class="acct-state" role="alert">
        <p>https://account.prysel.com must be allowed as an origin on auth.prysel.com.</p>
      </div>
      <div v-else-if="apps.length === 0" class="acct-state">
        <p>No applications available yet.</p>
      </div>
      <div v-else class="acct-grid" role="list">
        <article v-for="app in apps" :key="app.id" class="acct-card acct-app" role="listitem">
          <div class="acct-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path :d="iconPath(app.icon)" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <h2>{{ app.name }}</h2>
          <p>{{ app.description || 'Prysel ecosystem application.' }}</p>
          <div class="acct-meta">
            <span class="acct-sso">SSO Enabled</span>
            <span v-if="app.lastAccessedAt" class="acct-last">Last accessed {{ formatMediumDate(app.lastAccessedAt) }}</span>
          </div>
          <a
            :href="app.url"
            class="acct-pill"
            :aria-label="`Open ${app.name}`"
            @click="openApp(app, $event)"
          >
            Open Application
          </a>
        </article>
      </div>

      <nav class="acct-footer" aria-label="Account navigation">
        <NuxtLink to="/profile" class="acct-text-link">View Profile</NuxtLink>
        <button type="button" class="acct-logout" @click="logout">Log out</button>
      </nav>
    </div>
  </AccountShell>
</template>
