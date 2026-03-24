'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ProjectSummary, RankedProject } from '@samolyot-finder/shared-types';

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

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423];
const geocodeCache = new Map<string, MapPoint>();

function createProjectIcon(label: string, kind: 'ghost' | 'active' | 'origin') {
  return L.divIcon({
    className: `leaflet-project-icon ${kind}`,
    html: `<span>${label}</span>`,
    iconSize: kind === 'ghost' ? [18, 18] : kind === 'origin' ? [84, 38] : [152, 40],
    iconAnchor: kind === 'ghost' ? [9, 9] : kind === 'origin' ? [42, 19] : [76, 20]
  });
}

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
  const leafletMapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [allPoints, setAllPoints] = useState<MapPoint[]>([]);
  const [originPoint, setOriginPoint] = useState<MapPoint | null>(null);
  const [isResolving, setIsResolving] = useState(true);

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
            lat: MOSCOW_CENTER[0],
            lng: MOSCOW_CENTER[1]
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
    if (!mapRef.current || leafletMapRef.current) {
      return;
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      scrollWheelZoom: true
    }).setView(MOSCOW_CENTER, 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const layers = L.layerGroup().addTo(map);

    leafletMapRef.current = map;
    layerGroupRef.current = layers;

    return () => {
      map.remove();
      leafletMapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMapRef.current;
    const layers = layerGroupRef.current;

    if (!map || !layers) {
      return;
    }

    layers.clearLayers();

    const boundsPoints: L.LatLngExpression[] = [];

    allPoints.forEach((point) => {
      const latLng: L.LatLngExpression = [point.lat, point.lng];
      const isActive = activeProjectIds.has(point.id);
      boundsPoints.push(latLng);

      L.marker(latLng, {
        icon: createProjectIcon(
          isActive ? point.name : '',
          isActive ? 'active' : 'ghost'
        )
      })
        .bindPopup(point.name)
        .addTo(layers);
    });

    if (hasSearched && originPoint) {
      const originLatLng: L.LatLngExpression = [originPoint.lat, originPoint.lng];
      boundsPoints.push(originLatLng);

      L.marker(originLatLng, {
        icon: createProjectIcon(originPoint.name, 'origin')
      })
        .bindPopup(originPoint.name)
        .addTo(layers);

      allPoints
        .filter((point) => activeProjectIds.has(point.id))
        .forEach((point) => {
          const latLng: L.LatLngExpression = [point.lat, point.lng];

          L.polyline([originLatLng, latLng], {
            color: '#cc5e31',
            weight: 3,
            opacity: 0.85,
            dashArray: '10 10'
          }).addTo(layers);
        });
    }

    if (hasSearched && originPoint) {
      map.fitBounds(L.latLngBounds(boundsPoints), {
        padding: [120, 120]
      });
    } else if (allPoints.length > 0) {
      map.fitBounds(
        L.latLngBounds(allPoints.map((point) => [point.lat, point.lng] as L.LatLngExpression)),
        {
          padding: [80, 80]
        }
      );
    } else {
      map.setView(MOSCOW_CENTER, 10);
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
      </div>
    </div>
  );
}
