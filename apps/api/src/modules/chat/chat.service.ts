import type { SearchPreferences } from '@samolyot-finder/shared-types';

export function parseSearchQuery(message: string): SearchPreferences {
  const normalized = message.toLowerCase();

  return {
    rawQuery: message,
    rooms: normalized.includes('двуш') ? 2 : undefined,
    budgetMax: extractBudget(message),
    transportMode: normalized.includes('авто') ? 'car' : 'public_transport',
    completionFilter: extractCompletionFilter(normalized),
    completionYear: extractCompletionYear(message),
    importantPlaces: [
      {
        type: 'work',
        label: normalized.includes('белорус') ? 'Белорусская' : 'Не указано',
        maxTravelMinutes: extractTravelLimit(message) ?? 50,
        priority: 1
      }
    ],
    priorities: {
      commuteWeight: 0.55,
      budgetWeight: 0.25,
      familyWeight: 0.2
    }
  };
}

function extractBudget(message: string) {
  const match = message.match(/(\d+)\s*млн/i);
  if (!match) {
    return undefined;
  }

  return Number(match[1]) * 1_000_000;
}

function extractTravelLimit(message: string) {
  const match = message.match(/(\d+)\s*мин/i);
  if (!match) {
    return undefined;
  }

  return Number(match[1]);
}

function extractCompletionFilter(normalized: string) {
  if (
    normalized.includes('сдан') ||
    normalized.includes('готов') ||
    normalized.includes('введен') ||
    normalized.includes('введён')
  ) {
    return 'ready' as const;
  }

  if (
    normalized.includes('строит') ||
    normalized.includes('строящ') ||
    normalized.includes('на этапе') ||
    normalized.includes('котлован')
  ) {
    return 'building' as const;
  }

  return undefined;
}

function extractCompletionYear(message: string) {
  const match = message.match(/\b(2026|2027|2028|2029|2030)\b/);
  if (!match) {
    return undefined;
  }

  return Number(match[1]);
}
