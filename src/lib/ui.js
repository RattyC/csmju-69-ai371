// ตัวช่วยเรนเดอร์ฝั่ง client ที่ทุกหน้าใช้ร่วมกัน
import categories from '../data/categories.json';
import { STRONG_PERCENT, WEAK_PERCENT, PASS_PERCENT } from './analytics.js';

export const LETTERS = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'];
export const CATEGORY_BY_NAME = new Map(categories.map((c) => [c.name, c]));
export const CATEGORY_BY_ID = new Map(categories.map((c) => [c.id, c]));
const DIFFICULTY = { easy: 'ง่าย', medium: 'ปานกลาง', hard: 'ยาก' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

export function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/* ---------- Question card ---------- */

/**
 * เติมข้อมูลลงใน QuestionCard.astro
 * @param {HTMLElement} card
 * @param {{ q: any, perm: number[], number: number, total: number, selected: number|null, reveal: boolean, flagged?: boolean }} s
 */
export function renderQuestion(card, s) {
  const { q, perm, number, total, selected, reveal } = s;
  card.querySelector('[data-q-number]').textContent = `ข้อ ${number} / ${total}`;
  card.querySelector('[data-q-category]').textContent = q.category;
  card.querySelector('[data-q-difficulty]').textContent = DIFFICULTY[q.difficulty] ?? q.difficulty;
  const text = card.querySelector('[data-q-text]');
  text.textContent = q.question;

  const flag = card.querySelector('[data-q-flag]');
  if (flag) flag.hidden = !s.flagged;

  card.querySelectorAll('[data-choice]').forEach((btn, pos) => {
    const orig = perm[pos];
    if (orig === undefined) {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    btn.dataset.orig = String(orig);
    btn.querySelector('[data-choice-text]').textContent = q.choices[orig];

    let state = 'idle';
    let sr = '';
    if (reveal) {
      if (orig === q.answer) {
        state = 'correct';
        sr = ' (คำตอบที่ถูก)';
      } else if (orig === selected) {
        state = 'wrong';
        sr = ' (คำตอบของคุณ ไม่ถูกต้อง)';
      } else state = 'dim';
    } else if (orig === selected) {
      state = 'selected';
      sr = ' (เลือกแล้ว)';
    }
    btn.dataset.state = state;
    btn.setAttribute('aria-pressed', String(orig === selected));
    btn.setAttribute('aria-disabled', String(reveal));
    btn.querySelector('[data-choice-sr]').textContent = sr;
  });

  const feedback = card.querySelector('[data-q-feedback]');
  if (!reveal) {
    feedback.hidden = true;
    feedback.innerHTML = '';
    return;
  }
  feedback.hidden = false;
  feedback.innerHTML = feedbackHtml(q, perm, selected);
}

function feedbackHtml(q, perm, selected) {
  const letterOf = (orig) => LETTERS[perm.indexOf(orig)];
  const ok = selected === q.answer;
  const skipped = selected === null || selected === undefined;
  const verdict = ok
    ? '<p class="font-semibold text-emerald-700 dark:text-emerald-400">ถูกต้อง</p>'
    : `<p class="font-semibold text-rose-700 dark:text-rose-400">${skipped ? 'ไม่ได้ตอบ' : 'ยังไม่ถูก'} — คำตอบที่ถูกคือ ${letterOf(q.answer)}.</p>`;

  const why =
    !ok && !skipped && q.misconceptions?.[selected]
      ? `<p class="mt-3 text-sm leading-relaxed"><span class="font-medium">ทำไม ${letterOf(selected)}. ถึงผิด:</span> ${escapeHtml(q.misconceptions[selected])}</p>`
      : '';

  const others = (q.misconceptions ?? [])
    .map((m, orig) => ({ m, orig }))
    .filter(({ m, orig }) => m && orig !== selected)
    .sort((a, b) => perm.indexOf(a.orig) - perm.indexOf(b.orig))
    .map(({ m, orig }) => `<li><span class="font-medium">${letterOf(orig)}.</span> ${escapeHtml(m)}</li>`)
    .join('');

  return `
    <div class="anim-in rounded-xl border px-4 py-4 sm:px-5 ${ok ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/40' : 'border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/40'}">
      ${verdict}
      <p class="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">${escapeHtml(q.explanation)}</p>
      ${why}
      ${others ? `<details class="mt-3 text-sm"><summary class="cursor-pointer select-none font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">ดูเหตุผลของตัวเลือกอื่น</summary><ul class="mt-2 space-y-1.5 leading-relaxed text-zinc-600 dark:text-zinc-400">${others}</ul></details>` : ''}
    </div>`;
}

/* ---------- Progress bar ---------- */

export function setProgress(root, value, max, label) {
  if (!root) return;
  const percent = max ? Math.round((value / max) * 100) : 0;
  const bar = root.querySelector('[data-progress-bar]');
  bar.style.width = `${percent}%`;
  bar.setAttribute('aria-valuenow', String(percent));
  const text = root.querySelector('[data-progress-text]');
  if (text) text.textContent = label ?? `${value} / ${max}`;
}

/* ---------- Category bars (WeaknessChart.astro) ---------- */

export function renderCategoryBars(el, byCategory) {
  const rows = categories.filter((c) => byCategory[c.name]);
  if (!rows.length) {
    el.innerHTML = '<p class="text-sm text-zinc-500 dark:text-zinc-400">ยังไม่มีข้อมูล</p>';
    return;
  }
  el.innerHTML = rows
    .map((c) => {
      const d = byCategory[c.name];
      const tone = d.percent >= STRONG_PERCENT ? 'strong' : d.percent < WEAK_PERCENT ? 'weak' : 'mid';
      const fill = { strong: 'bg-emerald-600 dark:bg-emerald-500', weak: 'bg-rose-600 dark:bg-rose-500', mid: 'bg-indigo-600 dark:bg-indigo-400' }[tone];
      const tag = {
        strong: '<span class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">จุดแข็ง</span>',
        weak: '<span class="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">จุดอ่อน</span>',
        mid: '',
      }[tone];
      return `
        <div>
          <div class="flex items-baseline justify-between gap-3">
            <div class="min-w-0">
              <p class="flex items-center gap-2 font-medium">${escapeHtml(c.name)} ${tag}</p>
              <p class="truncate text-xs text-zinc-500 dark:text-zinc-400">${escapeHtml(c.nameTh)}</p>
            </div>
            <p class="shrink-0 text-sm tabular-nums text-zinc-600 dark:text-zinc-300">${d.correct}/${d.total} · <span class="font-semibold text-zinc-900 dark:text-zinc-100">${d.percent}%</span></p>
          </div>
          <div class="relative mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" role="img" aria-label="${escapeHtml(c.name)} ${d.percent} เปอร์เซ็นต์">
            <div class="bar-grow h-full rounded-full ${fill}" style="width:${d.percent}%"></div>
            <span class="absolute inset-y-0 w-px bg-zinc-400/60 dark:bg-zinc-500/60" style="left:${WEAK_PERCENT}%"></span>
            <span class="absolute inset-y-0 w-px bg-zinc-400/60 dark:bg-zinc-500/60" style="left:${STRONG_PERCENT}%"></span>
          </div>
        </div>`;
    })
    .join('');
}

/* ---------- Trend chart (history) ---------- */

export function renderTrendChart(el, attempts) {
  const data = attempts.slice(-20);
  if (!data.length) {
    el.innerHTML = '<p class="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">ทำข้อสอบอย่างน้อย 1 ครั้งเพื่อดูแนวโน้ม</p>';
    return;
  }
  const W = 640, H = 220, L = 36, R = 14, T = 14, B = 26;
  const iw = W - L - R, ih = H - T - B;
  const x = (i) => L + (data.length === 1 ? iw / 2 : (i * iw) / (data.length - 1));
  const y = (v) => T + ((100 - v) / 100) * ih;

  const grid = [0, 20, 40, 60, 80, 100]
    .map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="stroke-zinc-200 dark:stroke-zinc-800" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="fill-zinc-500 dark:fill-zinc-400" font-size="11">${v}</text>`)
    .join('');
  const pass = `<line x1="${L}" x2="${W - R}" y1="${y(PASS_PERCENT)}" y2="${y(PASS_PERCENT)}" class="stroke-rose-500" stroke-width="1.25" stroke-dasharray="5 4"/><text x="${W - R}" y="${y(PASS_PERCENT) - 6}" text-anchor="end" class="fill-rose-600 dark:fill-rose-400" font-size="11">เกณฑ์ผ่าน ${PASS_PERCENT}%</text>`;
  const path = data.map((a, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(a.percent).toFixed(1)}`).join(' ');
  const dots = data
    .map((a, i) => {
      const exam = a.mode !== 'practice';
      return `<circle cx="${x(i)}" cy="${y(a.percent)}" r="${exam ? 4.5 : 3.5}" class="${exam ? 'fill-indigo-600 dark:fill-indigo-400' : 'fill-white stroke-indigo-600 dark:fill-zinc-950 dark:stroke-indigo-400'}" stroke-width="2"><title>${escapeHtml(formatDate(a.date))} · ${a.percent}%</title></circle>`;
    })
    .join('');
  const labels = data
    .map((a, i) => (data.length <= 10 || i % Math.ceil(data.length / 10) === 0 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" class="fill-zinc-500 dark:fill-zinc-400" font-size="11">#${attempts.length - data.length + i + 1}</text>` : ''))
    .join('');
  const first = data[0].percent, last = data[data.length - 1].percent;
  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="h-auto w-full" role="img" aria-label="แนวโน้มคะแนน ${data.length} ครั้งล่าสุด จาก ${first}% เป็น ${last}%">
      ${grid}${pass}
      <path d="${path}" fill="none" class="stroke-indigo-600 dark:stroke-indigo-400" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}${labels}
    </svg>`;
}

/* ---------- Toast ---------- */

export function toast(message, { tone = 'info', assertive = false } = {}) {
  const region = document.getElementById(assertive ? 'toast-alert' : 'toast-status');
  if (!region) return;
  const el = document.createElement('div');
  const tones = {
    info: 'border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100',
    warn: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100',
  };
  el.className = `toast pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${tones[tone]}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.classList.add('toast-out'), tone === 'warn' ? 6000 : 3200);
  setTimeout(() => el.remove(), tone === 'warn' ? 6400 : 3600);
}

/* ---------- Scroll (Lenis-aware) ---------- */

export function scrollToEl(el, offset = -88) {
  if (!el) return;
  const lenis = window.__lenis;
  if (lenis) lenis.scrollTo(el, { offset, duration: 0.6 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' });
}

/* ---------- Keyboard shortcuts ---------- */

/**
 * 1–4 = เลือกตัวเลือก, Enter = ข้อถัดไป, ←/→ = เปลี่ยนข้อ
 * @param {{ isActive: () => boolean, onChoice: (pos: number) => void, onNext: () => void, onPrev: () => void, onEnter?: () => void }} h
 */
export function bindShortcuts(h) {
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    if (!h.isActive()) return;
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest('input, textarea, select, [contenteditable="true"], summary')) return;
    if (document.querySelector('dialog[open]')) return;

    if (/^[1-9]$/.test(e.key)) {
      e.preventDefault();
      h.onChoice(Number(e.key) - 1);
    } else if (e.key === 'Enter') {
      // Enter บนปุ่ม/ลิงก์อื่นให้ทำงานตามปกติ ยกเว้นปุ่มตัวเลือก
      if (t?.closest('button, a') && !t.closest('[data-choice]')) return;
      e.preventDefault();
      (h.onEnter ?? h.onNext)();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      h.onNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      h.onPrev();
    }
  });
}
