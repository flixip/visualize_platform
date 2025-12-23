<script setup lang="ts">
import { onMounted, ref, watch, reactive, nextTick, provide } from 'vue'
import Nav from './components/nav.vue'
import Map from './components/map.vue'
import TimeBar from './components/timeBar.vue'
import SettingPanel from './components/settingPanel.vue'
import DataPanel from './components/dataPanel.vue'



// 1. 基础响应式数据

const ispanelOpen = ref<boolean>(false)   // 数据面板是否打开
const isshowsetting = ref<boolean>(false)

const selectedDistrict = ref<string>('')
const yearIndex = ref<number>(0)
const startYear = ref<number>(2000)
const yearRange = ref<number>(11)

provide('startYear', startYear)
provide('yearIndex', yearIndex)
provide('selectedDistrict', selectedDistrict)
provide('yearRange', yearRange)

const resetTrigger = ref<boolean>(false)
const settingpanel = ref<InstanceType<typeof SettingPanel> | null>(null)

const reset = () => {
  // 1. 重置业务状态
  resetTrigger.value = !resetTrigger.value
  selectedDistrict.value = ''
  // yearIndex.value = 0 // 可选：重置年份到初始值
  ispanelOpen.value = false // 可选：关闭数据面板
  console.log('执行重置：恢复全局视图 + 重置缩放')

}

// 2. 全局默认配置（抽离常量，方便维护）
const DEFAULT_MAP_CONFIG = {
  startRGB: 'rgb(230, 255, 237)',
  endRGB: 'rgb(4, 120, 87)',
  opacityVal: 1,
  gammaVal: 1.0,
  ndviMin: 0.2,
  ndviMax: 0.5,
  layerType: 'fill' as string,
  showLabel: true
}

// 3. 响应式配置（传给Map组件，唯一数据源）
const mapConfig = reactive({ ...DEFAULT_MAP_CONFIG })

// 4. 工具函数：安全获取子组件参数（兜底+类型转换）
const getValidValue = <T>(val: unknown, defaultValue: T): T => {
  if (val === undefined || val === null || isNaN(Number(val)) && typeof val === 'number') {
    return defaultValue
  }
  return (typeof val === 'number' ? val : defaultValue) as T
}

// 5. 核心：更新Map配置（复用+容错）
const updateMapConfig = () => {
  // 子组件未挂载 → 保留默认配置
  if (!settingpanel.value) {
    console.log('SettingPanel未挂载，使用默认配置：', mapConfig)
    return
  }

  try {
    // 解构子组件参数 + 兜底
    const panelData = settingpanel.value
    const startR = getValidValue(panelData.startR, 230)
    const startG = getValidValue(panelData.startG, 255)
    const startB = getValidValue(panelData.startB, 237)
    const endR = getValidValue(panelData.endR, 4)
    const endG = getValidValue(panelData.endG, 120)
    const endB = getValidValue(panelData.endB, 87)
    const opacityVal = getValidValue(panelData.opacityVal, 1)
    const gammaVal = getValidValue(panelData.gammaVal, 1.0)
    const ndviMin = getValidValue(panelData.ndviMin, 0.2)
    const ndviMax = getValidValue(panelData.ndviMax, 0.5)
    const layerType = panelData.layerType
    const showLabelVal = panelData.showLabel

    // 确保NDVI最小值 < 最大值（避免除以0）
    const finalNdviMin = ndviMin >= ndviMax ? ndviMax - 0.1 : ndviMin
    const finalNdviMax = ndviMax <= ndviMin ? ndviMin + 0.1 : ndviMax

    // 更新响应式配置（关键：修改外层的mapConfig，而非重新定义）
    mapConfig.startRGB = `rgb(${startR}, ${startG}, ${startB})`
    mapConfig.endRGB = `rgb(${endR}, ${endG}, ${endB})`
    mapConfig.opacityVal = opacityVal
    mapConfig.gammaVal = gammaVal
    mapConfig.ndviMin = finalNdviMin
    mapConfig.ndviMax = finalNdviMax
    mapConfig.layerType = layerType
    mapConfig.showLabel = showLabelVal

    console.log('配置更新完成：', mapConfig)
  } catch (e) {
    console.error('配置更新失败，保留默认值：', e)
  }
}

// 6. 监听逻辑：确保参数变化时实时更新
// 监听面板打开/关闭
watch(isshowsetting, async (newVal) => {
  if (newVal) {
    // 等待面板渲染+数据就绪
    await nextTick()
    setTimeout(() => updateMapConfig(), 100)
  }
})

// 监听子组件参数变化（面板打开时才更新）
watch(
  () => [
    settingpanel.value?.startR,
    settingpanel.value?.startG,
    settingpanel.value?.startB,
    settingpanel.value?.endR,
    settingpanel.value?.endG,
    settingpanel.value?.endB,
    settingpanel.value?.opacityVal,
    settingpanel.value?.gammaVal,
    settingpanel.value?.ndviMin,
    settingpanel.value?.ndviMax,
    settingpanel.value?.layerType,
    settingpanel.value?.showLabel
  ],
  () => {
    if (isshowsetting.value) updateMapConfig()
  },
  { deep: true, immediate: false }
)

// 8. 初始化：仅打印默认配置，不强制更新（避免覆盖）
onMounted(() => {
  console.log('App初始化完成，默认配置：', mapConfig)
})


</script>

<template>
  <div class="h-screen w-screen flex flex-col">
    <Nav 
      @toggleDataPanel="()=> ispanelOpen = !ispanelOpen"
      @resetView="reset"
      @toggleSetting="()=> isshowsetting = !isshowsetting"
      @toggleSimplified="console.log('你点击了精简显示按钮')"
    />
    <!-- 核心：传递响应式的mapConfig -->
    
    <Map 
      :mapConfig="mapConfig"
      :resetTrigger="resetTrigger"
      @selectDistrict="(e:string)=>{
      selectedDistrict = e
      console.log('选择区县：', e)
    }"
    />
    <DataPanel
      :panelOpen="ispanelOpen"
      @closePanel="ispanelOpen = false"
    />
    <TimeBar/>
    <SettingPanel 
      ref="settingpanel"
      @close="isshowsetting = false"
      v-show="isshowsetting"
    />
    
  </div>
</template>

