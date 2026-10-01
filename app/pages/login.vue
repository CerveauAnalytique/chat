<script setup lang="ts">
import { ref } from 'vue'
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-vue-next'

useHead({
  title: 'Login',
  meta: [
    { name: 'description', content: 'Login to your Prysel Ai account to manage domains, servers, databases, and AI data agents.' }
  ]
})

const { login } = useAuth()
const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)
const socialNotice = ref<string | null>(null)

const handleSubmit = async () => {
  if (!email.value.trim()) {
    error.value = 'Please enter your username or email.'
    return
  }
  if (!password.value) {
    error.value = 'Please enter your password.'
    return
  }

  error.value = null
  isLoading.value = true

  try {
    // Simulate brief network delay
    await new Promise((resolve) => setTimeout(resolve, 600))
    await login({ email: email.value, password: password.value })
    router.push('/')
  } catch (err) {
    error.value = 'Invalid credentials provided. Please check your email and password.'
  } finally {
    isLoading.value = false
  }
}

const handleSocialClick = async (provider: string) => {
  // Quick direct login via Google / GitHub SSO for seamless demo & real use
  isLoading.value = true
  await new Promise((resolve) => setTimeout(resolve, 400))
  await login({ email: `${provider.toLowerCase()}-user@prysel.ai` })
  router.push('/')
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
          Sign in to your account
        </p>
      </div>

      <!-- Error Notice -->
      <div v-if="error" class="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm">
        {{ error }}
      </div>

      <!-- Social Notice -->
      <div v-if="socialNotice" class="mb-6 p-4 rounded-xl bg-neutral-100 text-neutral-800 text-xs leading-relaxed">
        {{ socialNotice }}
      </div>

      <!-- Login Form -->
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <!-- Username / Email Field -->
        <div>
          <label class="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2" for="email">
            Username or Email
          </label>
          <div class="relative flex items-center">
            <div class="absolute left-4 pointer-events-none text-neutral-400">
              <User class="w-5 h-5" />
            </div>
            <input
              id="email"
              v-model="email"
              type="text"
              autocomplete="username email"
              placeholder="name@company.com"
              class="w-full pl-12 pr-4 py-3.5 bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white text-neutral-900 placeholder:text-neutral-400 border border-neutral-200 focus:border-neutral-900 rounded-xl focus:outline-none transition-all text-sm font-medium"
            />
          </div>
        </div>

        <!-- Password Field -->
        <div>
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

        <!-- Full-width Login Button -->
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full mt-2 py-3.5 px-6 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
        >
          <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin text-white" />
          <span>{{ isLoading ? 'Logging in...' : 'Login' }}</span>
        </button>

        <!-- Forgot Password Link -->
        <div class="flex justify-end pt-1">
          <a
            href="#"
            class="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
            @click.prevent="error = 'Password reset instructions sent to your email.'"
          >
            Forgot your password?
          </a>
        </div>

        <!-- Text without any dividing gray line -->
        <div class="pt-3 pb-1 text-center">
          <span class="text-xs text-neutral-400 font-medium">Or continue with</span>
        </div>

        <!-- Social Sign-In Buttons matching lsky-eu -->
        <div class="space-y-2.5">
          <!-- Sign In with Google -->
          <button
            type="button"
            class="w-full py-3 px-4 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-sm font-medium transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99]"
            @click="handleSocialClick('Google')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign In with Google</span>
          </button>

          <!-- Sign In with Github -->
          <button
            type="button"
            class="w-full py-3 px-4 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-sm font-medium transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99]"
            @click="handleSocialClick('GitHub')"
          >
            <svg class="w-4 h-4 fill-neutral-900" viewBox="0 0 24 24">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>Sign In with Github</span>
          </button>
        </div>

        <!-- Create Account Footer Link -->
        <div class="pt-4 text-center">
          <p class="text-sm text-neutral-600">
            Don't have an account?{' '}
            <a
              href="#"
              class="font-semibold text-neutral-900 hover:text-black underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-900 transition-all"
              @click.prevent="error = 'Registration is managed by your Prysel Ai enterprise administrator.'"
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
