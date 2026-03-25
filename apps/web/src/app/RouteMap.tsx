'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectSummary, RankedProject } from '@samolyot-finder/shared-types';

type MapGlModule = typeof import('@2gis/mapgl');

type RouteMapProps = {
  allProjects: ProjectSummary[];
  featuredProjects: RankedProject[];
  originLabel: string;
  hasSearched: boolean;
};

type MapPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

const MOSCOW_CENTER: [number, number] = [37.618423, 55.751244];
const geocodeCache = new Map<string, MapPoint>();

async function geocodeLocation(query: string, fallbackId: string) {
  if (geocodeCache.has(query)) {
    return geocodeCache.get(query)!;
  }

  const encodedQuery = encodeURIComponent(query);
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodedQuery}`,
    {
      headers: {
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as Array<{ lat: string; lon: string }>;
  const first = data[0];

  if (!first) {
    return null;
  }

  const point = {
    id: fallbackId,
    name: query,
    lat: Number(first.lat),
    lng: Number(first.lon)
  };

  geocodeCache.set(query, point);
  return point;
}

export function RouteMap({
  allProjects,
  featuredProjects,
  originLabel,
  hasSearched
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapGlRef = useRef<Awaited<ReturnType<MapGlModule['load']>> | null>(null);
  const mapInstanceRef = useRef<InstanceType<Awaited<ReturnType<MapGlModule['load']>>['Map']> | null>(
    null
  );
  const mapObjectsRef = useRef<Array<{ destroy: () => void }>>([]);
  const [allPoints, setAllPoints] = useState<MapPoint[]>([]);
  const [originPoint, setOriginPoint] = useState<MapPoint | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const [mapProvider, setMapProvider] = useState<'2gis' | 'fallback'>('fallback');

  const activeProjectIds = useMemo(
    () => new Set(featuredProjects.slice(0, 3).map((project) => project.id)),
    [featuredProjects]
  );

  useEffect(() => {
    let cancelled = false;

    async function resolveProjects() {
      setIsResolving(true);

      const resolved = await Promise.all(
        allProjects.map(async (project) => {
          try {
            const query = `${project.name}, ${project.address}, ${project.city}, Россия`;
            const point = await geocodeLocation(query, project.id);

            if (!point) {
              return null;
            }

            return {
              ...point,
              name: project.name
            };
          } catch {
            return null;
          }
        })
      );

      if (!cancelled) {
        setAllPoints(resolved.filter(Boolean) as MapPoint[]);
        setIsResolving(false);
      }
    }

    void resolveProjects();

    return () => {
      cancelled = true;
    };
  }, [allProjects]);

  useEffect(() => {
    let cancelled = false;

    async function resolveOrigin() {
      if (!hasSearched) {
        setOriginPoint(null);
        return;
      }

      try {
        const point = await geocodeLocation(originLabel, `origin:${originLabel}`);
        if (!cancelled) {
          setOriginPoint(point);
        }
      } catch {
        if (!cancelled) {
          setOriginPoint({
            id: 'origin:fallback',
            name: originLabel,
            lat: MOSCOW_CENTER[1],
            lng: MOSCOW_CENTER[0]
          });
        }
      }
    }

    void resolveOrigin();

    return () => {
      cancelled = true;
    };
  }, [originLabel, hasSearched]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    let disposed = false;

    async function initializeMap() {
      const key = process.env.NEXT_PUBLIC_2GIS_KEY?.trim();

      if (!key) {
        setMapProvider('fallback');
        return;
      }

      try {
        const mapglModule = await import('@2gis/mapgl');
        const mapgl = await mapglModule.load();

        if (disposed || !mapRef.current) {
          return;
        }

        const map = new mapgl.Map(mapRef.current, {
          center: MOSCOW_CENTER,
          zoom: 10,
          key,
          style: 'c080bb6a-8134-4993-93a1-5b4d8c36a59b'
        });

        mapGlRef.current = mapgl;
        mapInstanceRef.current = map;
        setMapProvider('2gis');
      } catch {
        setMapProvider('fallback');
      }
    }

    void initializeMap();

    return () => {
      disposed = true;
      mapObjectsRef.current.forEach((item) => item.destroy());
      mapObjectsRef.current = [];
      mapInstanceRef.current?.destroy();
      mapInstanceRef.current = null;
      mapGlRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const mapgl = mapGlRef.current;

    if (!map || !mapgl) {
      return;
    }

    mapObjectsRef.current.forEach((item) => item.destroy());
    mapObjectsRef.current = [];

    const boundsPoints: Array<[number, number]> = [];

    allPoints.forEach((point) => {
      const isActive = activeProjectIds.has(point.id);
      boundsPoints.push([point.lng, point.lat]);

      const marker = new mapgl.Marker(map, {
        coordinates: [point.lng, point.lat],
        icon: isActive ? 'https://docs.2gis.com/img/mapgl/marker.svg' : undefined,
        size: isActive ? [40, 40] : undefined,
        label: isActive
          ? {
              text: point.name,
              color: '#ffffff',
              fontSize: 13,
              haloColor: '#c35a31',
              haloRadius: 10
            }
          : undefined
      });

      mapObjectsRef.current.push(marker);
    });

    if (hasSearched && originPoint) {
      boundsPoints.push([originPoint.lng, originPoint.lat]);

      const originMarker = new mapgl.Marker(map, {
        coordinates: [originPoint.lng, originPoint.lat],
        icon: 'https://docs.2gis.com/img/mapgl/marker.svg',
        size: [46, 46],
        label: {
          text: originPoint.name,
          color: '#ffffff',
          fontSize: 13,
          haloColor: '#153549',
          haloRadius: 10
        }
      });

      mapObjectsRef.current.push(originMarker);

      allPoints
        .filter((point) => activeProjectIds.has(point.id))
        .forEach((point) => {
          const polyline = new mapgl.Polyline(map, {
            coordinates: [
              [originPoint.lng, originPoint.lat],
              [point.lng, point.lat]
            ],
            width: 4,
            color: '#c35a31'
          });

          mapObjectsRef.current.push(polyline);
        });
    }

    if (hasSearched && originPoint) {
      const lngs = boundsPoints.map((point) => point[0]);
      const lats = boundsPoints.map((point) => point[1]);

      map.fitBounds(
        {
          northEast: [Math.max(...lngs), Math.max(...lats)],
          southWest: [Math.min(...lngs), Math.min(...lats)]
        },
        {
          padding: { top: 120, bottom: 120, left: 120, right: 120 }
        }
      );
    } else if (allPoints.length > 0) {
      const lngs = allPoints.map((point) => point.lng);
      const lats = allPoints.map((point) => point.lat);

      map.fitBounds(
        {
          northEast: [Math.max(...lngs), Math.max(...lats)],
          southWest: [Math.min(...lngs), Math.min(...lats)]
        },
        {
          padding: { top: 80, bottom: 80, left: 80, right: 80 }
        }
      );
    } else {
      map.setCenter(MOSCOW_CENTER);
      map.setZoom(10);
    }
  }, [activeProjectIds, allPoints, hasSearched, originPoint]);

  return (
    <div className="mapScene">
      <div className="mapCanvasFull" ref={mapRef} />
      <div className={hasSearched ? 'mapVeil searched' : 'mapVeil idle'} />
      <div className="mapHud">
        <div className="mapBadge">Москва / МО</div>
        <div className="mapStatus">
          {isResolving
            ? 'Загружаю карту и точки проектов...'
            : hasSearched
              ? `Маршруты от "${originLabel}" к рекомендованным ЖК`
              : 'Все объекты Самолета нанесены на карту'}
        </div>
        <div className="mapProviderBadge">
          {mapProvider === '2gis'
            ? 'Карта: 2GIS'
            : 'Карта: fallback mode, добавь NEXT_PUBLIC_2GIS_KEY'}
        </div>
      </div>
    </div>
  );
}
