/** 电子手账笔记模板 */
export const NOTE_STYLES = [
  {
    id: "minimal",
    label: "简约",
    desc: "干净留白",
    decor: "",
    paperClass: "paper-minimal",
  },
  {
    id: "cute",
    label: "可爱",
    desc: "粉嫩波点",
    decor: "♡",
    paperClass: "paper-cute",
  },
  {
    id: "retro",
    label: "复古",
    desc: "牛皮纸",
    decor: "✿",
    paperClass: "paper-retro",
  },
  {
    id: "nature",
    label: "自然",
    desc: "草木绿",
    decor: "❧",
    paperClass: "paper-nature",
  },
  {
    id: "dreamy",
    label: "梦境",
    desc: "淡紫渐变",
    decor: "☁",
    paperClass: "paper-dreamy",
  },
  {
    id: "grid",
    label: "方格",
    desc: "学习笔记格",
    decor: "▦",
    paperClass: "paper-grid",
  },
  {
    id: "candy",
    label: "糖果",
    desc: "彩虹糖纸",
    decor: "✧",
    paperClass: "paper-candy",
  },
  {
    id: "night",
    label: "夜读",
    desc: "深蓝星空",
    decor: "★",
    paperClass: "paper-night",
  },
];

export function getNoteStyle(id) {
  return NOTE_STYLES.find((s) => s.id === id) ?? NOTE_STYLES[0];
}
