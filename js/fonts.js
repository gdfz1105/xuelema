/** 全局字体风格（装饰字体 + 完整中文回退） */
export const FONT_THEMES = [
  {
    id: "cute",
    label: "软萌可爱",
    desc: "标题圆萌 · 正文全覆盖",
    vars: {
      "--font":
        '"LXGW WenKai", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      "--font-title":
        '"ZCOOL KuaiLe", "Zen Maru Gothic", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      "--font-serif":
        '"ZCOOL KuaiLe", "Noto Sans SC", "PingFang SC", sans-serif',
    },
  },
  {
    id: "round",
    label: "圆润日记",
    desc: "黄油体标题 · 正文全覆盖",
    vars: {
      "--font":
        '"Nunito", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      "--font-title":
        '"ZCOOL QingKe HuangYou", "Zen Maru Gothic", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      "--font-serif":
        '"ZCOOL QingKe HuangYou", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    },
  },
  {
    id: "hand",
    label: "手帐手写",
    desc: "全站手写感 · 生僻字友好",
    vars: {
      "--font":
        '"LXGW WenKai", "KaiTi", "Noto Sans SC", "PingFang SC", serif',
      "--font-title":
        '"Ma Shan Zheng", "LXGW WenKai", "Noto Sans SC", "KaiTi", cursive',
      "--font-serif":
        '"Ma Shan Zheng", "LXGW WenKai", "Noto Sans SC", serif',
    },
  },
  {
    id: "default",
    label: "清爽默认",
    desc: "干净克制，偏学术",
    vars: {
      "--font": '"DM Sans", "Noto Sans SC", "PingFang SC", sans-serif',
      "--font-title": '"Noto Serif SC", "Noto Sans SC", serif',
      "--font-serif": '"Noto Serif SC", "Noto Sans SC", serif',
    },
  },
];

export function getFontTheme(id) {
  return FONT_THEMES.find((f) => f.id === id) ?? FONT_THEMES[0];
}

export function applyFontTheme(fontThemeId) {
  const theme = getFontTheme(fontThemeId);
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  document.body.dataset.fontTheme = fontThemeId;
  document.documentElement.lang = "zh-CN";
}

/** 导出/截图用：保证生僻字也能显示 */
export const EXPORT_FONT =
  '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
