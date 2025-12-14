<template>
  <div 
    id="dataPanel" 
    class="glass-dark fixed right-0 w-90 h-full pb-12 rounded-2xl overflow-y-auto panel-transition transform translate-x-0 z-1000"
    :class="{ 'translate-x-full': !panelOpen }"
  >
    <div class="p-6">
      <!-- 标题 + 关闭按钮 -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-green-300">数据可视化</h2>
        <button 
          @click="handleClosePanel" 
          class="text-white/70 hover:text-white transition-colors"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- 视图切换按钮 -->
      <div class="flex space-x-2 mb-6 text-md">
        <button 
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

      <!-- 可视化内容区域 -->
      <div id="visualizationContent">
        <!-- 表格视图 -->
        <div v-show="currentView === 'table'" class="table-container">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted} from 'vue';
import Chart from 'chart.js/auto';
import type { Chart as ChartInstance, ChartConfiguration } from 'chart.js';

// ========== 固定常量（无需父组件传递） ==========
// 固定年份：2000~2010（共11年，和原版一致）
const years = Array.from({ length: 11 }, (_, i) => 2000 + i);
// 固定配色（和原版一致）
const colors = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#14b8a6', '#f43f5e', '#6366f1', '#84cc16', '#f59e0b'
];

// ========== Props定义（移除years/colors） ==========
interface NDVIDataItem {
  district: string;
  data: number[];
}

interface Props {
  ndviData: NDVIDataItem[];
  currentYear: number; // 当前选中年份（如2000）
  selectedDistrict: string | null; // 选中的区县（null=全局）
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

// ========== 核心计算属性：处理数据源 ==========
// 年份索引（currentYear - 2000）
const yearIndex = computed(() => props.currentYear - years[0]!);

// 表格数据（适配全局/区县视图）
interface TableItem {
  label: string;
  value: number;
}

const tableData = computed((): TableItem[] => {
  if (props.selectedDistrict) {
    const districtItem = props.ndviData.find(item => item.district === props.selectedDistrict);
    if (!districtItem) return []; // 无匹配区县返回空数组
    // 过滤掉value为NaN/undefined的项，并强转数字
    return years
      .map((year, index) => ({
        label: `${year}年`,
        value: Number(districtItem.data[index]) || 0 // 非数字转0
      }))
      .filter(item => !isNaN(item.value)); // 过滤无效数值
  } else {
    return props.ndviData
      .map(item => ({
        label: item.district,
        value: Number(item.data[yearIndex.value]) || 0
      }))
      .filter(item => !isNaN(item.value)) // 过滤无效数值
      .sort((a, b) => b.value - a.value);
  }
})
// 统计数据（最高/最低NDVI）
const stats = computed(() => {
  if (props.selectedDistrict) {
    // 区县视图：时间序列的最高/最低
    const districtItem = props.ndviData.find(item => item.district === props.selectedDistrict);
    if (!districtItem) {
      return { maxValue: 0, maxLabel: '无数据', minValue: 0, minLabel: '无数据' };
    }
    const maxValue = Math.max(...districtItem.data);
    const minValue = Math.min(...districtItem.data);
    const maxYear = years[districtItem.data.indexOf(maxValue)];
    const minYear = years[districtItem.data.indexOf(minValue)];
    return {
      maxValue,
      maxLabel: `${maxYear}年`,
      minValue,
      minLabel: `${minYear}年`
    };
  } else {
    // 全局视图：当前年份各区县的最高/最低
    const currentYearData = props.ndviData.map(item => ({
      district: item.district,
      value: item.data[yearIndex.value]
    })).sort((a, b) => b.value! - a.value!);
    if (currentYearData.length === 0) {
      return { maxValue: 0, maxLabel: '无数据', minValue: 0, minLabel: '无数据' };
    }
    const maxItem = currentYearData[0];
    const minItem = currentYearData[currentYearData.length - 1];
    return {
      maxValue: maxItem!.value,
      maxLabel: maxItem!.district,
      minValue: minItem!.value,
      minLabel: minItem!.district
    };
  }
});

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

// ========== 方法：更新图表 ==========
// 更新折线图
const updateLineChart = () => {
  // 销毁旧实例
  if (lineChartInstance.value) {
    lineChartInstance.value.destroy();
    lineChartInstance.value = null;
  }

  if (!lineChartRef.value) return;

  let chartConfig: ChartConfiguration;

  if (props.selectedDistrict) {
    // 区县视图：单区县时间序列折线图
    const districtItem = props.ndviData.find(item => item.district === props.selectedDistrict);
    if (!districtItem) return;

    chartConfig = {
      type: 'line',
      data: {
        labels: years, // 使用内部固定年份
        datasets: [{
          label: props.selectedDistrict,
          data: districtItem.data,
          borderColor: '#10b981',
          backgroundColor: '#10b98120',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          pointHoverRadius: 6
        }]
      }
    };
  } else {
    // 全局视图：所有区县时间序列折线图
    const datasets = props.ndviData.map((item, index) => ({
      label: item.district,
      data: item.data,
      borderColor: colors[index], // 使用内部固定配色
      backgroundColor: `${colors[index]}20`,
      borderWidth: 2,
      fill: false,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5
    }));

    chartConfig = {
      type: 'line',
      data: {
        labels: years, // 使用内部固定年份
        datasets
      }
    };
  }

  // 通用配置
  chartConfig.options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: props.selectedDistrict ? false : true,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          boxWidth: 12,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(16, 185, 129, 0.5)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 0.2,
        max: 0.4,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
      },
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
      }
    },
    animation: { duration: 500, easing: 'easeOutQuart' }
  };

  // 创建新实例
  lineChartInstance.value = new Chart(lineChartRef.value, chartConfig);
};

