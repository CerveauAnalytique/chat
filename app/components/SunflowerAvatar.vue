<script setup lang="ts">
withDefaults(
  defineProps<{
    className?: string
  }>(),
  {
    className: 'w-8 h-8'
  }
)
</script>

<template>
  <div
    :class="`relative overflow-hidden rounded-lg flex-shrink-0 flex items-center justify-center bg-[#233120] border border-neutral-200/80 shadow-xs ${className}`"
    title="User Avatar"
  >
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="w-full h-full object-cover"
    >
      <!-- Background foliage / dark green backdrop -->
      <rect width="48" height="48" fill="#2d3b2a" />
      <circle cx="24" cy="24" r="22" fill="#3a4b36" />

      <!-- Stem & Leaves -->
      <path d="M11 35C11 27 21 29 23 32C25 29 35 27 35 35C31 39 15 39 11 35Z" fill="#2d5e1e" />
      <path d="M24 32V42" stroke="#1d4213" stroke-width="2.8" stroke-linecap="round" />

      <!-- Sunflower Outer Petals -->
      <g transform="translate(24, 21)">
        <ellipse
          v-for="(_, i) in 14"
          :key="`outer-${i}`"
          cx="0"
          cy="-11"
          rx="3.4"
          ry="7.8"
          fill="#fbbf24"
          stroke="#b45309"
          stroke-width="0.7"
          :transform="`rotate(${i * (360 / 14)})`"
        />

        <!-- Inner Petals -->
        <ellipse
          v-for="(_, i) in 14"
          :key="`inner-${i}`"
          cx="0"
          cy="-9.5"
          rx="2.3"
          ry="5.2"
          fill="#f59e0b"
          :transform="`rotate(${i * (360 / 14) + 12.8})`"
        />

        <!-- Dark Seed Center -->
        <circle cx="0" cy="0" r="7.8" fill="#3b1d08" stroke="#78350f" stroke-width="1.2" />
        <circle cx="0" cy="0" r="5.2" fill="#221004" />

        <!-- Seed highlights -->
        <circle cx="-2.6" cy="-2.4" r="0.8" fill="#d97706" opacity="0.85" />
        <circle cx="2.6" cy="-2" r="0.8" fill="#d97706" opacity="0.85" />
        <circle cx="0" cy="2.6" r="0.8" fill="#d97706" opacity="0.85" />
        <circle cx="-2.2" cy="1.9" r="0.7" fill="#f59e0b" opacity="0.85" />
        <circle cx="2" cy="2.3" r="0.7" fill="#f59e0b" opacity="0.85" />
        <circle cx="0" cy="-0.4" r="1.1" fill="#fde047" opacity="0.9" />
      </g>

      <!-- Small terracotta plant pot at bottom -->
      <path d="M17 38L19 47H29L31 38H17Z" fill="#b45309" stroke="#78350f" stroke-width="0.8" />
      <rect x="16" y="36.5" width="16" height="2.8" rx="1.2" fill="#d97706" stroke="#92400e" stroke-width="0.8" />
    </svg>
  </div>
</template>
