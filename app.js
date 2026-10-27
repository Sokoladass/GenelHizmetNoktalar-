const DEFAULT_TOKEN = 'YOUR_MAPBOX_ACCESS_TOKEN';
const categoryColors = {
  'Kültür ve Yaşam Merkezleri': '#38bdf8',
  'Spor Merkezleri': '#f97316',
  'Alışveriş Alanları': '#a855f7',
  'Millet Kütüphaneleri': '#fb923c',
  'Hizmet Binaları': '#0284c7',
  'Yeşil Alanlar': '#22c55e',
  'Stadyumlar': '#10b981',
  'Hastaneler': '#ef4444',
  'Hayvan Hastanesi': '#ec4899',
  'İSKİ': '#06b6d4',
  'İGDAŞ': '#3b82f6',
  'BEDAŞ': '#eab308',
  'Living Lab': '#64748b',
  'Bizim Çınarlar Yaşam Merkezi': '#14b8a6',
  'U Metro': '#f43f5e',
  'M Metro': '#60a5fa',
  'Tarihi Alanlar': '#b45309',
  'Üniversiteler': '#d97706',
  'VR Tema Park': '#06b6d4',
  'Hızlı Oto Yıkama Alanı': '#0ea5e9',
  'Cemevleri': '#dc2626',
  'Polis Merkezleri': '#f43f5e',
  'İtfaiye İstasyonları': '#e11d48',
  'Eğitim Noktaları': '#94a3b8',
  'Camiler': '#eab308'
};

let allPoints = [];
let map = null;
let disabledCategories = new Set();
let isRotating = false;
let rotationReq = null;
let sidebarVisible = true;
let userToken = localStorage.getItem('mapbox_token') ||
  (DEFAULT_TOKEN !== 'YOUR_MAPBOX_ACCESS_TOKEN' ? DEFAULT_TOKEN : null);

const normalizeSearchTerm = (value) => {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const showBanner = (message, isError = false) => {
  const banner = document.getElementById('status-banner');
  if (!banner) return;
  banner.textContent = message;
  banner.classList.toggle('error', isError);
  banner.classList.remove('hidden');
};

const hideBanner = () => {
  const banner = document.getElementById('status-banner');
  if (!banner) return;
  banner.classList.add('hidden');
};

function normalizeLocations(source) {
  let items = [];

  if (Array.isArray(source)) {
    items = source;
  } else if (source && Array.isArray(source.features)) {
    items = source.features;
  } else if (source && source.type === 'FeatureCollection' && Array.isArray(source.features)) {
    items = source.features;
  }

  return items
    .map((item, index) => {
      if (item && item.type === 'Feature') {
        const props = item.properties || {};
        const geometry = item.geometry || {};
        const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
        const lat = Number(props.lat ?? coordinates[1]);
        const lng = Number(props.lng ?? coordinates[0]);

        return {
          name: props.name || `Nokta ${index + 1}`,
          cat: props.category || props.cat || props.CATEGORY || 'Genel',
          lat,
          lng,
          mah: props.mahalle || props.mah || props.mahalle_adi || 'Belirtilmemiş'
        };
      }

      if (item && typeof item === 'object') {
        const lat = Number(item.lat ?? item.latitude);
        const lng = Number(item.lng ?? item.longitude ?? item.lon ?? item.long);
        return {
          name: item.name || `Nokta ${index + 1}`,
          cat: item.cat || item.category || 'Genel',
          lat,
          lng,
          mah: item.mah || item.mahalle || 'Belirtilmemiş'
        };
      }

      return null;
    })
    .filter(Boolean)
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

async function loadLocations() {
  try {
    const response = await fetch('./locations.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`locations.json yüklenemedi: ${response.status}`);
    }

    const json = await response.json();
    allPoints = normalizeLocations(json);

    if (!allPoints.length) {
      throw new Error('Harita verisi boş geldi.');
    }

    buildCategories();
    buildPlacesList();
    updateMapSource();
    hideBanner();
  } catch (error) {
    console.error(error);
    showBanner('Harita verisi yüklenemedi. Lütfen locations.json dosyasını kontrol edin.', true);
  }
}

function buildCategories() {
  const counts = {};
  allPoints.forEach((point) => {
    counts[point.cat] = (counts[point.cat] || 0) + 1;
  });

  const container = document.getElementById('cat-view');
  if (!container) return;

  container.innerHTML = '';

  Object.keys(counts).sort().forEach((cat) => {
    const color = categoryColors[cat] || '#38bdf8';
    const row = document.createElement('div');
    row.className = 'cat-row' + (disabledCategories.has(cat) ? ' inactive' : '');
    row.innerHTML = `
      <div class="cat-left">
        <span class="cat-dot" style="background:${color};color:${color};"></span>
        <span>${cat}</span>
      </div>
      <span class="cat-badge">${counts[cat]}</span>
    `;
    row.addEventListener('click', () => {
      if (disabledCategories.has(cat)) {
        disabledCategories.delete(cat);
      } else {
        disabledCategories.add(cat);
      }
      buildCategories();
      updateMapSource();
      buildPlacesList();
    });
    container.appendChild(row);
  });
}

function buildPlacesList() {
  const container = document.getElementById('place-view');
  if (!container) return;

  const query = normalizeSearchTerm(document.getElementById('search-input')?.value || '');
  container.innerHTML = '';
  let count = 0;

  allPoints.forEach((point) => {
    if (disabledCategories.has(point.cat)) return;

    const haystack = normalizeSearchTerm(`${point.name} ${point.mah}`);
    if (query && !haystack.includes(query)) return;

    count += 1;
    const color = categoryColors[point.cat] || '#38bdf8';
    const row = document.createElement('div');
    row.className = 'place-row';
    row.innerHTML = `
      <div class="place-name">${point.name}</div>
      <div class="place-meta">
        <span style="color:${color};font-weight:700;">● ${point.cat}</span>
        <span>📍 ${point.mah}</span>
      </div>
    `;
    row.addEventListener('click', () => flyTo3D(point.lng, point.lat, 16.8, 65, point));
    container.appendChild(row);
  });

  const badge = document.getElementById('count-badge');
  if (badge) badge.textContent = count;
}

function initializeControls() {
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const tokenInput = document.getElementById('token-input');
  const saveTokenButton = document.getElementById('save-token-btn');

  searchInput.addEventListener('input', () => {
    const value = searchInput.value;
    searchClear.classList.toggle('visible', value.length > 0);
    updateMapSource();
    buildPlacesList();
    if (normalizeSearchTerm(value) !== '') {
      switchTab('place');
    }
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    updateMapSource();
    buildPlacesList();
    switchTab('cat');
  });

  saveTokenButton.addEventListener('click', saveToken);
  tokenInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') saveToken();
  });

  document.querySelectorAll('[data-light]').forEach((button) => {
    button.addEventListener('click', () => setLighting(button.dataset.light, button));
  });

  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });

  document.querySelectorAll('[data-action]').forEach((button) => {
    const action = button.dataset.action;
    if (action === 'togglePerspective') button.addEventListener('click', togglePerspective);
    if (action === 'rotateCamera') button.addEventListener('click', rotateCamera);
    if (action === 'resetToBasaksehir') button.addEventListener('click', resetToBasaksehir);
  });

  document.getElementById('sidebar-toggle-btn').addEventListener('click', toggleSidebar);
}

