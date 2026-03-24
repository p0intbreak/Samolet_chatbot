import { chromium } from 'playwright';

const targetUrl = process.argv[2] ?? 'https://samolet.ru/novostroyki/sputnik/';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3000);

  const html = await page.content();
  const cookies = await page.context().cookies();

  console.log(
    JSON.stringify(
      {
        targetUrl,
        finalUrl: page.url(),
        title: await page.title(),
        forbidden: html.includes('403 Error') || html.includes('Forbidden'),
        cookies
      },
      null,
      2
    )
  );

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

