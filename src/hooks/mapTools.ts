import L from 'leaflet';
import 'leaflet.chinatmsproviders'

type GeoJSONstyle = L.GeoJSONOptions['style'];

type RGBObject = {
  r: number;
  g: number;
  b: number;
};

/**
 * NDVI 可视化参数类型
 * @property max - NDVI 最大值（超过则锁为max）
 * @property min - NDVI 最小值（低于则锁为min）
 * @property gamma - Gamma校正系数（调整对比度）
 * @property platte - 颜色渐变面板（RGB字符串列表，默认：纯白→纯黑）
 */

interface visparams {
  max: number;
  min: number;
  gamma: number;
  platte?: string[]; // 可选，默认值在函数内定义
}

/**
 * ### 解析 RGB 字符串（如 "rgb(255, 255, 255)"）为 RGB 数值对象
 * @param rgbStr - 待解析的 RGB 字符串，格式要求：rgb(0-255, 0-255, 0-255)（逗号后允许空格，仅支持整数）
 * @returns {RGBObject} 包含 r/g/b 三个数值的对象（0-255）
 * @throws {Error} 传入值非有效RGB格式/数值超出0-255范围时抛出错误（含具体错误原因）
 * @example
 * parseRGB('rgb(255, 0, 0)') // 返回 { r: 255, g: 0, b: 0 }
 */
export const parseRGB = (rgbStr: string): RGBObject => {
  // 1. 先校验参数类型（非字符串直接报错）
  if (typeof rgbStr !== 'string') throw new Error(`解析RGB失败：传入值不是字符串类型，实际传入：${JSON.stringify(rgbStr)}`);
  
  // 2. 匹配RGB格式
  const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) throw new Error(`解析RGB失败：传入字符串不符合rgb(数字,数字,数字)格式，实际传入："${rgbStr}"`);
  
  // 3. 转换为数字并校验0-255范围
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  
  const checkRange = (val: number, channel: 'r' | 'g' | 'b') => {
    if (val < 0 || val > 255) throw new Error(`解析RGB失败：${channel}通道值超出0-255范围，实际值：${val}（传入字符串："${rgbStr}"）`);
  };
  checkRange(r, 'r');
  checkRange(g, 'g');
  checkRange(b, 'b');

  // 4. 解析成功返回结果
  return { r, g, b };
};


/**
 * ### 加载 GeoJSON 文件并创建 Leaflet GeoJSON 图层
 * @param geojson_path - GeoJSON 文件路径
 * @param style - GeoJSON 图层样式配置（兼容 Leaflet 样式对象/样式函数）
 * @returns {Promise<L.GeoJSON>} Leaflet GeoJSON 图层实例（Promise 形式，异步加载完成后返回）
 * @throws {Error} 1. HTTP请求失败（如404/500）；2. GeoJSON文件解析失败；3. 样式配置不合法
 * @example
 * // 加载开封市GeoJSON，使用城市样式
 * getGeojsonLayer(city_style.value).then(layer => {
 *   layer.addTo(map); // 将图层添加到 Leaflet 地图实例
 * });
 * // 加载自定义路径的GeoJSON，使用区县样式
 * getGeojsonLayer(county_style.value, '郑州市.geojson').then(layer => {
 *   layer.addTo(map);
 * });
 */
