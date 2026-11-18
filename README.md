# GenelHizmetNoktaları

Başakşehir'deki kamu ve sosyal hizmet noktalarını Mapbox Standard 3D haritasında gösteren statik web uygulaması.

## Özellikler

- 289 noktanın harita üzerinde kümelenerek gösterilmesi
- Kategori filtreleri ve tesis araması
- Tesis ayrıntıları, konum düzenleme ve JSON dışa aktarma
- Mapbox public token ile çalışma

## Dosyalar

- `index.html` — uygulama arayüzü, harita mantığı ve gömülü nokta verileri
- `.nojekyll` — GitHub Pages'in statik dosyaları doğrudan sunması için
- `.gitattributes` — Git dosya biçimi ayarları

Noktalar `index.html` içinde tutulur. Harita performansı için her nokta ayrı HTML işaretçisi yerine Mapbox kaynak ve katmanlarıyla çizilir. İndirilen JSON düzenleme/yedekleme içindir; uygulama çalışırken bu dosyayı okumaz.

## Çalıştırma

Projeyi bir statik dosya sunucusuyla açın. Örneğin:

```bash
python -m http.server 8000
```

Ardından `http://localhost:8000` adresine gidin ve Mapbox public token'ınızı girin. Token tarayıcıdaki yerel depoda saklanır.
