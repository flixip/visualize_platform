<script setup lang="ts">
import { onMounted, ref, watch, reactive, nextTick } from 'vue'
import Nav from './components/nav.vue'
import Map from './components/map.vue'
import TimeBar from './components/timeBar.vue'
import SettingPanel from './components/settingPanel.vue'
import DataPanel from './components/dataPanel.vue'

type DistrictBounds = [[number, number], [number, number]];

// 1. 基础响应式数据

const ispanelOpen = ref<boolean>(false)
const selectedDistrict = ref<string>('')
const resetTrigger = ref<boolean>(false)


const yearIndex = ref<number>(0)
const isshowsetting = ref<boolean>(false)
const settingpanel = ref<InstanceType<typeof SettingPanel> | null>(null)

const reset = () => {
  // 1. 重置业务状态
  resetTrigger.value = !resetTrigger.value
  selectedDistrict.value = ''
  // yearIndex.value = 0 // 可选：重置年份到初始值
  // ispanelOpen.value = false // 可选：关闭数据面板
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

// 死数据
const ndviData = [
  { district: "兰考县", data: [0.2924, 0.3188, 0.2215, 0.2420, 0.2594, 0.3234, 0.2656, 0.2432, 0.3249, 0.2437, 0.2580] },
  { district: "尉氏县", data: [0.2507, 0.3065, 0.2366, 0.2349, 0.3068, 0.2603, 0.2597, 0.2501, 0.3519, 0.2607, 0.3277] },
  { district: "杞县", data: [0.3351, 0.3237, 0.2362, 0.2320, 0.2597, 0.3616, 0.2609, 0.2435, 0.3391, 0.2657, 0.2611] },
  { district: "祥符区", data: [0.2656, 0.2950, 0.2330, 0.2434, 0.2715, 0.2819, 0.2496, 0.2362, 0.3157, 0.2466, 0.2666] },
  { district: "禹王台区", data: [0.2357, 0.2508, 0.2290, 0.2386, 0.2583, 0.2421, 0.2377, 0.2240, 0.2531, 0.2175, 0.2466] },
  { district: "通许县", data: [0.3230, 0.3215, 0.2359, 0.2318, 0.2701, 0.3554, 0.2599, 0.2588, 0.3429, 0.2676, 0.2813] },
  { district: "顺河回族区", data: [0.2370, 0.2641, 0.2245, 0.2364, 0.2498, 0.2424, 0.2402, 0.2294, 0.2950, 0.2286, 0.2547] },
  { district: "鼓楼区", data: [0.2183, 0.2356, 0.2154, 0.2223, 0.2466, 0.2265, 0.2142, 0.2162, 0.2382, 0.2137, 0.2364] },
  { district: "龙亭区", data: [0.2213, 0.2409, 0.2195, 0.2231, 0.2478, 0.2327, 0.2331, 0.2266, 0.2571, 0.2201, 0.2436] }
];

const boundsDict: Record<string, DistrictBounds> = {
    '兰考县': [[34.744958, 114.686933], [35.025608, 115.261211]],
    '尉氏县': [[34.195708, 113.871252], [34.618826, 114.437401]],
    '杞县': [[34.224362, 114.603486], [34.763910, 114.931119]],
    '祥符区': [[34.509519, 114.140056], [34.923018, 114.728261]],
    '禹王台区': [[34.701852, 114.316386], [34.785142, 114.443284]],
    '通许县': [[34.261085, 114.303372], [34.592257, 114.645476]],
    '顺河回族区': [[34.758807, 114.349912], [34.857390, 114.500633]],
    '鼓楼区': [[34.678461, 114.245458], [34.801400, 114.363040]],
    '龙亭区': [[34.702504, 114.111291], [34.940690, 114.428343]]
};
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
      :ndvidata="ndviData"
      :boundsDict="boundsDict"
      :yearindex="yearIndex"
      :mapConfig="mapConfig"
      :resetTrigger="resetTrigger"
      @selectDistrict="(e:string)=>{
      selectedDistrict = e
      console.log('选择区县：', e)
    }"
    />
    <DataPanel
      :selectedDistrict="selectedDistrict"
      :ndviData="ndviData"
      :currentYear="yearIndex + 2000"
      :panelOpen="ispanelOpen"
      @closePanel="ispanelOpen = false"
    />
    <TimeBar @change="(e)=>{yearIndex = e}"/>
    <SettingPanel 
      ref="settingpanel"
      @close="isshowsetting = false"
      v-show="isshowsetting"
    />
    
  </div>
</template>

