<template>
  <div 
    id="dataPanel" 
    class="glass-dark fixed  pb-12 rounded-2xl overflow-y-auto panel-transition z-1000"
    :class="[
      { 'translate-x-full opacity-0': !panelOpen },
      {'right-0 w-90 h-full' : !isExpanded},
      {'right-0 left-0 top-0 bottom-0 m-auto w-[80%] h-[80%]' : isExpanded}
    ]"
    
  >
    <div class="p-6">
      <!-- 标题 + 关闭按钮 -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-green-300">数据可视化</h2>

        <div class="flex items-center gap-3">
          
          <button 
            @click="()=> {
              isExpanded = !isExpanded
              if (isExpanded) {
                switchView('line')
              }else{
                switchView('table')
              }}" 
            class="text-white/70 hover:text-white transition-colors p-1"
            title="展开/收起面板"
          >
            <!-- 动态图标：展开（fa-expand）/ 收起（fa-compress） -->
            <i class="fas" :class="isExpanded ? 'fa-compress' : 'fa-expand'"></i>
          </button>

          <button 
            @click="handleClosePanel" 
            class="text-white/70 hover:text-white transition-colors"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div class="flex space-x-4">
        <div class="flex-col flex-2">
          <!-- 视图切换按钮 -->
          <div class="flex space-x-2 mb-6 text-md">
            <button v-show="!isExpanded"
              @click="switchView('table')"
              class="flex-1 py-2 px-4 rounded-lg transition-all"
              :class="{ 'bg-primary text-white': currentView === 'table', 'bg-gray-700/50 hover:bg-gray-700/70': currentView !== 'table' }"
            >
              <i class="fas fa-table mr-2"></i>表格
            </button>
            <button 
              @click="switchView('line')"
              class="flex-1 py-2 px-4 rounded-lg transition-all"
              :class="{ 'bg-primary text-white': currentView === 'line', 'bg-gray-700/50 hover:bg-gray-700/70': currentView !== 'line' }"
            >
              <i class="fas fa-chart-line mr-2"></i>折线图
            </button>
            <button 
              @click="switchView('bar')"
              class="flex-1 py-2 px-4 rounded-lg transition-all"
              :class="{ 'bg-primary text-white': currentView === 'bar', 'bg-gray-700/50 hover:bg-gray-700/70': currentView !== 'bar' }"
            >
              <i class="fas fa-chart-bar mr-2"></i>柱状图
            </button>
          </div>

          <!-- 数据状态显示 -->
          <div v-show="!isExpanded" class="mb-6 p-4 glass-dark rounded-lg">
            <div 
              class="flex items-center space-x-2"
              v-show="!selectedDistrict"
            >
              <i class="fas fa-globe text-primary"></i>
              <span>全局视图：显示所有区县数据</span>
            </div>
            <div 
              class="flex items-center space-x-2"
              v-show="selectedDistrict"
            >
              <i class="fas fa-map-marker-alt text-primary"></i>
              <span>区县视图：<span class="text-primary">{{ selectedDistrict }}</span></span>
            </div>
          </div>

          <!-- 可视化内容区域 -->
          <div id="visualizationContent">
            <!-- 表格视图 -->
            <div v-show="currentView === 'table'" class="table-container max-h-[300px]">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-white/10">
                    <th class="text-left py-3 px-2 text-green-400 font-semibold">
                      {{ !selectedDistrict ? '区县' : '年份' }}
                    </th>
                    <th class="text-right py-3 px-2 text-green-400 font-semibold">NDVI均值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(item, index) in tableData" 
                    :key="index" 
                    class="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td class="py-3 px-2">{{ item.label }}</td>
                    <td class="py-3 px-2 text-right font-medium">{{ item.value?.toFixed(4)}}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 折线图视图 -->
            <div v-show="currentView === 'line'" class="chart-container h-64">
              <canvas ref="lineChartRef"></canvas>
            </div>

            <!-- 柱状图视图 -->
            <div v-show="currentView === 'bar'" class="chart-container h-64">
              <canvas ref="barChartRef"></canvas>
            </div>
          </div>

          <!-- 统计信息卡片 -->
          <div class="mt-6 grid grid-cols-2 gap-4">
            <div class="p-4 glass-dark rounded-lg card-hover">
              <div class="text-white/60 text-sm">最高NDVI</div>
              <div class="text-2xl font-bold text-primary">{{ stats.maxValue?.toFixed(4) || 'N/A' }}</div>
              <div class="text-xs text-white/70">{{ stats.maxLabel }}</div>
            </div>
            <div class="p-4 glass-dark rounded-lg card-hover">
              <div class="text-white/60 text-sm">最低NDVI</div>
              <div class="text-2xl font-bold text-primary">{{ stats.minValue?.toFixed(4) || 'N/A' }}</div>
              <div class="text-xs text-white/70">{{ stats.minLabel }}</div>
            </div>
          </div>
        </div>      
      
        <!-- 展开状态右侧数字化面板 -->
      <div v-show="isExpanded" class="flex flex-col flex-1">
         <!-- 视图状态 -->
        <div class="mb-6 p-4 glass-dark rounded-lg">
            <div 
              class="flex items-center space-x-2"
              v-show="!selectedDistrict"
            >
              <i class="fas fa-globe text-primary"></i>
              <span>全局视图：显示所有区县数据</span>
            </div>
            <div 
              class="flex items-center space-x-2"
              v-show="selectedDistrict"
            >
              <i class="fas fa-map-marker-alt text-primary"></i>
              <span>区县视图：<span class="text-primary">{{ selectedDistrict }}</span></span>
            </div>
          </div>
        <!-- 表单 -->
        <div class="table-container max-h-[78%]">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-white/10">
                    <th class="text-left py-3 px-2 text-green-400 font-semibold">
                      {{ !selectedDistrict ? '区县' : '年份' }}
                    </th>
                    <th class="text-right py-3 px-2 text-green-400 font-semibold">NDVI均值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(item, index) in tableData" 
                    :key="index" 
                    class="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td class="py-3 px-2">{{ item.label }}</td>
                    <td class="py-3 px-2 text-right font-medium">{{ item.value?.toFixed(4)}}</td>
                  </tr>
                </tbody>
              </table>
            </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, inject } from 'vue';
