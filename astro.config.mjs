// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static output: Vercel ตรวจเจอ Astro อัตโนมัติและ deploy โฟลเดอร์ dist/ ได้เลย
// ไม่ต้องใช้ adapter เพราะไม่มี server-side code
export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  vite: {
    plugins: [tailwindcss()],
  },
});
