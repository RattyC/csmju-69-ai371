// ตรวจคุณภาพคลังข้อสอบ: npm run check:questions
import { readFileSync } from 'node:fs';

const qs = JSON.parse(readFileSync(new URL('../src/data/questions.json', import.meta.url), 'utf8'));
const cats = JSON.parse(readFileSync(new URL('../src/data/categories.json', import.meta.url), 'utf8'));
const errors = [];
const letters = ['ก', 'ข', 'ค', 'ง'];

// 1) โครงสร้าง + answer key ตรงกับ misconceptions (ช่องคำตอบที่ถูกต้องเป็น null)
const ids = new Set();
for (const q of qs) {
  if (ids.has(q.id)) errors.push(`id ซ้ำ: ${q.id}`);
  ids.add(q.id);
  if (!cats.some((c) => c.name === q.category)) errors.push(`#${q.id} หมวดไม่รู้จัก: ${q.category}`);
  if (q.choices.length !== 4) errors.push(`#${q.id} ต้องมี 4 ตัวเลือก`);
  if (!(q.answer >= 0 && q.answer < q.choices.length)) errors.push(`#${q.id} answer อยู่นอกช่วง`);
  if (new Set(q.choices).size !== q.choices.length) errors.push(`#${q.id} ตัวเลือกซ้ำกัน`);
  q.misconceptions?.forEach((m, i) => {
    if (i === q.answer && m !== null) errors.push(`#${q.id} misconception ของข้อถูกต้องต้องเป็น null`);
    if (i !== q.answer && !m) errors.push(`#${q.id} ตัวเลือก ${letters[i]} ไม่มี misconception`);
  });
}
const questionTexts = qs.map((q) => q.question);
if (new Set(questionTexts).size !== questionTexts.length) errors.push('มีคำถามซ้ำกัน');

// 2) การกระจายตำแหน่งคำตอบ
const dist = [0, 0, 0, 0];
qs.forEach((q) => dist[q.answer]++);
console.log(`\nจำนวนข้อ: ${qs.length}`);
console.log('ตำแหน่งคำตอบ:', dist.map((n, i) => `${letters[i]}=${n} (${((n / qs.length) * 100).toFixed(1)}%)`).join('  '));
dist.forEach((n, i) => n / qs.length > 0.35 && errors.push(`ตัวเลือก ${letters[i]} เกิน 35%`));

// 3) ความยาว: ข้อถูกยาวที่สุด (แบบไม่เสมอ) บ่อยแค่ไหน — ถ้าสุ่มจริงควรราว 25%
let longest = 0;
for (const q of qs) {
  const len = q.choices.map((c) => [...c].length);
  const max = Math.max(...len);
  if (len[q.answer] === max && len.filter((l) => l === max).length === 1) longest++;
}
console.log(`ข้อถูกเป็นตัวเลือกที่ยาวที่สุดเพียงตัวเดียว: ${longest}/${qs.length} (${((longest / qs.length) * 100).toFixed(1)}%)`);
if (longest / qs.length > 0.35) errors.push('ข้อถูกยาวที่สุดบ่อยเกินไป (>35%)');

// 4) จำนวนต่อหมวด
const per = {};
qs.forEach((q) => (per[q.category] = (per[q.category] || 0) + 1));
console.log('ต่อหมวด:', per);

// 5) ตรวจโจทย์คำนวณซ้ำด้วยโค้ด
const d = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const near = (a, b) => Math.abs(a - b) < 0.01;
const checks = [
  ['#10', near(d([-2, 1], [1, 5]), 5)],
  ['#11', near(d([2, 1], [5, 3]), Math.sqrt(13))],
  ['#12', (() => { const x = [6, 2]; const r = [[8, 1, 'A'], [2, 8, 'R'], [5, 5, 'R']].map((p) => [d(x, p), p[2]]).sort((a, b) => a[0] - b[0]); return r[0][1] === 'A'; })()],
  ['#13', (() => { const y = [4, 4]; const r = [[8, 1, 'A'], [2, 8, 'R'], [5, 5, 'R'], [3, 2, 'A'], [6, 3, 'A']].map((p) => [d(y, p), p[2]]).sort((a, b) => a[0] - b[0]).slice(0, 3); return r.filter((x) => x[1] === 'A').length === 2; })()],
  ['#18', (() => { const u = [4, 2]; const r = { P: d(u, [5, 2]), Q: d(u, [1, 3]), R: d(u, [4, 5]) }; return near(r.P, 1) && r.P < r.R && r.R < r.Q; })()],
  ['#27', (800 * 600 * 1) / 8 === 60000],
  ['#29', 1920 * ((1920 * 9) / 16) * 3 === 6220800],
  ['#30', 30000 / 3 / 100 === 100],
  ['#31', 2 ** 4 === 16],
  ['#32', Math.min(255, 200 + 80) === 255],
  ['#44', Math.max(0, 2 * 0.5 + 3 * -1 + 1) === 0],
  ['#45', 1 / (1 + Math.exp(0)) === 0.5],
  ['#49', 2000 * 10 === 20000],
  ['#52', (() => { const s = 1 * 0.2 + 0 * 0.9 + 1 * 0.3; return near(s, 0.5) && !(s > 0.6); })()],
];
checks.forEach(([name, ok]) => !ok && errors.push(`โจทย์คำนวณ ${name} ไม่ตรงกับเฉลย`));
console.log(`ตรวจโจทย์คำนวณ: ${checks.filter((c) => c[1]).length}/${checks.length} ผ่าน`);

if (errors.length) {
  console.error('\nพบปัญหา:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('\nผ่านทุกการตรวจ');
