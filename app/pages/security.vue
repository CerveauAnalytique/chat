<script setup lang="ts">
import { isAuthContinueUrl, safeAuthContinueUrl, type PortalGrant, type PortalSession, type TotpSetup } from '~/composables/useAccountPortal'

useHead({ title: 'Security' })
definePageMeta({ middleware: ['account-session'] })

const route = useRoute()
const {
  authRedirecting,
  corsBlocked,
  getSessions,
  revokeSession,
  getGrants,
  removeGrant,
  getPasskeys,
  setupTotp,
  confirmTotp,
  verifyMfa
} = useAccountPortal()

const loading = ref(true)
const status = ref('')
const alert = ref('')
const sessions = ref<PortalSession[]>([])
const grants = ref<PortalGrant[]>([])
const passkeyInstalled = ref(false)
const totp = ref<TotpSetup | null>(null)
const setupCode = ref('')
const settingUp = ref(false)
const enabling = ref(false)
const continueCode = ref('')
const verifying = ref(false)

const continueTarget = computed(() => {
  const raw = route.query.continue || route.query.returnUrl || route.query.return_to
  return typeof raw === 'string' ? raw : ''
})

const finishingSignIn = computed(() => isAuthContinueUrl(continueTarget.value))

const grantName = (grant: PortalGrant) => grant.appName || grant.clientName || grant.name || grant.clientId
const grantScopes = (grant: PortalGrant) => Array.isArray(grant.scopes) ? grant.scopes.join(', ') : (grant.scopes || 'None')

onMounted(async () => {
  if (corsBlocked.value || authRedirecting.value) {
    loading.value = false
    return
  }
  try {
    const [sessionList, grantList, passkeys] = await Promise.all([getSessions(), getGrants(), getPasskeys()])
    sessions.value = sessionList
    grants.value = grantList
    passkeyInstalled.value = passkeys.installed
  } catch (error) {
    if (!corsBlocked.value && !authRedirecting.value) {
      alert.value = error instanceof Error ? error.message : 'Unable to load security settings.'
    }
  } finally {
    loading.value = false
  }
})

const revoke = async (id: string) => {
  status.value = ''
  alert.value = ''
  try {
    await revokeSession(id)
    sessions.value = sessions.value.filter(item => item.id !== id)
    status.value = 'Session revoked.'
  } catch (error) {
    if (!corsBlocked.value) alert.value = error instanceof Error ? error.message : 'Unable to revoke that session.'
  }
}

const removeAccess = async (clientId: string) => {
  status.value = ''
  alert.value = ''
  try {
    await removeGrant(clientId)
    grants.value = grants.value.filter(item => item.clientId !== clientId)
    status.value = 'Application access removed.'
  } catch (error) {
    if (!corsBlocked.value) alert.value = error instanceof Error ? error.message : 'Unable to remove application access.'
  }
}

const startTotp = async () => {
  status.value = ''
  alert.value = ''
  settingUp.value = true
  try {
    totp.value = await setupTotp()
  } catch (error) {
    if (!corsBlocked.value) alert.value = error instanceof Error ? error.message : 'Unable to start authenticator setup.'
  } finally {
    settingUp.value = false
  }
}

const enableTotp = async () => {
  status.value = ''
  alert.value = ''
  const code = setupCode.value.replace(/\s/g, '')
  if (code.length !== 6) {
    alert.value = 'Enter the 6 digit code from your authenticator app.'
    return
  }
  enabling.value = true
  try {
    await confirmTotp(code)
    status.value = 'Authenticator enabled.'
    totp.value = null
    setupCode.value = ''
  } catch (error) {
    if (!corsBlocked.value) alert.value = error instanceof Error ? error.message : 'Verification code was incorrect.'
  } finally {
    enabling.value = false
  }
}

const continueSignIn = async () => {
  status.value = ''
  alert.value = ''
  const code = continueCode.value.replace(/\s/g, '')
  if (code.length !== 6) {
    alert.value = 'Enter the 6 digit code from your authenticator app.'
    return
  }
  verifying.value = true
  try {
    const result = await verifyMfa(code)
    status.value = 'Verification complete.'
    const next = safeAuthContinueUrl(result?.continueUrl) || safeAuthContinueUrl(continueTarget.value)
    if (next) {
      window.location.assign(next)
      return
    }
    await navigateTo('/dashboard')
  } catch (error) {
    if (!corsBlocked.value) alert.value = error instanceof Error ? error.message : 'Verification code was incorrect.'
  } finally {
    verifying.value = false
  }
}
</script>

