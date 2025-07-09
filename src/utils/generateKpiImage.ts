import ejs from 'ejs';
import path from 'path';
import puppeteer from 'puppeteer';

export async function generateKPIImage(data: {
  kpiName: string;
  kpiValue: string;
  kpiFooterDiffColor: string;
  kpiFooterDiff: string;
}): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'src/assets/kpi-template.ejs');
  const html = await ejs.renderFile(templatePath, data);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Optional: set viewport to match layout size
  await page.setViewport({ width: 182 * 2, height: 128 * 1.5 });

  const buffer = await page.screenshot({ type: 'png' });

  await browser.close();

  return buffer as Buffer;
}
