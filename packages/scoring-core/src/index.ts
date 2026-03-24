import type { ProjectSummary, RankedProject, SearchPreferences } from '@samolyot-finder/shared-types';

export function rankProjects(
  projects: ProjectSummary[],
  preferences: SearchPreferences
): RankedProject[] {
  return projects
    .map((project) => ({
      ...project,
      score: calculateProjectScore(project, preferences)
    }))
    .sort((left, right) => right.score - left.score);
}

export function buildRecommendationExplanation(
  project: RankedProject,
  preferences: SearchPreferences
) {
  const reasons = [
    `расположен в локации ${project.address}`,
    `статус проекта: ${project.completionStatus.toLowerCase()}`,
    `целевой срок: ${project.completionPeriod}`,
    project.tags.includes('family') ? 'подходит под семейный сценарий' : 'может подойти под городской сценарий'
  ];

  return `ЖК ${project.name} подходит, потому что ${reasons.join(', ')}.`;
}

function calculateProjectScore(project: ProjectSummary, preferences: SearchPreferences) {
  const query = preferences.rawQuery?.toLowerCase() ?? '';
  const locationTags = project.locationTags ?? [];
  const projectTags = project.tags ?? [];
  const locationMatchScore = locationTags.some((tag) => query.includes(tag.toLowerCase()))
    ? 100
    : 45;
  const statusScore = project.completionStatus.toLowerCase().includes('сдан') ? 100 : 65;
  const familyScore = projectTags.includes('family') ? 100 : 40;

  return (
    locationMatchScore * preferences.priorities.commuteWeight +
    statusScore * preferences.priorities.budgetWeight +
    familyScore * preferences.priorities.familyWeight
  );
}
