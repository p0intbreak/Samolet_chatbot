'use client';

import { useState } from 'react';
import projects from '../../../../data/seeds/projects.moscow-mo.json';

const suggestions = [
  'Сданный ЖК рядом с Одинцово',
  'Строящийся проект 2026 рядом с Красногорском',
  'Семейный ЖК в Новой Москве',
  'Готовый проект рядом с Домодедово'
];

const years = ['all', '2026', '2027', '2028'];
const statusOptions = [
  { id: 'all', label: 'Все статусы' },
  { id: 'ready', label: 'Сданные' },
  { id: 'building', label: 'Строящиеся' }
] as const;

const metrics = [
  { label: 'ЖК в каталоге', value: String(projects.length).padStart(2, '0') },
  { label: 'Локации МО и Москвы', value: '09+' },
  { label: 'Источник seed-каталога', value: '01' }
];

type StatusFilter = (typeof statusOptions)[number]['id'];

function getProjectMatchScore(project: (typeof projects)[number], query: string) {
  if (!query) {
    return 0;
  }

  const lowerQuery = query.toLowerCase();
  const haystack = [project.name, project.address, project.city, ...project.locationTags]
    .join(' ')
    .toLowerCase();

  return lowerQuery
    .split(/\s+/)
    .filter(Boolean)
    .reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function isReady(project: (typeof projects)[number]) {
  return project.completionStatus.toLowerCase().includes('сдан');
}

export function LandingClient() {
  const [query, setQuery] = useState('Ищу строящийся ЖК 2026 рядом с Красногорском');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [year, setYear] = useState('all');

  const rankedProjects = projects
    .map((project) => ({
      ...project,
      matchScore: getProjectMatchScore(project, query)
    }))
    .filter((project) => {
      if (status === 'ready' && !isReady(project)) {
        return false;
      }

      if (status === 'building' && isReady(project)) {
        return false;
      }

      if (year !== 'all' && !project.completionPeriod.includes(year)) {
        return false;
      }

      if (!query.trim()) {
        return true;
      }

      return project.matchScore > 0;
    })
    .sort((left, right) => right.matchScore - left.matchScore || left.name.localeCompare(right.name));

  const featuredProjects = rankedProjects.slice(0, 6);
  const highlightProject = featuredProjects[0] ?? projects[0];

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
            <span className="filterLabel">Статус</span>
            <div className="filterRow">
              {statusOptions.map((option) => (
                <button
                  className={option.id === status ? 'filterPill active' : 'filterPill'}
                  key={option.id}
                  type="button"
                  onClick={() => setStatus(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filterGroup">
            <span className="filterLabel">Год ввода</span>
            <div className="filterRow">
              {years.map((option) => (
                <button
                  className={option === year ? 'filterPill active' : 'filterPill'}
                  key={option}
                  type="button"
                  onClick={() => setYear(option)}
                >
                  {option === 'all' ? 'Любой' : option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="summaryPanel">
          <p className="summaryLabel">Результат</p>
          <p className="summaryValue">{featuredProjects.length} ЖК в текущей выдаче</p>
          <p className="summaryText">
            Визуал сейчас тестирует product direction: поисковый ввод, project cards, фильтры
            статуса и срока ввода, а также explainable-подачу каталога.
          </p>
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
                    <h3>{project.name}</h3>
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
                    <span className="factLabel">Теги</span>
                    <span className="factValue">{project.tags.join(' · ')}</span>
                  </div>
                </div>

                <div className="tagRow">
                  {project.locationTags.slice(0, 4).map((tag) => (
                    <span className="miniTag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>

                <a className="projectLink" href={project.sourceUrl} target="_blank" rel="noreferrer">
                  Источник проекта
                </a>
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
          <article className="storyCard">
            <p className="sectionLabel">Как это читается</p>
            <h2>Лендинг уже показывает продуктовую рамку</h2>
            <ul className="plainList">
              <li>Google-like поле запроса остается главным входом в продукт.</li>
              <li>Выдача строится по ЖК, а не по отдельным квартирам.</li>
              <li>Фильтры статуса и срока ввода видны сразу, а не прячутся в чате.</li>
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
          </article>
        </div>
      </section>
    </main>
  );
}

