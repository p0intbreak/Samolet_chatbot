import {
  buildRecommendationExplanation,
  rankProjects
} from '@samolyot-finder/scoring-core';
import type {
  ProjectSearchResponse,
  ProjectSummary,
  SearchPreferences
} from '@samolyot-finder/shared-types';
import { projects } from '../projects/projects.repository';

export function searchProjects(preferences: SearchPreferences): ProjectSearchResponse {
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

    if (preferences.completionYear && !project.completionPeriod.includes(String(preferences.completionYear))) {
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

function isReadyProject(project: ProjectSummary) {
  return project.completionStatus.toLowerCase().includes('сдан');
}
