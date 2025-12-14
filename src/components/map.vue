<template>
  <div id="map"></div>
</template>

<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { onMounted, ref, watch, computed } from 'vue'
import 'leaflet.chinatmsproviders'



const emit = defineEmits(['selectDistrict'])

// 🔥 1. 扩展Props，加入mapConfig（定义完整类型）
const props = defineProps<{
  ndvidata: Array<{
    district: string;
    data: number[];
  }>;
  resetTrigger: boolean;
  yearindex: number;
  boundsDict: Record<string, [number[], number[]]>; // 区县边界字典
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

// 🔥 2. 解析RGB字符串为数值（比如 "rgb(230,255,237)" → {r:230,g:255,b:237}）
const parseRGB = (rgbStr: string) => {
  const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return { r: 220, g: 245, b: 220 }; // 解析失败用默认浅绿
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3])
  };
};

// 🔥 3. 响应式解析起始/结束颜色（依赖mapConfig）
const startColor = computed(() => parseRGB(props.mapConfig.startRGB));
const endColor = computed(() => parseRGB(props.mapConfig.endRGB));

// 🔥 4. 计算属性：获取当前NDVI范围（从mapConfig取，替代固定值）
const ndviMin = computed(() => props.mapConfig.ndviMin);
const ndviMax = computed(() => props.mapConfig.ndviMax);
const fillOpacity = computed(() => props.mapConfig.opacityVal);
const gammaVal = computed(() => props.mapConfig.gammaVal);

// 修正：处理props可能为undefined的情况，避免报错
const ndvidatamap = computed(() => {
  if (!props.ndvidata) return {};
  return props.ndvidata.reduce((acc: Record<string, number[]>, item) => {
    acc[item.district] = item.data;
    return acc;
  }, {});
});


/**
 * 🔥 5. 适配mapConfig的颜色映射逻辑：
 * 1. Gamma校正 → 2. 钳位NDVI → 3. 归一化 → 4. 插值计算RGB
 */
const getNdviColor = computed(() => {
  return (ndvi: number) => {
    // Step1: Gamma校正（调整对比度）
    const correctedNdvi = Math.pow(Math.max(0, ndvi), gammaVal.value);
    
    // Step2: 钳位NDVI到配置的范围
    const clampedNdvi = Math.max(ndviMin.value, Math.min(ndviMax.value, correctedNdvi));
    
    // Step3: 归一化到[0,1]
    const normalized = (clampedNdvi - ndviMin.value) / (ndviMax.value - ndviMin.value) || 0; // 避免除以0
    
    // Step4: 插值计算RGB（从起始色到结束色）
    const r = Math.round(startColor.value.r * (1 - normalized) + endColor.value.r * normalized);
    const g = Math.round(startColor.value.g * (1 - normalized) + endColor.value.g * normalized);
    const b = Math.round(startColor.value.b * (1 - normalized) + endColor.value.b * normalized);
    
    return `rgb(${r},${g},${b})`;
  };
});

/**
 * 安全获取NDVI值：处理区县不存在/索引越界的情况
 */
const getNdviVal = (county_name: string, year: number = props.yearindex) => {
    if (!ndvidatamap.value) return (ndviMin.value + ndviMax.value) / 2;
  const data = ndvidatamap.value[county_name];
  if (!data || year < 0 || year >= data.length) {
    console.warn(`未找到${county_name}的NDVI数据，使用默认值`);
    return (ndviMin.value + ndviMax.value) / 2;
  }
  return data[year];
};

// 基础样式（图层类型暂用fill，可扩展tiff逻辑）
const city_style = computed(() => ({
  color: 'rgb(0, 200, 0)', // 城市边框深绿
  weight: 5,
  opacity: 1,
  fillOpacity: fillOpacity.value, // 从配置取不透明度
}));

const county_style = computed(() => ({
  color: '#000000', // 区县边框深灰
  dashArray: '3,5',
  weight: 2,
  opacity: 1,
  fillColor: '#FFFFFF',
  fillOpacity: 0
}));

