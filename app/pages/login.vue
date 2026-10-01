<script setup lang="ts">
import { isSafeReturnPath } from '@prysel/auth'

useHead({ title: 'Sign in' })

const route = useRoute()
const { redirectToSignIn } = useAccountPortal()

onMounted(() => {
  const requested = typeof route.query.next === 'string' ? route.query.next : '/'
  redirectToSignIn(isSafeReturnPath(requested) ? requested : '/')
})
</script>

<template>
  <div class="acct-state" style="min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
    <div class="acct-spinner" aria-hidden="true" />
    <p>Sending you to Prysel Auth...</p>
  </div>
</template>
