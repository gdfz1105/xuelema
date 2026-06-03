import { getCategory } from "./categories.js";
import { getJournal, getTasksForDate } from "./storage.js";
import { getNoteStyle } from "./note-styles.js";
import { formatPlacedStickersExport } from "./stickers.js";

const MOOD   = ["", "很低落", "略低落", "平静", "不错", "很好"];
const ENERGY = ["", "极低", "较低", "一般", "较好", "充沛"];
const SLEEP  = ["", "很差", "较差", "一般", "较好", "很好"];

function downloadText(filename, text, mime) {
  const blob = new Blob(["\uFEFF" + text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function noteBlockMd(title, note) {
  if (!note?.content?.trim() && !note?.placedStickers?.length) return "";
  const style = getNoteStyle(note.style || "minimal").label;
  return `### ${title}\n*模板：${style}*${formatPlacedStickersExport(note.placedStickers)}\n${(note.content || "").trim()}\n\n`;
}

export function exportDayMarkdown(state, dateKey, dateLabel) {
  const journal = getJournal(state, dateKey);
  const tasks   = getTasksForDate(state, dateKey);
  let md = `# 今天学了吗？ · ${dateLabel}\n\n`;
  md += `> 导出时间：${new Date().toLocaleString("zh-CN")}\n\n`;

  // 任务
  md += `## 任务完成情况\n\n`;
  if (!tasks.length) {
    md += `_今日无任务_\n\n`;
  } else {
    const done = tasks.filter(t => t.completed).length;
    md += `完成 **${done}** / **${tasks.length}** 项\n\n`;
    tasks.forEach(t => {
      const cat   = getCategory(t.categoryId);
      const check = t.completed ? "x" : " ";
      const time  = t.startTime && t.endTime
        ? ` (${t.startTime.slice(0,5)}–${t.endTime.slice(0,5)})` : "";
      md += `- [${check}] **${t.title}** · ${cat.label}${time}\n`;
    });
    md += "\n";
  }

  // 状态
  md += `## 今日状态\n\n`;
  md += `- 情绪：${journal.mood   ? MOOD[journal.mood]     : "未记录"}\n`;
  md += `- 精力：${journal.energy ? ENERGY[journal.energy] : "未记录"}\n`;
  md += `- 睡眠：${journal.sleep  ? SLEEP[journal.sleep]   : "未记录"}\n`;
  const studyHours = (journal.studyMorning || 0) + (journal.studyAfternoon || 0) + (journal.studyEvening || 0);
  if (studyHours > 0) md += `- 学习时长：${studyHours.toFixed(1)} 小时\n`;
  if (journal.reflection?.summary) md += `- 一句总结：${journal.reflection.summary}\n`;
  md += "\n";

  // 小记
  md += `## 小记一笔\n\n`;
  md += noteBlockMd("🌱 小收获", journal.reflection?.accomplished);
  md += noteBlockMd("🫠 小问题", journal.reflection?.unfinished);

  return md;
}

export function exportReflectionMarkdown(state, dateKey, dateLabel) {
  const journal = getJournal(state, dateKey);
  let md = `# 小记一笔 · ${dateLabel}\n\n`;
  md += noteBlockMd("小收获", journal.reflection?.accomplished);
  md += noteBlockMd("小问题", journal.reflection?.unfinished);
  return md;
}

export function getExportMarkdown(scope, state, dateKey, dateLabel) {
  if (scope === "reflection") return exportReflectionMarkdown(state, dateKey, dateLabel);
  return exportDayMarkdown(state, dateKey, dateLabel);
}

export function getExportBasename(scope, dateKey) {
  if (scope === "reflection") return `今天学了吗-小记-${dateKey}`;
  return `今天学了吗-${dateKey}`;
}

export function exportAsMarkdown(scope, state, dateKey, dateLabel) {
  const md = getExportMarkdown(scope, state, dateKey, dateLabel);
  downloadText(`${getExportBasename(scope, dateKey)}.md`, md, "text/markdown;charset=utf-8");
}

/** @deprecated */
export function exportDay(state, dateKey, dateLabel) {
  exportAsMarkdown("day", state, dateKey, dateLabel);
}

export function exportReflectionOnly(state, dateKey, dateLabel) {
  exportAsMarkdown("reflection", state, dateKey, dateLabel);
}

export { MOOD, ENERGY, noteBlockMd };
