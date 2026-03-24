import type { ProjectSummary } from '@samolyot-finder/shared-types';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectsSeedPath = join(process.cwd(), 'data', 'seeds', 'projects.moscow-mo.json');
const projectsSeed = JSON.parse(readFileSync(projectsSeedPath, 'utf-8')) as Array<
  Omit<ProjectSummary, 'sourceName'> & { sourceName: string }
>;

export const projects: ProjectSummary[] = projectsSeed.map((project) => ({
  ...project,
  sourceName: 'novostroy.ru'
}));
