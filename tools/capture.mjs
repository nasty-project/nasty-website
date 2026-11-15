// Capture NASty WebUI screenshots for the website, in light and dark.
//
//   cd tools && npm install
//   NASTY_URL=https://nasty.0f.ee NASTY_USER=admin NASTY_PASS=... node capture.mjs
//
// A route like "/shares#SMB" opens the page, then clicks the tab named SMB.
// Output: ../shots/<theme>/<name>.webp (needs cwebp on PATH).
import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base = process.env.NASTY_URL;
const routes = process.argv.slice(2).length
	? process.argv.slice(2)
	: ['/', '/subvolumes', '/shares#SMB', '/apps', '/backups', '/update'];

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
		const [path, tab] = route.split('#');
		await page.goto(base + path);
		if (tab) await page.getByRole('tab', { name: tab }).or(page.getByRole('button', { name: tab })).first().click();
		// The WebSocket stays open, so wait for the data to render rather than for network idle.
		await page.waitForTimeout(3000);
		const name = path === '/' ? 'dashboard' : path.slice(1).replaceAll('/', '-');
		const png = `../shots/${theme}/${name}.png`;
		await page.screenshot({ path: png });
		execFileSync('cwebp', ['-quiet', '-q', '85', png, '-o', png.replace(/\.png$/, '.webp')]);
		await rm(png);
		console.log(theme, route);
	}
}
await browser.close();
