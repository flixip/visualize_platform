// 先补充缺失的类型定义（确保代码可运行）
type DistrictBounds = [[number, number], [number, number]];

import { ndviData } from './ndvidata';

/**
 * 递归遍历坐标，计算最小/最大经纬度（边界框BBox）
 */
function getCoordinatesBounds(coords: any[]): [number, number, number, number] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  const stack: any[] = [...coords];

  while (stack.length > 0) {
    const item = stack.pop();
    if (!Array.isArray(item)) continue;

    // 检查是否为经纬度点 [lng, lat]
    if (item.length === 2 && 
        typeof item[0] === 'number' && !isNaN(item[0]) &&
        typeof item[1] === 'number' && !isNaN(item[1])) {
      const [lng, lat] = item;
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    } else {
      stack.push(...item);
    }
  }

  return minLng === Infinity ? null : [minLng, minLat, maxLng, maxLat];
}

/**
 * 从单个GeoJSON中提取所有区县的边界（核心计算逻辑，无缓存）
 */
async function parseCityGeoJSON(): Promise<Record<string, DistrictBounds>> {
  try {
    // 加载唯一的开封市GeoJSON
    const response = await fetch('开封市.geojson'); // public目录下直接访问
    if (!response.ok) throw new Error(`加载GeoJSON失败: ${response.status}`);
    
    const geojson = await response.json();
    const boundsDict: Record<string, DistrictBounds> = {};

    // 假设GeoJSON是FeatureCollection，每个Feature对应一个区县
    if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
      geojson.features.forEach((feature: any) => {
        const districtName = feature.properties?.name; // 区县名称字段（需与ndviData中的district匹配）
        if (!districtName) return;

        // 计算该区县的边界
        const bbox = getCoordinatesBounds(feature.geometry?.coordinates);
        if (bbox) {
          const [minLng, minLat, maxLng, maxLat] = bbox;
          boundsDict[districtName] = [[minLat, minLng], [maxLat, maxLng]];
        }
      });
    }

    // 为ndviData中存在但GeoJSON中未找到的区县设置默认值
    ndviData.forEach(item => {
      if (!boundsDict[item.district]) {
        console.warn(`未找到${item.district}的边界数据，使用默认值`);
        boundsDict[item.district] = [[0, 0], [0, 0]];
      }
    });

    return boundsDict;
  } catch (error) {
    console.error('解析GeoJSON失败:', error);
    // 全量兜底
    return ndviData.reduce((acc, item) => {
      acc[item.district] = [[0, 0], [0, 0]];
      return acc;
    }, {} as Record<string, DistrictBounds>);
  }
}

// 核心：定义缓存变量（存储Promise，避免异步竞态）
let cachedBoundsPromise: Promise<Record<string, DistrictBounds>> | null = null;

/**
 * 生成边界字典（带缓存版本）
 * 首次调用：执行加载+计算，后续调用：直接返回缓存的Promise
 */
export const generateBoundsDict = async (): Promise<Record<string, DistrictBounds>> => {
  // 如果缓存不存在，执行解析并缓存Promise（关键：缓存Promise而非结果，避免多次并发调用重复请求）
  if (!cachedBoundsPromise) {
    console.log('缓存不存在，开始解析GeoJSON...');
    cachedBoundsPromise = parseCityGeoJSON();
  }
  // 返回缓存的Promise（无论是否已resolve，都能正确获取结果）
  return cachedBoundsPromise;
};

/**
 * 可选：手动清除缓存（如需刷新边界数据时使用）
 */
export const clearBoundsCache = () => {
  cachedBoundsPromise = null;
  boundsDict = {}; // 同步清空已初始化的变量
  console.log('边界缓存已清除');
};

// 初始化边界字典（基于缓存逻辑）
export let boundsDict: Record<string, DistrictBounds> = {};
generateBoundsDict().then(result => {
  boundsDict = result;
  console.log('边界字典生成完成:', boundsDict);
});