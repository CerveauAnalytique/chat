import { stripAuthParamsFromUrl } from '@prysel/auth'

export default defineNuxtPlugin(() => {
  stripAuthParamsFromUrl()
})
