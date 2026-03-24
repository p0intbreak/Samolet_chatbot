/*
  Run this script in the browser DevTools console on https://samolet.ru/
  or on a Samolet project listing page while you are logged into a normal
  browser session that can open project pages without anti-bot blocks.

  Result:
  - downloads `samolet-projects-moscow-mo.json`
  - returns the collected array in the console
*/

(async () => {
  const REGION_HINTS = ['москва', 'московская область', 'подмосковье', 'московской области'];
  const PROJECT_PATH_RE = /\/novostroyki\/[^/?#]+\/?$/i;
  const SKIP_PATH_RE =
    /\/(parking|storage|commercial|flats|kvartiry|trade-in|ipoteka|akcii|shares|journal|media|card)\b/i;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const toAbsolute = (href) => {
    try {
      return new URL(href, location.origin).toString();
    } catch {
      return null;
    }
  };

  const normalizeText = (value) => (value || '').replace(/\s+/g, ' ').trim();

  const uniq = (items) => [...new Set(items.filter(Boolean))];

  const candidateUrls = uniq(
    [...document.querySelectorAll('a[href]')]
      .map((link) => toAbsolute(link.getAttribute('href')))
      .filter(Boolean)
      .filter((url) => url.startsWith(location.origin))
      .filter((url) => PROJECT_PATH_RE.test(new URL(url).pathname))
      .filter((url) => !SKIP_PATH_RE.test(new URL(url).pathname))
  );

  if (candidateUrls.length === 0) {
    console.warn('No project URLs found on the current page.');
    return [];
  }

  console.log(`Found ${candidateUrls.length} candidate project pages`);

  async function fetchHtml(url) {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'x-requested-with': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return response.text();
  }

  function parseJsonScripts(doc) {
    return [...doc.querySelectorAll('script[type="application/ld+json"]')]
      .map((node) => node.textContent?.trim())
      .filter(Boolean)
      .flatMap((text) => {
        try {
          const parsed = JSON.parse(text);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [];
        }
      });
  }

  function findCoordinates(rawText) {
    const patterns = [
      /"lat(?:itude)?"\s*:\s*"?([0-9]{2}\.[0-9]+)"?/i,
      /"lng(?:itude)?"\s*:\s*"?([0-9]{2}\.[0-9]+)"?/i,
      /"longitude"\s*:\s*"?([0-9]{2}\.[0-9]+)"?/i
    ];

    const latMatch = rawText.match(patterns[0]);
    const lngMatch = rawText.match(patterns[1]) || rawText.match(patterns[2]);

    return {
      lat: latMatch ? Number(latMatch[1]) : null,
      lng: lngMatch ? Number(lngMatch[1]) : null
    };
  }

  function findSettlementInfo(text) {
    const compact = normalizeText(text).toLowerCase();
    const statusPatterns = [
      /статус\s+строительства[:\s]+([^.;]+)/i,
      /ход\s+строительства[:\s]+([^.;]+)/i,
      /степень\s+готовности[:\s]+([^.;]+)/i
    ];
    const completionPatterns = [
      /срок\s+сдачи[:\s]+([^.;]+)/i,
      /срок\s+ввода[:\s]+([^.;]+)/i,
      /ввод\s+в\s+эксплуатацию[:\s]+([^.;]+)/i,
      /ключи[:\s]+([^.;]+)/i
    ];

    const constructionStatus =
      statusPatterns.map((pattern) => compact.match(pattern)?.[1]).find(Boolean) ?? null;
    const completionDate =
      completionPatterns.map((pattern) => compact.match(pattern)?.[1]).find(Boolean) ?? null;

    return { constructionStatus, completionDate };
  }

  function extractProjectData(url, html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const text = normalizeText(doc.body?.innerText || '');
    const rawText = html;
    const ldJson = parseJsonScripts(doc);
    const canonical =
      doc.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim() || url;
    const h1 = normalizeText(doc.querySelector('h1')?.textContent || '');
    const title = normalizeText(doc.title || '').replace(/\s*\|\s*Группа.*$/i, '');
    const metaDescription = normalizeText(
      doc.querySelector('meta[name="description"]')?.getAttribute('content') || ''
    );

    const addressCandidate = normalizeText(
      ldJson.find((item) => item?.address)?.address?.streetAddress ||
        ldJson.find((item) => item?.address)?.address?.addressLocality ||
        metaDescription.match(/(?:адрес|локация)[:\s]+([^.;]+)/i)?.[1] ||
        ''
    );

    const geoFromJson =
      ldJson.find((item) => item?.geo?.latitude && item?.geo?.longitude)?.geo || null;
    const geoFromRaw = findCoordinates(rawText);
    const geo = {
      lat: geoFromJson?.latitude ? Number(geoFromJson.latitude) : geoFromRaw.lat,
      lng: geoFromJson?.longitude ? Number(geoFromJson.longitude) : geoFromRaw.lng
    };

    const { constructionStatus, completionDate } = findSettlementInfo(text);
    const lowerText = text.toLowerCase();
    const region =
      REGION_HINTS.find((hint) => lowerText.includes(hint)) ||
      (lowerText.includes('москва') ? 'москва' : null);

    return {
      name: h1 || title || canonical.split('/').filter(Boolean).pop() || canonical,
      url: canonical,
      slug: new URL(canonical).pathname.replace(/^\/|\/$/g, '').split('/').pop(),
      address: addressCandidate || null,
      region,
      coordinates: geo.lat && geo.lng ? geo : null,
      constructionStatus,
      completionDate,
      metaDescription: metaDescription || null
    };
  }

  const results = [];

  for (const [index, url] of candidateUrls.entries()) {
    try {
      console.log(`[${index + 1}/${candidateUrls.length}] Fetching ${url}`);
      const html = await fetchHtml(url);
      const project = extractProjectData(url, html);

      if (!project.region || REGION_HINTS.some((hint) => project.region.includes(hint))) {
        results.push(project);
      }
    } catch (error) {
      console.warn(`Failed to parse ${url}`, error);
    }

    await sleep(300);
  }

  const filteredResults = results.filter((item) => item.url && item.name);

  const blob = new Blob([JSON.stringify(filteredResults, null, 2)], {
    type: 'application/json'
  });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = downloadUrl;
  link.download = 'samolet-projects-moscow-mo.json';
  link.click();
  URL.revokeObjectURL(downloadUrl);

  console.table(
    filteredResults.map((item) => ({
      name: item.name,
      region: item.region,
      completionDate: item.completionDate,
      constructionStatus: item.constructionStatus,
      url: item.url
    }))
  );

  return filteredResults;
})();

