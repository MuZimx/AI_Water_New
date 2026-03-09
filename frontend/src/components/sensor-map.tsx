"use client";

import React, { useEffect, useRef } from 'react';

type Sensor = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  status?: string;
  last_audio_time?: string | null;
};

export default function SensorMap({ sensors }: { sensors: Sensor[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletLoadedRef = useRef(false);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
  // 优先使用本地离线瓦片（如果配置了 NEXT_PUBLIC_OFFLINE_TILE_URL），
  // 否则优先使用 MapLibre 矢量样式（当 NEXT_PUBLIC_MAP_STYLE 存在），再回退到 Leaflet + OSM 瓦片。
  const offlineTemplate = process.env.NEXT_PUBLIC_OFFLINE_TILE_URL;
  const useMapLibre = !offlineTemplate && !!(process.env.NEXT_PUBLIC_MAP_STYLE);

    const ensureMapLibre = async () => {
      if ((window as any).maplibregl) return;
      // inject CSS
      const cssId = 'maplibre-css';
      if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css';
        document.head.appendChild(link);
      }
      await new Promise<void>((resolve) => {
        if ((window as any).maplibregl) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js';
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    };

    const ensureLeaflet = async () => {
      if (leafletLoadedRef.current) return;
      // 动态注入 Leaflet CSS
      const cssId = 'leaflet-css';
      if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // 动态注入 Leaflet JS
      await new Promise<void>((resolve) => {
        if ((window as any).L) {
          leafletLoadedRef.current = true;
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          leafletLoadedRef.current = true;
          resolve();
        };
        document.body.appendChild(script);
      });
    };

    const setup = async () => {
      if (!mapRef.current) return;

      // 如果配置了离线瓦片，强制使用 Leaflet 离线瓦片层（不会走 MapLibre）
      if (offlineTemplate) {
        await ensureLeaflet();
        if (!mapRef.current) return;
        const L = (window as any).L;
        if (!instanceRef.current) {
          // 南京市中心位置
          instanceRef.current = L.map(mapRef.current, {
            center: [32.06, 118.78],
            zoom: 10,
            maxBounds: [[31.8, 118.5], [32.3, 119.0]], // 南京市边界
            maxBoundsViscosity: 1.0, // 限制拖拽出边界
            minZoom: 10,
            maxZoom: 14
          });
          L.tileLayer(offlineTemplate, {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(instanceRef.current);
        }

        // render markers same as Leaflet fallback below
        const layerGroup = L.layerGroup();
        sensors.forEach((s: Sensor) => {
          const marker = L.marker([s.latitude, s.longitude]);
          const popupContent = `
            <div style="min-width:150px">
              <strong>${s.name}</strong><br/>
              状态：${s.status || '未知'}<br/>
              最近上报：${s.last_audio_time || '—'}
            </div>
          `;
          marker.bindPopup(popupContent);
          marker.addTo(layerGroup);
        });
        layerGroup.addTo(instanceRef.current);

        // 注释掉自动适配，保持固定在南京瓦片位置
        // if (sensors.length > 0) {
        //   const latlngs = sensors.map(s => [s.latitude, s.longitude]);
        //   instanceRef.current.fitBounds(latlngs as any, { padding: [40, 40] });
        // }

        return;
      }

      if (useMapLibre) {
        await ensureMapLibre();
        const maplibre = (window as any).maplibregl;
        if (!maplibre) {
          // fallback
          await ensureLeaflet();
        } else {
          // initialize MapLibre
          if (!instanceRef.current) {
            const styleFromEnv = process.env.NEXT_PUBLIC_MAP_STYLE as string;
            let style = styleFromEnv;
            const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string | undefined;
            // If style URL expects an access token placeholder
            if (token && style && style.includes('{access_token}')) {
              style = style.replace('{access_token}', token);
            } else if (token && style && style.includes('api.mapbox.com') && !style.includes('access_token')) {
              style = style + (style.includes('?') ? '&' : '?') + `access_token=${token}`;
            }

            instanceRef.current = new maplibre.Map({
              container: mapRef.current,
              style: style,
              center: [118.78, 32.06],
              zoom: 10,
              maxBounds: [[118.5, 31.8], [119.0, 32.3]], // 南京市边界 [lng, lat]
              minZoom: 10,
              maxZoom: 14
            });
          }

          // add markers
          // remove existing markers if any
          if ((instanceRef.current as any)._markerGroup) {
            (instanceRef.current as any)._markerGroup.forEach((m: any) => m.remove());
          }
          (instanceRef.current as any)._markerGroup = [];

          sensors.forEach((s: Sensor) => {
            const el = document.createElement('div');
            el.className = 'rounded-full bg-blue-600 w-4 h-4 border-2 border-white';
            const marker = new (window as any).maplibregl.Marker({ element: el })
              .setLngLat([s.longitude, s.latitude])
              .setPopup(new (window as any).maplibregl.Popup({ offset: 12 }).setHTML(`
                <div style="min-width:150px">
                  <strong>${s.name}</strong><br/>
                  状态：${s.status || '未知'}<br/>
                  最近上报：${s.last_audio_time || '—'}
                </div>
              `))
              .addTo(instanceRef.current);
            (instanceRef.current as any)._markerGroup.push(marker);
          });

          // 注释掉自动适配，保持固定在南京瓦片位置
          // if (sensors.length > 0) {
          //   const bounds = new (window as any).maplibregl.LngLatBounds();
          //   sensors.forEach(s => bounds.extend([s.longitude, s.latitude]));
          //   instanceRef.current.fitBounds(bounds, { padding: 40 });
          // }

          return;
        }
      }

      // fallback to Leaflet raster tiles
      await ensureLeaflet();
      if (!mapRef.current) return;
      const L = (window as any).L;
      // 初始化 map
      if (!instanceRef.current) {
        // 南京市中心位置
        instanceRef.current = L.map(mapRef.current, {
          center: [32.06, 118.78],
          zoom: 10,
          maxBounds: [[31.8, 118.5], [32.3, 119.0]], // 南京市边界
          maxBoundsViscosity: 1.0, // 限制拖拽出边界
          minZoom: 10,
          maxZoom: 14
        });

        // 使用 OpenStreetMap 在线瓦片
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(instanceRef.current);
      }

      // 清除现有图层（如果有）再添加 - 使用 instanceRef 存储 layerGroup，避免给已移除的 map 添加 marker 导致 _leaflet_pos 错误
      try {
        if ((instanceRef.current as any)._layerGroup) {
          try {
            (instanceRef.current as any).removeLayer((instanceRef.current as any)._layerGroup);
          } catch (e) {}
          (instanceRef.current as any)._layerGroup = null;
        }
      } catch (e) {}

      const layerGroup = L.layerGroup();
      (instanceRef.current as any)._layerGroup = layerGroup;

      sensors.forEach((s: Sensor) => {
        const marker = L.marker([s.latitude, s.longitude]);
        const popupContent = `
          <div style="min-width:150px">
            <strong>${s.name}</strong><br/>
            状态：${s.status || '未知'}<br/>
            最近上报：${s.last_audio_time || '—'}
          </div>
        `;
        marker.bindPopup(popupContent);
        marker.addTo(layerGroup);
      });

      try {
        layerGroup.addTo(instanceRef.current);
      } catch (e) {
        // 如果 map 已在移除中，忽略
      }

      // 注释掉自动适配，保持固定在南京瓦片位置
      // if (sensors.length > 0) {
      //   const latlngs = sensors.map(s => [s.latitude, s.longitude]);
      //   try {
      //     instanceRef.current.fitBounds(latlngs as any, { padding: [40, 40] });
      //   } catch (e) {
      //     // ignore
      //   }
      // }
    };

    setup();

    // cleanup function
    return () => {
      try {
        if (instanceRef.current) {
          instanceRef.current.remove();
          instanceRef.current = null;
        }
      } catch (e) {}
    };
  }, [sensors]);

  return (
    <div className="rounded-lg overflow-hidden border border-muted h-[360px] w-full" ref={mapRef} />
  );
}
