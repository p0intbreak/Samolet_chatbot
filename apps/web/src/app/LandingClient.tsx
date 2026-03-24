'use client';

import { useEffect, useState } from 'react';
import { parseSearchQuery, searchProjects } from '@samolyot-finder/search-engine';
import type { ProjectSearchResponse, ProjectSummary } from '@samolyot-finder/shared-types';
import projects from '../../../../data/seeds/projects.moscow-mo.json';

const suggestions = [
  'Сданный ЖК рядом с Одинцово',
  'Строящийся проект 2026 рядом с Красногорском',
  'Семейный ЖК в Новой Москве',
  'Готовый проект рядом с Домодедово'
];

const metrics = [
  { label: 'ЖК в каталоге', value: String(projects.length).padStart(2, '0') },
  { label: 'Локации МО и Москвы', value: '09+' },
  { label: 'Источник seed-каталога', value: '01' }
];

const projectCatalog: ProjectSummary[] = projects.map((project) => ({
  ...project,
  sourceName: 'novostroy.ru'
}));

const githubRepoUrl = 'https://github.com/p0intbreak/Samolet_chatbot';
const publicDemoUrl = 'https://p0intbreak.github.io/Samolet_chatbot/';

function isReady(project: Pick<ProjectSummary, 'completionStatus'>) {
  return project.completionStatus.toLowerCase().includes('сдан');
}

