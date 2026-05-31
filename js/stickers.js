/** 页面装饰贴纸（手账风格，大幅扩充） */
export const DECOR_STICKERS = [
  /* ── 胶带 ── */
  { id: "tape-blush",  type: "tape", label: "粉胶带",   color: "#f5ccd6" },
  { id: "tape-sage",   type: "tape", label: "绿胶带",   color: "#c5ddd0" },
  { id: "tape-sky",    type: "tape", label: "蓝胶带",   color: "#c8d8ea" },
  { id: "tape-cream",  type: "tape", label: "米胶带",   color: "#ebe0cc" },
  { id: "tape-lemon",  type: "tape", label: "柠檬胶带", color: "#f5f0b0" },
  { id: "tape-lilac",  type: "tape", label: "紫胶带",   color: "#ddd0f0" },
  { id: "tape-peach",  type: "tape", label: "桃胶带",   color: "#f8d8c0" },
  { id: "tape-mint",   type: "tape", label: "薄荷胶带", color: "#b8ecd8" },
  /* ── 标签贴 ── */
  { id: "tag-nice",   type: "tag", label: "不错",   text: "不错!",   bg: "#fff0b8", color: "#8a7848" },
  { id: "tag-go",     type: "tag", label: "加油",   text: "加油鸭",  bg: "#ffdce8", color: "#9a5878" },
  { id: "tag-done",   type: "tag", label: "done",   text: "done ✓", bg: "#d8ecd8", color: "#508858" },
  { id: "tag-read",   type: "tag", label: "读了",   text: "读了!",   bg: "#dce8f5", color: "#587090" },
  { id: "tag-yay",    type: "tag", label: "耶",     text: "耶!",     bg: "#fff0c8", color: "#887038" },
  { id: "tag-nap",    type: "tag", label: "困困",   text: "困困",    bg: "#e8e8f5", color: "#585888" },
  { id: "tag-love",   type: "tag", label: "喜欢",   text: "超喜欢",  bg: "#ffd8e8", color: "#985878" },
  { id: "tag-wow",    type: "tag", label: "哇",     text: "wow!",    bg: "#e8f8e0", color: "#508840" },
  { id: "tag-focus",  type: "tag", label: "专注",   text: "专注中",  bg: "#e0eeff", color: "#486890" },
  { id: "tag-cafe",   type: "tag", label: "咖啡",   text: "☕ 续命", bg: "#f5e8d8", color: "#8a6848" },
  { id: "tag-idea",   type: "tag", label: "灵感",   text: "灵感!",   bg: "#fffbd0", color: "#888040" },
  { id: "tag-rest",   type: "tag", label: "休息",   text: "摸了~",   bg: "#f0e8ff", color: "#785888" },
  { id: "tag-finish", type: "tag", label: "完成",   text: "搞定 🎉", bg: "#d8f5e8", color: "#408858" },
  { id: "tag-read2",  type: "tag", label: "在读",   text: "📖 在读", bg: "#e8f0ff", color: "#486898" },
  /* ── 动物印章 ── */
  { id: "sp-cat",      type: "stamp", label: "小猫",    emoji: "🐱", bg: "#ffe4ec" },
  { id: "sp-dog",      type: "stamp", label: "小狗",    emoji: "🐶", bg: "#f5ebe0" },
  { id: "sp-rabbit",   type: "stamp", label: "兔子",    emoji: "🐰", bg: "#fce8f0" },
  { id: "sp-bear",     type: "stamp", label: "小熊",    emoji: "🐻", bg: "#ede4d8" },
  { id: "sp-chick",    type: "stamp", label: "小鸡",    emoji: "🐥", bg: "#fff8d8" },
  { id: "sp-panda",    type: "stamp", label: "熊猫",    emoji: "🐼", bg: "#ececec" },
  { id: "sp-frog",     type: "stamp", label: "青蛙",    emoji: "🐸", bg: "#dff0e0" },
  { id: "sp-fox",      type: "stamp", label: "狐狸",    emoji: "🦊", bg: "#ffe8d8" },
  { id: "sp-hamster",  type: "stamp", label: "仓鼠",    emoji: "🐹", bg: "#fce8d8" },
  { id: "sp-koala",    type: "stamp", label: "考拉",    emoji: "🐨", bg: "#e8ece8" },
  { id: "sp-otter",    type: "stamp", label: "水獭",    emoji: "🦦", bg: "#dce8f0" },
  { id: "sp-penguin",  type: "stamp", label: "企鹅",    emoji: "🐧", bg: "#e8ecf5" },
  { id: "sp-duck",     type: "stamp", label: "小鸭",    emoji: "🐤", bg: "#fff8d0" },
  { id: "sp-bee",      type: "stamp", label: "小蜜蜂",  emoji: "🐝", bg: "#fff5c8" },
  { id: "sp-hedgehog", type: "stamp", label: "刺猬",    emoji: "🦔", bg: "#f0e8dc" },
  /* ── 植物印章 ── */
  { id: "pl-sakura",   type: "stamp", label: "樱花",    emoji: "🌸", bg: "#ffe8f0" },
  { id: "pl-leaf",     type: "stamp", label: "绿叶",    emoji: "🌿", bg: "#e0f0e4" },
  { id: "pl-sunflower",type: "stamp", label: "向日葵",  emoji: "🌻", bg: "#fff5d8" },
  { id: "pl-mushroom", type: "stamp", label: "蘑菇",    emoji: "🍄", bg: "#fae8e8" },
  { id: "pl-clover",   type: "stamp", label: "四叶草",  emoji: "🍀", bg: "#e4f5e4" },
  { id: "pl-tulip",    type: "stamp", label: "郁金香",  emoji: "🌷", bg: "#fce8f5" },
  { id: "pl-potted",   type: "stamp", label: "盆栽",    emoji: "🪴", bg: "#e8f2e8" },
  { id: "pl-cactus",   type: "stamp", label: "仙人掌",  emoji: "🌵", bg: "#dce8dc" },
  { id: "pl-hibiscus", type: "stamp", label: "木槿",    emoji: "🌺", bg: "#ffe0e8" },
  { id: "pl-herb",     type: "stamp", label: "嫩芽",    emoji: "🌱", bg: "#e4f8e4" },
  { id: "pl-bamboo",   type: "stamp", label: "竹子",    emoji: "🎋", bg: "#e0f0d8" },
  { id: "pl-cherry",   type: "stamp", label: "樱桃",    emoji: "🍒", bg: "#fce8e8" },
  { id: "pl-lemon",    type: "stamp", label: "柠檬",    emoji: "🍋", bg: "#fefce0" },
  /* ── 食物饮品 ── */
  { id: "fd-cake",     type: "stamp", label: "蛋糕",    emoji: "🍰", bg: "#fff0e8" },
  { id: "fd-coffee",   type: "stamp", label: "咖啡",    emoji: "☕", bg: "#f0e4d8" },
  { id: "fd-boba",     type: "stamp", label: "奶茶",    emoji: "🧋", bg: "#f5e8d8" },
  { id: "fd-donut",    type: "stamp", label: "甜甜圈",  emoji: "🍩", bg: "#ffe8f0" },
  { id: "fd-icecream", type: "stamp", label: "冰淇淋",  emoji: "🍦", bg: "#fff5f8" },
  { id: "fd-cookie",   type: "stamp", label: "曲奇",    emoji: "🍪", bg: "#f5ead8" },
  /* ── 学习文具 ── */
  { id: "st-pencil",   type: "stamp", label: "铅笔",    emoji: "✏️", bg: "#fff8d8" },
  { id: "st-book",     type: "stamp", label: "书本",    emoji: "📚", bg: "#e8f0ff" },
  { id: "st-bulb",     type: "stamp", label: "灵感灯",  emoji: "💡", bg: "#fff8d0" },
  { id: "st-trophy",   type: "stamp", label: "奖杯",    emoji: "🏆", bg: "#fdf0d8" },
  { id: "st-rocket",   type: "stamp", label: "火箭",    emoji: "🚀", bg: "#e8eeff" },
  { id: "st-gem",      type: "stamp", label: "宝石",    emoji: "💎", bg: "#e0f8ff" },
  { id: "st-note",     type: "stamp", label: "音符",    emoji: "🎵", bg: "#f0e8ff" },
  { id: "st-palette",  type: "stamp", label: "调色盘",  emoji: "🎨", bg: "#f8e8ff" },
  { id: "st-pin",      type: "stamp", label: "图钉",    emoji: "📌", bg: "#ffe8e8" },
  /* ── 天气季节 ── */
  { id: "wx-sun",      type: "stamp", label: "太阳",    emoji: "☀️", bg: "#fff8d0" },
  { id: "wx-rain",     type: "stamp", label: "雨天",    emoji: "🌧️", bg: "#e8eeff" },
  { id: "wx-snow",     type: "stamp", label: "雪花",    emoji: "❄️", bg: "#e8f4ff" },
  { id: "wx-rainbow",  type: "stamp", label: "彩虹",    emoji: "🌈", bg: "#f0f8ff" },
  { id: "wx-moon",     type: "stamp", label: "月亮",    emoji: "🌙", bg: "#eeeaff" },
  { id: "wx-cloud",    type: "stamp", label: "云朵",    emoji: "☁️", bg: "#f0f5ff" },
  { id: "wx-star3",    type: "stamp", label: "流星",    emoji: "🌠", bg: "#e8eaff" },
  /* ── 图标 ── */
  { id: "icon-heart",   type: "icon", label: "爱心",   char: "♡", color: "#e098a8" },
  { id: "icon-star",    type: "icon", label: "星星",   char: "✦", color: "#d4b868" },
  { id: "icon-spark",   type: "icon", label: "闪光",   char: "✧", color: "#a898c8" },
  { id: "icon-flower",  type: "icon", label: "小花",   char: "✿", color: "#e8a0b8" },
  { id: "icon-diamond", type: "icon", label: "菱形",   char: "◇", color: "#88b8d8" },
  /* ── 配件 ── */
  { id: "clip", type: "clip", label: "回形针" },
  { id: "dots", type: "dots", label: "圆点"   },
];

