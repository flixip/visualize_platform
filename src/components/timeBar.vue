<template>
  <div class="fixed glass-dark bottom-10 left-20 right-20 rounded-2xl px-10 py-4 z-500">    
    <div class="relative">
      <!-- 轨道 -->
      <div ref="track" class="progress-track"></div>
      
      <!-- 滑块：用 :style 绑定位置，无需手动调用 updateSliderPosition -->
      <div 
      ref="slider"
      @mousedown="(e)=>{
        e.preventDefault()
        followCursor(e)}"
        class="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10">
        <div class="progress-thumb "></div>
      </div>
      
      <!-- 时间标记：用 v-for 渲染（核心重构点） -->
      <div class="absolute mt-4 top-0 left-0 right-0">
        <div v-for="(year, index) in years" :key="year" 
        @click="(e)=>{
          const curelement = e.currentTarget as HTMLElement
          if (!slider) return 
          slider.style.left = curelement.style.left
          if (!curelement.dataset.index) return 
          currentYear = Number(curelement.dataset.index) + startYear
          emit('change',currentYear - startYear)
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
import { ref, computed, onUnmounted, watch } from 'vue'

// 1. 响应式状态（不变）
const startYear:number = 2000
const years = ref<number[]>(Array.from({ length: 11 }, (_, i) => startYear + i))
const currentYear = ref<number>(startYear)
const isDragging = ref<boolean>(false)
const track = ref<HTMLElement | null>(null) // 轨道 ref 
const slider = ref<HTMLElement | null>(null) 
let globalMousemove: ((e: MouseEvent) => void) | null = null
let globalMouseup: (() => void) | null = null

// 应该监听节点变化才对，同时不能是拖拽状态
const emit = defineEmits(['change'])
watch(isDragging,(val)=>{
  if (!val) emit('change',currentYear.value - startYear)
})

// ✅ 加computed：缓存重复依赖（只算一次，依赖变化才更）
const yearCount = computed(() => years.value.length - 1) // 10（2000-2010共11年）

// 这里输入一个占比 试想如果把一根木头分成10份，那么就是1/10 单位是占比是n/10，所以要乘10 然后四舍五入就能得到份数
// 所以如果是11份也是同理，但是要得到靠近的节点，就要乘以份数-1
const getNearestNode = computed(() => (accfor: number) => {
  // 此函数用于获取节点数
  return Math.round(accfor * yearCount.value)
})
// ✅ 加computed：自动计算“当前年份→滑块位置”（依赖currentYear、yearCount）
const nearestSliderLeft = computed(() => {
  const pos = (currentYear.value - startYear) / yearCount.value
  return `${pos * 100}%`
})

// ✅ 加computed：实时拖拽占比→滑块位置（后续可复用）
const getSliderLeftByAccfor = computed(() => (accfor: number) => {
  return `${accfor * 100}%`
})
// 1. 鼠标按下：绑定全局事件
const followCursor = (e: MouseEvent) => {
  // 按下鼠标后认为正在被拖曳
  isDragging.value = true
  const sliderEl = e.currentTarget as HTMLElement
  if (!track.value) return

  // 2. 定义全局鼠标移动逻辑
  globalMousemove = (moveE: MouseEvent) => {
    if (!isDragging.value || !track.value) return
    
    // 计算滑块位置（你的核心逻辑）
    const trackRect = track.value.getBoundingClientRect()
    const dx = moveE.clientX - trackRect.left 
    const safeDx = Math.max(0, Math.min(dx, trackRect.width))
    const accfor = safeDx / trackRect.width

    currentYear.value = startYear + getNearestNode.value(accfor)
    sliderEl.style.left = getSliderLeftByAccfor.value(accfor)
  }

  // 3. 定义全局鼠标松开逻辑（解绑事件）
  globalMouseup = () => {
    isDragging.value = false
    sliderEl.style.left = nearestSliderLeft.value
    // 解绑全局事件
    if (globalMousemove) document.removeEventListener('mousemove', globalMousemove)
    if (globalMouseup) document.removeEventListener('mouseup', globalMouseup)
    // 清空句柄（避免内存泄漏）
    globalMousemove = null
    globalMouseup = null
  }

  // 4. 绑定全局事件到 document
  document.addEventListener('mousemove', globalMousemove)
  document.addEventListener('mouseup', globalMouseup)
}

// 5. 组件卸载：兜底清理全局事件（防止松开事件未触发导致泄漏）
onUnmounted(() => {
  if (globalMousemove) document.removeEventListener('mousemove', globalMousemove)
  if (globalMouseup) document.removeEventListener('mouseup', globalMouseup)
})



</script>