export const getGeojsonLayer = async (
    geojson_path: string ,
    style: GeoJSONstyle
): Promise<L.GeoJSON> => {
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


/**
 * 根据 Index指数的值和可视化参数计算RGB颜色（核心规则：归一化计算，超限按最大最下值赋值）
 * @param index - Index指数值（待计算颜色的数值）
 * @param visparams - Index可视化配置（max/min/gamma/platte）
 * @returns 接收Index值，返回对应RGB颜色字符串的函数
 */
export const getIndexColor = (
    index: number,
    visparams: visparams
):string => {
  // 1. 解构参数 + 默认值（platte默认纯白→纯黑）
  const { max, min, gamma, platte = ['rgb(255,255,255)', 'rgb(0,0,0)'] } = visparams;

  // 2. 解析颜色面板（仅取首尾颜色做渐变，避免index逻辑）
  // 处理platte长度异常：至少保留1个颜色，优先首尾
  const validPlatte = platte.filter(color => !!color); // 过滤空值
  const startColor = validPlatte[0] || 'rgb(255,255,255)'; // 起始色（默认纯白）
  const endColor = validPlatte[validPlatte.length - 1] || 'rgb(0,0,0)'; // 结束色（默认纯黑）

  // 解析RGB（失败则兜底）
  const parseColor = (colorStr: string): RGBObject => {
    try {
      return parseRGB(colorStr);
    } catch (error) {
      console.warn(`解析颜色${colorStr}失败，使用默认值`, error);
      return colorStr === startColor ? { r:255,g:255,b:255 } : { r:0,g:0,b:0 };
    }
  };
    const parsedStart = parseColor(startColor);
    const parsedEnd = parseColor(endColor);

    const clampedIndex = Math.max(min, Math.min(max, index));

    // Step2：Gamma校正（仅对非负Index生效）
    const correctedIndex = Math.pow(Math.max(0, clampedIndex), gamma);

    // Step3：归一化到[0,1]（避免min=max除零）
    const range = max - min;
    const normalized = range === 0 ? 0 : (correctedIndex - min) / range;

    // Step4：线性映射到首尾颜色（无index，直接插值）
    const r = Math.round(parsedStart.r * (1 - normalized) + parsedEnd.r * normalized);
    const g = Math.round(parsedStart.g * (1 - normalized) + parsedEnd.g * normalized);
    const b = Math.round(parsedStart.b * (1 - normalized) + parsedEnd.b * normalized);

    return `rgb(${r},${g},${b})`;
 
};

/**
 * ### 添加自定义HTML标注到地图容器
 * @param position - 标注位置（经纬度表达式）
 * @param markerHtml - 标注HTML内容（可包含样式）
 * @param className - 标注类名（默认'custom-marker'）
 * @param iconSize - 标注图标大小（默认[100, 50]）
 * @param iconAnchor - 标注图标锚点（默认[50, 25]）
 * @returns L.Marker - Leaflet 标注对象（可直接添加到地图容器）
 * @example
 * // 在地图上添加红色标注
 * addMarker(map, [39.9042, 116.4074], '<div style="color:red;">红色标注</div>');
 */
export const getHTMLMarker =(
    position: L.LatLngExpression,
    markerHtml: string,
    className: string = 'custom-marker',
    iconSize: L.PointExpression = [100, 50],
    iconAnchor: L.PointExpression = [50, 25],
    zIndexOffset: number = 1000,
):L.Marker =>{
    return L.marker(position, {
        icon: L.divIcon({
            html: markerHtml,
            className: className,
            iconSize: iconSize,
            iconAnchor: iconAnchor,
        }),
        zIndexOffset: zIndexOffset,
    });
}

/**
 * 创建高德地图图层 + 图层切换控件
 * @param addnormalmap - 是否创建高德普通地图图层（默认 true）
 * @param addsatellitemap - 是否创建高德卫星地图图层（默认 true）
 * @param addannotion - 是否创建高德卫星标注图层（默认 true）
 * @returns Leaflet 图层切换控件（L.Control.Layers）
 */
export const getGaoDeMapLayer = (
  addnormalmap: boolean = true,
  addsatellitemap: boolean = true,
  addannotion: boolean = true // 去掉末尾多余逗号
) => {
  // 1. 提前声明变量（函数级作用域），初始化为 undefined
  let normalmap: L.TileLayer | undefined;
  let satellitemap: L.TileLayer | undefined;
  let annotion: L.TileLayer | undefined;

  // 2. 根据参数创建对应图层（赋值到函数级变量）
  if (addnormalmap) {
    normalmap = L.tileLayer.chinaProvider('GaoDe.Normal.Map', {
      maxZoom: 18,
      minZoom: 5
    });
  }
  if (addsatellitemap) {
    satellitemap = L.tileLayer.chinaProvider('GaoDe.Satellite.Map', {
      maxZoom: 18,
      minZoom: 5
    });
  }
  if (addannotion) {
    annotion = L.tileLayer.chinaProvider('GaoDe.Satellite.Annotion', {
      maxZoom: 18,
      minZoom: 5
    });
  }

  // 3. 构建图层切换控件（仅传入已创建的图层）
  const baseLayers: Record<string, L.TileLayer> = {};
  const overlayLayers: Record<string, L.TileLayer> = {};
  
  if (normalmap) overlayLayers["地图"] = normalmap;
  if (satellitemap) overlayLayers["影像"] = satellitemap;
  if (annotion) overlayLayers["标注"] = annotion;

  return L.control.layers(baseLayers, overlayLayers);
};