import type { Chart as ChartInstance} from 'chart.js';
import {ndviData} from '@/data/ndvidata';
import { getTableData, getStat, getLineChart, getBarChart } from '@/hooks/chartTools';



// ========== Props定义（移除years/colors） ==========


interface Props {
  panelOpen: boolean; // 面板是否打开
}

// 接收外部Props
const props = defineProps<Props>();

// 定义Emits
const emit = defineEmits<{
  closePanel: []; // 关闭面板
}>();

// 响应式变量
const currentView = ref<'table' | 'line' | 'bar'>('table'); // 当前视图类型
const lineChartRef = ref<HTMLCanvasElement | null>(null); // 折线图DOM引用
const barChartRef = ref<HTMLCanvasElement | null>(null); // 柱状图DOM引用
const lineChartInstance = ref<ChartInstance | null>(null); // 折线图实例
const barChartInstance = ref<ChartInstance | null>(null); // 柱状图实例
const isExpanded = ref(false); // 面板是否展开

// ========== 方法：视图切换 ==========
const switchView = (view: 'table' | 'line' | 'bar') => {
  currentView.value = view;
  // 切换视图后更新对应图表
  if (view === 'line') {
    updateLineChart();
  } else if (view === 'bar') {
    updateBarChart();
  }
};



// ========== 核心计算属性：处理数据源 ==========
// 年份索引（currentYear - 2000）
const yearIndex = inject('yearIndex', ref<number>(0))
const startYear = inject('startYear', ref<number>(2000))
const selectedDistrict = inject('selectedDistrict', ref<string | null>(null))
const yearRange = inject('yearRange', ref<number>(10))

// 表格数据（当前区县/全局）
const tableData = computed(
  () => getTableData(selectedDistrict.value,startYear.value,yearIndex.value,yearRange.value,ndviData)
)
// 统计数据（最高/最低NDVI）
const stats = computed(
  () => getStat(selectedDistrict.value,startYear.value,yearIndex.value,yearRange.value,ndviData)
);


// 值得注意的是，因为tabledata是一个动态值，所以不需要考虑selected的不同情况，他自己就会变



// ========== 方法：更新图表 ==========
const updateLineChart = () => {
  // 销毁旧实例
  if (lineChartInstance.value) {
    lineChartInstance.value.destroy();
    lineChartInstance.value = null;
  }
  // 创建新实例
  lineChartInstance.value = getLineChart(lineChartRef.value!, tableData);
}

// 更新柱状图

const updateBarChart = () => {
  // 销毁旧实例
  if (barChartInstance.value) {
    barChartInstance.value.destroy();
    barChartInstance.value = null;
  }
  barChartInstance.value = getBarChart(barChartRef.value!, tableData);

}

const handleClosePanel = () => {
  emit('closePanel');
};

// ========== 监听：数据变化时更新图表 ==========
// 监听核心数据变化
const updateAllCharts = () => {
  if (currentView.value === 'line') {
    updateLineChart();
  } else if (currentView.value === 'bar') {
    updateBarChart();
  }
};

watch([() => yearIndex.value, () => selectedDistrict.value], updateAllCharts, {
  deep: true,
  immediate: true
});

// 监听面板打开状态，打开时更新图表
watch(() => props.panelOpen, (isOpen) => {
  if (isOpen && (currentView.value === 'line' || currentView.value === 'bar')) {
    setTimeout(updateAllCharts, 100); // 延迟确保DOM渲染完成
  }
});

// ========== 生命周期：初始化/销毁 ==========
onMounted(() => {
  // 初始化默认视图的图表
  if (currentView.value === 'line') {
    updateLineChart();
  } else if (currentView.value === 'bar') {
    updateBarChart();
  }
});

onUnmounted(() => {
  // 销毁图表实例，避免内存泄漏
  if (lineChartInstance.value) {
    lineChartInstance.value.destroy();
  }
  if (barChartInstance.value) {
    barChartInstance.value.destroy();
  }
});
</script>