const getGeojsonLayer = async (style: any, geojson_path: string = '开封市.geojson') => {
  return fetch(geojson_path)
    .then(response => {
      if (!response.ok) throw new Error(`请求失败: ${response.status}`);
      return response.json();
    })
    .then(geojsonData => {
      return L.geoJSON(geojsonData, { style });
    })
    .catch(error => {
      console.error('加载GeoJSON失败：', error);
      throw error;
    });
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
        this.setStyle(county_style.value);
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
const districtLabels = ref<L.LayerGroup | null>(null); // 存储标注图层组
const isLabelsAdded = ref<boolean>(false); // 标记是否已添加到地图

// 复刻原生 updateDistrictLabels 逻辑（适配 Vue）
const updateDistrictLabels = () => {
    console.log(props.mapConfig.showLabel)
    if (!mapInstance.value) {
    console.warn('地图实例未初始化，跳过标注更新');
    return;
  }
  if (!districtLabels.value) {
    districtLabels.value = L.layerGroup(); // 初始化标注图层组
  }

  // 1. 开关关闭：清空标注 + 移除图层组
  if (!props.mapConfig.showLabel) {
    districtLabels.value.clearLayers();
    if (isLabelsAdded.value) {
      mapInstance.value!.removeLayer(districtLabels.value as L.LayerGroup);
      isLabelsAdded.value = false;
    }
    return;
  }

  // 2. 开关打开：确保图层组挂载到地图
  if (!isLabelsAdded.value) {
    districtLabels.value!.addTo(mapInstance.value! as L.Map);
    isLabelsAdded.value = true;
  }

  // 3. 清空旧标注，重新生成
  districtLabels.value!.clearLayers();
  const yearIndex = props.yearindex;
  const targetDistricts = Object.keys(props.boundsDict); // 如需支持单区县选中，可后续扩展

  targetDistricts.forEach(district => {
    const districtInfo = props.boundsDict[district]!;
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
    const ndviItem = props.ndvidata.find(item => item.district === district);
    const ndviValue = ndviItem?.data[yearIndex] || 0;

    // 复刻原生标注 HTML 样式
    const labelHtml = `
      <div class="glass-dark px-3 py-2 rounded-lg text-sm text-center shadow-lg border border-primary/20 
                  bg-opacity-90 backdrop-blur-sm z-50">
        <div class="font-bold text-primary">${district}</div>
        <div class="text-xs text-white/90">NDVI: ${ndviValue.toFixed(4)}</div>
      </div>
    `;

    // 创建自定义 div 标记
    const labelIcon = L.divIcon({
      html: labelHtml,
      className: 'district-label',
      iconSize: [100, 50],
      iconAnchor: [50, 25]
    });

    // 添加标记到图层组（挂载到 vectorPane 确保置顶）
    
    L.marker(center as L.LatLngExpression, {
      icon: labelIcon,
      zIndexOffset: 1000
    }).addTo(districtLabels.value! as L.LayerGroup);
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
  districtLabels.value = L.layerGroup();
  const city_layer = await getGeojsonLayer(city_style.value);
  const county_layer = await getGeojsonLayer(county_style.value);
  cityLayerInstance.value = city_layer;
  countyLayerInstance.value = county_layer;
  
  // 初始化城市图层颜色
  updateCityLayerStyle();

  // 初始化区县图层交互
  county_layer.eachLayer((layer: any) => {
    onEachFeature(layer);
  });


    const normalm = L.tileLayer.chinaProvider('GaoDe.Normal.Map', {
    maxZoom: 18,
    minZoom: 5
});
  const imgm = L.tileLayer.chinaProvider('GaoDe.Satellite.Map', {
    maxZoom: 18,
    minZoom: 5
});
  const imga = L.tileLayer.chinaProvider('GaoDe.Satellite.Annotion', {
    maxZoom: 18,
    minZoom: 5
});


    L.control.layers({
        "地图": normalm,
        "影像": imgm
    },{
        "标注": imga
    }).addTo(map);
  // 添加图层到地图
  city_layer.addTo(map);
  county_layer.addTo(map);

});

// 🔥 8. 封装图层样式更新方法（复用）
const updateCityLayerStyle = () => {
    if (props.mapConfig.layerType === 'fill'){ 
    if (!mapInstance.value) return;
    updateDistrictLabels();
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
watch(() => props.yearindex, () => {
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
  height: 100vh;
  width: 100%;
}

/* 修复leaflet样式穿透问题 */
:deep(.leaflet-popup-content) {
  color: #333;
  font-size: 14px;
}

:deep(.leaflet-popup-tip) {
  background-color: #fff;
}
</style>