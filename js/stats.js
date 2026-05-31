import { CATEGORIES } from "./categories.js";

const MOOD_TEXT   = ["", "很低落", "略低落", "平静", "不错", "很好"];
const ENERGY_TEXT = ["", "极低",   "较低",   "一般", "较好", "充沛"];
const SLEEP_TEXT  = ["", "很差",   "较差",   "一般", "较好", "很好"];
const WEEKDAY_SHORT = ["周日","周一","周二","周三","周四","周五","周六"];

/* ── 工具 ─────────────────────────────────── */

function getDayKeys(days) {
  const keys = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    keys.push({ key: `${y}-${m}-${day}`, date: d });
  }
  return keys;
}

/** x轴标签：7天用周几，30天用月/日 */
function xLabels(dayKeys, n) {
  const labelCount = Math.min(n, 7);
  const indices = new Set([0, n - 1]);
  for (let i = 1; i < labelCount - 1; i++) {
    indices.add(Math.round(i * (n - 1) / (labelCount - 1)));
  }
  return [...indices].sort((a, b) => a - b).map(i => {
    const d = dayKeys[i].date;
    const label = n <= 7
      ? WEEKDAY_SHORT[d.getDay()]
      : `${d.getMonth() + 1}/${d.getDate()}`;
    return { i, label };
  });
}

/* ── 数据计算 ──────────────────────────────── */

function computeStats(state, days) {
  const dayKeys = getDayKeys(days);
  const allTasks = state.tasks || [];
  const journals = state.journals || {};

  let totalTasks = 0, doneTasks = 0;
  let moodSum = 0, moodCount = 0;
  let energySum = 0, energyCount = 0;
  let sleepSum = 0, sleepCount = 0;
  let litMinutes = 0, litPapers = 0;
  let studyTotal = 0, studyDays = 0;
  let activeDays = 0, streak = 0;

  const dailyRates   = [];
  const dailyMoods   = [];
  const dailyEnergy  = [];
  const dailySleep   = [];
  const dailyStudy   = [];
  const catCount = {};
  CATEGORIES.forEach(c => { catCount[c.id] = 0; });

  dayKeys.forEach(({ key, date }) => {
    const dayTasks = allTasks.filter(t => t.date === key);
    const j = journals[key];
    const total = dayTasks.length;
    const done  = dayTasks.filter(t => t.completed).length;

    totalTasks += total;
    doneTasks  += done;
    dailyRates.push({ key, date, total, done, rate: total > 0 ? Math.round((done / total) * 100) : null });
    dayTasks.forEach(t => { if (catCount[t.categoryId] !== undefined) catCount[t.categoryId]++; });

    if (j) {
      activeDays++;
      if (j.mood   != null) { moodSum   += j.mood;   moodCount++;   }
      if (j.energy != null) { energySum += j.energy; energyCount++; }
      if (j.sleep  != null) { sleepSum  += j.sleep;  sleepCount++;  }
      if (j.studyMinutes != null && j.studyMinutes > 0) {
        studyTotal += j.studyMinutes;
        studyDays++;
      }
      if (j.papers) {
        litPapers += j.papers.length;
        j.papers.forEach(p => { litMinutes += Number(p.minutes) || 0; });
      }
    }
    dailyMoods.push ({ key, date, val: j?.mood          ?? null });
    dailyEnergy.push({ key, date, val: j?.energy        ?? null });
    dailySleep.push ({ key, date, val: j?.sleep         ?? null });
    dailyStudy.push ({ key, date, val: j?.studyMinutes  ?? null });
  });

  // 连续打卡（从今天往前）
  const sortedKeys = [...dayKeys].reverse();
  for (const { key } of sortedKeys) {
    const hasData = allTasks.some(t => t.date === key) || journals[key];
    if (hasData) streak++; else break;
  }

  const catDist = CATEGORIES
    .map(c => ({ ...c, count: catCount[c.id] || 0 }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    totalTasks, doneTasks,
    completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
    avgMood:   moodCount   > 0 ? (moodSum   / moodCount).toFixed(1)   : null,
    avgEnergy: energyCount > 0 ? (energySum / energyCount).toFixed(1) : null,
    avgSleep:  sleepCount  > 0 ? (sleepSum  / sleepCount).toFixed(1)  : null,
    studyTotal, studyDays,
    activeDays, streak, litMinutes, litPapers,
    dailyRates, dailyMoods, dailyEnergy, dailySleep, dailyStudy,
    catDist, days, dayKeys,
  };
}

/* ── 关联分析 ──────────────────────────────── */

/**
 * 计算两个数值数组的 Pearson 相关系数（忽略任一为 null 的天）
 * 返回 { r, n } 其中 r ∈ [-1,1]，n 为有效样本数
 */
function pearson(xs, ys) {
  const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => x != null && y != null);
  const n = pairs.length;
  if (n < 3) return { r: null, n };
  const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
  const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  pairs.forEach(([x, y]) => {
    const a = x - mx, b = y - my;
    num += a * b; dx2 += a * a; dy2 += b * b;
  });
  const denom = Math.sqrt(dx2 * dy2);
  return { r: denom < 1e-9 ? 0 : num / denom, n };
}

