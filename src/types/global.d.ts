type DistrictBounds = [[number, number], [number, number]];

// 表格数据（适配全局/区县视图）
/**
 * 表格数据项接口
 * @interface TableItem
 * @property {string} label - 标签（年份或区县名称）
 * @property {number} value - 对应的NDVI值
 */
interface TableItem {
  label: string;
  value: number;
}


/**
 * 区县数据项接口
 * @interface IndexDataItem
 * @property {string} district - 区县名称
 * @property {number[]} data - 该区县所有年份的NDVI数据
 */
interface IndexDataItem {
  district: string;
  data: number[];
}
