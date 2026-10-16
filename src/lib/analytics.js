// คำนวณคะแนน เกรด และวิเคราะห์จุดแข็ง–จุดอ่อน

export const PASS_PERCENT = 60;
export const STRONG_PERCENT = 80;
export const WEAK_PERCENT = 60;

export const MODE_LABELS = {
  practice: 'โหมดฝึก',
  'exam-timed': 'โหมดสอบ · จับเวลา',
  'exam-untimed': 'โหมดสอบ · ไม่จับเวลา',
};

export function grade(percent) {
  if (percent >= 80) return 'A';
  if (percent >= 75) return 'B+';
  if (percent >= 70) return 'B';
  if (percent >= 65) return 'C+';
  if (percent >= 60) return 'C';
  if (percent >= 50) return 'D';
  return 'F';
}

const pct = (correct, total) => (total ? Math.round((correct / total) * 1000) / 10 : 0);

/**
 * @param {Map<number, any>} qMap  id → question
 * @param {number[]} order         ลำดับข้อที่นับคะแนน
 * @param {Record<number, number>} answers id → index ตัวเลือก (ตามข้อมูลเดิม)
 */
export function scoreAttempt(qMap, order, answers) {
  const byCategory = {};
  const items = [];
  let correct = 0;

  for (const id of order) {
    const q = qMap.get(id);
    if (!q) continue;
    const selected = answers[id] ?? null;
    const ok = selected === q.answer;
    if (ok) correct++;
    const c = (byCategory[q.category] ??= { correct: 0, total: 0, percent: 0 });
    c.total++;
    if (ok) c.correct++;
    items.push({ id, selected, correct: ok });
  }

  for (const c of Object.values(byCategory)) c.percent = pct(c.correct, c.total);
  const percent = pct(correct, items.length);
  const { strong, weak } = splitStrengths(byCategory);

  return {
    total: items.length,
    correct,
    percent,
    grade: grade(percent),
    passed: percent >= PASS_PERCENT,
    byCategory,
    strong,
    weak,
    items,
  };
}

export function splitStrengths(byCategory) {
  const entries = Object.entries(byCategory);
  return {
    strong: entries.filter(([, c]) => c.percent >= STRONG_PERCENT).map(([name]) => name),
    weak: entries.filter(([, c]) => c.percent < WEAK_PERCENT).map(([name]) => name),
  };
}

/** รวมผลทุกครั้งที่ทำ แยกตามหมวด */
export function aggregateHistory(history) {
  const byCategory = {};
  for (const a of history) {
    for (const [name, c] of Object.entries(a.byCategory ?? {})) {
      const t = (byCategory[name] ??= { correct: 0, total: 0, percent: 0 });
      t.correct += c.correct;
      t.total += c.total;
    }
  }
  for (const c of Object.values(byCategory)) c.percent = pct(c.correct, c.total);
  return byCategory;
}

/** id ของข้อที่ "ครั้งล่าสุดที่เจอ" ยังตอบผิดอยู่ */
export function latestWrongIds(history) {
  const last = new Map();
  for (const a of history) for (const it of a.items ?? []) last.set(it.id, it.correct);
  return [...last].filter(([, ok]) => !ok).map(([id]) => id);
}

export function historyStats(history) {
  if (!history.length) return null;
  const p = history.map((a) => a.percent);
  const exams = history.filter((a) => a.mode !== 'practice');
  return {
    count: history.length,
    examCount: exams.length,
    best: Math.max(...p),
    average: Math.round((p.reduce((s, v) => s + v, 0) / p.length) * 10) / 10,
    latest: history[history.length - 1],
  };
}
