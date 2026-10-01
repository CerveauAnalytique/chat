<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { X, Mic, MicOff, Sparkles, ArrowLeft, Volume2 } from 'lucide-vue-next'
import NeuriyFace from './NeuriyFace.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit-speech', text: string): void
}>()

const isListening = ref(false)
const isSpeaking = ref(false)
const isThinking = ref(false)
const transcript = ref('')
const lastResponse = ref('')

let recognition: any = null

const stopAllAudio = () => {
  if (recognition) {
    try {
      recognition.stop()
    } catch (e) {}
  }
  isListening.value = false
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  isSpeaking.value = false
  isThinking.value = false
}

const startListening = () => {
  if (typeof window === 'undefined') return
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  if (!SpeechRecognition) {
    lastResponse.value = 'Speech recognition is not supported in this browser. You can type in the chat instead.'
    return
  }

  stopAllAudio()

  try {
    recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      isListening.value = true
    }

    recognition.onresult = (event: any) => {
      let current = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        current += event.results[i][0].transcript
      }
      transcript.value = current
    }

    recognition.onend = () => {
      isListening.value = false
      if (transcript.value.trim()) {
        handleFinalizeSpeech(transcript.value)
      }
    }

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error)
      isListening.value = false
    }

    recognition.start()
  } catch (err) {
    console.error('Failed to start speech recognition', err)
    isListening.value = false
  }
}

const toggleMic = () => {
  if (isListening.value) {
    stopAllAudio()
  } else {
    transcript.value = ''
    startListening()
  }
}

const handleFinalizeSpeech = async (spokenText: string) => {
  if (!spokenText.trim() || isThinking.value || isSpeaking.value) return

  isThinking.value = true
  isListening.value = false

  // Emit event so chat history also registers the user's speech
  emit('submit-speech', spokenText)

  let reply = ''
  const lower = spokenText.toLowerCase()

  if (lower.includes('error') || lower.includes('bug') || lower.includes('issue')) {
    reply = 'I detected an issue in the query logs. Would you like me to inspect the server stack trace?'
  } else if (lower.includes('sales') || lower.includes('revenue') || lower.includes('growth')) {
    reply = 'Overall sales grew by 18.4% this quarter, driven strongly by European and North American enterprise tiers.'
  } else if (lower.includes('cloud') || lower.includes('hosting') || lower.includes('server')) {
    reply = 'Your Prysel Ai cluster in Frankfurt is running optimally on KVM with triple-replicated Ceph storage.'
  } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    reply = 'Hello! I am Neuriy AI. What would you like to explore or analyze today?'
  } else {
    reply = `I have received your request: "${spokenText}". Let me process that for you in Prysel Ai.`
  }

  lastResponse.value = reply
  isThinking.value = false

  // Speak response out loud using SpeechSynthesis
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(reply)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.onstart = () => {
      isSpeaking.value = true
    }
    utterance.onend = () => {
      isSpeaking.value = false
      transcript.value = ''
      // Re-enable listening after speech completes
      setTimeout(() => {
        if (props.modelValue && !isListening.value) {
          startListening()
        }
      }, 500)
    }
    window.speechSynthesis.speak(utterance)
  }
}

const close = () => {
  stopAllAudio()
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      transcript.value = ''
      lastResponse.value = ''
      setTimeout(() => {
        startListening()
      }, 300)
    } else {
      stopAllAudio()
    }
  }
)

onUnmounted(() => {
  stopAllAudio()
})
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 bg-[#ededed]/95 backdrop-blur-md flex flex-col items-center justify-between p-6 animate-in fade-in duration-200"
    @click.self="close"
  >
    <!-- Top Bar -->
    <div class="w-full max-w-2xl flex items-center justify-between">
      <button
        class="flex items-center gap-2 px-3 py-1.5 bg-white text-neutral-800 rounded-xl text-xs font-semibold shadow-xs hover:bg-neutral-100 transition-all active:scale-95"
        @click="close"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Exit Voice Mode</span>
      </button>

      <div class="flex items-center gap-2 text-xs font-medium text-neutral-500">
        <Sparkles class="w-3.5 h-3.5 text-amber-500" />
        <span>Neuriy AI Voice Control</span>
      </div>
    </div>

    <!-- Centered AI Face in the middle of chat -->
    <div class="my-auto flex flex-col items-center text-center space-y-8 select-none">
      <!-- Big Neuriy Vector Face with glowing ambient aura -->
      <NeuriyFace
        size="lg"
        :is-listening="isListening"
        :is-speaking="isSpeaking"
      />

      <!-- Status & Speech Transcript Display -->
      <div class="space-y-3 max-w-lg px-4">
        <p class="text-xs font-bold tracking-wider uppercase text-neutral-400">
          <span v-if="isThinking">Neuriy is thinking...</span>
          <span v-else-if="isSpeaking" class="text-amber-600">Neuriy is speaking...</span>
          <span v-else-if="isListening" class="text-sky-600 animate-pulse">Listening... Speak anytime</span>
          <span v-else>Tap microphone to talk</span>
        </p>

        <!-- User spoken transcript -->
        <p
          v-if="transcript"
          class="text-xl font-medium text-neutral-900 italic transition-all"
        >
          "{{ transcript }}"
        </p>

        <!-- AI Spoken Response -->
        <p
          v-if="lastResponse && !transcript"
          class="text-base text-neutral-700 leading-relaxed font-sans transition-all"
        >
          "{{ lastResponse }}"
        </p>

        <p v-if="!transcript && !lastResponse" class="text-sm text-neutral-400">
          Ask questions, query Prysel Ai cloud databases, or give voice instructions.
        </p>
      </div>
    </div>

    <!-- Bottom Controls -->
    <div class="w-full max-w-md flex items-center justify-center gap-4 mb-4">
      <button
        class="p-4 rounded-full shadow-lg transition-all transform active:scale-95 cursor-pointer"
        :class="isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-neutral-900 text-white hover:bg-black'"
        title="Toggle Microphone"
        @click="toggleMic"
      >
        <MicOff v-if="isListening" class="w-6 h-6" />
        <Mic v-else class="w-6 h-6" />
      </button>

      <button
        class="p-4 rounded-full bg-neutral-200 text-neutral-700 hover:bg-neutral-300 transition-colors cursor-pointer"
        title="Close Voice Mode"
        @click="close"
      >
        <X class="w-6 h-6" />
      </button>
    </div>
  </div>
</template>
