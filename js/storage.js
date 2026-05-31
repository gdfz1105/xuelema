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
  studyMinutes: null,
  papers: [],
  reflection: {
    accomplished: defaultReflectionPart(),
    unfinished: defaultReflectionPart(),
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
  if (raw?.papers && Array.isArray(raw.papers)) {
    return {
      mood: raw.mood ?? null,
      energy: raw.energy ?? null,
      sleep: raw.sleep ?? null,
      studyMinutes: raw.studyMinutes ?? null,
      papers: raw.papers.map((p) => ({
        id: p.id || crypto.randomUUID(),
        title: p.title || "",
        minutes: p.minutes ?? 0,
        ...normalizeNotePart(p),
      })),
      reflection: normalizeReflection(raw.reflection),
    };
  }

  const papers = [];
  const lit = raw?.literature;
  if (lit?.notes?.trim()) {
    papers.push({
      id: crypto.randomUUID(),
      title: "往期汇总笔记",
      minutes: lit.minutes ?? 0,
      content: lit.notes,
      style: "minimal",
      placedStickers: [],
    });
  } else {
    const count = lit?.papers ?? 0;
    for (let i = 0; i < count; i++) {
      papers.push({
        id: crypto.randomUUID(),
        title: `文献 ${i + 1}`,
        minutes: i === 0 ? lit?.minutes ?? 0 : 0,
        content: "",
        style: "minimal",
        placedStickers: [],
      });
    }
  }

  let reflection = defaultJournal().reflection;
  if (typeof raw?.reflection === "string" && raw.reflection.trim()) {
    reflection = {
      ...reflection,
      accomplished: { ...defaultReflectionPart(), content: raw.reflection },
    };
  } else if (raw?.reflection && typeof raw.reflection === "object") {
    reflection = normalizeReflection(raw.reflection);
  }

  return {
    mood: raw?.mood ?? null,
    energy: raw?.energy ?? null,
    sleep: raw?.sleep ?? null,
    studyMinutes: raw?.studyMinutes ?? null,
    papers,
    reflection,
  };
}

function normalizeReflection(r) {
  const base = defaultJournal().reflection;
  if (!r || typeof r !== "object") return base;
  return {
    accomplished: normalizeNotePart(r.accomplished),
    unfinished: normalizeNotePart(r.unfinished),
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
      tasks: (parsed.tasks || []).map((t) => ({
        ...t,
        shapeId: t.shapeId || "rounded",
      })),
      journals,
      settings: defaultSettings(),
    };
  } catch {
    return null;
  }
}

export function loadState() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const migrated = migrateFromV1();
      if (migrated) {
        saveState(migrated);
        return migrated;
      }
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
  } catch {
    return defaultState();
  }
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

export function hasLiterature(journal) {
  return (journal.papers || []).some(
    (p) => p.title?.trim() || p.content?.trim() || (p.minutes && p.minutes > 0)
  );
}

export function hasReflection(journal) {
  const r = journal.reflection;
  const hasStickers = (part) => (part?.placedStickers?.length ?? 0) > 0;
  return (
    r?.accomplished?.content?.trim() ||
    r?.unfinished?.content?.trim() ||
    hasStickers(r?.accomplished) ||
    hasStickers(r?.unfinished)
  );
}
