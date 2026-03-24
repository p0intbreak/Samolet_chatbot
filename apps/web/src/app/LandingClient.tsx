'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { parseSearchQuery, searchProjects } from '@samolyot-finder/search-engine';
import type { ProjectSearchResponse, ProjectSummary } from '@samolyot-finder/shared-types';
import projects from '../../../../data/seeds/projects.moscow-mo.json';

const RouteMap = dynamic(() => import('./RouteMap').then((module) => module.RouteMap), {
  ssr: false
});

const scenarios = [
  {
    id: 'office-west',
    title: 'Работа на западе',
    prompt: 'Ищу сданный ЖК рядом с Одинцово или Заречьем, чтобы удобно ездить на работу',
    origin: 'Одинцово, Московская область'
  },
  {
    id: 'family-new-moscow',
    title: 'Семья в Новой Москве',
    prompt: 'Ищу семейный ЖК в Новой Москве рядом с Остафьево или Алхимово',
    origin: 'Остафьево, Москва'
  },
  {
    id: 'commute-northwest',
    title: 'Маршрут через северо-запад',
    prompt: 'Ищу строящийся ЖК 2026 рядом с Красногорском',
    origin: 'Красногорск, Московская область'
  },
  {
    id: 'airport-south',
    title: 'Направление Домодедово',
    prompt: 'Нужен готовый проект рядом с Домодедово',
    origin: 'Домодедово, Московская область'
  }
];

const projectCatalog: ProjectSummary[] = projects.map((project) => ({
  ...project,
  sourceName: 'novostroy.ru'
}));

function inferOriginLabel(rawQuery: string, detectedLocation: string | null | undefined) {
  const lower = rawQuery.toLowerCase();

  const hints = [
    { tokens: ['одинцово', 'заречье', 'лайково'], label: 'Одинцово, Московская область' },
    { tokens: ['красногорск', 'строгино', 'мякинино'], label: 'Красногорск, Московская область' },
    { tokens: ['домодедово', 'мисайлово', 'коробово'], label: 'Домодедово, Московская область' },
    { tokens: ['остафьево', 'алхимово', 'бутово'], label: 'Остафьево, Москва' },
    { tokens: ['внуково', 'кокошкино'], label: 'Внуково, Москва' },
    { tokens: ['мытищи'], label: 'Мытищи, Московская область' }
  ];

  const matched =
    hints.find((hint) => hint.tokens.some((token) => lower.includes(token))) ||
    hints.find((hint) => detectedLocation && hint.tokens.includes(detectedLocation.toLowerCase()));

  return matched?.label ?? 'Москва, Россия';
}

