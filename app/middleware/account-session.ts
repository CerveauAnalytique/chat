export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const portal = useAccountPortal()
  if (portal.authRedirecting.value) return abortNavigation()

  try {
    await portal.ensureSession()
  } catch {
    if (portal.corsBlocked.value) return
    return abortNavigation()
  }
})
