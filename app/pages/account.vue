<script setup lang="ts">
definePageMeta({
  middleware: [() => navigateTo('/profile', { replace: true })]
})
</script>

<template>
  <div class="acct-state">
    <div class="acct-spinner" aria-hidden="true" />
  </div>
</template>
