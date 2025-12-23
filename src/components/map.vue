<template>
  <div id="map"></div>
</template>

<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { onMounted, ref, watch, computed, inject } from 'vue'
import 'leaflet.chinatmsproviders'
import { getGeojsonLayer, getIndexColor,getHTMLMarker,getGaoDeMapLayer } from '@/hooks/mapTools'
import { ndviData } from '@/data/ndvidata'
import { boundsDict } from '@/data/boundsdict'

const emit = defineEmits(['selectDistrict'])
const yearIndex = inject('yearIndex', ref<number>(0))

// 🔥 1. 扩展Props，加入mapConfig（定义完整类型）
const props = defineProps<{
  resetTrigger: boolean;
  mapConfig: {
    startRGB: string; // 起始颜色（rgb字符串）
    endRGB: string;   // 结束颜色（rgb字符串）
    opacityVal: number; // 填充不透明度
    gammaVal: number;   // Gamma校正值
    ndviMin: number;    // NDVI最小值
    ndviMax: number;    // NDVI最大值
    layerType: string;  // 图层类型（fill/tiff，暂用fill）
    showLabel: boolean; // 是否显示标注（弹窗）
  };
}>();


// 🔥 4. 计算属性：获取当前NDVI范围（从mapConfig取，替代固定值）
const ndviMin = computed(() => props.mapConfig.ndviMin);
const ndviMax = computed(() => props.mapConfig.ndviMax);
const fillOpacity = computed(() => props.mapConfig.opacityVal);
const gammaVal = computed(() => props.mapConfig.gammaVal);

// 修正：处理props可能为undefined的情况，避免报错
const ndvidatamap = computed(() => {
  if (!ndviData) return {};
  return ndviData.reduce((acc: Record<string, number[]>, item) => {
    acc[item.district] = item.data;
    return acc;
  }, {});
});


/**
 * 🔥 5. 适配mapConfig的颜色映射逻辑：
 * 1. Gamma校正 → 2. 钳位NDVI → 3. 归一化 → 4. 插值计算RGB
 */
const getNdviColor = computed(() => {
 return (index: number) => getIndexColor(index, {
    max: ndviMax.value,
    min: ndviMin.value,
    gamma: gammaVal.value,
    platte: [props.mapConfig.startRGB, props.mapConfig.endRGB],
  });
});

/**
 * 安全获取NDVI值：处理区县不存在/索引越界的情况
 */
const getNdviVal = (county_name: string, year: number = yearIndex.value) => {
  if (!ndvidatamap.value) {
    console.warn(`未找到${county_name}的geojson`);
    return 0;}
  const data = ndvidatamap.value[county_name];
  if (!data || year < 0 || year >= data.length) {
    console.warn(`未找到${county_name}的NDVI数据，使用默认值0`);
    return 0;
  }
  return data[year];
};

// 基础样式（图层类型暂用fill，可扩展tiff逻辑）
const city_bounds_style = {
  color: 'rgb(0, 200, 0)', // 城市边框深绿
  weight: 5,
  opacity: 1,
  fillOpacity: 0, // 从配置取不透明度
};

const county_bounds_style = {
  color: '#000000', // 区县边框深灰
  dashArray: '3,5',
  weight: 2,
  opacity: 1,
  fillColor: '#FFFFFF',
  fillOpacity: 0
};


// 🔥 6. 优化交互逻辑（根据showLabel控制弹窗显示）
function onEachFeature(layer: any) {
  const feature = layer.feature;
  if (feature?.properties?.name && props.mapConfig.showLabel) {
    // 绑定弹窗（显示标注）
    layer.bindPopup(`${feature.properties.name}`);
    
    // 鼠标悬停效果
    layer.on('mouseover', function(this: any) {
      const domEl = this.getElement();
      if (domEl) {
        this.setStyle({
          weight: 3,
          color: '#ffffff', // 悬停边框深绿
        });
        domEl.style.transition = 'all 0.3s ease';
        domEl.style.transform = 'scale(1.03)';
        domEl.style.boxShadow = '0 0 15px rgba(0, 120, 0, 0.5)';
        domEl.style.transformOrigin = 'center center';
        domEl.style.zIndex = '100';
      }
    });

    // 鼠标离开恢复原状
    layer.on('mouseout', function(this: any) {
      const domEl = this.getElement();
      if (domEl) {
        this.setStyle(county_bounds_style);
        domEl.style.transform = 'scale(1)';
        domEl.style.boxShadow = 'none';
        domEl.style.zIndex = '1';
      }
    });
    layer.on('dblclick', function(this: any) {
      // 双击认为是选中该区县
      // 触发父组件事件，更新选中区县
      console.log('双击区县：', this.feature.properties.name);
      emit('selectDistrict', this.feature.properties.name);
    }) 
  }
}

// 🔥 7. 保存地图和图层实例（用于后续更新）
const viewcenter = ref<[number, number]>([34.55, 114.7]); // 开封市中心经纬度
const mapInstance = ref<L.Map | null>(null);
const cityLayerInstance = ref<L.GeoJSON | null>(null);
const countyLayerInstance = ref<L.GeoJSON | null>(null);
// 2. 标注相关响应式变量（对应原生全局变量）
const districtLabels = ref<L.LayerGroup>(L.layerGroup()); // 存储标注图层组


