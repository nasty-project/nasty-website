// Capture NASty WebUI screenshots for the website, in light and dark.
//
//   cd tools && npm install
//   NASTY_URL=https://nasty.0f.ee NASTY_USER=admin NASTY_PASS=... node capture.mjs
//
// A route like "/shares#SMB" opens the page, then clicks the tab named SMB;
// "/apps@Installed Apps" starts the crop at that heading.
// Output: ../shots/<theme>/<name>.webp (needs cwebp on PATH).
import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base = process.env.NASTY_URL;
const routes = process.argv.slice(2).length
	? process.argv.slice(2)
	: ['/', '/subvolumes', '/shares#SMB', '/apps@Installed Apps', '/backups', '/update'];

const browser = await chromium.launch();
const context = await browser.newContext({
	viewport: { width: 1600, height: 1000 },
	deviceScaleFactor: 2,
	ignoreHTTPSErrors: true
});
const page = await context.newPage();

await page.goto(base);
await page.fill('#username', process.env.NASTY_USER);
await page.fill('#password', process.env.NASTY_PASS);
await page.keyboard.press('Enter');
await page.waitForSelector('#password', { state: 'detached' });

for (const theme of ['light', 'dark']) {
	await mkdir(`../shots/${theme}`, { recursive: true });
	await page.evaluate((t) => localStorage.setItem('nasty-theme', t), theme);
	for (const route of routes) {
		const [spec, from] = route.split('@');
		const [path, tab] = spec.split('#');
		await page.goto(base + path);
		if (tab) await page.getByRole('tab', { name: tab }).or(page.getByRole('button', { name: tab })).first().click();
		// The WebSocket stays open, so wait for the data to render rather than for network idle.
		await page.waitForTimeout(3000);
		const name = path === '/' ? 'dashboard' : path.slice(1).replaceAll('/', '-');
		const png = `../shots/${theme}/${name}.png`;
		// The hero shows the whole UI; feature shots crop to the page content so text stays readable.
		await page.setViewportSize(name === 'dashboard' ? { width: 1600, height: 1000 } : { width: 1360, height: 1060 });
		await page.waitForTimeout(500);
		const clip = name === 'dashboard' ? undefined : await page.evaluate((from) => {
			const main = document.querySelector('main');
			const start = from && [...main.querySelectorAll('h1,h2,h3')].find((h) => h.textContent.trim() === from);
			if (start) main.scrollTop = start.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 24;
			const box = main.getBoundingClientRect();
			const bottom = Math.max(...[...main.querySelectorAll(':scope > *')].map((el) => el.getBoundingClientRect().bottom));
			const top = start ? Math.max(box.y, start.getBoundingClientRect().top - 24) : box.y;
			return { x: box.x, y: top, width: box.width, height: Math.min(bottom + 24, box.bottom) - top };
		}, from);
		await page.screenshot({ path: png, clip });
		execFileSync('cwebp', ['-quiet', '-q', '85', png, '-o', png.replace(/\.png$/, '.webp')]);
		await rm(png);
		console.log(theme, route);
	}
}
await browser.close();
