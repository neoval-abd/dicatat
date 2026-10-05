import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { transform } from 'esbuild'

for (const width of [360, 390, 412, 1024]) {
  test(`entry page and app shell at ${width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Selamat datang kembali' })).toBeVisible()
    expect(await page.getByRole('heading', { name: 'Satu langkah sebelum mulai' }).count() + await page.getByLabel('Email', { exact: true }).count()).toBe(1)
    await expect(page.getByRole('heading', { name: /Pengeluaran kecil/ })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(errors).toEqual([])
    await page.evaluate(() => localStorage.setItem('dicatat:theme', 'dark'))
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByRole('heading', { name: 'Selamat datang kembali' })).toBeVisible()
    if (width === 390) await page.screenshot({ path: '.verification/setup-mobile-dark.png', fullPage: true })
    await page.evaluate(() => localStorage.setItem('dicatat:theme', 'light'))
    await page.reload()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await expect(page.getByRole('heading', { name: 'Selamat datang kembali' })).toBeVisible()
    if (width === 390) await page.screenshot({ path: '.verification/setup-mobile.png', fullPage: true })
    if (width === 1024) await page.screenshot({ path: '.verification/setup-desktop.png', fullPage: true })
    if (width === 390) {
      await page.evaluate(() => localStorage.setItem('dicatat:theme', 'pink'))
      await page.reload()
      await expect(page.locator('html')).toHaveClass(/pink/)
      await expect(page.locator('html')).not.toHaveClass(/dark/)
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim())).toBe('#b83270')
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.reload()
      await expect(page.locator('html')).toHaveClass(/pink/)
      await expect(page.locator('html')).not.toHaveClass(/dark/)
      await expect(page.getByRole('heading', { name: 'Selamat datang kembali' })).toBeVisible()
      await page.screenshot({ path: '.verification/setup-mobile-pink.png', fullPage: true })
    }
  })
}

test('manifest, icons and frontend-only service worker', async ({ page, request }) => {
  await page.goto('/')
  const manifest = await (await request.get('/manifest.json')).json()
  expect(manifest.name).toBe('Catatan Keuangan')
  expect(manifest.display).toBe('standalone')
  for (const icon of manifest.icons) {
    const result = await request.get(icon.src)
    expect(result.status()).toBe(200)
    expect(result.headers()['content-type']).toContain('image/png')
  }
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBeGreaterThan(0)
  const worker = await (await request.get('/sw.js')).text()
  expect(worker).not.toContain('supabase.co')
})

test('receipt compression preserves aspect ratio and caps dimensions', async ({ page }) => {
  await page.goto('/')
  const { code } = await transform(readFileSync('src/utils/image.ts', 'utf8'), { loader: 'ts', format: 'iife', globalName: 'ReceiptTest' })
  await page.addScriptTag({ content: code })
  const result = await page.evaluate(async () => {
    const api = (window as unknown as { ReceiptTest: { compressImage: (file: File) => Promise<Blob> } }).ReceiptTest
    const canvas = document.createElement('canvas'); canvas.width = 3200; canvas.height = 2100
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 3200, 2100)
    ctx.fillStyle = 'black'; ctx.font = '80px sans-serif'; ctx.fillText('Nota belanja Rp45.000', 80, 160)
    const original = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'))
    const compressed = await api.compressImage(new File([original], 'nota.png', { type: 'image/png' }))
    const bitmap = await createImageBitmap(compressed)
    const dimensions = { width: bitmap.width, height: bitmap.height, type: compressed.type, size: compressed.size }
    bitmap.close()
    return dimensions
  })
  expect(result.width).toBe(1600)
  expect(result.height).toBe(1050)
  expect(result.type).toBe('image/jpeg')
  expect(result.size).toBeLessThan(5 * 1024 * 1024)
})
