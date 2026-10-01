<script setup lang="ts">
import { computed, ref } from 'vue'
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-vue-next'

useHead({
  title: 'Login',
  meta: [
    { name: 'description', content: 'Login to your Prysel Ai account to manage domains, servers, databases, and AI data agents.' }
  ]
})

const { login, submitLoginCode, submitPasskey, requestPasswordReset, authUrl } = useAuth()
const router = useRouter()

const email = ref('')
const password = ref('')
const code = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const step = ref<'email' | 'password' | 'code' | 'passkey'>('email')
const loginToken = ref('')
const factors = ref({ code: false, passkey: false })

const steps = computed(() => {
  const sequence: Array<'email' | 'password' | 'code' | 'passkey'> = ['email', 'password']
  if (factors.value.code) sequence.push('code')
  if (factors.value.passkey) sequence.push('passkey')
  return sequence
})

const stepLabels = {
  email: 'Your email',
  password: 'Your password',
  code: 'Your code',
  passkey: 'Your passkey'
}

const signupUrl = computed(() => `${authUrl}/signup`)

const finish = () => {
  router.push('/')
}

const applyResult = (result: Awaited<ReturnType<typeof login>>) => {
  if (result.status === 'complete') {
    finish()
    return
  }
  loginToken.value = result.loginToken
  factors.value = result.factors
  step.value = result.next
}

const run = async (action: () => Promise<void>) => {
  error.value = null
  notice.value = null
  isLoading.value = true
  try {
    await action()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to sign in. Please try again.'
  } finally {
    isLoading.value = false
  }
}

const handleSubmit = async () => {
  if (step.value === 'email') {
    if (!email.value.trim() || !email.value.includes('@')) {
      error.value = 'Please enter a valid email address.'
      return
    }
    error.value = null
    step.value = 'password'
    return
  }

  if (step.value === 'password') {
    if (!password.value) {
      error.value = 'Enter your password.'
      return
    }
    await run(async () => {
      applyResult(await login({ email: email.value, password: password.value }))
    })
    return
  }

  if (step.value === 'code') {
    if (!/^\d{6}$/.test(code.value.trim())) {
      error.value = 'Enter the 6 digit code from your authenticator.'
      return
    }
    await run(async () => {
      applyResult(await submitLoginCode(loginToken.value, code.value.trim()))
    })
    return
  }

  await run(async () => {
    applyResult(await submitPasskey(loginToken.value))
  })
}

const editEmail = () => {
  step.value = 'email'
  loginToken.value = ''
  factors.value = { code: false, passkey: false }
  password.value = ''
  code.value = ''
  error.value = null
}

