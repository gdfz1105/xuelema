const STORAGE_KEY = "yancheng-scholar-planner-v2";

const defaultReflectionPart = () => ({
  content: "",
  style: "minimal",
  placedStickers: [],
});

export const defaultJournal = () => ({
  mood: null,
  energy: null,
  sleep: null,
  studyMorning: null,   // 上午学习时长（小时，可含小数）
  studyAfternoon: null, // 下午
  studyEvening: null,   // 晚上
  reflection: {
    accomplished: defaultReflectionPart(),
    unfinished: defaultReflectionPart(),
    summary: "",  // 一句话总结
  },
});

const defaultSettings = () => ({
  bgThemeId: "morandi-default",
  fontThemeId: "cute",
  decorStickers: [],
  stickerMode: false,
});

function normalizeNotePart(p) {
  if (!p || typeof p !== "object") return defaultReflectionPart();
  return {
    content: p.content || "",
    style: p.style || "minimal",
    placedStickers: Array.isArray(p.placedStickers) ? p.placedStickers : [],
  };
}

const defaultState = () => ({
  tasks: [],
  journals: {},
  settings: defaultSettings(),
});

function migrateJournal(raw) {
  // 把旧 studyMinutes 转换为 studyEvening（兜底）
  const studyMorning   = raw?.studyMorning   ?? null;
  const studyAfternoon = raw?.studyAfternoon ?? null;
  const studyEvening   = raw?.studyEvening
    ?? (raw?.studyMinutes != null ? parseFloat((raw.studyMinutes / 60).toFixed(1)) : null);

  const reflection = normalizeReflection(raw?.reflection);

  return {
    mood: raw?.mood ?? null,
    energy: raw?.energy ?? null,
    sleep: raw?.sleep ?? null,
    studyMorning,
    studyAfternoon,
    studyEvening,
    litCount: raw?.litCount ?? null,
    reflection,
  };
}

function normalizeReflection(r) {
  const base = defaultJournal().reflection;
  if (!r || typeof r !== "object") return base;
  // 兼容旧版 string reflection
  if (typeof r === "string") {
    return { ...base, accomplished: { ...defaultReflectionPart(), content: r } };
  }
  return {
    accomplished: normalizeNotePart(r.accomplished),
    unfinished:   normalizeNotePart(r.unfinished),
    summary:      typeof r.summary === "string" ? r.summary : "",
  };
}

function migrateFromV1() {
  try {
    const raw = localStorage.getItem("yancheng-scholar-planner-v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const journals = {};
    if (parsed.journals) {
      Object.entries(parsed.journals).forEach(([k, v]) => {
        journals[k] = migrateJournal(v);
      });
    }
    return {
      tasks: (parsed.tasks || []).map((t) => ({ ...t, shapeId: t.shapeId || "rounded" })),
      journals,
      settings: defaultSettings(),
    };
  } catch { return null; }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const migrated = migrateFromV1();
      if (migrated) { saveState(migrated); return migrated; }
      return defaultState();
    }
    const parsed = JSON.parse(raw);
    const journals = {};
    if (parsed.journals) {
      Object.entries(parsed.journals).forEach(([k, v]) => {
        journals[k] = migrateJournal(v);
      });
    }
    return {
      tasks: Array.isArray(parsed.tasks)
        ? parsed.tasks.map((t) => ({ ...t, shapeId: t.shapeId || "rounded" }))
        : [],
      journals,
      settings: { ...defaultSettings(), ...(parsed.settings || {}) },
    };
  } catch { return defaultState(); }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getJournal(state, key) {
  const j = state.journals[key];
  if (!j) return defaultJournal();
  return migrateJournal(j);
}

export function setJournal(state, key, journal) {
  state.journals[key] = journal;
}

export function getTasksForDate(state, key) {
  return state.tasks.filter((t) => t.date === key);
}

/** 总学习时长（小时） */
export function totalStudyHours(journal) {
  return (journal.studyMorning || 0)
       + (journal.studyAfternoon || 0)
       + (journal.studyEvening || 0);
}

export function hasReflection(journal) {
  const r = journal.reflection;
  const hasStickers = (part) => (part?.placedStickers?.length ?? 0) > 0;
  return (
    r?.accomplished?.content?.trim() ||
    r?.unfinished?.content?.trim() ||
    r?.summary?.trim() ||
    hasStickers(r?.accomplished) ||
    hasStickers(r?.unfinished)
  );
}
