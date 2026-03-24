'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RankedProject } from '@samolyot-finder/shared-types';

type RouteMapProps = {
  projects: RankedProject[];
};

type MapPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423];

const geocodeCache = new Map<string, MapPoint>();

function createProjectIcon(label: string) {
  return L.divIcon({
    className: 'leaflet-project-icon',
    html: `<span>${label}</span>`,
    iconSize: [126, 34],
    iconAnchor: [63, 17]
  });
}

function createOriginIcon() {
  return L.divIcon({
    className: 'leaflet-origin-icon',
    html: '<span>Вы</span>',
    iconSize: [58, 34],
    iconAnchor: [29, 17]
  });
}

export function RouteMap({ projects }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [isResolving, setIsResolving] = useState(true);

  const requestedProjects = useMemo(() => projects.slice(0, 3), [projects]);

  useEffect(() => {
    let cancelled = false;

    async function resolvePoints() {
      setIsResolving(true);

      const resolved = await Promise.all(
        requestedProjects.map(async (project) => {
          const cacheKey = `${project.name} ${project.address}`;

          if (geocodeCache.has(cacheKey)) {
            return geocodeCache.get(cacheKey)!;
          }

          try {
            const query = encodeURIComponent(`${project.name}, ${project.address}, Москва, Россия`);
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`,
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
              id: project.id,
              name: project.name,
              lat: Number(first.lat),
              lng: Number(first.lon)
            };

            geocodeCache.set(cacheKey, point);
            return point;
          } catch {
            return null;
          }
        })
      );

      if (!cancelled) {
        setPoints(resolved.filter(Boolean) as MapPoint[]);
        setIsResolving(false);
      }
    }

    void resolvePoints();

    return () => {
      cancelled = true;
    };
  }, [requestedProjects]);

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) {
      return;
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView(MOSCOW_CENTER, 9);

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

    const origin = L.marker(MOSCOW_CENTER, {
      icon: createOriginIcon()
    }).bindPopup('Точка пользователя / центр сценария');

    origin.addTo(layers);

    const latLngs: L.LatLngExpression[] = [MOSCOW_CENTER];

    points.forEach((point) => {
      const latLng: L.LatLngExpression = [point.lat, point.lng];
      latLngs.push(latLng);

      L.marker(latLng, {
        icon: createProjectIcon(point.name)
      })
        .bindPopup(point.name)
        .addTo(layers);

      L.polyline([MOSCOW_CENTER, latLng], {
        color: '#cc5e31',
        weight: 3,
        opacity: 0.65,
        dashArray: '8 8'
      }).addTo(layers);
    });

    if (latLngs.length > 1) {
      map.fitBounds(L.latLngBounds(latLngs), {
        padding: [28, 28]
      });
    } else {
      map.setView(MOSCOW_CENTER, 9);
    }
  }, [points]);

  return (
    <div className="mapCard">
      <p className="sectionLabel">Визуализация маршрута</p>
      <h2>Карта сценария поиска</h2>
      <div className="realMapFrame">
        <div className="realMapCanvas" ref={mapRef} />
        {isResolving ? <div className="mapOverlay">Определяю координаты ЖК...</div> : null}
      </div>
      <p className="mapCaption">
        Карта интерактивная: маркеры строятся по геокодированию адресов рекомендованных ЖК через
        OpenStreetMap.
      </p>
    </div>
  );
}

