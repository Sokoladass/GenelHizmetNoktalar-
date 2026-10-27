const DEFAULT_TOKEN = 'YOUR_MAPBOX_ACCESS_TOKEN';

const CATEGORY_ALIASES = {
  'kultur ve yasam': 'Kültür ve Yaşam',
  'kultur ve yasam merkezleri': 'Kültür ve Yaşam',
  'kültür ve yaşam': 'Kültür ve Yaşam',
  'kültür ve yaşam merkezleri': 'Kültür ve Yaşam',
  'kultur': 'Kültür ve Yaşam',
  'kültür': 'Kültür ve Yaşam',
  'spor': 'Spor',
  'spor merkezleri': 'Spor',
  'stadyumlar': 'Spor',
  'alisveris': 'Alışveriş',
  'alışveriş': 'Alışveriş',
  'alisveris alanlari': 'Alışveriş',
  'alışveriş alanları': 'Alışveriş',
  'kutuphane': 'Kütüphane',
  'kütüphane': 'Kütüphane',
  'millet kutuphaneleri': 'Kütüphane',
  'millet kütüphaneleri': 'Kütüphane',
  'hizmet': 'Hizmet',
  'hizmet binasi': 'Hizmet',
  'hizmet binası': 'Hizmet',
  'hizmet binalari': 'Hizmet',
  'hizmet binaları': 'Hizmet',
  'yesil alan': 'Yeşil Alan',
  'yeşil alan': 'Yeşil Alan',
  'yesil alanlar': 'Yeşil Alan',
  'yeşil alanlar': 'Yeşil Alan',
  'saglik': 'Sağlık',
  'sağlık': 'Sağlık',
  'hastaneler': 'Sağlık',
  'hayvan hastanesi': 'Sağlık',
  'igdas': 'Altyapı',
  'i̇gdaş': 'Altyapı',
  'işki': 'Altyapı',
  'iski': 'Altyapı',
  'bedas': 'Altyapı',
  'living lab': 'Araştırma',
  'bizim cinarlar yasam merkezi': 'Kültür ve Yaşam',
  'bizim çınarlar yaşam merkezi': 'Kültür ve Yaşam',
  'u metro': 'Ulaşım',
  'm metro': 'Ulaşım',
  'ulasim': 'Ulaşım',
  'ulaşım': 'Ulaşım',
  'tarihi alanlar': 'Tarih',
  'universiteler': 'Eğitim',
  'üniversiteler': 'Eğitim',
  'vr tema park': 'Eğlence',
  'hizli oto yikama alani': 'Hizmet',
  'hızlı oto yıkama alanı': 'Hizmet',
  'cemevleri': 'Kültür ve Yaşam',
  'polis merkezleri': 'Güvenlik',
  'itfaiye istasyonlari': 'Güvenlik',
  'itfaiye istasyonları': 'Güvenlik',
  'egitim': 'Eğitim',
  'eğitim': 'Eğitim',
  'egitim noktaları': 'Eğitim',
  'eğitim noktaları': 'Eğitim',
  'camiler': 'Kültür ve Yaşam',
  'genel': 'Genel',
  'belediye': 'Hizmet',
  'sağlık merkezi': 'Sağlık',
  'guvenlik': 'Güvenlik',
  'güvenlik': 'Güvenlik',
  'altyapi': 'Altyapı',
  'altyapı': 'Altyapı',
  'cevre': 'Yeşil Alan',
  'çevre': 'Yeşil Alan'
};

const categoryColors = {
  'Kültür ve Yaşam': '#38bdf8',
  'Spor': '#f97316',
  'Alışveriş': '#a855f7',
  'Kütüphane': '#fb923c',
  'Hizmet': '#0284c7',
  'Yeşil Alan': '#22c55e',
  'Sağlık': '#ef4444',
  'Altyapı': '#06b6d4',
  'Araştırma': '#64748b',
  'Tarih': '#b45309',
  'Eğitim': '#d97706',
  'Eğlence': '#06b6d4',
  'Güvenlik': '#f43f5e',
  'Ulaşım': '#60a5fa',
  'Genel': '#38bdf8'
};

