'use client';

import { useEffect, useRef } from 'react';

// Leaflet types
type LeafletMap = import('leaflet').Map;
type DivIconOptions = import('leaflet').DivIconOptions;

function makeIcon(color: string, size: number): DivIconOptions {
  return {
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #1a1208;border-radius:50%;"></div>`,
    iconSize: [size, size] as [number, number],
    iconAnchor: [size / 2, size / 2] as [number, number],
    className: '',
  };
}

const TILE_URL  = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const SEPIA     = 'sepia(50%) brightness(97%)';

function useLeafletMap(
  containerId: string,
  setup: (L: typeof import('leaflet'), container: HTMLElement) => LeafletMap,
) {
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container || mapRef.current) return;

    import('leaflet').then(L => {
      // Fix default icon path
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      mapRef.current = setup(L, container);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [containerId, setup]);
}

function MapLuxembourg() {
  useLeafletMap('map-luxembourg', (L) => {
    const map = L.map('map-luxembourg', { scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 15 }).addTo(map);
    map.setView([49.555, 6.155], 12);
    document.getElementById('map-luxembourg')!.style.filter = SEPIA;

    const gold = L.divIcon(makeIcon('#c4962a', 12));
    const red  = L.divIcon(makeIcon('#8b3a2a', 14));

    [
      { lat: 49.5642, lng: 6.1594, icon: red,  title: 'Alzingen',   body: 'Family seat 1698–1848<br><em>Jean through Joannes</em>' },
      { lat: 49.549,  lng: 6.168,  icon: gold, title: 'Bivingen',   body: 'Likely family origin before 1698<br><em>Gaasch cluster documented 1685–1699</em>' },
      { lat: 49.556,  lng: 6.143,  icon: gold, title: 'Hesperange', body: 'Parish church & records<br><em>Marriages & baptisms recorded here</em>' },
      { lat: 49.539,  lng: 6.157,  icon: gold, title: 'Roeser',     body: 'Parish register begins 1685<br><em>Gaasch family documented here</em>' },
      { lat: 49.521,  lng: 6.134,  icon: gold, title: 'Bettenburg', body: 'Nicolaus Gaasch from here<br><em>married Catharina Peters, 1727</em>' },
    ].forEach(({ lat, lng, icon, title, body }) =>
      L.marker([lat, lng], { icon }).addTo(map).bindPopup(`<strong>${title}</strong><br>${body}`)
    );
    return map;
  });

  return (
    <div className="map-card">
      <h3>Luxembourg Villages — The Old World</h3>
      <div id="map-luxembourg" className="map-container" />
      <p className="map-caption">Alzingen (family seat 1698–1848), Bivingen (likely origin before 1698), Hesperange (parish church), Roeser, Bettenburg.</p>
    </div>
  );
}

function MapMigration() {
  useLeafletMap('map-migration', (L) => {
    const map = L.map('map-migration', { scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 5 }).addTo(map);
    map.setView([45, -30], 3);
    document.getElementById('map-migration')!.style.filter = SEPIA;

    const gold = L.divIcon(makeIcon('#c4962a', 12));
    const red  = L.divIcon(makeIcon('#8b3a2a', 14));

    L.polyline(
      [[49.5642, 6.1594], [49.612, 6.132], [51.507, -0.127], [49.0, -30.0], [29.954, -90.075], [42.501, -90.664]],
      { color: '#c4962a', weight: 2, dashArray: '6,4', opacity: 0.8 }
    ).addTo(map);

    L.marker([49.5642, 6.1594], { icon: red  }).addTo(map).bindPopup('<strong>Alzingen, Luxembourg</strong><br>Joannes departs 1848');
    L.marker([42.501, -90.664], { icon: red  }).addTo(map).bindPopup('<strong>Dubuque, Iowa</strong><br>Arrival 1848–49. Peter born here 1849');
    L.marker([30.55, -97.83],   { icon: gold }).addTo(map).bindPopup('<strong>Texas High Plains</strong><br>Phil settled here c. 1995');
    return map;
  });

  return (
    <div className="map-card">
      <h3>The Migration Route — Luxembourg to Texas</h3>
      <div id="map-migration" className="map-container" />
      <p className="map-caption">Joannes departed Luxembourg in 1848, landing in Dubuque, Iowa. The family then moved west through Kansas, Oklahoma, and finally to the Texas High Plains.</p>
    </div>
  );
}

function MapAmerica() {
  useLeafletMap('map-america', (L) => {
    const map = L.map('map-america', { scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 6 }).addTo(map);
    map.setView([38, -96], 5);
    document.getElementById('map-america')!.style.filter = SEPIA;

    const gold = L.divIcon(makeIcon('#c4962a', 12));

    [
      { coords: [42.501, -90.664] as [number, number], name: 'Dubuque, Iowa',        note: 'Arrival 1848–49' },
      { coords: [38.352, -97.134] as [number, number], name: 'Marion, Kansas',       note: 'Homestead 1877' },
      { coords: [36.155, -95.993] as [number, number], name: 'Tulsa, Oklahoma',      note: 'Glenn & Melvin' },
      { coords: [36.115, -97.058] as [number, number], name: 'Stillwater, Oklahoma', note: 'Peter died 1915' },
      { coords: [35.973, -96.378] as [number, number], name: 'Mannford, Oklahoma',   note: 'Glenn 1935–1988' },
    ].forEach(({ coords, name, note }) =>
      L.marker(coords, { icon: gold }).addTo(map).bindPopup(`<strong>${name}</strong><br><em>${note}</em>`)
    );
    return map;
  });

  return (
    <div className="map-card">
      <h3>American Frontier — Iowa to Oklahoma</h3>
      <div id="map-america" className="map-container" />
      <p className="map-caption">Dubuque (arrival 1848–49), Marion County Kansas (homestead 1877), Benton County Arkansas (1900), Payne County Oklahoma (1910–15), Mannford Oklahoma (Glenn 1935–1988).</p>
    </div>
  );
}

function MapTexas() {
  useLeafletMap('map-texas', (L) => {
    const map = L.map('map-texas', { scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 9 }).addTo(map);
    map.setView([33.88, -102.72], 9);
    document.getElementById('map-texas')!.style.filter = SEPIA;

    const gold = L.divIcon(makeIcon('#c4962a', 12));
    const red  = L.divIcon(makeIcon('#8b3a2a', 14));

    L.marker([33.888, -102.727], { icon: red  }).addTo(map).bindPopup('<strong>Muleshoe, Texas</strong><br>Bailey County seat<br><em>Phil settled here c. 1995</em>');
    L.marker([33.837, -102.413], { icon: gold }).addTo(map).bindPopup("<strong>Amherst, Texas</strong><br>Bailey County<br><em>Phil's area of settlement</em>");
    return map;
  });

  return (
    <div className="map-card">
      <h3>Texas High Plains — The Present</h3>
      <div id="map-texas" className="map-container" />
      <p className="map-caption">Phil settled in Bailey County — Muleshoe and Amherst — the final chapter of this nine-generation journey.</p>
    </div>
  );
}

export default function MapsSection() {
  return (
    <section id="maps" className="maps-section">
      <div style={{ textAlign: 'center', padding: '0 2rem 0' }}>
        <h2 className="section-heading">Geography of the Family</h2>
        <p className="map-intro">From the Alzette valley to the American frontier — places that shaped each generation.</p>
      </div>
      <div className="maps-grid">
        <MapLuxembourg />
        <MapMigration />
        <MapAmerica />
        <MapTexas />
      </div>
    </section>
  );
}
