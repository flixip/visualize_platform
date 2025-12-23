<template>
  <div class="fixed glass-dark bottom-10 left-20 right-20 rounded-2xl px-10 py-4 z-500">
    <div class="relative">
      <!-- 轨道 -->
      <div ref="track" class="progress-track"></div>

      <!-- 滑块：拖拽时仅更新样式，不修改 yearIndex -->
      <div
        ref="slider"
        @mousedown="(e) => { e.preventDefault(); followCursor(e) }"
        class="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10"
      >
        <div class="progress-thumb"></div>
      </div>

      <!-- 时间标记：left计算已正确（years.length-1 = yearRange-1） -->
      <div class="absolute mt-4 top-0 left-0 right-0">
        <div
          v-for="(year, index) in years"
          :key="year"
          @click="(e) => {
            const curelement = e.currentTarget as HTMLElement
            if (!slider) return
            slider.style.left = curelement.style.left
            if (!curelement.dataset.index) return
            yearIndex = Number(curelement.dataset.index)
          }"
          class="progress-marker"
          :style="{ left: `${(index / (years.length - 1)) * 100}%` }"
          :data-index="index"
        >
          <div class="progress-label">
            {{ year }}年
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, inject } from 'vue'

// App 层 provide 的响应式数据
const yearIndex = inject('yearIndex', ref<number>(0))
const startYear = inject('startYear', ref<number>(2000))
const yearRange = inject('yearRange', ref<number>(10))

// 年份数组
const years = ref<number[]>(
  Array.from({ length: yearRange.value }, (_, i) => startYear.value + i)
)

const isDragging = ref<boolean>(false)
const track = ref<HTMLElement | null>(null)
const slider = ref<HTMLElement | null>(null)
// 新增：存储拖拽过程中的临时占比（仅用于更新滑块样式）
const tempAccfor = ref<number>(0)
let globalMousemove: ((e: MouseEvent) => void) | null = null
let globalMouseup: (() => void) | null = null

// 核心修复：计算索引最大值（yearRange-1）
const maxIndex = computed(() => yearRange.value - 1)

// 修复卡位逻辑：accfor * maxIndex（而非yearRange）
const getNearestNode = computed(() => (accfor: number) => {
  return Math.round(accfor * maxIndex.value)
})

// 拖拽逻辑：仅更新临时占比，松开时才修改 yearIndex
const followCursor = (e: MouseEvent) => {
  isDragging.value = true
  const sliderEl = e.currentTarget as HTMLElement
  if (!track.value) return

  globalMousemove = (moveE: MouseEvent) => {
    if (!isDragging.value || !track.value) return

    // 1. 仅计算临时占比，更新滑块样式（不修改 yearIndex）
    const trackRect = track.value.getBoundingClientRect()
    const dx = moveE.clientX - trackRect.left
    const safeDx = Math.max(0, Math.min(dx, trackRect.width))
    tempAccfor.value = safeDx / trackRect.width
    sliderEl.style.left = `${tempAccfor.value * 100}%`
  }

  globalMouseup = () => {
    isDragging.value = false
    // 2. 鼠标松开时，计算最终索引（修复：用maxIndex）
    const finalIndex = getNearestNode.value(tempAccfor.value)
    // 边界防护：最大值是maxIndex（yearRange-1）
    yearIndex.value = Math.max(0, Math.min(finalIndex, maxIndex.value))
    // 同步滑块位置（分母改为maxIndex）
    sliderEl.style.left = `${(yearIndex.value / maxIndex.value) * 100}%`
    
    // 解绑事件
    if (globalMousemove) document.removeEventListener('mousemove', globalMousemove)
    if (globalMouseup) document.removeEventListener('mouseup', globalMouseup)
    globalMousemove = null
    globalMouseup = null
  }

  document.addEventListener('mousemove', globalMousemove)
  document.addEventListener('mouseup', globalMouseup)
}

// 组件卸载：清理全局事件
onUnmounted(() => {
  if (globalMousemove) document.removeEventListener('mousemove', globalMousemove)
  if (globalMouseup) document.removeEventListener('mouseup', globalMouseup)
})
</script>