const handleForgotPassword = async () => {
  if (!email.value.trim() || !email.value.includes('@')) {
    error.value = 'Enter your email address first.'
    step.value = 'email'
    return
  }
  await run(async () => {
    notice.value = await requestPasswordReset(email.value)
  })
}
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col justify-center py-12 px-4 sm:px-6 font-sans antialiased text-neutral-900 selection:bg-sky-100 selection:text-sky-900">
    <!-- Centered clean container matching lsky-eu, no card border, no gray lines -->
    <div class="w-full max-w-[420px] mx-auto my-auto">
      <!-- Brand Header with official Prysel Ai Logo -->
      <div class="flex items-center justify-center mb-8">
        <NuxtLink to="/" class="inline-flex items-center group">
          <img
            src="/assets/img/prysel.svg"
            alt="Prysel Ai"
            class="h-9 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </NuxtLink>
      </div>

      <!-- Title & Subtitle -->
      <div class="text-center mb-8">
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
          Welcome back
        </h1>
        <p class="mt-2 text-sm text-neutral-500">
          Step {{ steps.indexOf(step) + 1 }} of {{ steps.length }} · {{ stepLabels[step] }}
        </p>
        <p class="mt-1 text-xs text-neutral-400">
          Auth Prysel · auth.prysel.com
        </p>
      </div>

      <!-- Error Notice -->
      <div v-if="error" class="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm">
        {{ error }}
      </div>

      <div v-if="notice" class="mb-6 p-4 rounded-xl bg-neutral-100 text-neutral-800 text-xs leading-relaxed">
        {{ notice }}
      </div>

      <!-- Login Form -->
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="step === 'email'">
          <label class="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2" for="email">
            Email address
          </label>
          <div class="relative flex items-center">
            <div class="absolute left-4 pointer-events-none text-neutral-400">
              <User class="w-5 h-5" />
            </div>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="username email"
              placeholder="name@company.com"
              class="w-full pl-12 pr-4 py-3.5 bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white text-neutral-900 placeholder:text-neutral-400 border border-neutral-200 focus:border-neutral-900 rounded-xl focus:outline-none transition-all text-sm font-medium"
            />
          </div>
        </div>

        <div v-else class="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 text-sm">
          <span class="font-medium text-neutral-800 truncate">{{ email }}</span>
          <button type="button" class="text-xs font-semibold text-neutral-500 hover:text-neutral-900" @click="editEmail">
            Edit
          </button>
        </div>

        <div v-if="step === 'password'">
          <label class="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2" for="password">
            Password
          </label>
          <div class="relative flex items-center">
            <div class="absolute left-4 pointer-events-none text-neutral-400">
              <Lock class="w-5 h-5" />
            </div>
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••••••"
              class="w-full pl-12 pr-12 py-3.5 bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white text-neutral-900 placeholder:text-neutral-400 border border-neutral-200 focus:border-neutral-900 rounded-xl focus:outline-none transition-all text-sm font-medium"
            />
            <button
              type="button"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              class="absolute right-4 text-neutral-400 hover:text-neutral-700 transition-colors focus:outline-none cursor-pointer"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" class="w-5 h-5" />
              <Eye v-else class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div v-if="step === 'code'">
          <label class="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2" for="code">
            Authenticator code
          </label>
          <input
            id="code"
            v-model="code"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="6 digit code"
            class="w-full px-4 py-3.5 bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white text-neutral-900 placeholder:text-neutral-400 border border-neutral-200 focus:border-neutral-900 rounded-xl focus:outline-none transition-all text-sm font-medium tracking-[0.3em]"
          />
        </div>

        <p v-if="step === 'passkey'" class="text-sm text-neutral-600">
          This account has a passkey. Confirm it to finish signing in.
        </p>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full mt-2 py-3.5 px-6 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
        >
          <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin text-white" />
          <span>{{ isLoading ? 'Signing in...' : step === 'email' ? 'Continue' : step === 'passkey' ? 'Confirm passkey' : 'Login' }}</span>
        </button>

        <div v-if="step === 'passkey' && factors.code" class="text-center">
          <button type="button" class="text-xs font-medium text-neutral-500 hover:text-neutral-900" @click="step = 'code'">
            Use a 6-digit code instead
          </button>
        </div>
        <div v-if="step === 'code' && factors.passkey" class="text-center">
          <button type="button" class="text-xs font-medium text-neutral-500 hover:text-neutral-900" @click="step = 'passkey'">
            Use a passkey instead
          </button>
        </div>

        <div v-if="step === 'email' || step === 'password'" class="flex justify-end pt-1">
          <button
            type="button"
            class="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
            @click="handleForgotPassword"
          >
            Forgot your password?
          </button>
        </div>

        <div class="pt-4 text-center">
          <p class="text-sm text-neutral-600">
            Don't have an account?
            <a
              :href="signupUrl"
              class="font-semibold text-neutral-900 hover:text-black underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-900 transition-all"
            >
              Create here
            </a>
          </p>
        </div>
      </form>
    </div>

    <!-- Bottom copyright -->
    <div class="text-center text-xs text-neutral-400">
      &copy; {{ new Date().getFullYear() }} Prysel Ai. All rights reserved.
    </div>
  </div>
</template>
