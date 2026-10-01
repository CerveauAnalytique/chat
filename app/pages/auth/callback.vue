<script setup lang="ts">
useHead({ title: 'Signing in' })

const { completeCallback } = useAccountPortal()

onMounted(() => {
  const next = completeCallback()
  navigateTo(next, { replace: true })
})
</script>

<template>
  <div class="acct-state" style="min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
    <div class="acct-spinner" aria-hidden="true" />
    <p>Finishing sign in.</p>
  </div>
</template>