// 逻辑，如果showlabel为false,添加标注图层组到地图，再清空标注图层组
// 如果showLabel为true,添加标注图层组到地图，添加标注到图层组
const updateDistrictLabels = async (
  mapInstance: L.Map | null,
  layerGroup: L.LayerGroup,
  showLabel: boolean,
) => {
    // 1. 检查地图实例是否存在
    if (!mapInstance) {
    console.warn('地图实例未初始化，跳过标注更新');
    return;
    }
    // 2. 检查图层组是否存在，如果不存在应该直接报错，而不是反复创建新的图层组
    if (!layerGroup) {
      throw new Error('图层组不存在，无法更新标注');
    }
    // 3. 检查地图是否已添加图层组，默认是没有加上去的,加上去之后不会被重复添加和移除
    if (!mapInstance.hasLayer(layerGroup)) {
      mapInstance.addLayer(layerGroup);
      console.log('地图已添加标注图层组，所以按道理不刷新这条消息只会出现一次')
    }
    // 3. 在标注开关关闭时，清空标注 + 移除图层组,也就是当showLabel为true时，不执行这一步
    if (showLabel == false) {
      layerGroup.clearLayers();
      // 兜底移除图层组，确保不会重复添加
      return;
    }

  // 首先不管有没有开关，都清空旧标注
  layerGroup.clearLayers();
  const targetDistricts = Object.keys(boundsDict); // 如需支持单区县选中，可后续扩展
   
  targetDistricts.forEach(district => {
    const districtInfo = boundsDict[district]!;
    const [minLat, minLng] = districtInfo[0];
    const [maxLat, maxLng] = districtInfo[1];
    if (!minLat || !maxLat || !minLng || !maxLng) {
      console.warn(`区县${district}边界数据缺失，跳过标注`);
      return;
    }
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const center = [centerLat, centerLng];

    // 获取当前年份的 NDVI 值
    const ndviItem = ndviData.find(item => item.district === district);
    const ndviValue = ndviItem?.data[yearIndex.value] || 0;

    // 复刻原生标注 HTML 样式
    const labelHtml = `
      <div class="glass-dark px-3 py-2 rounded-lg text-sm text-center shadow-lg border border-primary/20 
                  bg-opacity-90 backdrop-blur-sm z-50">
        <div class="font-bold text-primary">${district}</div>
        <div class="text-xs text-white/90">NDVI: ${ndviValue? ndviValue.toFixed(4) : 'NaN'}</div>
      </div>
    `;

    // 创建自定义 div 标记
   
    getHTMLMarker(center as L.LatLngExpression,labelHtml).addTo(layerGroup);
  });
};


onMounted(async () => {

  // 初始化地图
  const map = L.map('map', {
    zoomControl: false,
    doubleClickZoom: false,
    attributionControl: false
  }).setView(viewcenter.value, 9);
  mapInstance.value = map;

  // 加载图层
  const city_layer = await getGeojsonLayer('开封市.geojson',city_bounds_style);
  const county_layer = await getGeojsonLayer('开封市.geojson',county_bounds_style);
  cityLayerInstance.value = city_layer;
  countyLayerInstance.value = county_layer;
  
  // 初始化城市图层颜色
  updateCityLayerStyle();

  // 初始化区县图层交互
  county_layer.eachLayer((layer: any) => {
    onEachFeature(layer);
  });

  // 添加高德地图图层
  getGaoDeMapLayer().addTo(map);
  
  
  // 添加图层到地图
  city_layer.addTo(map);
  county_layer.addTo(map);

});

// 🔥 8. 封装图层样式更新方法（复用）
const updateCityLayerStyle = () => {
    if (props.mapConfig.layerType === 'fill'){ 
    if (!mapInstance.value) return;
    
    updateDistrictLabels(mapInstance.value as L.Map,districtLabels.value as L.LayerGroup,props.mapConfig.showLabel );
    if (!cityLayerInstance.value) return;
    cityLayerInstance.value.eachLayer((layer: any) => {
        const name = layer.feature?.properties?.name;
        if (name) {
        layer.setStyle({
            fillOpacity: fillOpacity.value, // 从配置取不透明度
            fillColor: getNdviColor.value(getNdviVal(name)!) // 动态颜色
        });
        }
    });
    }
  };

// 🔥 9. 监听参数变化，实时更新
// 监听yearindex变化
watch(() => yearIndex.value, () => {
  updateCityLayerStyle();
}, { immediate: true });

// 监听mapConfig变化（核心：颜色/透明度/NDVI范围等）
watch(() => props.mapConfig, () => {
  updateCityLayerStyle();
  // 重新绑定区县弹窗（如果showLabel变化）
  if (countyLayerInstance.value) {
    countyLayerInstance.value.eachLayer((layer: any) => {
      onEachFeature(layer);
    });
  }
}, { deep: true }); // 深度监听配置对象

watch(() => props.resetTrigger, () => {
    mapInstance.value!.setView(viewcenter.value, 9);
})


</script>

<style scoped>
#map {
  height: 100%;
  width: 100%;
}

</style>