export const TASK_SHAPES = [
  { id: "rounded", label: "圆角", icon: "▢" },
  { id: "pill", label: "胶囊", icon: "⬭" },
  { id: "paw", label: "猫爪", icon: "🐾" },
  { id: "tag", label: "标签", icon: "🏷" },
  { id: "leaf", label: "叶片", icon: "🍃" },
  { id: "cloud", label: "云朵", icon: "☁" },
  { id: "ribbon", label: "丝带", icon: "🎀" },
];

export function getShape(id) {
  return TASK_SHAPES.find((s) => s.id === id) ?? TASK_SHAPES[0];
}

export function shapeClass(shapeId) {
  return `shape-${shapeId || "rounded"}`;
}
