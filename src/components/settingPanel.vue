<template>
  <!-- 参数设置面板 -->
  <div 
    id="settingPanel" 
    class="glass-dark fixed right-20 top-20 rounded-2xl p-6 z-1000 w-96 max-h-[80vh] overflow-y-auto shadow-lg border border-white/15"
  >
    <!-- 面板标题+关闭按钮 -->
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold text-green-300">图层可视化参数</h3>
      <button @click="emit('close')" class="text-white/70 hover:text-white transition-colors">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- 图层类型选择（区分填充层/TIFF层） -->
    <div class="mb-4">
      <label class="block text-sm text-white/80 mb-1">调整对象</label>
      <select v-model="layerType" class="w-full bg-gray-800 rounded px-2 py-1 text-white border border-gray-700">
        <option value="fill">填充图层（精简模式）</option>
        <option value="tiff">TIFF图层（详细模式）</option>
      </select>
    </div>

    <!-- 参数输入项 -->
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label class="block text-sm text-white/80 mb-1">NDVI最小值</label>
        <input 
          type="number" 
          v-model.number="ndviMin" 
          step="0.01" 
          min="0" 
          max="1"
          class="w-full bg-gray-800 rounded px-2 py-1 text-white border border-gray-700"
        >
      </div>
      <div>
        <label class="block text-sm text-white/80 mb-1">NDVI最大值</label>
        <input 
          type="number" 
          v-model.number="ndviMax" 
          step="0.01" 
          min="0" 
          max="1"
          class="w-full bg-gray-800 rounded px-2 py-1 text-white border border-gray-700"
        >
      </div>
      <div>
        <label class="block text-sm text-white/80 mb-1">Gamma校正</label>
        <input 
          type="number" 
          v-model.number="gammaVal" 
          step="0.1" 
          min="0.1" 
          max="3"
          class="w-full bg-gray-800 rounded px-2 py-1 text-white border border-gray-700"
        >
      </div>
      <div>
        <label class="block text-sm text-white/80 mb-1">不透明度</label>
        <input 
          type="range" 
          v-model.number="opacityVal" 
          min="0" 
          max="1" 
          step="0.1" 
          class="w-full mt-2"
        >
        <span class="text-xs text-white/60">{{ (opacityVal * 100).toFixed(0) }}%</span>
      </div>
    </div>

    <!-- 两段RGB过渡色调色板（核心修改） -->
    <div class="mb-6">
      <h2 class="block text-lg text-white/80 mb-2 font-medium">调色板</h2>
      
      <!-- 起始颜色 -->
      <div class="mb-3 border-b border-white/10 pb-3">
        <label class="block text-xs text-green-300 mb-2">▶ 起始颜色（低NDVI值）</label>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="block text-xs text-white/60 mb-1">R (0-255)</label>
            <input 
              type="number" 
              v-model.number="startR" 
              min="0" 
              max="255" 
              step="1"
              class="w-full bg-gray-800 rounded px-2 py-1 text-white border border-gray-700 text-sm"
            >
          </div>
          <div>
            <label class="block text-xs text-white/60 mb-1">G (0-255)</label>
            <input 
              type="number" 
              v-model.number="startG" 
              min="0" 
              max="255" 
              step="1"
              class="w-full bg-gray-800 rounded px-2 py-1 text-white border border-gray-700 text-sm"
            >
          </div>
          <div>
            <label class="block text-xs text-white/60 mb-1">B (0-255)</label>
            <input 
              type="number" 
              v-model.number="startB" 
              min="0" 
              max="255" 
              step="1"
              class="w-full bg-gray-800 rounded px-2 py-1 text-white border border-gray-700 text-sm"
            >
          </div>
        </div>
        <!-- 起始颜色预览 -->
        <div class="mt-2 flex items-center">
          <div 
            class="w-8 h-8 rounded-full mr-2"
            :style="{ backgroundColor: `rgb(${startR}, ${startG}, ${startB})` }"
          ></div>
          <span class="text-xs text-white/70">rgb({{ startR }}, {{ startG }}, {{ startB }})</span>
        </div>
      </div>

      <!-- 结束颜色 -->
      <div class="mb-2">
        <label class="block text-xs text-green-300 mb-2">▶ 结束颜色（高NDVI值）</label>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="block text-xs text-white/60 mb-1">R (0-255)</label>
            <input 
              type="number" 
              v-model.number="endR" 
              min="0" 
              max="255" 
              step="1"
              class="w-full bg-gray-800 rounded px-2 py-1 text-white border border-gray-700 text-sm"
            >
          </div>
          <div>
            <label class="block text-xs text-white/60 mb-1">G (0-255)</label>
            <input 
              type="number" 
              v-model.number="endG" 
              min="0" 
              max="255" 
              step="1"
              class="w-full bg-gray-800 rounded px-2 py-1 text-white border border-gray-700 text-sm"
            >
          </div>
          <div>
            <label class="block text-xs text-white/60 mb-1">B (0-255)</label>
            <input 
              type="number" 
              v-model.number="endB" 
              min="0" 
              max="255" 
              step="1"
              class="w-full bg-gray-800 rounded px-2 py-1 text-white border border-gray-700 text-sm"
            >
          </div>
        </div>
        <!-- 结束颜色预览 -->
        <div class="mt-2 flex items-center">
          <div 
            class="w-8 h-8 rounded-full mr-2"
            :style="{ backgroundColor: `rgb(${endR}, ${endG}, ${endB})` }"
          ></div>
          <span class="text-xs text-white/70">rgb({{ endR }}, {{ endG }}, {{ endB }})</span>
        </div>
      </div>

      <!-- 过渡效果预览条 -->
      <div class="mt-3 h-6 rounded-md" :style="{
        background: `linear-gradient(to right, rgb(${startR}, ${startG}, ${startB}), rgb(${endR}, ${endG}, ${endB}))`
      }"></div>
      <p class="text-xs text-white/50 mt-1 text-center">NDVI值从低到高的颜色过渡预览</p>
    </div>

    <!-- 标注开关区域 -->
    <div class="mb-6 pt-4 border-t border-white/10">
      <label class="flex items-center justify-between text-sm text-white/80">
        <span>显示区县名+NDVI值</span>
        <input 
          type="checkbox" 
          v-model="showLabel" 
          class="w-5 h-5 accent-primary rounded"
        >
      </label>
    </div>

    <!-- 移除应用参数按钮 -->
  </div>
