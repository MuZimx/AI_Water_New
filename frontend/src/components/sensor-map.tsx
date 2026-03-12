"use client";

import React, { useEffect, useRef } from 'react';

type Sensor = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  status?: string;
  last_audio_time?: string | null;
  assigned?: boolean; // 是否已分配工人
};

export default function SensorMap({ sensors, onSensorClick, isAdmin, onViewDetails }: { sensors: Sensor[]; onSensorClick?: (sensor: Sensor) => void; isAdmin?: boolean; onViewDetails?: (sensorId: number) => void }) {
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
            maxZoom: 18
          });
          L.tileLayer(offlineTemplate, {
            attribution: '&copy; 天地图'
          }).addTo(instanceRef.current);
        }

        // render markers same as Leaflet fallback below
        const layerGroup = L.layerGroup();
        sensors.forEach((s: Sensor) => {
          const color = s.status === '严重漏水' ? '#ef4444' :
                       s.status === '轻微漏水' ? '#eab308' :
                       s.status === '传感器损坏' ? '#6b7280' :
                       s.status === '正常' ? '#22c55e' : '#9ca3af';
          const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="
              background-color: ${color};
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          const marker = L.marker([s.latitude, s.longitude], { icon });
          const isAbnormal = s.status === '严重漏水' || s.status === '轻微漏水' || s.status === '传感器损坏';
          const isAssigned = s.assigned === true;
          let buttons = '';
          if (isAbnormal) {
            if (isAdmin) {
              buttons = '<div style="margin-top:8px;"><button data-sensor-id="' + s.id + '" ' + (isAssigned ? 'disabled style="width:100%;padding:6px;background:#9ca3af;color:#6b7280;border:none;border-radius:4px;cursor:not-allowed;font-size:12px;">已分配</button>' : 'class="assign-worker-btn" style="width:100%;padding:6px;background:#2563eb;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">分配维修工</button>') + '</div>';
            } else {
              buttons = '<div style="margin-top:8px;"><button data-view-details="' + s.id + '" style="width:100%;padding:6px;background:#22c55e;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">查看详情</button></div>';
            }
          }
          const popupContent = `
            <div style="min-width:150px">
              <strong>${s.name}</strong><br/>
              <span style="color:${color}">●</span> 状态：${s.status || '未知'}<br/>
              最近上报：${s.last_audio_time || '—'}
              ${buttons}
            </div>
          `;
          marker.bindPopup(popupContent);

          // 添加点击事件 - 只在点击时触发，不影响弹窗显示
          marker.on('click', () => {
            // 不阻止默认行为，让弹窗正常显示
            if (onSensorClick && (s.status === '严重漏水' || s.status === '轻微漏水' || s.status === '传感器损坏') && isAdmin) {
              // 点击时记录选中的传感器，但仍然显示弹窗
              const sensorData = s;
              // 将传感器ID通过事件传递
              if (typeof window !== 'undefined') {
                (window as any).lastClickedSensor = sensorData;
              }
            }
          });

          // 监听弹窗内的按钮点击
          marker.on('popupopen', () => {
            const popup = marker.getPopup();
            if (popup) {
              const popupContent = popup.getElement();
              if (popupContent) {
                  const assignBtn = popupContent.querySelector('.assign-worker-btn');
                  if (assignBtn) {
                    assignBtn.addEventListener('click', (e: Event) => {
                      e.stopPropagation();
                      if (typeof window !== 'undefined') {
                        (window as any).lastClickedSensor = s;
                        if (typeof (window as any).triggerAssignWorker === 'function') {
                          (window as any).triggerAssignWorker(s.id);
                        }
                      }
                    });
                  }
                  const viewDetailsBtn = popupContent.querySelector('[data-view-details]');
                  if (viewDetailsBtn && onViewDetails) {
                    viewDetailsBtn.addEventListener('click', (e: Event) => {
                      e.stopPropagation();
                      onViewDetails(s.id);
                    });
                  }
              }
            }
          });

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
              maxZoom: 18
            });
          }

          // add markers
          // remove existing markers if any
          if ((instanceRef.current as any)._markerGroup) {
            (instanceRef.current as any)._markerGroup.forEach((m: any) => m.remove());
          }
          (instanceRef.current as any)._markerGroup = [];

          sensors.forEach((s: Sensor) => {
            const color = s.status === '严重漏水' ? '#ef4444' :
                         s.status === '轻微漏水' ? '#eab308' :
                         s.status === '传感器损坏' ? '#6b7280' :
                         s.status === '正常' ? '#22c55e' : '#9ca3af';
            const el = document.createElement('div');
            el.className = `rounded-full w-4 h-4 border-2 border-white`;
            el.style.backgroundColor = color;
            const isAbnormal = s.status === '严重漏水' || s.status === '轻微漏水' || s.status === '传感器损坏';
            const isAssigned = s.assigned === true;
            let buttons = '';
            if (isAbnormal) {
              if (isAdmin) {
                buttons = '<div style="margin-top:8px;"><button data-sensor-id="' + s.id + '" ' + (isAssigned ? 'disabled style="width:100%;padding:6px;background:#9ca3af;color:#6b7280;border:none;border-radius:4px;cursor:not-allowed;font-size:12px;">已分配</button>' : 'class="assign-worker-btn" style="width:100%;padding:6px;background:#2563eb;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">分配维修工</button>') + '</div>';
              } else {
                buttons = '<div style="margin-top:8px;"><button data-view-details="' + s.id + '" style="width:100%;padding:6px;background:#22c55e;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">查看详情</button></div>';
              }
            }
            const marker = new (window as any).maplibregl.Marker({ element: el })
              .setLngLat([s.longitude, s.latitude])
              .setPopup(new (window as any).maplibregl.Popup({ offset: 12 }).setHTML(`
                <div style="min-width:150px">
                  <strong>${s.name}</strong><br/>
                  <span style="color:${color}">●</span> 状态：${s.status || '未知'}<br/>
                  最近上报：${s.last_audio_time || '—'}
                  ${buttons}
                </div>
                `))
              .addTo(instanceRef.current);

            // 添加点击事件
            marker.getElement()?.addEventListener('click', () => {
              if (onSensorClick && (s.status === '严重漏水' || s.status === '轻微漏水' || s.status === '传感器损坏') && isAdmin) {
                if (typeof window !== 'undefined') {
                  (window as any).lastClickedSensor = s;
                }
              }
            });

            // 监听弹窗内的按钮点击
            marker.on('open', () => {
              const popup = marker.getPopup();
              if (popup) {
                const popupElement = (popup as any).getElement();
                if (popupElement) {
                  const assignBtn = popupElement.querySelector('.assign-worker-btn');
                  if (assignBtn) {
                    assignBtn.addEventListener('click', (e: Event) => {
                      e.stopPropagation();
                      if (typeof window !== 'undefined') {
                        (window as any).lastClickedSensor = s;
                        if (typeof (window as any).triggerAssignWorker === 'function') {
                          (window as any).triggerAssignWorker(s.id);
                        }
                      }
                    });
                  }
                  const viewDetailsBtn = popupElement.querySelector('[data-view-details]');
                  if (viewDetailsBtn && onViewDetails) {
                    viewDetailsBtn.addEventListener('click', (e: Event) => {
                      e.stopPropagation();
                      onViewDetails(s.id);
                    });
                  }
                }
              }
            });
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
          maxZoom: 18
        });

        // 使用天地图在线瓦片
        const tdtKey = process.env.NEXT_PUBLIC_TDT_KEY || '您的天地图Key';
        // 天地图影像底图
        L.tileLayer(`https://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tdtKey}`, {
          attribution: '&copy; 天地图',
          maxZoom: 18
        }).addTo(instanceRef.current);

        // 天地图注记图层
        L.tileLayer(`https://t0.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tdtKey}`, {
          attribution: '&copy; 天地图',
          maxZoom: 18
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
        const color = s.status === '严重漏水' ? '#ef4444' :
                     s.status === '轻微漏水' ? '#eab308' :
                     s.status === '传感器损坏' ? '#6b7280' :
                     s.status === '正常' ? '#22c55e' : '#9ca3af';
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            background-color: ${color};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        const marker = L.marker([s.latitude, s.longitude], { icon });
        const isAbnormal = s.status === '严重漏水' || s.status === '轻微漏水' || s.status === '传感器损坏';
        const isAssigned = s.assigned === true;
        let buttons = '';
        if (isAbnormal) {
          if (isAdmin) {
            buttons = '<div style="margin-top:8px;"><button data-sensor-id="' + s.id + '" ' + (isAssigned ? 'disabled style="width:100%;padding:6px;background:#9ca3af;color:#6b7280;border:none;border-radius:4px;cursor:not-allowed;font-size:12px;">已分配</button>' : 'class="assign-worker-btn" style="width:100%;padding:6px;background:#2563eb;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">分配维修工</button>') + '</div>';
          } else {
            buttons = '<div style="margin-top:8px;"><button data-view-details="' + s.id + '" style="width:100%;padding:6px;background:#22c55e;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">查看详情</button></div>';
          }
        }
        const popupContent = `
          <div style="min-width:150px">
            <strong>${s.name}</strong><br/>
            <span style="color:${color}">●</span> 状态：${s.status || '未知'}<br/>
            最近上报：${s.last_audio_time || '—'}
            ${buttons}
          </div>
        `;
        marker.bindPopup(popupContent);

        // 添加点击事件
        marker.on('click', () => {
          if (onSensorClick && (s.status === '严重漏水' || s.status === '轻微漏水' || s.status === '传感器损坏') && isAdmin) {
            if (typeof window !== 'undefined') {
              (window as any).lastClickedSensor = s;
            }
          }
        });

        // 监听弹窗内的按钮点击
        marker.on('popupopen', () => {
          const popup = marker.getPopup();
          if (popup) {
            const popupContent = popup.getElement();
            if (popupContent) {
              const assignBtn = popupContent.querySelector('.assign-worker-btn');
              if (assignBtn) {
                assignBtn.addEventListener('click', (e: Event) => {
                  e.stopPropagation();
                  if (typeof window !== 'undefined') {
                    (window as any).lastClickedSensor = s;
                    if (typeof (window as any).triggerAssignWorker === 'function') {
                      (window as any).triggerAssignWorker(s.id);
                    }
                  }
                });
              }
              const viewDetailsBtn = popupContent.querySelector('[data-view-details]');
              if (viewDetailsBtn && onViewDetails) {
                viewDetailsBtn.addEventListener('click', (e: Event) => {
                  e.stopPropagation();
                  onViewDetails(s.id);
                });
              }
            }
          }
        });

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