function getMapsLink(project: Pick<ProjectSummary, 'name' | 'address'>) {
  const query = encodeURIComponent(`${project.name}, ${project.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function LandingClient() {
  const [query, setQuery] = useState('Ищу строящийся ЖК 2026 рядом с Красногорском');
  const [searchResult, setSearchResult] = useState<ProjectSearchResponse>(() =>
    searchProjects(projectCatalog, parseSearchQuery('Ищу строящийся ЖК 2026 рядом с Красногорском'))
  );
  const [isLoading, setIsLoading] = useState(false);
  const featuredProjects = searchResult.projects.slice(0, 6);
  const highlightProject = featuredProjects[0] ?? projectCatalog[0];

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      setIsLoading(true);

      const fallbackResult = searchProjects(projectCatalog, parseSearchQuery(query));
      const apiBase = process.env.NEXT_PUBLIC_SEARCH_API_URL?.trim();

      if (!apiBase) {
        if (!cancelled) {
          setSearchResult(fallbackResult);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/chat/message`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({ message: query })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as ProjectSearchResponse;

        if (!cancelled) {
          setSearchResult(payload);
        }
      } catch {
        if (!cancelled) {
          setSearchResult(fallbackResult);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <main className="page">
      <section className="heroPanel">
        <div className="heroCopy">
          <p className="eyebrow">Samolyot Finder / MVP landing</p>
          <h1>Лендинг для подбора ЖК Самолета по сценарию жизни, району и сроку ввода</h1>
          <p className="subtitle">
            Это уже не статичный мок. Экран работает на реальном seed-каталоге ЖК Самолета по
            Москве и Московской области и позволяет быстро проверить визуал, структуру выдачи и
            базовую интерактивность.
          </p>

          <div className="heroSearch">
            <label className="searchLabel" htmlFor="landing-query">
              Поисковый запрос
            </label>
            <div className="searchShell">
              <input
                id="landing-query"
                aria-label="Поисковый запрос"
                className="searchInput"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Например: сданный ЖК рядом с Одинцово"
              />
              <button className="searchButton" type="button">
                Подобрать
              </button>
            </div>
          </div>

          <div className="chips">
            {suggestions.map((item) => (
              <button
                className="chip"
                key={item}
                type="button"
                onClick={() => setQuery(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <aside className="heroAside">
          <div className="metricsGrid">
            {metrics.map((metric) => (
              <article className="metricCard" key={metric.label}>
                <span className="metricValue">{metric.value}</span>
                <span className="metricLabel">{metric.label}</span>
              </article>
            ))}
          </div>

          <article className="highlightCard">
            <p className="sectionLabel">Сейчас в фокусе</p>
            <h2>{highlightProject.name}</h2>
            <p className="highlightMeta">
              {highlightProject.city} · {highlightProject.completionStatus} ·{' '}
              {highlightProject.completionPeriod}
            </p>
            <p className="highlightText">{highlightProject.address}</p>
            <a className="projectLink" href={highlightProject.sourceUrl} target="_blank" rel="noreferrer">
              Открыть карточку источника
            </a>
          </article>
        </aside>
      </section>

      <section className="controlPanel">
        <div className="filters">
          <div className="filterGroup">
            <span className="filterLabel">Примененные фильтры</span>
            <div className="filterRow">
              <span className="filterPill active">
                {searchResult.appliedFilters.completionFilter === 'ready'
                  ? 'Сданные'
                  : searchResult.appliedFilters.completionFilter === 'building'
                    ? 'Строящиеся'
                    : 'Все статусы'}
              </span>
              <span className="filterPill active">
                {searchResult.appliedFilters.completionYear ?? 'Любой год'}
              </span>
              <span className="filterPill active">
                {searchResult.appliedFilters.detectedLocation ?? 'Без локации'}
              </span>
            </div>
          </div>

          <div className="filterGroup">
            <span className="filterLabel">Ответ движка</span>
            <p className="summaryText">
              {isLoading ? 'Обновляю выдачу...' : searchResult.reply}
            </p>
          </div>
        </div>

        <div className="summaryPanel">
          <p className="summaryLabel">Результат</p>
          <p className="summaryValue">{featuredProjects.length} ЖК в текущей выдаче</p>
          <p className="summaryText">
            Визуал сейчас тестирует product direction: поисковый ввод, project cards, фильтры
            статуса и срока ввода, а также explainable-подачу каталога.
          </p>
          <div className="summaryLinks">
            <a className="summaryLink" href={publicDemoUrl} target="_blank" rel="noreferrer">
              Открыть публичную страницу
            </a>
            <a className="summaryLink" href={githubRepoUrl} target="_blank" rel="noreferrer">
              Репозиторий проекта
            </a>
          </div>
        </div>
      </section>

      <section className="resultsGrid">
        <div className="resultsColumn">
          <div className="sectionHeader">
            <p className="sectionLabel">Выдача</p>
            <h2>Подобранные ЖК</h2>
          </div>

          <div className="projectGrid">
            {featuredProjects.map((project) => (
              <article className="projectCard" key={project.id}>
                <div className="projectTop">
                  <div>
                    <p className="projectCity">{project.city}</p>
                    <h3>
                      <a
                        className="projectTitleLink"
                        href={project.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {project.name}
                      </a>
                    </h3>
                  </div>
                  <span className={isReady(project) ? 'statusBadge ready' : 'statusBadge building'}>
                    {project.completionStatus}
                  </span>
                </div>

                <p className="projectAddress">{project.address}</p>

                <div className="projectFacts">
                  <div className="factBox">
                    <span className="factLabel">Срок</span>
                    <span className="factValue">{project.completionPeriod}</span>
                  </div>
                  <div className="factBox">
                    <span className="factLabel">Почему в выдаче</span>
                    <span className="factValue">{project.explanation}</span>
                  </div>
                </div>

                <div className="tagRow">
                  {project.locationTags.slice(0, 4).map((tag) => (
                    <button className="miniTag" key={tag} type="button" onClick={() => setQuery(tag)}>
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="projectLinks">
                  <a className="projectLink" href={project.sourceUrl} target="_blank" rel="noreferrer">
                    Источник проекта
                  </a>
                  <a
                    className="projectLink"
                    href={getMapsLink(project)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Открыть на карте
                  </a>
                </div>
              </article>
            ))}

            {featuredProjects.length === 0 ? (
              <article className="emptyState">
                <h3>Ничего не нашлось</h3>
                <p>Попробуй убрать год ввода или заменить район на метро или направление.</p>
              </article>
            ) : null}
          </div>
        </div>

        <div className="insightColumn">
          <article className="mapCard">
            <p className="sectionLabel">Визуализация маршрута</p>
            <h2>Карта сценария поиска</h2>
            <div className="mapCanvas" aria-hidden="true">
              <div className="mapRing ringOne" />
              <div className="mapRing ringTwo" />
              <div className="mapMarker routeOrigin">
                <span>Вы</span>
              </div>
              {featuredProjects.slice(0, 3).map((project, index) => (
                <div className={`mapMarker projectMarker marker${index + 1}`} key={project.id}>
                  <span>{project.name}</span>
                </div>
              ))}
              <div className="mapLine lineOne" />
              <div className="mapLine lineTwo" />
              <div className="mapLine lineThree" />
            </div>
            <p className="mapCaption">
              Пока это MVP-визуализация: точка пользователя и рекомендованные направления. Следующим
              шагом сюда можно подключить реальную карту и маршрутный движок.
            </p>
          </article>

          <article className="storyCard">
            <p className="sectionLabel">Как это читается</p>
            <h2>Лендинг уже показывает продуктовую рамку</h2>
            <ul className="plainList">
              <li>Google-like поле запроса остается главным входом в продукт.</li>
              <li>Выдача строится по ЖК, а не по отдельным квартирам.</li>
              <li>На экране работает тот же search engine, что и в backend API.</li>
              <li>Карточка объясняет, почему проект попадает в подбор.</li>
            </ul>
          </article>

          <article className="sourceCard">
            <p className="sectionLabel">Источник seed-каталога</p>
            <h2>Novostroy.ru как временный data source</h2>
            <p>
              На текущем этапе лендинг использует curated seed для Москвы и МО. Это позволяет
              тестировать визуал, сценарии поиска и структуру выдачи до подключения нормального
              ingestion pipeline.
            </p>
            <div className="sourceLinks">
              <a className="projectLink" href="https://www.novostroy.ru/" target="_blank" rel="noreferrer">
                Открыть Novostroy.ru
              </a>
              <a className="projectLink" href={githubRepoUrl} target="_blank" rel="noreferrer">
                Смотреть код проекта
              </a>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