/**
 * 计算"昨日 X → 今日 Y"的滞后相关
 */
function laggedPearson(xSeries, ySeries) {
  const xs = xSeries.slice(0, -1).map(d => d.val);
  const ys = ySeries.slice(1).map(d => d.val);
  return pearson(xs, ys);
}

function corrLabel(r) {
  if (r === null) return null;
  const abs = Math.abs(r);
  const dir = r > 0 ? "正相关" : "负相关";
  if (abs >= 0.6) return `较强${dir}`;
  if (abs >= 0.35) return `中等${dir}`;
  if (abs >= 0.15) return `弱${dir}`;
  return "几乎无关联";
}

function corrColor(r) {
  if (r === null) return "var(--text-muted)";
  const abs = Math.abs(r);
  if (abs >= 0.6) return r > 0 ? "#61BD73" : "#F87171";
  if (abs >= 0.35) return r > 0 ? "#38BDF8" : "#FB923C";
  return "var(--text-muted)";
}

function buildCorrelations(s) {
  const mood   = s.dailyMoods;
  const energy = s.dailyEnergy;
  const sleep  = s.dailySleep;
  const study  = s.dailyStudy;
  const rates  = s.dailyRates.map(d => ({ ...d, val: d.rate }));

  const pairs = [
    {
      label: "睡眠 → 次日精力",
      desc: "昨晚睡好，今天精力是否更好？",
      emoji: "🌙→⚡",
      ...laggedPearson(sleep, energy),
    },
    {
      label: "睡眠 → 次日情绪",
      desc: "睡眠质量与次日心情的关系",
      emoji: "🌙→😊",
      ...laggedPearson(sleep, mood),
    },
    {
      label: "精力 → 学习时长",
      desc: "精力充沛的天，学得更久吗？",
      emoji: "⚡→⏱",
      ...pearson(energy.map(d => d.val), study.map(d => d.val)),
    },
    {
      label: "精力 → 完成率",
      desc: "精力好时任务完成得更多？",
      emoji: "⚡→✅",
      ...pearson(energy.map(d => d.val), rates.map(d => d.val)),
    },
    {
      label: "学习时长 → 情绪",
      desc: "学得多的天，心情会更好还是更差？",
      emoji: "⏱→😊",
      ...pearson(study.map(d => d.val), mood.map(d => d.val)),
    },
    {
      label: "情绪 → 完成率",
      desc: "心情好时任务完成率更高？",
      emoji: "😊→✅",
      ...pearson(mood.map(d => d.val), rates.map(d => d.val)),
    },
  ];

  return pairs;
}

