import { searchProjects as searchProjectsShared } from '@samolyot-finder/search-engine';
import type { SearchPreferences } from '@samolyot-finder/shared-types';
import { projects } from '../projects/projects.repository';

export function searchProjects(preferences: SearchPreferences) {
  return searchProjectsShared(projects, preferences);
}
