<script setup lang="ts">
import { AccountRequestError, formatLongDate, formatMediumDate, textOrNone } from '~/composables/useAccountPortal'

useHead({ title: 'Profile' })
definePageMeta({ middleware: ['account-session'] })

const { session, authRedirecting, corsBlocked, ensureSession, updateProfile, changePassword, logout } = useAccountPortal()

const loading = ref(true)
const failed = ref(false)
const name = ref('')
const username = ref('')
const mobile = ref('')
const picture = ref('')
const profileMessage = ref('')
const profileError = ref('')
const saving = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const passwordMessage = ref('')
const passwordError = ref('')
const savingPassword = ref(false)

const user = computed(() => session.value?.user)
const initial = computed(() => (user.value?.name || user.value?.email || 'P').charAt(0).toUpperCase())

const fillForm = () => {
  if (!user.value) return
  name.value = user.value.name || ''
  username.value = user.value.username || ''
  mobile.value = user.value.mobile || ''
  picture.value = user.value.picture || ''
}

onMounted(async () => {
  if (corsBlocked.value || authRedirecting.value) {
    loading.value = false
    return
  }
  try {
    await ensureSession()
    fillForm()
  } catch {
    if (!corsBlocked.value && !authRedirecting.value) failed.value = true
  } finally {
    loading.value = false
  }
})

const saveProfile = async () => {
  profileMessage.value = ''
  profileError.value = ''
  const nextUsername = username.value.trim()
  if (nextUsername && !/^[A-Za-z0-9.-]{3,32}$/.test(nextUsername)) {
    profileError.value = 'Username must be 3 to 32 letters, numbers, dots, or dashes.'
    return
  }
  const nextPicture = picture.value.trim()
  if (nextPicture && !nextPicture.startsWith('http://') && !nextPicture.startsWith('https://')) {
    profileError.value = 'Photo must be an http or https URL.'
    return
  }
  saving.value = true
  try {
    await updateProfile({
      name: name.value.trim() || null,
      username: nextUsername || null,
      mobile: mobile.value.trim() || null,
      picture: nextPicture || null
    })
    profileMessage.value = 'Profile saved.'
  } catch (error) {
    if (error instanceof AccountRequestError && error.status === 409) {
      profileError.value = 'That username is already taken.'
    } else if (!corsBlocked.value) {
      profileError.value = error instanceof Error ? error.message : 'Unable to save your profile.'
    }
  } finally {
    saving.value = false
  }
}

