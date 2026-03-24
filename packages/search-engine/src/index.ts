import {
  buildRecommendationExplanation,
  rankProjects
} from '@samolyot-finder/scoring-core';
import type {
  ProjectSearchResponse,
  ProjectSummary,
  SearchPreferences
} from '@samolyot-finder/shared-types';

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

export function searchProjects(
  projects: ProjectSummary[],
  preferences: SearchPreferences
): ProjectSearchResponse {
  const eligibleProjects = filterProjects(projects, preferences);
  const ranked = rankProjects(eligibleProjects, preferences);
  const detectedLocation = detectLocationHint(preferences.rawQuery, ranked);

  return {
    reply: `Нашел ${ranked.length} ЖК, которые подходят под текущие параметры.`,
    appliedFilters: {
      transportMode: preferences.transportMode,
      detectedLocation,
      completionFilter: preferences.completionFilter,
      completionYear: preferences.completionYear
    },
    projects: ranked.map((project) => ({
      ...project,
      explanation: buildRecommendationExplanation(project, preferences)
    })),
    totalProjects: ranked.length,
    clarifyingQuestion:
      ranked.length === 0 ? 'Уточните район, метро или направление, которое для вас важнее.' : null,
    suggestedNextActions: [
      'Уточнить район или метро',
      'Добавить приоритет по сроку ввода',
      'Сузить список до готовых или строящихся ЖК'
    ]
  };
}

function filterProjects(projectList: ProjectSummary[], preferences: SearchPreferences) {
  const query = preferences.rawQuery?.toLowerCase() ?? '';

  return projectList.filter((project) => {
    if (preferences.completionFilter === 'ready' && !isReadyProject(project)) {
      return false;
    }

    if (preferences.completionFilter === 'building' && isReadyProject(project)) {
      return false;
    }

    if (
      preferences.completionYear &&
      !project.completionPeriod.includes(String(preferences.completionYear))
    ) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [project.name, project.address, ...project.locationTags].some((value) =>
      query.includes(value.toLowerCase())
    );
  });
}

function detectLocationHint(rawQuery: string | undefined, rankedProjects: ProjectSummary[]) {
  const query = rawQuery?.toLowerCase() ?? '';
  const matchedTag = rankedProjects
    .flatMap((project) => project.locationTags)
    .find((tag) => query.includes(tag.toLowerCase()));

  return matchedTag ?? null;
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

function isReadyProject(project: ProjectSummary) {
  return project.completionStatus.toLowerCase().includes('сдан');
}
