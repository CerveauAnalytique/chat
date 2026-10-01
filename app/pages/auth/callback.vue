<script setup lang="ts">
useHead({ title: 'Signing in' })

onMounted(() => {
  navigateTo('/dashboard', { replace: true })
})
</script>

<template>
  <div class="acct-state" style="min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
    <div class="acct-spinner" aria-hidden="true" />
    <p>Redirecting to dashboard...</p>
  </div>
</template>
