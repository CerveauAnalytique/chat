<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    isListening?: boolean
    isSpeaking?: boolean
    size?: 'xs' | 'sm' | 'md' | 'lg'
    className?: string
  }>(),
  {
    isListening: false,
    isSpeaking: false,
    size: 'xs',
    className: ''
  }
)

const scale = computed(() => {
  if (props.size === 'xs') return 0.22
  if (props.size === 'sm') return 0.35
  if (props.size === 'lg') return 1.5
  return 1
})
</script>

<template>
  <div
    class="relative inline-flex flex-col items-center justify-center select-none"
    :class="[
      isListening || isSpeaking ? 'animate-float-fast' : 'animate-float',
      className
    ]"
  >
    <!-- Ambient glow when listening or speaking -->
    <div
      v-if="isListening || isSpeaking"
      class="absolute rounded-full blur-xl transition-all duration-500"
      :class="isSpeaking ? 'w-20 h-20 bg-amber-400/30' : 'w-20 h-20 bg-sky-400/30'"
    />

    <!-- SVG Vector AI Face matching Neuriy reference -->
    <svg
      :width="140 * scale"
      :height="100 * scale"
      viewBox="0 0 140 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="relative z-10 transition-transform duration-300 drop-shadow-xs"
    >
      <!-- Left Eye (Pill shape with blinking animation) -->
      <rect
        x="40"
        y="20"
        width="18"
        height="42"
        rx="9"
        class="fill-neutral-900 animate-eye-blink origin-center"
      />

      <!-- Right Eye (Pill shape with blinking animation) -->
      <rect
        x="82"
        y="20"
        width="18"
        height="42"
        rx="9"
        class="fill-neutral-900 animate-eye-blink origin-center"
      />

      <!-- Nose / Mouth Dot (talking animation when speaking) -->
      <rect
        x="68"
        y="74"
        width="4"
        height="9"
        rx="2"
        class="fill-neutral-900 origin-center transition-all"
        :class="{ 'animate-mouth-talk': isSpeaking }"
      />
    </svg>
  </div>
</template>

<style scoped>
@keyframes floatBob {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes eyeBlink {
  0%, 45%, 53%, 100% {
    transform: scaleY(1);
  }
  49% {
    transform: scaleY(0.08);
  }
}

@keyframes mouthTalk {
  0%, 100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(2.2);
  }
}

.animate-float {
  animation: floatBob 3.2s ease-in-out infinite;
}

.animate-float-fast {
  animation: floatBob 1.8s ease-in-out infinite;
}

.animate-eye-blink {
  animation: eyeBlink 3.8s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center center;
}

.animate-mouth-talk {
  animation: mouthTalk 0.4s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center center;
}
</style>