function buildGuidance(corrs, s) {
  const tips = [];
  const minN = 5;

  // 睡眠→精力
  const sleepEnergy = corrs.find(c => c.label === "睡眠 → 次日精力");
  if (sleepEnergy?.n >= minN && sleepEnergy.r !== null) {
    if (sleepEnergy.r >= 0.35) {
      tips.push({ icon: "🌙", text: `你的睡眠质量与次日精力有明显正向关联（r=${sleepEnergy.r.toFixed(2)}）。保证睡眠是提升次日状态最直接的杠杆。` });
    } else if (sleepEnergy.r < 0) {
      tips.push({ icon: "🌙", text: `数据显示睡眠与次日精力关联较弱甚至反向，可能还有其他影响精力的因素值得关注。` });
    }
  }

  // 精力→学习时长
  const energyStudy = corrs.find(c => c.label === "精力 → 学习时长");
  if (energyStudy?.n >= minN && energyStudy.r !== null) {
    if (energyStudy.r >= 0.35) {
      tips.push({ icon: "⚡", text: `精力越好学习越久（r=${energyStudy.r.toFixed(2)}）。可以把高难度任务安排在精力预期较好的天。` });
    } else if (Math.abs(energyStudy.r) < 0.15) {
      tips.push({ icon: "⚡", text: `你的学习时长受精力影响不大——说明你有不错的自律能力，或者有其他驱动力在支撑学习。` });
    }
  }

  // 学习时长→情绪
  const studyMood = corrs.find(c => c.label === "学习时长 → 情绪");
  if (studyMood?.n >= minN && studyMood.r !== null) {
    if (studyMood.r <= -0.35) {
      tips.push({ icon: "⏱", text: `学习越多、情绪反而越低（r=${studyMood.r.toFixed(2)}）。留意是否存在过度学习消耗的情况，适当安排休息和非学习活动。` });
    } else if (studyMood.r >= 0.35) {
      tips.push({ icon: "⏱", text: `学习时长与情绪正相关（r=${studyMood.r.toFixed(2)}），学习本身对你有积极的情绪反馈，保持节奏！` });
    }
  }

  // 情绪→完成率
  const moodRate = corrs.find(c => c.label === "情绪 → 完成率");
  if (moodRate?.n >= minN && moodRate.r !== null && moodRate.r >= 0.35) {
    tips.push({ icon: "😊", text: `情绪状态与任务完成率有明显关联（r=${moodRate.r.toFixed(2)}）。情绪低落的天可以主动减少任务量，避免挫败感积累。` });
  }

  // 数据不足
  const maxN = Math.max(...corrs.map(c => c.n));
  if (maxN < minN) {
    tips.push({ icon: "📊", text: `目前有效数据点较少（最多 ${maxN} 天），关联分析仅供参考。多记录几周后结论会更可靠。` });
  }

  // 通用
  if (s.avgSleep !== null && parseFloat(s.avgSleep) <= 2.5) {
    tips.push({ icon: "🛌", text: `近期平均睡眠质量偏低（${s.avgSleep}/5），这可能是影响精力和情绪的共同原因，值得优先改善。` });
  }

  if (!tips.length) {
    tips.push({ icon: "🌱", text: `继续记录数据，当积累足够多天后，这里会给出个性化的规律分析和建议。` });
  }

  return tips;
}

/* ── 洞察文案 ──────────────────────────────── */