/** 笔记页边贴纸 */
export const NOTE_STICKERS = [
  { id: "ns-tag-key",   type: "tag",   label: "重点", text: "重点",    bg: "#ffe8a8", color: "#7a6838" },
  { id: "ns-tag-q",     type: "tag",   label: "疑问", text: "?",       bg: "#ffd8d8", color: "#884848" },
  { id: "ns-tag-idea",  type: "tag",   label: "灵感", text: "灵感!",   bg: "#e8f0ff", color: "#486888" },
  { id: "ns-tag-todo",  type: "tag",   label: "待办", text: "todo",    bg: "#f0e8ff", color: "#685888" },
  { id: "ns-tag-ok",    type: "tag",   label: "完成", text: "ok ✓",   bg: "#d8ecd8", color: "#488848" },
  { id: "ns-tag-wow",   type: "tag",   label: "哇",   text: "wow",     bg: "#fff0c8", color: "#887040" },
  { id: "ns-tag-cite",  type: "tag",   label: "引用", text: "引用",    bg: "#e8e8f8", color: "#585880" },
  { id: "ns-tag-imp",   type: "tag",   label: "重要", text: "‼ 重要", bg: "#ffe0d8", color: "#885040" },
  { id: "ns-tape-pink", type: "tape",  label: "粉胶带", color: "#f5ccd6" },
  { id: "ns-tape-mint", type: "tape",  label: "绿胶带", color: "#c5ddd0" },
  { id: "ns-tape-lemon",type: "tape",  label: "黄胶带", color: "#f5f0b0" },
  { id: "ns-cat",       type: "stamp", label: "小猫",   emoji: "🐱", bg: "#ffe4ec" },
  { id: "ns-rabbit",    type: "stamp", label: "兔子",   emoji: "🐰", bg: "#fce8f0" },
  { id: "ns-bear",      type: "stamp", label: "小熊",   emoji: "🐻", bg: "#ede4d8" },
  { id: "ns-chick",     type: "stamp", label: "小鸡",   emoji: "🐥", bg: "#fff8d8" },
  { id: "ns-panda",     type: "stamp", label: "熊猫",   emoji: "🐼", bg: "#ececec" },
  { id: "ns-frog",      type: "stamp", label: "青蛙",   emoji: "🐸", bg: "#dff0e0" },
  { id: "ns-hamster",   type: "stamp", label: "仓鼠",   emoji: "🐹", bg: "#fce8d8" },
  { id: "ns-duck",      type: "stamp", label: "小鸭",   emoji: "🐤", bg: "#fff8d0" },
  { id: "ns-bee",       type: "stamp", label: "蜜蜂",   emoji: "🐝", bg: "#fff5c8" },
  { id: "ns-sakura",    type: "stamp", label: "樱花",   emoji: "🌸", bg: "#ffe8f0" },
  { id: "ns-leaf",      type: "stamp", label: "绿叶",   emoji: "🌿", bg: "#e0f0e4" },
  { id: "ns-sunflower", type: "stamp", label: "向日葵", emoji: "🌻", bg: "#fff5d8" },
  { id: "ns-mushroom",  type: "stamp", label: "蘑菇",   emoji: "🍄", bg: "#fae8e8" },
  { id: "ns-clover",    type: "stamp", label: "四叶草", emoji: "🍀", bg: "#e4f5e4" },
  { id: "ns-coffee",    type: "stamp", label: "咖啡",   emoji: "☕", bg: "#f0e4d8" },
  { id: "ns-boba",      type: "stamp", label: "奶茶",   emoji: "🧋", bg: "#f5e8d8" },
  { id: "ns-pencil",    type: "stamp", label: "铅笔",   emoji: "✏️", bg: "#fff8d8" },
  { id: "ns-bulb",      type: "stamp", label: "灵感灯", emoji: "💡", bg: "#fff8d0" },
  { id: "ns-moon",      type: "stamp", label: "月亮",   emoji: "🌙", bg: "#eeeaff" },
  { id: "ns-heart",     type: "icon",  label: "爱心",   char: "♡",  color: "#e098a8" },
  { id: "ns-star",      type: "icon",  label: "星星",   char: "✦",  color: "#d4b868" },
  { id: "ns-spark",     type: "icon",  label: "闪光",   char: "✧",  color: "#a898c8" },
  { id: "ns-flower",    type: "icon",  label: "小花",   char: "✿",  color: "#e8a0b8" },
  { id: "ns-tag-yay",   type: "tag",   label: "耶",     text: "耶!", bg: "#fff0c8", color: "#887038" },
];

