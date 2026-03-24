import { parseSearchQuery as parseSearchQueryShared } from '@samolyot-finder/search-engine';

export function parseSearchQuery(message: string) {
  return parseSearchQueryShared(message);
}