function generateInsight(s) {
  if (s.totalTasks === 0) return "这段时间还没有任务记录，赶快开始规划吧！每一步都算数 ✨";
  const lines = [];
  if (s.completionRate >= 80) lines.push(`完成率 ${s.completionRate}%，表现非常棒！`);
  else if (s.completionRate >= 50) lines.push(`完成率 ${s.completionRate}%，继续保持～`);
  else lines.push(`完成率 ${s.completionRate}%，任务有点多，下次可以少安排几项。`);

  if (s.streak >= 5) lines.push(`已连续记录 ${s.streak} 天 🔥`);
  else if (s.streak >= 2) lines.push(`连续记录 ${s.streak} 天，坚持下去！`);

  if (s.avgMood !== null && parseFloat(s.avgMood) <= 2.5)
    lines.push("情绪有些低落，记得休息和照顾自己 🌱");

  if (s.avgSleep !== null && parseFloat(s.avgSleep) <= 2.5)
    lines.push("睡眠质量较差，注意保证休息时间 🌙");

  if (s.studyTotal > 0) {
    const avg = s.studyDays > 0 ? Math.round(s.studyTotal / s.studyDays) : 0;
    lines.push(`累计学习 ${s.studyTotal >= 60 ? (s.studyTotal/60).toFixed(1)+"小时" : s.studyTotal+"分钟"}，有记录日均 ${avg} 分钟 ⏱`);
  }
  if (s.litMinutes > 0) lines.push(`共读文献 ${s.litPapers} 篇，累计 ${s.litMinutes} 分钟 📚`);

  return lines.join("　");
}

/* ── SVG 折线图（通用） ─────────────────────── */