function switchTab(tabName) {
  const isCat = tabName === 'cat';
  const catButton = document.getElementById('tab-cat-btn');
  const placeButton = document.getElementById('tab-place-btn');
  const catView = document.getElementById('cat-view');
  const placeView = document.getElementById('place-view');

  catButton.classList.toggle('active', isCat);
  placeButton.classList.toggle('active', !isCat);
  catView.style.display = isCat ? 'block' : 'none';
  placeView.style.display = isCat ? 'none' : 'block';
}

function saveToken() {
  const input = document.getElementById('token-input');
  const value = input.value.trim();

  if (!value.startsWith('pk.')) {
    alert('Lütfen geçerli bir Mapbox Public Token (pk.eyJ...) girin.');
    return;
  }

  localStorage.setItem('mapbox_token', value);
  userToken = value;
  document.getElementById('token-modal').classList.remove('show');
  initMapbox(value);
}

function showTokenModal() {
  const modal = document.getElementById('token-modal');
  if (modal) modal.classList.add('show');
}

function initMapbox(token) {
  if (!token) return;

  mapboxgl.accessToken = token;
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/standard',
    center: [28.775, 41.105],
    zoom: 13.2,
    pitch: 62,
    bearing: -18,
    maxPitch: 85
  });

  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');

  map.on('style.load', () => {
    try {
      map.setConfigProperty('basemap', 'lightPreset', 'dusk');
    } catch (error) {
      console.warn('Işıklandırma ayarı uygulanamadı:', error.message);
    }
    initMapLayers();
  });
}

function buildGeoJSON() {
  const query = normalizeSearchTerm(document.getElementById('search-input')?.value || '');
  const features = allPoints
    .filter((point) => {
      if (disabledCategories.has(point.cat)) return false;
      if (!query) return true;
      return normalizeSearchTerm(`${point.name} ${point.mah}`).includes(query);
    })
    .map((point, index) => ({
      type: 'Feature',
      id: index,
      geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
      properties: {
        name: point.name,
        cat: point.cat,
        mah: point.mah,
        lat: point.lat,
        lng: point.lng,
        color: categoryColors[point.cat] || '#38bdf8'
      }
    }));

  return { type: 'FeatureCollection', features };
}