const ZONE_LABELS = { top: "上方", left: "左侧", right: "右侧", bottom: "下方" };

export function getDecorSticker(id) {
  return DECOR_STICKERS.find((s) => s.id === id);
}
export function getNoteSticker(id) {
  return NOTE_STICKERS.find((s) => s.id === id);
}

export function stickerInnerHtml(stickerId, legacyEmoji) {
  const s = getDecorSticker(stickerId) || getNoteSticker(stickerId);
  if (!s) {
    if (legacyEmoji) return `<span class="ht-legacy">${legacyEmoji}</span>`;
    return "";
  }
  switch (s.type) {
    case "tape":   return `<span class="ht-tape" style="--tape:${s.color}"></span>`;
    case "tag":    return `<span class="ht-tag" style="background:${s.bg};color:${s.color}">${s.text}</span>`;
    case "stamp":  return `<span class="ht-stamp" style="background:${s.bg}"><span class="ht-stamp-emoji">${s.emoji}</span></span>`;
    case "icon":   return `<span class="ht-icon" style="color:${s.color}">${s.char}</span>`;
    case "clip":   return `<span class="ht-clip"></span>`;
    case "dots":   return `<span class="ht-dots"><i></i><i></i><i></i></span>`;
    default:       return "";
  }
}

export function decorStickerInnerHtml(stickerId, legacyEmoji) {
  return stickerInnerHtml(stickerId, legacyEmoji);
}

