<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  X,
  Cpu,
  Settings,
  Key,
  Terminal,
  Copy,
  Check,
  RotateCcw,
  Play,
  Layers,
  Activity,
  Server,
  ShieldCheck,
  Eye,
  EyeOff,
  Code2,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-vue-next'
import { useSdk } from '~/composables/useSdk'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const {
  config,
  isTesting,
  lastTestResult,
  testLogs,
  saveConfig,
  resetConfig,
  getCodeSnippet,
  testConnection
} = useSdk()

const activeTab = ref<'config' | 'playground' | 'code' | 'cluster'>('config')
const showApiKey = ref(false)
const copiedCode = ref(false)
const codeLanguage = ref<'typescript' | 'python' | 'curl'>('typescript')
const playgroundPrompt = ref('Analyze the latest quarterly revenue growth and regional variances.')
const saveToast = ref(false)

const providerPresets: Record<string, { endpoint: string; model: string }> = {
  lsky: { endpoint: 'https://api.lsky.eu/v1', model: 'lsky-sovereign-v1' },
  openai: { endpoint: 'https://api.openai.com/v1', model: 'gpt-4o' },
  anthropic: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20241022' },
  gemini: { endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-pro' },
  ollama: { endpoint: 'http://localhost:11434/v1', model: 'llama3.2' },
  custom: { endpoint: 'https://api.lsky.eu/v1', model: 'custom-model' }
}

const onProviderChange = () => {
  const preset = providerPresets[config.value.provider]
  if (preset) {
    config.value.endpoint = preset.endpoint
    config.value.model = preset.model
  }
}

const copyCurrentSnippet = async () => {
  const code = getCodeSnippet(codeLanguage.value)
  try {
    await navigator.clipboard.writeText(code)
    copiedCode.value = true
    setTimeout(() => {
      copiedCode.value = false
    }, 2000)
  } catch (e) {
    console.error('Clipboard copy failed', e)
  }
}

const handleSave = () => {
  saveConfig()
  saveToast.value = true
  setTimeout(() => {
    saveToast.value = false
  }, 2500)
}

const runPlaygroundTest = async () => {
  await testConnection(playgroundPrompt.value)
}

const close = () => {
  emit('update:modelValue', false)
}
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    @click="close"
  >
    <div
      class="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-neutral-200/80 overflow-hidden flex flex-col max-h-[90vh]"
      @click.stop
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
            <Cpu class="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold text-neutral-900">LSKY SDK & Model Engine</h2>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60 font-semibold">
                @lsky/cloud-sdk v1.2
              </span>
            </div>
            <p class="text-[11px] text-neutral-500">Configure LLM providers, hyper-parameters, test completions, and export client code</p>
          </div>
        </div>

        <button
          class="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          @click="close"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Tab Navigation -->
      <div class="flex items-center px-6 border-b border-neutral-100 bg-white gap-2 pt-2">
        <button
          class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors"
          :class="activeTab === 'config' ? 'border-sky-600 text-sky-700 font-semibold' : 'border-transparent text-neutral-500 hover:text-neutral-800'"
          @click="activeTab = 'config'"
        >
          <Sliders class="w-3.5 h-3.5" />
          <span>Engine Config</span>
        </button>

        <button
          class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors"
          :class="activeTab === 'playground' ? 'border-sky-600 text-sky-700 font-semibold' : 'border-transparent text-neutral-500 hover:text-neutral-800'"
          @click="activeTab = 'playground'"
        >
          <Play class="w-3.5 h-3.5" />
          <span>SDK Playground</span>
        </button>

        <button
          class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors"
          :class="activeTab === 'code' ? 'border-sky-600 text-sky-700 font-semibold' : 'border-transparent text-neutral-500 hover:text-neutral-800'"
          @click="activeTab = 'code'"
        >
          <Code2 class="w-3.5 h-3.5" />
          <span>Code Snippets</span>
        </button>

        <button
          class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors"
          :class="activeTab === 'cluster' ? 'border-sky-600 text-sky-700 font-semibold' : 'border-transparent text-neutral-500 hover:text-neutral-800'"
          @click="activeTab = 'cluster'"
        >
          <Server class="w-3.5 h-3.5" />
          <span>Cluster Infrastructure</span>
        </button>
      </div>

      <!-- Body Content -->
      <div class="p-6 overflow-y-auto flex-1 text-xs space-y-5">
        <!-- 1. CONFIG TAB -->
        <div v-if="activeTab === 'config'" class="space-y-4">
          <!-- Provider & Region Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] font-semibold text-neutral-700 mb-1.5">Model Provider</label>
              <select
                v-model="config.provider"
                class="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                @change="onProviderChange"
              >
                <option value="lsky">LSKY Sovereign Cloud AI (Frankfurt DC-01)</option>
                <option value="openai">OpenAI (GPT-4o, GPT-4o-mini)</option>
                <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                <option value="gemini">Google Gemini (Gemini 1.5 Pro)</option>
                <option value="ollama">Ollama Local (llama3.2, mistral)</option>
                <option value="custom">Custom OpenAI-Compatible API</option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-neutral-700 mb-1.5">Datacenter / Cluster Region</label>
              <input
                v-model="config.clusterRegion"
                type="text"
                class="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none font-mono"
              />
            </div>
          </div>

          <!-- Endpoint URL & Model Identifier -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] font-semibold text-neutral-700 mb-1.5">API Base Endpoint</label>
              <input
                v-model="config.endpoint"
                type="text"
                placeholder="https://api.lsky.eu/v1"
                class="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none font-mono"
              />
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-neutral-700 mb-1.5">Model Identifier</label>
              <input
                v-model="config.model"
                type="text"
                placeholder="lsky-sovereign-v1"
                class="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none font-mono"
              />
            </div>
          </div>

          <!-- Secret API Key -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-[11px] font-semibold text-neutral-700">API Key / Auth Bearer Token</label>
              <span class="text-[10px] text-neutral-400">Optional: leave empty to use in-memory demo backend</span>
            </div>
            <div class="relative">
              <input
                v-model="config.apiKey"
                :type="showApiKey ? 'text' : 'password'"
                placeholder="sk-lsky-..."
                class="w-full pl-3 pr-10 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none font-mono"
              />
              <button
                type="button"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                @click="showApiKey = !showApiKey"
              >
                <EyeOff v-if="showApiKey" class="w-3.5 h-3.5" />
                <Eye v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Hyperparameters -->
          <div class="p-4 rounded-xl border border-neutral-100 bg-neutral-50/60 space-y-4">
            <div class="text-[11px] font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders class="w-3.5 h-3.5 text-neutral-500" />
              Inference Hyperparameters
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[11px] text-neutral-600">Temperature</span>
                  <span class="font-mono font-semibold text-neutral-800">{{ config.temperature }}</span>
                </div>
                <input
                  v-model.number="config.temperature"
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  class="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[11px] text-neutral-600">Max Tokens</span>
                  <span class="font-mono font-semibold text-neutral-800">{{ config.maxTokens }}</span>
                </div>
                <input
                  v-model.number="config.maxTokens"
                  type="range"
                  min="512"
                  max="16384"
                  step="512"
                  class="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[11px] text-neutral-600">Top-P</span>
                  <span class="font-mono font-semibold text-neutral-800">{{ config.topP }}</span>
                </div>
                <input
                  v-model.number="config.topP"
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  class="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <!-- System Prompt Instructions -->
          <div>
            <label class="block text-[11px] font-semibold text-neutral-700 mb-1.5">System Prompt / Instructions</label>
            <textarea
              v-model="config.systemPrompt"
              rows="3"
              class="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none resize-none leading-relaxed font-sans"
            ></textarea>
          </div>
        </div>

        <!-- 2. PLAYGROUND & TESTER TAB -->
        <div v-else-if="activeTab === 'playground'" class="space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-neutral-600">
              Test completions directly through the SDK interface to verify model output and token latency.
            </p>
            <span
              v-if="lastTestResult"
              class="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold"
              :class="lastTestResult.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'"
            >
              Latency: {{ lastTestResult.latencyMs }}ms ({{ lastTestResult.status }})
            </span>
          </div>

          <!-- Prompt Input -->
          <div>
            <label class="block text-[11px] font-semibold text-neutral-700 mb-1.5">Test Prompt</label>
            <div class="flex gap-2">
              <input
                v-model="playgroundPrompt"
                type="text"
                class="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                placeholder="Enter prompt to test SDK..."
                @keydown.enter="runPlaygroundTest"
              />
              <button
                class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                :disabled="isTesting"
                @click="runPlaygroundTest"
              >
                <Activity v-if="isTesting" class="w-3.5 h-3.5 animate-spin" />
                <Play v-else class="w-3.5 h-3.5 fill-current" />
                <span>{{ isTesting ? 'Running...' : 'Run Test' }}</span>
              </button>
            </div>
          </div>

          <!-- Response Inspector -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Left: Request Payload -->
            <div>
              <div class="flex items-center justify-between text-[11px] font-semibold text-neutral-700 mb-1.5">
                <span>Request Payload (JSON)</span>
                <span class="font-mono text-neutral-400">POST {{ config.endpoint }}/chat/completions</span>
              </div>
              <pre class="p-3 bg-neutral-900 text-neutral-200 rounded-xl font-mono text-[10px] overflow-x-auto h-52">{{
                JSON.stringify({
                  model: config.model,
                  temperature: config.temperature,
                  max_tokens: config.maxTokens,
                  messages: [
                    { role: 'system', content: config.systemPrompt.slice(0, 60) + '...' },
                    { role: 'user', content: playgroundPrompt }
                  ]
                }, null, 2)
              }}</pre>
            </div>

            <!-- Right: Response Output -->
            <div>
              <div class="flex items-center justify-between text-[11px] font-semibold text-neutral-700 mb-1.5">
                <span>Response Output</span>
                <span v-if="lastTestResult" class="font-mono text-emerald-600">{{ lastTestResult.latencyMs }}ms</span>
              </div>
              <div class="p-3 bg-neutral-900 text-emerald-400 rounded-xl font-mono text-[10px] overflow-y-auto h-52 whitespace-pre-wrap leading-relaxed">
                {{ lastTestResult ? lastTestResult.responseOutput : 'Run a test completion above to inspect output from the SDK.' }}
              </div>
            </div>
          </div>

          <!-- Activity Logs -->
          <div v-if="testLogs.length > 0" class="pt-2">
            <div class="text-[11px] font-semibold text-neutral-600 mb-1">SDK Event Log</div>
            <div class="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 font-mono text-[10px] text-neutral-600 space-y-0.5 max-h-24 overflow-y-auto">
              <div v-for="(log, idx) in testLogs" :key="idx">{{ log }}</div>
            </div>
          </div>
        </div>

        <!-- 3. CODE SNIPPETS TAB -->
        <div v-else-if="activeTab === 'code'" class="space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-neutral-600">
              Integrate the LSKY SDK directly into your TypeScript/Node.js, Python, or bash applications.
            </p>

            <div class="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg">
              <button
                class="px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors"
                :class="codeLanguage === 'typescript' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'"
                @click="codeLanguage = 'typescript'"
              >
                TypeScript
              </button>
              <button
                class="px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors"
                :class="codeLanguage === 'python' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'"
                @click="codeLanguage = 'python'"
              >
                Python
              </button>
              <button
                class="px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors"
                :class="codeLanguage === 'curl' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'"
                @click="codeLanguage = 'curl'"
              >
                cURL
              </button>
            </div>
          </div>

          <div class="relative">
            <pre class="p-4 bg-neutral-900 text-neutral-100 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-neutral-800 max-h-72">{{ getCodeSnippet(codeLanguage) }}</pre>
            
            <button
              class="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs flex items-center gap-1.5 transition-colors border border-neutral-700"
              @click="copyCurrentSnippet"
            >
              <Check v-if="copiedCode" class="w-3.5 h-3.5 text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5" />
              <span>{{ copiedCode ? 'Copied!' : 'Copy Code' }}</span>
            </button>
          </div>
        </div>

        <!-- 4. CLUSTER & INFRASTRUCTURE TAB -->
        <div v-else class="space-y-4">
          <p class="text-neutral-600">
            Current European cluster orchestration backing this LSKY instance via OpenNebula (KVM) + Ceph/ZFS.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/70 space-y-1">
              <div class="text-[10px] text-neutral-400 uppercase font-semibold">Primary Region</div>
              <div class="font-bold text-neutral-900 text-sm">Frankfurt (FRA-01)</div>
              <div class="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Operational • 12ms latency
              </div>
            </div>

            <div class="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/70 space-y-1">
              <div class="text-[10px] text-neutral-400 uppercase font-semibold">Storage Architecture</div>
              <div class="font-bold text-neutral-900 text-sm">Ceph NVMe-oF + ZFS</div>
              <div class="text-[11px] text-neutral-500">Triple-replicated block store</div>
            </div>

            <div class="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/70 space-y-1">
              <div class="text-[10px] text-neutral-400 uppercase font-semibold">Hypervisor Engine</div>
              <div class="font-bold text-neutral-900 text-sm">KVM via OpenNebula</div>
              <div class="text-[11px] text-neutral-500">Hardware-assisted virtualization</div>
            </div>
          </div>

          <div class="p-4 rounded-xl border border-neutral-200 bg-neutral-900 text-neutral-200 space-y-2">
            <div class="flex items-center justify-between text-[11px]">
              <span class="font-bold text-neutral-100">ONE_AUTH Session Credential</span>
              <span class="text-neutral-400 font-mono">cluster-token-active</span>
            </div>
            <div class="font-mono text-[11px] text-sky-400 break-all bg-black/40 p-2.5 rounded-lg border border-neutral-800">
              {{ config.oneAuthSession }}
            </div>
            <p class="text-[10px] text-neutral-400">
              This token is auto-provisioned by @lsky/cloud-sdk for authenticating storage calls and VM state verification.
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/60">
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-xl text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors flex items-center gap-1.5"
            @click="resetConfig"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <span v-if="saveToast" class="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 class="w-3.5 h-3.5" />
            Settings saved
          </span>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            class="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            :disabled="isTesting"
            @click="runPlaygroundTest"
          >
            <Play class="w-3.5 h-3.5" />
            <span>Test Connection</span>
          </button>

          <button
            class="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors"
            @click="handleSave(); close()"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
