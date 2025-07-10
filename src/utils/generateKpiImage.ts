import ejs from 'ejs';
import path from 'path';
import puppeteer from 'puppeteer';

export interface KPIImageData {
  kpiName: string;
  kpiValue: string;
  kpiFooterDiffColor: string;
  kpiFooterDiff: string;
}

export async function generateKPIImage(data: KPIImageData): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'src/assets/kpi-template.ejs');
  const html = await ejs.renderFile(templatePath, data);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.setViewport({ width: 182 * 1.5, height: 140 });

  const buffer = await page.screenshot({ type: 'png' });

  await browser.close();

  return buffer as Buffer;
}

export interface KPIImageChartData {
  kpiLeadsValue: string;
  kpiLeadsDiff: number;
  kpiBookingRateValue: string;
  kpiBookingRateDiff: number;
  kpiRevenuePerJobValue: string;
  kpiRevenuePerJobDiff: number;
  kpiRevenueValue: string;
  kpiRevenueDiff: number;
  kpiLeadsDataArray: number[];
  kpiBookingRateDataArray: number[];
  kpiRevenuePerJobDataArray: number[];
  kpiRevenueDataArray: number[];
}

export async function generateKPIImageChart(
  data: KPIImageChartData,
): Promise<Buffer> {
  const templatePath = path.join(
    process.cwd(),
    'src/assets/kpi-template-chart.ejs',
  );
  const html = await ejs.renderFile(templatePath, data);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.setViewport({ width: 378, height: 580 });

  const buffer = await page.screenshot({ type: 'png' });

  await browser.close();

  return buffer as Buffer;
}