export function decorPaletteBtnHtml(s, selected) {
  const sel = selected ? " selected" : "";
  return `<button type="button" class="ht-palette-btn${sel}" data-sticker-id="${s.id}" title="${s.label}" draggable="true">
    ${stickerInnerHtml(s.id)}
  </button>`;
}

export function notePaletteBtnHtml(s) {
  return `<button type="button" class="ht-palette-btn note-drag-source" data-sticker-id="${s.id}" title="${s.label}" draggable="true">
    ${stickerInnerHtml(s.id)}
  </button>`;
}

export function stickerExportLabel(stickerId) {
  const s = getDecorSticker(stickerId) || getNoteSticker(stickerId);
  if (!s) return stickerId;
  if (s.type === "tag")   return s.text;
  if (s.type === "stamp") return s.label || s.emoji;
  return s.label || s.char || stickerId;
}

export function formatPlacedStickersExport(placedStickers) {
  if (!placedStickers?.length) return "";
  const byZone = {};
  placedStickers.forEach((p) => {
    const z = p.zone || "top";
    if (!byZone[z]) byZone[z] = [];
    byZone[z].push(stickerExportLabel(p.stickerId));
  });
  let out = "\n> 页边手账装饰：\n";
  Object.entries(byZone).forEach(([zone, labels]) => {
    out += `> - ${ZONE_LABELS[zone] || zone}：${labels.join("、")}\n`;
  });
  return out;
}

/** @deprecated */
export function noteStickerLabel(id) {
  return `[${stickerExportLabel(id)}]`;
}
