/** 马卡龙 & 莫兰迪背景主题 — 提亮版 */
export const BG_THEMES = [
  {
    id: "morandi-default",
    label: "莫兰迪·雾灰",
    group: "morandi",
    vars: {
      "--bg": "#f2ede8",
      "--surface": "#fdfcf9",
      "--border": "#d4ccc3",
      "--text": "#4a4541",
      "--text-muted": "#8a837a",
      "--accent": "#8b9a9a",
      "--accent-soft": "#e4ebe9",
    },
  },
  {
    id: "morandi-rose",
    label: "莫兰迪·豆沙",
    group: "morandi",
    vars: {
      "--bg": "#f0e8e4",
      "--surface": "#fdf6f3",
      "--border": "#d0c2bc",
      "--text": "#5c4f4c",
      "--text-muted": "#9a8884",
      "--accent": "#a89090",
      "--accent-soft": "#f5ece9",
    },
  },
  {
    id: "morandi-sage",
    label: "莫兰迪·苔绿",
    group: "morandi",
    vars: {
      "--bg": "#ecf0ea",
      "--surface": "#f8fbf6",
      "--border": "#c2cebe",
      "--text": "#454a44",
      "--text-muted": "#7a8478",
      "--accent": "#8a9a88",
      "--accent-soft": "#e8f0e5",
    },
  },
  {
    id: "macaron-peach",
    label: "马卡龙·蜜桃",
    group: "macaron",
    vars: {
      "--bg": "#fff5f0",
      "--surface": "#fffdf9",
      "--border": "#f2d4c8",
      "--text": "#6b524c",
      "--text-muted": "#a88880",
      "--accent": "#d4a098",
      "--accent-soft": "#ffece4",
    },
  },
  {
    id: "macaron-mint",
    label: "马卡龙·薄荷",
    group: "macaron",
    vars: {
      "--bg": "#edfaf4",
      "--surface": "#f8fdfb",
      "--border": "#c0e8da",
      "--text": "#455a52",
      "--text-muted": "#7a9488",
      "--accent": "#88b5a8",
      "--accent-soft": "#dcf5ec",
    },
  },
  {
    id: "macaron-lavender",
    label: "马卡龙·薰衣草",
    group: "macaron",
    vars: {
      "--bg": "#f5f0fa",
      "--surface": "#fdfbff",
      "--border": "#d8cced",
      "--text": "#5a5268",
      "--text-muted": "#9488a0",
      "--accent": "#a89bb8",
      "--accent-soft": "#ede6f8",
    },
  },
  {
    id: "macaron-lemon",
    label: "马卡龙·柠檬",
    group: "macaron",
    vars: {
      "--bg": "#fefce8",
      "--surface": "#fffefc",
      "--border": "#e8e0bc",
      "--text": "#5a5640",
      "--text-muted": "#9a9478",
      "--accent": "#c4b888",
      "--accent-soft": "#f8f4dc",
    },
  },
];

export function getTheme(id) {
  return BG_THEMES.find((t) => t.id === id) ?? BG_THEMES[0];
}

export function applyTheme(themeId) {
  const theme = getTheme(themeId);
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  document.body.dataset.bgTheme = themeId;
}
