import { getCategory } from "./categories.js";
import { getJournal, getTasksForDate, hasReflection } from "./storage.js";
import { shapeClass } from "./shapes.js";

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function startOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatPeriodLabel(view, anchor) {
  const y = anchor.getFullYear();
  const m = anchor.getMonth() + 1;
  if (view === "week") {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    if (start.getMonth() === end.getMonth()) {
      return `${y}年${m}月 ${start.getDate()}日 – ${end.getDate()}日`;
    }
    return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 – ${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`;
  }
  return `${y}年${m}月`;
}

function renderIndicators(journal) {
  const parts = [];
  if (journal.mood != null) {
    parts.push('<span class="indicator mood" title="已记录情绪"></span>');
  }
  if (journal.energy != null) {
    const cls =
      journal.energy <= 2 ? "energy-low" : journal.energy <= 3 ? "energy-mid" : "energy-high";
    parts.push(`<span class="indicator ${cls}" title="已记录精力"></span>`);
  }
  if (hasReflection(journal)) {
    parts.push('<span class="indicator reflect" title="有反思记录"></span>');
  }
  if (!parts.length) return "";
  return `<div class="day-indicators">${parts.join("")}</div>`;
}

function renderBlocks(tasks, maxShow) {
  const shown = tasks.slice(0, maxShow);
  const html = shown
    .map((t) => {
      const cat = getCategory(t.categoryId);
      const done = t.completed ? " done" : "";
      const shape = shapeClass(t.shapeId);
      const time =
        t.startTime && t.endTime ? ` (${t.startTime.slice(0, 5)}–${t.endTime.slice(0, 5)})` : "";
      return `<div class="task-block ${shape}${done}" style="background:${cat.color};color:${cat.text}" title="${escapeHtml(t.title)}${time}">${escapeHtml(t.title)}</div>`;
    })
    .join("");
  const more =
    tasks.length > maxShow
      ? `<span class="more-tasks">+${tasks.length - maxShow} 项</span>`
      : "";
  return html + more;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDayCell(date, state, { selectedKey, today, otherMonth, maxBlocks }) {
  const key = dateKeyFromDate(date);
  const tasks = getTasksForDate(state, key);
  const journal = getJournal(state, key);
  const classes = ["day-cell"];
  if (otherMonth) classes.push("other-month");
  if (isSameDay(date, today)) classes.push("today");
  if (key === selectedKey) classes.push("selected");

  return `
    <div class="${classes.join(" ")}" data-date="${key}" role="button" tabindex="0">
      <span class="day-num">${date.getDate()}</span>
      <div class="day-blocks">${renderBlocks(tasks, maxBlocks)}</div>
      ${renderIndicators(journal)}
    </div>
  `;
}

function dateKeyFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weekdayHeaders() {
  return WEEKDAYS.map((w) => `<div class="weekday-cell">${w}</div>`).join("");
}

export function renderWeekCalendar(container, state, anchor, selectedKey) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  container.innerHTML = `
    <div class="week-grid">
      <div class="weekday-header">${weekdayHeaders()}</div>
      ${days.map((d) => buildDayCell(d, state, { selectedKey, today, otherMonth: false, maxBlocks: 5 })).join("")}
    </div>
  `;
}

export function renderMonthCalendar(container, state, anchor, selectedKey) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const first = startOfMonth(anchor);
  const start = startOfWeek(first);
  const cells = [];
  let cursor = new Date(start);

  for (let i = 0; i < 42; i++) {
    const otherMonth = cursor.getMonth() !== anchor.getMonth();
    cells.push(
      buildDayCell(cursor, state, { selectedKey, today, otherMonth, maxBlocks: 3 })
    );
    cursor = addDays(cursor, 1);
  }

  container.innerHTML = `
    <div class="month-grid">
      <div class="weekday-header">${weekdayHeaders()}</div>
      ${cells.join("")}
    </div>
  `;
}

export { WEEKDAYS };