function getMapsLink(project: Pick<ProjectSummary, 'name' | 'address'>) {
  const query = encodeURIComponent(`${project.name}, ${project.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function LandingClient() {
  const [draftQuery, setDraftQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [searchResult, setSearchResult] = useState<ProjectSearchResponse | null>(null);
  const [originLabel, setOriginLabel] = useState('Москва, Россия');
  const [isLoading, setIsLoading] = useState(false);

  const featuredProjects = searchResult?.projects.slice(0, 3) ?? [];
  const hasSearched = Boolean(searchResult && submittedQuery);

  const helperPrompt = useMemo(
    () =>
      hasSearched
        ? 'Уточни район, срок ввода или жизненный сценарий, чтобы карта перестроила маршрут.'
        : 'Опиши работу, учебу, район или направление, а я предложу сценарий поиска и покажу маршрут на карте.',
    [hasSearched]
  );

  useEffect(() => {
    if (!submittedQuery) {
      return;
    }

    let cancelled = false;

    async function runSearch() {
      setIsLoading(true);

      const fallbackResult = searchProjects(projectCatalog, parseSearchQuery(submittedQuery));
      const fallbackOrigin = inferOriginLabel(
        submittedQuery,
        fallbackResult.appliedFilters.detectedLocation ?? null
      );
      const apiBase = process.env.NEXT_PUBLIC_SEARCH_API_URL?.trim();

      if (!apiBase) {
        if (!cancelled) {
          setSearchResult(fallbackResult);
          setOriginLabel(fallbackOrigin);
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
          body: JSON.stringify({ message: submittedQuery })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as ProjectSearchResponse;

        if (!cancelled) {
          setSearchResult(payload);
          setOriginLabel(
            inferOriginLabel(submittedQuery, payload.appliedFilters.detectedLocation ?? null)
          );
        }
      } catch {
        if (!cancelled) {
          setSearchResult(fallbackResult);
          setOriginLabel(fallbackOrigin);
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
  }, [submittedQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = draftQuery.trim();
    if (!normalized) {
      return;
    }

    setSubmittedQuery(normalized);
  }

  function applyScenario(prompt: string) {
    setDraftQuery(prompt);
    setSubmittedQuery(prompt);
  }

  return (
    <main className="page">
      <RouteMap
        allProjects={projectCatalog}
        featuredProjects={featuredProjects}
        originLabel={originLabel}
        hasSearched={hasSearched}
      />

      <div className={hasSearched ? 'overlayStage shifted' : 'overlayStage centered'}>
        <section className={hasSearched ? 'chatWindow resultMode' : 'chatWindow introMode'}>
          <div className="chatHeader">
            <div>
              <p className="eyebrow">Samolyot Finder</p>
              <h1>Подбор ЖК через чат и карту</h1>
            </div>
            <div className="chatHeaderBadge">
              <span>{hasSearched ? 'Маршрут найден' : 'Сценарий ожидания'}</span>
            </div>
          </div>

          <div className="chatBody">
            {!hasSearched ? (
              <div className="introBlock">
                <div className="messageBubble assistant">
                  Опиши потребности как в диалоге: работа, район, метро, учеба, срок ввода. После
                  ответа чат сдвинется вправо, а карта покажет маршрут к рекомендованным ЖК.
                </div>
                <p className="helperText">{helperPrompt}</p>
              </div>
            ) : (
              <div className="conversationThread">
                <div className="messageBubble user">{submittedQuery}</div>
                <div className="messageBubble assistant">
                  {isLoading
                    ? 'Собираю рекомендации и перестраиваю маршрут...'
                    : searchResult?.reply}
                  {searchResult?.appliedFilters.detectedLocation ? (
                    <span className="detectedMeta">
                      {' '}
                      Точка сценария: {searchResult.appliedFilters.detectedLocation}.
                    </span>
                  ) : null}
                </div>
              </div>
            )}

            <form className="chatComposer" onSubmit={handleSubmit}>
              <div className="composerShell">
                <input
                  aria-label="Сообщение чат-боту"
                  className="composerInput"
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  placeholder="Например: Ищу семейный ЖК в Новой Москве рядом с Остафьево"
                />
                <button className="composerButton" type="submit">
                  {hasSearched ? 'Обновить' : 'Запустить'}
                </button>
              </div>
            </form>

            <div className="scenarioRow">
              {scenarios.map((scenario) => (
                <button
                  className="scenarioChip"
                  key={scenario.id}
                  type="button"
                  onClick={() => applyScenario(scenario.prompt)}
                >
                  <span>{scenario.title}</span>
                  <small>{scenario.origin}</small>
                </button>
              ))}
            </div>

            {hasSearched ? (
              <div className="resultsPanel">
                <div className="resultsHeading">
                  <div>
                    <p className="sectionLabel">Рекомендации</p>
                    <h2>{featuredProjects.length} ЖК на текущем маршруте</h2>
                  </div>
                  <div className="routeSummary">
                    <span>Откуда</span>
                    <strong>{originLabel}</strong>
                  </div>
                </div>

                <div className="resultCards">
                  {featuredProjects.map((project) => (
                    <article className="resultCard" key={project.id}>
                      <div className="resultCardTop">
                        <div>
                          <p className="projectCity">{project.city}</p>
                          <h3>{project.name}</h3>
                        </div>
                        <span
                          className={
                            project.completionStatus.toLowerCase().includes('сдан')
                              ? 'statusBadge ready'
                              : 'statusBadge building'
                          }
                        >
                          {project.completionStatus}
                        </span>
                      </div>

                      <p className="projectAddress">{project.address}</p>
                      <p className="resultExplanation">{project.explanation}</p>

                      <div className="resultMeta">
                        <span>{project.completionPeriod}</span>
                        <span>{project.tags.join(' · ')}</span>
                      </div>

                      <div className="resultLinks">
                        <a
                          className="projectLink"
                          href={project.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Карточка ЖК
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
                </div>
              </div>
            ) : (
              <div className="emptyMapHint">
                <p className="sectionLabel">Сценарии</p>
                <div className="miniFacts">
                  <div className="miniFact">
                    <strong>{projectCatalog.length}</strong>
                    <span>ЖК уже нанесены на карту</span>
                  </div>
                  <div className="miniFact">
                    <strong>Маршрут</strong>
                    <span>Появится после первого ответа чат-бота</span>
                  </div>
                  <div className="miniFact">
                    <strong>Подсказки</strong>
                    <span>Нажми на сценарий и начни с готового запроса</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