function initMapLayers() {
  if (!map) return;

  if (!map.getSource('points')) {
    map.addSource('points', { type: 'geojson', data: buildGeoJSON() });
  }

  if (!map.getLayer('points-glow')) {
    map.addLayer({
      id: 'points-glow',
      type: 'circle',
      slot: 'top',
      source: 'points',
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 16, 14, 26, 18, 40],
        'circle-opacity': 0.45,
        'circle-blur': 1.0,
        'circle-emissive-strength': 1
      }
    });
  }

  if (!map.getLayer('points-mid')) {
    map.addLayer({
      id: 'points-mid',
      type: 'circle',
      slot: 'top',
      source: 'points',
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 9, 14, 14, 18, 22],
        'circle-opacity': 0.65,
        'circle-blur': 0.5,
        'circle-emissive-strength': 1
      }
    });
  }

  if (!map.getLayer('points-circle')) {
    map.addLayer({
      id: 'points-circle',
      type: 'circle',
      slot: 'top',
      source: 'points',
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 9, 18, 15],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 1,
        'circle-opacity': 1,
        'circle-emissive-strength': 1
      }
    });
  }

  map.on('mouseenter', 'points-circle', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'points-circle', () => { map.getCanvas().style.cursor = ''; });
  map.on('click', 'points-circle', (event) => {
    if (!event.features.length) return;
    const props = event.features[0].properties;
    const [lng, lat] = event.features[0].geometry.coordinates;
    flyTo3D(lng, lat, 16.8, 65, { name: props.name, cat: props.cat, mah: props.mah });
  });
}

function updateMapSource() {
  if (!map || !map.getSource('points')) return;
  map.getSource('points').setData(buildGeoJSON());
}

function showInfoPopup(point, coords) {
  const color = categoryColors[point.cat] || '#38bdf8';
  new mapboxgl.Popup({ offset: 16, closeButton: true, maxWidth: '290px' })
    .setLngLat(coords)
    .setHTML(`
      <div style="font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;color:${color};letter-spacing:0.06em;margin-bottom:5px;">
          ${point.cat}
        </div>
        <h3 style="font-size:0.96rem;font-weight:800;color:#fff;line-height:1.3;margin-bottom:6px;">
          ${point.name}
        </h3>
        <div style="font-size:0.75rem;color:#94a3b8;margin-bottom:10px;">
          <i class="fa-solid fa-location-dot" style="color:#64748b;margin-right:4px;"></i>${point.mah}
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}"
             target="_blank" rel="noopener"
             style="display:inline-flex;align-items:center;gap:5px;font-size:0.75rem;font-weight:700;color:#38bdf8;text-decoration:none;">
            <i class="fa-solid fa-diamond-turn-right"></i> Yol Tarifi Al ↗
          </a>
        </div>
      </div>
    `)
    .addTo(map);
}

function flyTo3D(lng, lat, zoom = 16.5, pitch = 65, point = null) {
  if (!map) return;

  map.flyTo({
    center: [lng, lat],
    zoom,
    pitch,
    bearing: Math.floor(Math.random() * 60) - 30,
    speed: 1.2,
    curve: 1.4,
    essential: true
  });

  if (point) {
    map.once('moveend', () => showInfoPopup(point, [lng, lat]));
  }
}

function togglePerspective() {
  if (!map) return;
  const pitch = map.getPitch();
  map.easeTo({ pitch: pitch > 20 ? 0 : 65, duration: 1000 });
}

function resetToBasaksehir() {
  if (!map) return;
  stopRotation();
  map.flyTo({ center: [28.775, 41.105], zoom: 13, pitch: 62, bearing: -18, speed: 1.2 });
}

function rotateCamera() {
  if (!map) return;
  isRotating ? stopRotation() : startRotation();
}

function startRotation() {
  isRotating = true;
  const orbitIcon = document.getElementById('orbit-icon');
  if (orbitIcon) orbitIcon.classList.add('fa-spin');
  animateOrbit();
}

function animateOrbit() {
  if (!isRotating || !map) return;
  map.setBearing(map.getBearing() + 0.2);
  rotationReq = requestAnimationFrame(animateOrbit);
}

function stopRotation() {
  isRotating = false;
  const orbitIcon = document.getElementById('orbit-icon');
  if (orbitIcon) orbitIcon.classList.remove('fa-spin');

  if (rotationReq) {
    cancelAnimationFrame(rotationReq);
    rotationReq = null;
  }

  if (map) {
    const rounded = Math.round(map.getBearing() / 45) * 45;
    map.easeTo({ bearing: rounded, duration: 800 });
  }
}

function setLighting(preset, button) {
  if (!map) return;

  try {
    map.setConfigProperty('basemap', 'lightPreset', preset);
  } catch (error) {
    console.warn('Işıklandırma ayarlanamadı:', error.message);
  }

  document.querySelectorAll('.btn-light').forEach((item) => item.classList.remove('active'));
  if (button) button.classList.add('active');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebarVisible = !sidebarVisible;
  sidebar.classList.toggle('sidebar-hidden', !sidebarVisible);

  const icon = document.getElementById('sidebar-toggle-icon');
  if (icon) {
    icon.classList.toggle('fa-bars', sidebarVisible);
    icon.classList.toggle('fa-xmark', !sidebarVisible);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  initializeControls();
  buildCategories();
  buildPlacesList();
  await loadLocations();

  if (!userToken) {
    showTokenModal();
  } else {
    initMapbox(userToken);
  }
});