function buildLineChartSvg({ data, dayKeys, yMax, yFormat, color, areaColor, days }) {
  const W = 300, H = 80, PAD = { l: 36, r: 8, t: 8, b: 18 };
  const inner = { w: W - PAD.l - PAD.r, h: H - PAD.t - PAD.b };
  const n = data.length;
  const xs = data.map((_, i) => PAD.l + (i / Math.max(n - 1, 1)) * inner.w);

  const pts = data.map((d, i) => ({
    x: xs[i],
    y: d != null ? PAD.t + inner.h - (d / yMax) * inner.h : null,
    val: d,
  }));
  const valid = pts.filter(p => p.y != null);
  const polyline = valid.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = valid.length > 1
    ? `M${valid[0].x.toFixed(1)},${(PAD.t+inner.h).toFixed(1)} ` +
      valid.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
      ` L${valid[valid.length-1].x.toFixed(1)},${(PAD.t+inner.h).toFixed(1)} Z`
    : "";

  // y 轴三条刻度
  const yMarks = [0, yMax / 2, yMax];
  const labels = xLabels(dayKeys, n);

  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:90px">
    <line x1="${PAD.l}" y1="${PAD.t}" x2="${PAD.l}" y2="${PAD.t+inner.h}" stroke="var(--border)" stroke-width="0.8"/>
    ${yMarks.map(v => {
      const y = PAD.t + inner.h - (v / yMax) * inner.h;
      return `<line x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${W-PAD.r}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="0.6" stroke-dasharray="3,3"/>
              <text x="${PAD.l-3}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="7" fill="var(--text-muted)">${yFormat(v)}</text>`;
    }).join("")}
    ${area ? `<path d="${area}" fill="${areaColor}"/>` : ""}
    ${valid.length > 1 ? `<polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>` : ""}
    ${valid.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="#fff" stroke="${color}" stroke-width="1.5"/>`).join("")}
    ${labels.map(({ i, label }) =>
      `<text x="${xs[i].toFixed(1)}" y="${H}" text-anchor="middle" font-size="7" fill="var(--text-muted)">${label}</text>`
    ).join("")}
  </svg>`;
}

function buildLineChart(dailyRates, dayKeys, days) {
  return buildLineChartSvg({
    data: dailyRates.map(d => d.rate),
    dayKeys,
    yMax: 100,
    yFormat: v => `${v}%`,
    color: "var(--accent)",
    areaColor: "rgba(212,160,152,0.13)",
    days,
  });
}

function buildStudyChart(dailyStudy, dayKeys, days) {
  const vals = dailyStudy.map(d => d.val).filter(v => v != null);
  const maxVal = vals.length ? Math.max(60, ...vals) : 60;
  return buildLineChartSvg({
    data: dailyStudy.map(d => d.val),
    dayKeys,
    yMax: maxVal,
    yFormat: v => v >= 60 ? `${(v/60).toFixed(1)}h` : `${Math.round(v)}m`,
    color: "#88b5a8",
    areaColor: "rgba(136,181,168,0.15)",
    days,
  });
}

/* ── 情绪/精力/睡眠条形 ─────────────────────── */

function buildMoodBars(dailyMoods, dailyEnergy, dailySleep) {
  const n = dailyMoods.length;
  const slice  = n > 7 ? dailyMoods.slice(-7)  : dailyMoods;
  const eSlice = n > 7 ? dailyEnergy.slice(-7) : dailyEnergy;
  const sSlice = n > 7 ? dailySleep.slice(-7)  : dailySleep;

  return slice.map((d, i) => {
    const e  = eSlice[i];
    const sl = sSlice[i];
    const wd = n <= 7
      ? WEEKDAY_SHORT[d.date.getDay()]
      : `${d.date.getMonth()+1}/${d.date.getDate()}`;
    const moodPct  = d.val  != null ? Math.round((d.val  / 5) * 100) : 0;
    const engPct   = e.val  != null ? Math.round((e.val  / 5) * 100) : 0;
    const sleepPct = sl.val != null ? Math.round((sl.val / 5) * 100) : 0;
    const moodEmoji  = d.val  != null ? ["😫","😕","😐","🙂","😊"][d.val - 1] : "—";
    const sleepEmoji = sl.val != null ? ["😵","😪","😑","😴","😌"][sl.val - 1] : "—";
    return `<div class="stats-bar-row">
      <span class="stats-bar-day">${wd}</span>
      <div class="stats-bar-wrap" title="情绪">
        <div class="stats-bar mood-bar-fill" style="width:${moodPct}%">
          <span class="stats-bar-label">${moodEmoji}${d.val != null ? " "+d.val : ""}</span>
        </div>
      </div>
      <div class="stats-bar-wrap" title="精力">
        <div class="stats-bar energy-bar-fill" style="width:${engPct}%">
          <span class="stats-bar-label" style="color:var(--accent)">${e.val != null ? ENERGY_TEXT[e.val] : "—"}</span>
        </div>
      </div>
      <div class="stats-bar-wrap" title="睡眠">
        <div class="stats-bar sleep-bar-fill" style="width:${sleepPct}%">
          <span class="stats-bar-label">${sleepEmoji}${sl.val != null ? " "+SLEEP_TEXT[sl.val] : ""}</span>
        </div>
      </div>
    </div>`;
  }).join("");
}

/* ── 环形图 ──────────────────────────────────── */

function buildDonut(catDist, total) {
  if (!catDist.length || total === 0) {
    return `<svg viewBox="0 0 80 80" style="width:80px;height:80px">
      <circle cx="40" cy="40" r="30" fill="none" stroke="var(--border)" stroke-width="14"/>
      <text x="40" y="44" text-anchor="middle" font-size="9" fill="var(--text-muted)">暂无</text>
    </svg>`;
  }
  const R = 30, CX = 40, CY = 40, circ = 2 * Math.PI * R;
  let offset = 0;
  const segs = catDist.slice(0, 5).map(c => {
    const dash = (c.count / total) * circ;
    const s = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${c.color}" stroke-width="14"
      stroke-dasharray="${dash.toFixed(2)} ${circ.toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 ${CX} ${CY})"/>`;
    offset += dash;
    return s;
  });
  return `<svg viewBox="0 0 80 80" style="width:80px;height:80px;flex-shrink:0">
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--border)" stroke-width="14"/>
    ${segs.join("")}
    <text x="${CX}" y="${CY+4}" text-anchor="middle" font-size="9" fill="var(--text-muted)">${total}项</text>
  </svg>`;
}

/* ── 关联分析卡片 ─────────────────────────────── */

function buildCorrCard(corrs) {
  const rows = corrs.map(c => {
    const label = c.n < 3
      ? `<span style="color:var(--text-muted);font-size:0.75rem">数据不足（${c.n}天）</span>`
      : `<span style="color:${corrColor(c.r)};font-weight:600">${corrLabel(c.r)}</span>
         <span style="color:var(--text-muted);font-size:0.72rem;margin-left:4px">${c.r != null ? `r=${c.r.toFixed(2)}` : ""}</span>`;
    return `<div class="corr-row">
      <div class="corr-emoji">${c.emoji}</div>
      <div class="corr-body">
        <div class="corr-label">${c.label}</div>
        <div class="corr-desc">${c.desc}</div>
      </div>
      <div class="corr-result">${label}</div>
    </div>`;
  }).join("");

  return `<div class="corr-card">
    <div class="stats-chart-title">数据关联分析
      <span class="corr-disclaimer">· 样本量小，仅供参考</span>
    </div>
    ${rows}
  </div>`;
}

function buildGuidanceCard(tips) {
  const items = tips.map(t =>
    `<div class="guidance-item">
      <span class="guidance-icon">${t.icon}</span>
      <p class="guidance-text">${t.text}</p>
    </div>`
  ).join("");
  return `<div class="guidance-card">
    <div class="stats-chart-title">个性化建议 <span class="corr-disclaimer">· 基于你的数据规律，客观呈现</span></div>
    ${items}
  </div>`;
}

/* ── 主渲染 ──────────────────────────────────── */

export function renderStats(container, state, days) {
  const s = computeStats(state, days);
  const corrs    = buildCorrelations(s);
  const guidance = buildGuidance(corrs, s);
  const insight  = generateInsight(s);

  const lineChart  = buildLineChart(s.dailyRates, s.dayKeys, days);
  const studyChart = buildStudyChart(s.dailyStudy, s.dayKeys, days);
  const moodBars   = buildMoodBars(s.dailyMoods, s.dailyEnergy, s.dailySleep);
  const donut      = buildDonut(s.catDist, s.totalTasks);

  // 卡片数值
  const fmt = (v, suffix) => v != null ? `${v} / 5` : "未记录";
  const avgMoodText   = fmt(s.avgMood);
  const avgMoodSub    = s.avgMood   ? MOOD_TEXT[Math.round(parseFloat(s.avgMood))]   : "—";
  const avgEnergyText = fmt(s.avgEnergy);
  const avgEnergySub  = s.avgEnergy ? ENERGY_TEXT[Math.round(parseFloat(s.avgEnergy))] : "—";
  const avgSleepText  = fmt(s.avgSleep);
  const avgSleepSub   = s.avgSleep  ? SLEEP_TEXT[Math.round(parseFloat(s.avgSleep))]  : "—";
  const studyText     = s.studyTotal > 0
    ? (s.studyTotal >= 60 ? `${(s.studyTotal/60).toFixed(1)} 小时` : `${s.studyTotal} 分钟`)
    : "0 分钟";
  const studySub      = s.studyDays > 0
    ? `日均 ${Math.round(s.studyTotal/s.studyDays)} 分钟`
    : "暂无记录";
  const streakText    = s.streak > 0 ? `${s.streak} 天 🔥` : "0 天";
  const streakSub     = s.streak >= 3 ? "打卡习惯养成中！" : "每天记一点";
  const litText       = s.litPapers > 0 ? `${s.litPapers} 篇` : "0 篇";
  const litSub        = s.litMinutes > 0 ? `累计 ${s.litMinutes} 分钟` : "暂无记录";

  const top5 = s.catDist.slice(0, 5);
  const legendHTML = top5.length
    ? top5.map(c => {
        const pct = s.totalTasks > 0 ? Math.round((c.count / s.totalTasks) * 100) : 0;
        return `<div class="stats-legend-item">
          <span class="stats-legend-dot" style="background:${c.color}"></span>
          <span class="stats-legend-label">${c.label}</span>
          <span class="stats-legend-pct">${pct}%</span>
        </div>`;
      }).join("")
    : `<div style="font-size:0.8rem;color:var(--text-muted)">暂无数据</div>`;

  container.innerHTML = `<div class="stats-view">

    <!-- 时间范围 -->
    <div class="stats-range-bar">
      <span class="stats-range-label">数据概览</span>
      <div class="stats-range-toggle">
        <button class="stats-range-btn${days===7?" active":""}" data-range="7">近7天</button>
        <button class="stats-range-btn${days===30?" active":""}" data-range="30">近30天</button>
      </div>
    </div>

    <!-- 指标卡片 -->
    <div class="stats-metrics">
      <div class="stats-card">
        <div class="stats-card-label">✅ 任务完成率</div>
        <div class="stats-card-value">${s.completionRate}%</div>
        <div class="stats-card-sub">${s.doneTasks} / ${s.totalTasks} 项</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-label">📅 连续打卡</div>
        <div class="stats-card-value">${streakText}</div>
        <div class="stats-card-sub">${streakSub}</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-label">😊 平均情绪</div>
        <div class="stats-card-value">${avgMoodText}</div>
        <div class="stats-card-sub">${avgMoodSub}</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-label">⚡ 平均精力</div>
        <div class="stats-card-value">${avgEnergyText}</div>
        <div class="stats-card-sub">${avgEnergySub}</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-label">🌙 平均睡眠</div>
        <div class="stats-card-value">${avgSleepText}</div>
        <div class="stats-card-sub">${avgSleepSub}</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-label">⏱ 累计学习</div>
        <div class="stats-card-value">${studyText}</div>
        <div class="stats-card-sub">${studySub}</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-label">📚 文献阅读</div>
        <div class="stats-card-value">${litText}</div>
        <div class="stats-card-sub">${litSub}</div>
      </div>
    </div>

    <!-- 折线图 -->
    <div class="stats-charts">
      <div class="stats-chart-card">
        <div class="stats-chart-title">每日任务完成率</div>
        ${lineChart}
      </div>
      <div class="stats-chart-card">
        <div class="stats-chart-title">每日学习时长 ⏱</div>
        ${studyChart}
      </div>
    </div>

    <!-- 状态条形（最近7天，30天模式也只看近7天更清晰） -->
    <div class="stats-chart-card stats-chart-card-wide">
      <div class="stats-chart-title">情绪 😊 · 精力 ⚡ · 睡眠 🌙（近 ${Math.min(days,7)} 天）</div>
      <div class="stats-bar-legend">
        <span class="stats-bar-legend-dot mood-dot"></span>情绪
        <span class="stats-bar-legend-dot energy-dot" style="margin-left:10px"></span>精力
        <span class="stats-bar-legend-dot sleep-dot" style="margin-left:10px"></span>睡眠
      </div>
      <div class="stats-bars">${moodBars}</div>
    </div>

    <!-- 关联分析 + 建议 -->
    <div class="stats-corr-row">
      ${buildCorrCard(corrs)}
      ${buildGuidanceCard(guidance)}
    </div>

    <!-- 底部：类型占比 + 智能小结 -->
    <div class="stats-bottom">
      <div class="stats-chart-card stats-donut-card">
        <div class="stats-chart-title">任务类型分布</div>
        <div class="stats-donut-row">
          ${donut}
          <div class="stats-legend">${legendHTML}</div>
        </div>
      </div>
      <div class="stats-insight-card">
        <div class="stats-insight-icon">🌱</div>
        <div>
          <div class="stats-insight-title">近期小结</div>
          <div class="stats-insight-body">${insight}</div>
        </div>
      </div>
    </div>

  </div>`;
}
