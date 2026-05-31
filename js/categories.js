/** 明亮手账色系 · 覆盖学术与生活场景 */
export const CATEGORIES = [
  { id: "research",     label: "实验/研究", color: "#5BA4CF", text: "#ffffff" },
  { id: "reading",      label: "文献阅读",  color: "#61BD73", text: "#ffffff" },
  { id: "writing",      label: "写作撰稿",  color: "#A78BFA", text: "#ffffff" },
  { id: "meeting",      label: "组会/交流", color: "#F59E0B", text: "#ffffff" },
  { id: "exam",         label: "考试/答辩", color: "#F87171", text: "#ffffff" },
  { id: "course",       label: "课程/听课", color: "#38BDF8", text: "#ffffff" },
  { id: "presentation", label: "汇报/演讲", color: "#FB923C", text: "#ffffff" },
  { id: "travel",       label: "出行/差旅", color: "#34D399", text: "#ffffff" },
  { id: "collab",       label: "合作/审稿", color: "#C084FC", text: "#ffffff" },
  { id: "admin",        label: "行政杂务",  color: "#94A3B8", text: "#ffffff" },
  { id: "life",         label: "生活琐事",  color: "#F472B6", text: "#ffffff" },
  { id: "rest",         label: "休息调节",  color: "#2DD4BF", text: "#ffffff" },
];

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}
