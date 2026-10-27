# GenelHizmetNoktaları

Bu proje, Başakşehir ilçesindeki kamu ve sosyal hizmet noktalarını 3D harita üzerinde gösteren tek sayfalık bir web uygulamasıdır.

## Özellikler

- Mapbox Standard 3D harita görünümü
- Kategori bazlı filtreleme
- Metin arama ile nokta bulma
- Nokta listesi ve detay görünümü
- Mobil uyumlu yan panel
- Token tabanlı Mapbox erişimi
- Durum banner ve hata mesajları

## Proje Yapısı

- `index.html` — uygulama arayüzü ve layout
- `styles.css` — görünüm ve mobil düzenlemeler
- `app.js` — harita, veri işleme, arama ve kategori mantığı
- `locations.json` — nokta verisi
- `README.md` — proje kullanımı ve veri bilgisi

## Gereksinimler

- Modern bir tarayıcı
- Mapbox public token (`pk.eyJ...`)
- Yerel sunucu / statik dosya sunucu

## Çalıştırma

1. Proje klasörünü yerel bir sunucu üzerinden açın.
2. `locations.json` dosyasının mevcut olduğundan emin olun.
3. Açılan ekranda Mapbox token'ınızı girin.
4. Harita otomatik olarak yüklenir.

Örnek yerel çalıştırma:

```bash
python -m http.server 8000
```

Sonrasında tarayıcıda:

```text
http://localhost:8000
```

## Mapbox Token

Uygulama, Mapbox v3 Standard için public token gerektirir.

Token alınacak adres:

```text
https://account.mapbox.com/
```

Token girişi için modal açıldığında `pk.eyJ...` formatındaki anahtarı yazın.

## Veri Formatı

`locations.json` içindeki her nokta aşağıdaki formata uygun olmalıdır:

```json
{
  "id": "BSK-001",
  "name": "Başakşehir Belediyesi Hizmet Binası",
  "category": "Hizmet",
  "mahalle": "Başakşehir",
  "lat": 41.1054,
  "lng": 28.7891
}
```

### Desteklenen kategori örnekleri

- Kültür ve Yaşam
- Spor
- Alışveriş
- Kütüphane
- Hizmet
- Yeşil Alan
- Sağlık
- Altyapı
- Araştırma
- Tarih
- Eğitim
- Eğlence
- Güvenlik
- Ulaşım
- Genel

## Notlar

- Uygulama, benzer kategori isimlerini normalize eder.
- Arama, isim, kategori ve mahalle üzerinden çalışır.
- Geçersiz veya eksik koordinatlar filtrelenir.
- Sonuç bulunamadığında kullanıcıya daha açıklayıcı boş durum ekranı gösterilir.

## Geliştirme Notları

Bu proje statik dosyalardan oluşur. Daha büyük bir veri seti için aşağıdaki iyileştirmeler önerilir:

- veri dosyasını ayrı bir veri katmanına taşıma
- tüm kategorileri tek bir harita renk şemasına bağlama
- nokta odaklı cluster yapısı ekleme
- daha güçlü veri doğrulama akışı ekleme