// 更新柱状图
const updateBarChart = () => {
  // 销毁旧实例
  if (barChartInstance.value) {
    barChartInstance.value.destroy();
    barChartInstance.value = null;
  }

  if (!barChartRef.value) return;

  let chartConfig: ChartConfiguration;

  if (props.selectedDistrict) {
    // 区县视图：单区县时间序列柱状图
    const districtItem = props.ndviData.find(item => item.district === props.selectedDistrict);
    if (!districtItem) return;

    chartConfig = {
      type: 'bar',
      data: {
        labels: years, // 使用内部固定年份
        datasets: [{
          label: 'NDVI值',
          data: districtItem.data,
          backgroundColor: '#10b981',
          borderColor: '#059669',
          borderWidth: 1,
          borderRadius: 4
        }]
      }
    };
  } else {
    // 全局视图：当前年份各区县柱状图
    const currentYearData = props.ndviData
    .map(item => ({
      district: item.district,
      // 核心修复1：非数字/undefined转0，确保value是数字
      value: Number(item.data[yearIndex.value]) || 0 
    }))
    // 核心修复2：过滤掉value为NaN的无效项（兜底后实际不会有，但防极端情况）
    .filter(item => !isNaN(item.value)) 
    .sort((a, b) => b.value - a.value);

    chartConfig = {
      type: 'bar',
      data: {
        labels: currentYearData.map(item => item.district),
        datasets: [{
          label: 'NDVI值',
          data: currentYearData.map(item => item.value),
          backgroundColor: colors.slice(0, currentYearData.length), // 使用内部固定配色
          borderColor: colors.slice(0, currentYearData.length),
          borderWidth: 1,
          borderRadius: 4
        }]
      }
    };
  }

  // 通用配置
  chartConfig.options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(16, 185, 129, 0.5)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 0.2,
        max: 0.4,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
      }
    },
    animation: { duration: 500, easing: 'easeOutQuart' }
  };

  // 创建新实例
  barChartInstance.value = new Chart(barChartRef.value, chartConfig);
};

// ========== 方法：关闭面板 ==========
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

watch([() => props.currentYear, () => props.selectedDistrict, () => props.ndviData], updateAllCharts, {
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

