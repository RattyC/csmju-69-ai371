// ตัวจับเวลาแบบอิง timestamp (endAt) — รีโหลดหน้าแล้วเวลายังเดินถูกต้อง

export function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h} ชม. ${m} นาที`;
  if (m) return `${m} นาที ${s} วินาที`;
  return `${s} วินาที`;
}

/**
 * @param {object} opts
 * @param {number} opts.endAt        เวลาสิ้นสุด (ms epoch)
 * @param {number[]} [opts.alerts]   นาทีที่ต้องแจ้งเตือน เช่น [10, 5]
 * @param {Record<number, boolean>} [opts.alerted] นาทีที่แจ้งไปแล้ว (เก็บใน session)
 * @param {(remainingMs: number) => void} opts.onTick
 * @param {(minutes: number) => void} [opts.onAlert]
 * @param {() => void} opts.onExpire
 */
export function createTimer({ endAt, alerts = [10, 5], alerted = {}, onTick, onAlert, onExpire }) {
  let done = false;
  const tick = () => {
    if (done) return;
    const remaining = endAt - Date.now();
    onTick(remaining);
    for (const min of alerts) {
      if (!alerted[min] && remaining <= min * 60_000 && remaining > 0) {
        alerted[min] = true;
        onAlert?.(min);
      }
    }
    if (remaining <= 0) {
      done = true;
      clearInterval(id);
      onExpire();
    }
  };
  const id = setInterval(tick, 1000);
  tick();
  return {
    stop() {
      done = true;
      clearInterval(id);
    },
  };
}