</template>

<script setup lang="ts">
import { ref, watch} from 'vue';

const emit = defineEmits(['close'])

// 3. 核心响应式数据
// 基础参数
const layerType = ref('fill');
const ndviMin = ref(0.2);
const ndviMax = ref(0.4);
const gammaVal = ref(1.0);
const opacityVal = ref(1);
const showLabel = ref(true);

// 两段RGB过渡色（默认浅绿→深绿）
const startR = ref(230); // 起始R
const startG = ref(255); // 起始G
const startB = ref(237); // 起始B
const endR = ref(4);     // 结束R
const endG = ref(120);   // 结束G
const endB = ref(87);    // 结束B



// 5. 监听RGB值变化（可选：限制0-255范围，防止输入越界）
watch([startR, startG, startB, endR, endG, endB], () => {
  [startR, startG, startB, endR, endG, endB].forEach(refVal => {
    if (refVal.value < 0) refVal.value = 0;
    if (refVal.value > 255) refVal.value = 255;
  });
});


// 可选：暴露响应式数据给父组件（如果需要父组件获取颜色参数）
defineExpose({
  ndviMin,
  ndviMax,
  gammaVal,
  opacityVal,
  showLabel,
  startR,
  startG,
  startB,
  endR,
  endG,
  endB,
  layerType
});
</script>

<style scoped>
/* 可选：优化输入框聚焦样式 */
input:focus {
  outline: 1px solid #10b981;
  box-shadow: 0 0 4px rgba(16, 185, 129, 0.3);
}
</style>