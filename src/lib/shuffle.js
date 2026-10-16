// สุ่มลำดับข้อและลำดับตัวเลือก (Fisher–Yates)

export function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * สร้างชุดข้อสอบ
 * @returns {{ order: number[], perm: Record<number, number[]> }}
 *   order = ลำดับ id ของข้อ, perm[id] = ลำดับ index ของตัวเลือกเดิมที่แสดงในแต่ละตำแหน่ง
 */
export function buildSet(questions, { limit } = {}) {
  const order = shuffle(questions.map((q) => q.id)).slice(0, limit ?? questions.length);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const perm = {};
  for (const id of order) {
    perm[id] = shuffle([...byId.get(id).choices.keys()]);
  }
  return { order, perm };
}
