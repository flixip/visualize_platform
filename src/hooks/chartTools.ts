import type {Ref} from 'vue'
import { Chart,LinearScale,CategoryScale, LineController, LineElement,    
  PointElement,BarController,BarElement,Title,Tooltip,
  Legend } from 'chart.js';


Chart.register(LinearScale,CategoryScale,LineController,LineElement,PointElement,BarController,BarElement,Title,Tooltip,Legend);

// 固定配色
const colors = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#14b8a6', '#f43f5e', '#6366f1', '#84cc16', '#f59e0b'
];


/**
 * 获取表格数据（根据区县选择和当前年份）
 * @param selectedDistrict - 选中的区县（null表示全局）
 * @param startYear - 开始年份（2000）
 * @param curYearIndex - 当前年份的索引（0~10）
 * @param data - 原始NDVI数据数组
 * @returns 表格数据项数组
 * 1. 无区县选择：返回[{区县名，NDVI值}，{区县名，NDVI值}，...]
 * 2. 有区县选择：返回[{年份，NDVI值},{年份，NDVI值},...]
 * 
 */
export const getTableData = (
  selectedDistrict: string | null,
  startYear: number,
  curYearIndex: number,
  yearRange: number,
  data: IndexDataItem[]
): TableItem[] => {
    if (!data[0] || data[0].data.length === 0) throw new Error('数据格式错误：缺少NDVI数据');
   
    const years = Array.from({ length: yearRange }, (_, i) => startYear + i);
    // 无区县选择，获取当前年份的所有区县的数据
    if (!selectedDistrict){
        return data.map(item => ({                     // 锁定年份
        label: item.district,                          // 区县名称
        value: Number(item.data[curYearIndex]) || 0    // NDVI值
    }));
  } // 如果有区县选择，获取选择区县所有年份的均值，其实就是对应的值
   else {
    const districtItem = data.find(item => item.district === selectedDistrict);
    if (!districtItem) throw new Error('数据格式错误：没有找到该区县的NDVI数据');
    return districtItem.data.slice(0,yearRange).map((value, index) => ({                      // 锁定区县
      label: `${years[index]}年`,                                          // 年份
      value: Number(value || 0)                                            // NDVI值  
    }));
  }
}


/**
 * 获取统计数据（根据区县选择和当前年份）
 * @param selectedDistrict - 选中的区县（null表示全局）
 * @param startYear - 开始年份（2000）
 * @param curYearIndex - 当前年份的索引（0~10）
 * @param data - 原始NDVI数据数组
 * @returns 统计数据对象（包含最大最小值和对应的标签）
 */
export const getStat = (
  selectedDistrict: string | null,
  startYear: number,
  curYearIndex: number,
  yearRange: number,
  data: IndexDataItem[]
) => {
  if(!data[0] || data[0].data.length === 0) throw new Error('数据格式错误：缺少NDVI数据');
  const years = Array.from({ length: yearRange }, (_, i) => startYear + i);
  // 区县视图下统计选择区县的时间序列上的最大最小值
 if (selectedDistrict) {
   const districtItem = data.find(item => item.district === selectedDistrict);
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
 } // 全局视图下统计当前年份所有区县的最大最小值
  else {
    const maxValue = Math.max(...data.map(item => item.data[curYearIndex] || 0));
    const minValue = Math.min(...data.map(item => item.data[curYearIndex] || 0));
    const maxDistrict = data.find(item => item.data[curYearIndex] === maxValue)?.district || '无数据';
    const minDistrict = data.find(item => item.data[curYearIndex] === minValue)?.district || '无数据';
    return {
      maxValue,
      maxLabel: maxDistrict,
      minValue,
      minLabel: minDistrict
    };
  }

}

/**
 * 获取折线图（根据区县选择和当前年份）
 * @param canva - 目标Canvas元素
 * @param tableData - 表格数据项数组（Ref）--通过方法getTableData获得
 * @returns Chart.js 折线图实例
 */
export const getLineChart = (
  canva: HTMLCanvasElement,
  tableData: Ref<TableItem[]>
) => {
  if (!tableData.value[0] || tableData.value.length === 0) throw new Error('数据格式错误：缺少NDVI数据');
  if (!canva) throw new Error('请提供有效Canvas element');
    return new Chart(canva,   {
      type: 'line',
      data: {
        labels: tableData.value.map(item => item.label),  // x轴标签（年份）
        datasets: [{
          label: 'NDVI一览图',                        // 这个是数据集名称
          data: tableData.value.map(item => item.value),        // 这个是对应的值
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
      },
      options :{
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, 
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
        min: 0.0,
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
  }

    })
}

/**
 * 获取柱状图（根据区县选择和当前年份）
 * @param canva - 目标Canvas元素
 * @param tableData - 表格数据项数组（Ref）--通过方法getTableData获得
 * @returns Chart.js 柱状图实例
 */
export const getBarChart = (
  canva: HTMLCanvasElement,
  tableData: Ref<TableItem[]>
) => {
  if (!tableData.value[0] || tableData.value.length === 0) throw new Error('数据格式错误：缺少NDVI数据');
  if (!canva) throw new Error('请提供有效Canvas element');
  return new Chart(canva, {
    type: 'bar',
    data: {
      labels: tableData.value.map(item => item.label),  // x轴标签（区县名称）
      datasets: [{
        label: 'NDVI值',
        data: tableData.value.map(item => item.value),
        backgroundColor: colors.slice(0, tableData.value.length), // 使用内部固定配色
        borderColor: colors.slice(0, tableData.value.length),
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options:{
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
        min: 0.0,
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
  }
  })
}