# Browser Extraction

## Goal

Collect a first-party project catalog from `samolet.ru` using the user's normal browser session, which is not blocked by anti-bot protection.

## How to run

1. Open `samolet.ru` in your normal browser.
2. Navigate to a page where Samolet project links are visible.
3. Open DevTools.
4. Open the Console tab.
5. Paste the contents of `scripts/samolet/browser-extract-projects.js`.
6. Press Enter.

## Expected result

The script:

- finds candidate project pages under `/novostroyki/...`
- fetches them with your browser cookies
- extracts basic project data
- downloads `samolet-projects-moscow-mo.json`

## Fields collected

- `name`
- `url`
- `slug`
- `address`
- `region`
- `coordinates`
- `constructionStatus`
- `completionDate`
- `metaDescription`

## Important limitation

This is a best-effort extractor. Since the site structure can change, some fields may come back as `null`.

That is acceptable for the current iteration, because the product only needs a project-level catalog for Moscow and Moscow Oblast.

## Next step

Once the JSON is downloaded, provide it back in one of these ways:

- attach the file
- paste the JSON
- save it into the repository and tell me the path

Then the catalog can be normalized and wired into the search backend.