<template>
  <AccountShell>
    <div class="acct-page acct-page-security">
      <header class="acct-security-lead">
        <h1 class="acct-title">Security.</h1>
        <p class="acct-lead">Review sessions and the applications allowed to use your Prysel identity.</p>
      </header>

      <p v-if="status" class="acct-banner-ok" role="status">{{ status }}</p>
      <p v-if="alert" class="acct-banner-bad" role="alert">{{ alert }}</p>

      <div v-if="loading || authRedirecting" class="acct-state" aria-live="polite">
        <div class="acct-spinner" aria-hidden="true" />
        <p>Loading security settings...</p>
      </div>
      <div v-else-if="corsBlocked" class="acct-state" role="alert">
        <p>https://account.prysel.com must be allowed as an origin on auth.prysel.com.</p>
      </div>
      <div v-else>
        <section class="acct-panel" aria-labelledby="sessions-heading">
          <h2 id="sessions-heading" class="acct-section-title">Active sessions</h2>
          <p v-if="sessions.length === 0" class="acct-state">No active sessions yet.</p>
          <div v-else class="acct-list" role="list">
            <div v-for="item in sessions" :key="item.id" class="acct-item" role="listitem">
              <div class="acct-item-copy">
                <div class="acct-item-title">
                  <span>{{ item.ipAddress ? `IP ${item.ipAddress}` : 'Session' }}</span>
                  <span v-if="item.current || item.isCurrent" class="acct-pill-ok">This session</span>
                </div>
                <span class="acct-item-meta">{{ item.userAgent || 'Web browser' }}</span>
              </div>
              <button type="button" class="acct-logout" @click="revoke(item.id)">Revoke</button>
            </div>
          </div>
        </section>

        <section class="acct-panel" aria-labelledby="grants-heading">
          <h2 id="grants-heading" class="acct-section-title">Connected applications</h2>
          <p v-if="grants.length === 0" class="acct-state">You have not approved any OAuth applications.</p>
          <div v-else class="acct-list" role="list">
            <div v-for="grant in grants" :key="grant.clientId" class="acct-item" role="listitem">
              <div class="acct-item-copy">
                <span class="acct-item-title">{{ grantName(grant) }}</span>
                <span class="acct-item-meta">Scopes: {{ grantScopes(grant) }}</span>
              </div>
              <button type="button" class="acct-logout" @click="removeAccess(grant.clientId)">Remove access</button>
            </div>
          </div>
        </section>

        <section class="acct-panel" aria-labelledby="passkey-heading">
          <h2 id="passkey-heading" class="acct-section-title">Passkey</h2>
          <p class="acct-passkey-copy">
            <template v-if="passkeyInstalled">
              A passkey is installed on this account. Sign in will ask for it after your password and code.
            </template>
            <template v-else>
              Add a passkey on this device. Sign in will ask for it only after it is installed.
            </template>
          </p>
          <a class="acct-pill" href="https://auth.prysel.com/security">Add a passkey</a>
        </section>

        <section class="acct-panel" aria-labelledby="authenticator-heading">
          <h2 id="authenticator-heading" class="acct-section-title">Authenticator app</h2>
          <div v-if="finishingSignIn" class="acct-form">
            <h3>Confirm it is you</h3>
            <p class="acct-muted">Enter the 6 digit code from your authenticator app.</p>
            <div class="acct-field">
              <label for="continue-code">6 digit code</label>
              <input id="continue-code" v-model="continueCode" class="acct-code" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000">
            </div>
            <button type="button" class="acct-pill" :disabled="verifying" @click="continueSignIn">Continue</button>
          </div>
          <div v-else-if="totp" class="acct-form">
            <p class="acct-muted">Save this secret key in your authenticator app, then enter the 6 digit code.</p>
            <div class="acct-secret">
              <span class="acct-item-meta">Secret key</span>
              <code>{{ totp.secret }}</code>
            </div>
            <div class="acct-field">
              <label for="totp-code">6 digit code</label>
              <input id="totp-code" v-model="setupCode" class="acct-code" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000">
            </div>
            <button type="button" class="acct-pill" :disabled="enabling" @click="enableTotp">Enable</button>
          </div>
          <button v-else type="button" class="acct-pill" :disabled="settingUp" @click="startTotp">Set up authenticator</button>
        </section>
      </div>
    </div>
  </AccountShell>
</template>