let allPoints = [];
let map = null;
let disabledCategories = new Set();
let isRotating = false;
let rotationReq = null;
let sidebarVisible = true;
let userToken = localStorage.getItem('mapbox_token') ||
  (DEFAULT_TOKEN !== 'YOUR_MAPBOX_ACCESS_TOKEN' ? DEFAULT_TOKEN : null);

const normalizeText = (value) => {
  if (value === null || value === undefined) return '';

  return String(value)
    .trim()
    .toLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeCategory = (value) => {
  const raw = normalizeText(value || '');
  if (!raw) return 'Genel';
  return CATEGORY_ALIASES[raw] || 'Genel';
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

const dedupePoints = (points) => {
  const seen = new Set();

  return points.filter((point) => {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false;

    const key = [
      normalizeText(point.name),
      Number(point.lat).toFixed(6),
      Number(point.lng).toFixed(6),
      normalizeText(point.mah)
    ].join('|');

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const validatePoint = (point) => {
  if (!point || typeof point !== 'object') {
    return { valid: false, reason: 'Nokta verisi yok.' };
  }

  if (!point.name || String(point.name).trim() === '') {
    return { valid: false, reason: 'Nokta adı eksik.' };
  }

  const lat = Number(point.lat);
  const lng = Number(point.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { valid: false, reason: 'Koordinatlar geçersiz.' };
  }

  if (lat < 35 || lat > 42) {
    return { valid: false, reason: 'Enlem değeri Türkiye aralığı dışında.' };
  }

  if (lng < 26 || lng > 45) {
    return { valid: false, reason: 'Boylam değeri Türkiye aralığı dışında.' };
  }

  return { valid: true };
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

  const normalized = items
    .map((item, index) => {
      if (item && item.type === 'Feature') {
        const props = item.properties || {};
        const geometry = item.geometry || {};
        const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
        const lat = Number(props.lat ?? props.latitude ?? coordinates[1]);
        const lng = Number(props.lng ?? props.lon ?? props.long ?? props.longitude ?? coordinates[0]);
        const category = normalizeCategory(props.category || props.cat || props.CATEGORY || 'Genel');

        return {
          id: props.id || `point-${index + 1}`,
          name: String(props.name || props.title || `Nokta ${index + 1}`).trim(),
          cat: category,
          lat,
          lng,
          mah: String(props.mahalle || props.mah || props.mahalle_adi || 'Belirtilmemiş').trim()
        };
      }

      if (item && typeof item === 'object') {
        const lat = Number(item.lat ?? item.latitude);
        const lng = Number(item.lng ?? item.longitude ?? item.lon ?? item.long);
        const category = normalizeCategory(item.cat || item.category || item.CATEGORY || 'Genel');

        return {
          id: item.id || `point-${index + 1}`,
          name: String(item.name || item.title || `Nokta ${index + 1}`).trim(),
          cat: category,
          lat,
          lng,
          mah: String(item.mah || item.mahalle || item.neighborhood || 'Belirtilmemiş').trim()
        };
      }

      return null;
    })
    .filter(Boolean)
    .map((point) => ({
      ...point,
      name: point.name || `Nokta ${point.id || '1'}`,
      cat: normalizeCategory(point.cat),
      mah: point.mah || 'Belirtilmemiş'
    }))
    .filter((point) => {
      const result = validatePoint(point);
      return result.valid;
    });

  return dedupePoints(normalized);
}

const updateStats = () => {
  const total = allPoints.length;
  const visible = allPoints.filter((point) => !disabledCategories.has(point.cat)).length;
  const categoryCount = new Set(allPoints.map((point) => point.cat)).size;

  const totalEl = document.getElementById('stat-total');
  const categoryEl = document.getElementById('stat-categories');
  const visibleEl = document.getElementById('stat-visible');

  if (totalEl) totalEl.textContent = String(total);
  if (categoryEl) categoryEl.textContent = String(categoryCount);
  if (visibleEl) visibleEl.textContent = String(visible);
};

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

    disabledCategories.clear();
    buildCategories();
    buildPlacesList();
    updateMapSource();
    updateStats();
    hideBanner();
  } catch (error) {
    console.error(error);
    allPoints = [];
    buildCategories();
    buildPlacesList();
    updateStats();
    showBanner('Harita verisi yüklenemedi. Lütfen locations.json dosyasını kontrol edin.', true);
  }
}

function createEmptyState(message) {
  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';
  emptyState.innerHTML = `
    <div class="empty-state-icon"><i class="fa-solid fa-location-crosshairs"></i></div>
    <div class="empty-state-title">Sonuç bulunamadı</div>
    <div class="empty-state-text">${message}</div>
  `;
  return emptyState;
}

function buildCategories() {
  const counts = {};
  allPoints.forEach((point) => {
    counts[point.cat] = (counts[point.cat] || 0) + 1;
  });

  const container = document.getElementById('cat-view');
  if (!container) return;

  container.innerHTML = '';

  const keys = Object.keys(counts).sort();
  if (!keys.length) {
    container.appendChild(createEmptyState('Gösterilecek nokta bulunamadı.'));
    return;
  }

  keys.forEach((cat) => {
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
      updateStats();
    });

    container.appendChild(row);
  });
}

function buildPlacesList() {
  const container = document.getElementById('place-view');
  if (!container) return;

  const query = normalizeText(document.getElementById('search-input')?.value || '');
  container.innerHTML = '';

  const filtered = allPoints.filter((point) => {
    if (disabledCategories.has(point.cat)) return false;
    if (!query) return true;

    const haystack = normalizeText(`${point.name} ${point.mah} ${point.cat}`);
    return haystack.includes(query);
  });

  if (!filtered.length) {
    const message = query ? 'Aramanıza uygun nokta bulunamadı.' : 'Gösterilecek nokta bulunamadı.';
    container.appendChild(createEmptyState(message));
  } else {
    filtered.forEach((point) => {
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
  }

  const badge = document.getElementById('count-badge');
  if (badge) badge.textContent = String(filtered.length);

  updateStats();
}

function clearSearch() {
  const searchInput = document.getElementById('search-input');
  const clearButton = document.getElementById('search-clear');

  if (searchInput) searchInput.value = '';
  if (clearButton) clearButton.classList.remove('visible');

  updateMapSource();
  buildPlacesList();
  switchTab('cat');
}

function handleSearchInput() {
  const input = document.getElementById('search-input');
  const clearButton = document.getElementById('search-clear');
  const value = input ? input.value : '';

  if (clearButton) clearButton.classList.toggle('visible', value.length > 0);
  updateMapSource();
  buildPlacesList();

  if (normalizeText(value) !== '') {
    switchTab('place');
  }
}

function initializeControls() {
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const tokenInput = document.getElementById('token-input');
  const saveTokenButton = document.getElementById('save-token-btn');

  if (searchInput) searchInput.addEventListener('input', handleSearchInput);
  if (searchClear) searchClear.addEventListener('click', clearSearch);

  if (saveTokenButton) saveTokenButton.addEventListener('click', saveToken);
  if (tokenInput) {
    tokenInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') saveToken();
    });
  }

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

  const sidebarToggleButton = document.getElementById('sidebar-toggle-btn');
  if (sidebarToggleButton) {
    sidebarToggleButton.addEventListener('click', toggleSidebar);
  }
}

function switchTab(tabName) {
  const isCat = tabName === 'cat';
  const catButton = document.getElementById('tab-cat-btn');
  const placeButton = document.getElementById('tab-place-btn');
  const catView = document.getElementById('cat-view');
  const placeView = document.getElementById('place-view');

  if (catButton) catButton.classList.toggle('active', isCat);
  if (placeButton) placeButton.classList.toggle('active', !isCat);
  if (catView) catView.style.display = isCat ? 'block' : 'none';
  if (placeView) placeView.style.display = isCat ? 'none' : 'block';
}

function showTokenModal() {
  const modal = document.getElementById('token-modal');
  if (modal) modal.classList.add('show');
}

function saveToken() {
  const input = document.getElementById('token-input');
  const value = input ? input.value.trim() : '';

  if (!value.startsWith('pk.')) {
    alert('Lütfen geçerli bir Mapbox Public Token (pk.eyJ...) girin.');
    return;
  }

  localStorage.setItem('mapbox_token', value);
  userToken = value;
  const modal = document.getElementById('token-modal');
  if (modal) modal.classList.remove('show');
  initMapbox(value);
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
  const query = normalizeText(document.getElementById('search-input')?.value || '');

  const features = allPoints
    .filter((point) => {
      if (disabledCategories.has(point.cat)) return false;
      if (!query) return true;

      const haystack = normalizeText(`${point.name} ${point.mah} ${point.cat}`);
      return haystack.includes(query);
    })
    .map((point, index) => ({
      type: 'Feature',
      id: point.id || index,
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
    map.addSource('points', {
      type: 'geojson',
      data: buildGeoJSON(),
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });
  }

  if (!map.getLayer('points-cluster')) {
    map.addLayer({
      id: 'points-cluster',
      type: 'circle',
      source: 'points',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#38bdf8',
          10,
          '#22c55e',
          25,
          '#f59e0b',
          50,
          '#f97316',
          100,
          '#ef4444'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          18,
          10,
          22,
          25,
          28,
          50,
          34,
          100,
          40
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 1,
        'circle-opacity': 0.9
      }
    });
  }

  if (!map.getLayer('points-cluster-count')) {
    map.addLayer({
      id: 'points-cluster-count',
      type: 'symbol',
      source: 'points',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#0f172a',
        'text-halo-width': 1.25
      }
    });
  }

  if (!map.getLayer('points-point')) {
    map.addLayer({
      id: 'points-point',
      type: 'circle',
      source: 'points',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 9, 18, 15],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 1,
        'circle-opacity': 1,
        'circle-emissive-strength': 1
      }
    });
  }

  map.on('mouseenter', 'points-cluster', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'points-cluster', () => { map.getCanvas().style.cursor = ''; });
  map.on('mouseenter', 'points-point', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'points-point', () => { map.getCanvas().style.cursor = ''; });

  map.on('click', 'points-cluster', (event) => {
    const features = map.queryRenderedFeatures(event.point, { layers: ['points-cluster'] });
    if (!features.length) return;

    const cluster = features[0];
    const clusterId = cluster.properties.cluster_id;
    const source = map.getSource('points');

    if (!source || typeof source.getClusterExpansionZoom !== 'function') return;

    source.getClusterExpansionZoom(clusterId, (error, zoom) => {
      if (error || zoom === undefined || zoom === null) return;

      const [lng, lat] = cluster.geometry.coordinates;
      map.easeTo({
        center: [lng, lat],
        zoom: Math.min(zoom + 0.6, 17.5),
        duration: 600
      });
    });
  });

  map.on('click', 'points-point', (event) => {
    if (!event.features.length) return;
    const feature = event.features[0];
    const [lng, lat] = feature.geometry.coordinates;
    const point = {
      name: feature.properties.name,
      cat: feature.properties.cat,
      mah: feature.properties.mah,
      lng,
      lat
    };
    flyTo3D(lng, lat, 16.8, 65, point);
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
  updateStats();
  await loadLocations();

  if (!userToken) {
    showTokenModal();
  } else {
    initMapbox(userToken);
  }
});