const savePassword = async () => {
  passwordMessage.value = ''
  passwordError.value = ''
  if (!currentPassword.value) {
    passwordError.value = 'Current password is required.'
    return
  }
  if (newPassword.value.length < 8) {
    passwordError.value = 'Password must be at least 8 characters.'
    return
  }
  savingPassword.value = true
  try {
    await changePassword(currentPassword.value, newPassword.value)
    passwordMessage.value = 'Password updated.'
    currentPassword.value = ''
    newPassword.value = ''
  } catch (error) {
    if (error instanceof AccountRequestError && error.status === 401) {
      passwordError.value = 'Current password is incorrect.'
    } else if (!corsBlocked.value) {
      passwordError.value = error instanceof Error ? error.message : 'Unable to change your password.'
    }
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <AccountShell>
    <div class="acct-page acct-page-profile">
      <header class="acct-profile-header">
        <h1 class="acct-title">Your Profile.</h1>
        <NuxtLink to="/dashboard" class="acct-text-link">Back to Dashboard</NuxtLink>
      </header>

      <div v-if="loading || authRedirecting" class="acct-state" aria-live="polite">
        <div class="acct-spinner" aria-hidden="true" />
        <p>Loading profile...</p>
      </div>
      <div v-else-if="corsBlocked" class="acct-state" role="alert">
        <p>https://account.prysel.com must be allowed as an origin on auth.prysel.com.</p>
      </div>
      <div v-else-if="failed || !user" class="acct-state" role="alert">
        <p>Unable to load profile. Please try again later.</p>
        <NuxtLink to="/dashboard" class="acct-text-link">Return to Dashboard</NuxtLink>
      </div>
      <div v-else class="acct-stack">
        <section class="acct-card" aria-labelledby="identity-heading">
          <h2 id="identity-heading" class="acct-section-title">Identity</h2>
          <div class="acct-identity">
            <img v-if="user.picture" :src="user.picture" :alt="user.name || 'Profile picture'" class="acct-avatar-lg">
            <div v-else class="acct-avatar-lg" aria-hidden="true">{{ initial }}</div>
            <div class="acct-rows">
              <div class="acct-row"><span>Name</span><span>{{ textOrNone(user.name) }}</span></div>
              <div class="acct-row"><span>Username</span><span>{{ textOrNone(user.username) }}</span></div>
              <div class="acct-row"><span>Email</span><span>{{ textOrNone(user.email) }}</span></div>
              <div class="acct-row"><span>Mobile</span><span>{{ textOrNone(user.mobile) }}</span></div>
              <div class="acct-row"><span>Role</span><span>{{ user.role || 'user' }}</span></div>
              <div class="acct-row">
                <span>Email Verified</span>
                <span v-if="user.emailVerified" class="acct-pill-ok">Verified</span>
                <span v-else class="acct-pill-bad">Not verified</span>
              </div>
              <div class="acct-row"><span>Account ID</span><span class="acct-mono">{{ user.id || 'None' }}</span></div>
              <div class="acct-row"><span>Member since</span><span>{{ formatLongDate(user.createdAt) }}</span></div>
              <div class="acct-row"><span>Last login</span><span>{{ formatMediumDate(user.lastLoginAt) }}</span></div>
            </div>
          </div>
        </section>

        <section class="acct-card" aria-labelledby="edit-heading">
          <h2 id="edit-heading" class="acct-section-title">Edit profile</h2>
          <p v-if="profileMessage" class="acct-status" role="status">{{ profileMessage }}</p>
          <p v-if="profileError" class="acct-alert" role="alert">{{ profileError }}</p>
          <form class="acct-form" @submit.prevent="saveProfile">
            <div class="acct-field">
              <label for="profile-name">Name</label>
              <input id="profile-name" v-model="name" type="text" autocomplete="name">
            </div>
            <div class="acct-field">
              <label for="profile-username">Username</label>
              <input id="profile-username" v-model="username" type="text" autocomplete="username">
            </div>
            <div class="acct-field">
              <label for="profile-mobile">Mobile</label>
              <input id="profile-mobile" v-model="mobile" type="tel" autocomplete="tel">
            </div>
            <div class="acct-field">
              <label for="profile-picture">Photo URL</label>
              <input id="profile-picture" v-model="picture" type="url" placeholder="https://" autocomplete="off">
            </div>
            <button type="submit" class="acct-pill" :disabled="saving">Save profile</button>
          </form>
        </section>

        <section class="acct-card" aria-labelledby="password-heading">
          <h2 id="password-heading" class="acct-section-title">Change password</h2>
          <p v-if="passwordMessage" class="acct-status" role="status">{{ passwordMessage }}</p>
          <p v-if="passwordError" class="acct-alert" role="alert">{{ passwordError }}</p>
          <form class="acct-form" @submit.prevent="savePassword">
            <div class="acct-field">
              <label for="current-password">Current password</label>
              <input id="current-password" v-model="currentPassword" type="password" autocomplete="current-password">
            </div>
            <div class="acct-field">
              <label for="new-password">New password</label>
              <input id="new-password" v-model="newPassword" type="password" autocomplete="new-password">
            </div>
            <button type="submit" class="acct-pill" :disabled="savingPassword">Update password</button>
          </form>
        </section>

        <section class="acct-card" aria-labelledby="history-heading">
          <h2 id="history-heading" class="acct-section-title">Login History</h2>
          <p v-if="!session?.loginHistory?.length" class="acct-state">No login history available.</p>
          <div v-else class="acct-list" role="list">
            <div v-for="(event, index) in session.loginHistory" :key="event.id || index" class="acct-item" role="listitem">
              <span :class="event.success ? 'acct-pill-ok' : 'acct-pill-bad'">{{ event.success ? 'Success' : 'Failed' }}</span>
              <div class="acct-item-copy">
                <span class="acct-history-method">{{ event.loginMethod || 'None' }}</span>
                <span class="acct-item-meta">
                  {{ formatMediumDate(event.createdAt) }}
                  <template v-if="event.ipAddress">, IP {{ event.ipAddress }}</template>
                </span>
              </div>
            </div>
          </div>
        </section>

        <div class="acct-actions">
          <button type="button" class="acct-logout" @click="logout">Log out</button>
        </div>
      </div>
    </div>
  </AccountShell>
</template>
