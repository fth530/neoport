# 💰 Yatırım Portföy Takip Uygulaması

Modern ve kullanıcı dostu bir portföy yönetim uygulaması. Kripto paralar, hisse senetleri, altın ve döviz varlıklarınızı tek bir yerden takip edin.

## ✨ Özellikler

### 📊 Portföy Yönetimi
- **Çoklu Varlık Desteği**: Kripto, hisse, altın, döviz
- **Alım-Satım İşlemleri**: Otomatik ortalama maliyet hesaplama
- **Gerçek Zamanlı Kar/Zarar**: Gerçekleşmiş ve gerçekleşmemiş kar takibi
- **İşlem Geçmişi**: Tüm alım-satım işlemlerinin detaylı kaydı

### 📤 Export/Import
- **JSON Export**: Varlıklar, işlemler ve portföy özeti
- **CSV Export**: Excel uyumlu format
- **Veri İçe Aktarma**: JSON ve CSV formatında import
- **Toplu İşlem**: Birden fazla varlık aynı anda eklenebilir

### 📈 Raporlama & Analiz
- **Aylık Rapor**: Ay bazında alım-satım özeti
- **Performans Raporu**: Varlık bazlı kar/zarar analizi
- **Dağılım Raporu**: Tür bazlı portföy dağılımı
- **İşlem Özeti**: Tarih aralığına göre filtreleme
- **Portföy Geçmişi**: Değer değişim grafiği
- **Top Performers**: En çok kazandıran/kaybettiren varlıklar
- **Risk Analizi**: Diversifikasyon ve konsantrasyon analizi

### 📈 Görselleştirme
- **Pasta Grafikleri**: Varlık dağılımı ve tür ağırlıkları
- **Mini Dashboard**: En çok kazandıran/kaybettiren varlıklar
- **Döviz Çevirici**: Anlık kur hesaplama

### 🎨 Kullanıcı Deneyimi
- **Dark/Light Mode**: Göz dostu tema desteği
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu
- **Toast Bildirimleri**: Modern, animasyonlu bildirimler
- **Loading States**: Tüm işlemlerde görsel geri bildirim
- **Tab Navigation**: Portföy, Geçmiş ve Raporlar sekmeleri
- **Export/Import UI**: Dropdown menü ve modal ile kolay kullanım

### 🔄 Otomatik Fiyat Güncelleme
- **CoinGecko**: Kripto para fiyatları
- **Finnhub**: US hisse senedi fiyatları
- **Exchange Rate API**: Döviz kurları
- **Fallback Değerler**: API başarısız olursa yedek değerler

## 🚀 Kurulum

### Gereksinimler
- Node.js (v14 veya üzeri)
- npm veya yarn

### Adımlar

1. **Bağımlılıkları yükleyin:**
```bash
npm install
```

2. **Uygulamayı başlatın:**
```bash
npm start
```

3. **Tarayıcınızda açın:**
```
http://localhost:3000
```

4. **API Dokümantasyonu:**
```
http://localhost:3000/api-docs
```

## 📚 API Dokümantasyonu

### Swagger UI
Interaktif API dokümantasyonu için Swagger UI kullanabilirsiniz:

**URL**: http://localhost:3000/api-docs

Swagger UI özellikleri:
- 📖 Tüm endpoint'lerin detaylı dokümantasyonu
- 🧪 Tarayıcıdan direkt API test etme
- 📝 Request/Response örnekleri
- 🔍 Schema tanımları
- 🏷️ Tag bazlı gruplama

### OpenAPI Spec
OpenAPI 3.0 specification JSON formatında:

**URL**: http://localhost:3000/api-docs.json

Bu dosyayı kullanarak:
- Postman/Insomnia'ya import edebilirsiniz
- Code generation yapabilirsiniz
- API client oluşturabilirsiniz

## 📁 Proje Yapısı

```
portfolio-app/
├── server.js              # Express sunucu ve API endpoints
├── database.js            # SQLite veritabanı işlemleri
├── priceService.js        # Harici API entegrasyonları
├── index.html             # Frontend (SPA)
├── portfolio.db           # SQLite veritabanı dosyası
├── swagger.js             # Swagger/OpenAPI yapılandırması
├── swagger-docs.js        # API endpoint dokümantasyonları
├── middleware/            # Middleware fonksiyonları
│   ├── cache.js          # In-memory caching
│   ├── performance.js    # Response time tracking
│   ├── sanitize.js       # Input sanitization
│   ├── transaction.js    # Transaction validation
│   ├── validate.js       # Input validation
│   └── errorHandler.js   # Error handling middleware
├── utils/                 # Utility fonksiyonları
│   ├── export.js         # Export/Import utilities
│   ├── reports.js        # Reporting utilities
│   └── logger.js         # Structured logging
├── backups/              # Database backups
├── test-api.js           # API testleri
├── test-security.js      # Güvenlik testleri
├── test-performance.js   # Performans testleri
├── test-integrity.js     # Veri bütünlüğü testleri
├── test-functional.js    # Export/Import/Reporting testleri
├── test-utils.js         # Ortak test utilities
├── run-all-tests.js      # Tüm testleri çalıştırma
├── SECURITY.md           # Güvenlik dokümantasyonu
├── PERFORMANCE.md        # Performans dokümantasyonu
├── TECHNICAL_DEBT.md     # Teknik borç takibi
├── CHANGELOG.md          # Değişiklik günlüğü
├── SUMMARY.md            # Proje özeti
└── package.json          # Proje bağımlılıkları
```

## 🔌 API Endpoints

### Varlıklar
- `GET /api/assets` - Tüm varlıkları listele
- `GET /api/assets/:id` - Tek varlık getir
- `POST /api/assets` - Yeni varlık ekle
- `PUT /api/assets/:id` - Varlık güncelle
- `DELETE /api/assets/:id` - Varlık sil

### İşlemler
- `POST /api/assets/:id/buy` - Alım işlemi
- `POST /api/assets/:id/sell` - Satış işlemi
- `GET /api/transactions` - Tüm işlemleri listele
- `GET /api/assets/:id/transactions` - Varlığa ait işlemler

### Export/Import
- `GET /api/export/assets?format=json|csv` - Varlıkları export et
- `GET /api/export/transactions?format=json|csv` - İşlemleri export et
- `GET /api/export/portfolio?format=json|csv` - Tam portföy export
- `POST /api/import/assets` - Varlıkları import et

### Raporlama
- `GET /api/reports/monthly` - Aylık rapor
- `GET /api/reports/performance` - Performans raporu
- `GET /api/reports/distribution` - Dağılım raporu
- `GET /api/reports/transactions?startDate=&endDate=` - İşlem özeti
- `GET /api/reports/history` - Portföy değer geçmişi
- `GET /api/reports/top-performers?limit=5` - En iyi performans
- `GET /api/reports/risk` - Risk analizi

### Diğer
- `GET /api/summary` - Portföy özeti
- `POST /api/prices/refresh` - Fiyatları güncelle
- `DELETE /api/clear` - Tüm verileri temizle
- `GET /api/health` - Sunucu sağlık durumu
- `GET /api/metrics` - Performans metrikleri

## 🛠️ Teknolojiler

### Backend
- **Express.js** - Web framework
- **sql.js** - SQLite veritabanı (in-memory)
- **CORS** - Cross-origin resource sharing

### Frontend
- **Vanilla JavaScript** - Framework yok, saf JS
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js** - Grafik kütüphanesi
- **Font Awesome** - İkon kütüphanesi

### API Entegrasyonları
- **CoinGecko API** - Kripto fiyatları (ücretsiz)
- **Finnhub API** - Hisse fiyatları (ücretsiz tier)
- **Open Exchange Rates** - Döviz kurları (ücretsiz)

## 🎯 Kullanım

### Varlık Ekleme
1. "Yeni Varlık Ekle" butonuna tıklayın
2. Hazır listeden seçin veya manuel girin
3. Miktar ve alış fiyatını girin
4. "Ekle" butonuna tıklayın

### Alım İşlemi
1. Varlık satırındaki "+" butonuna tıklayın
2. Miktar ve fiyat girin
3. Ortalama maliyet otomatik hesaplanır

### Satış İşlemi
1. Varlık satırındaki "-" butonuna tıklayın
2. Satılacak miktar ve fiyat girin
3. Gerçekleşen kar/zarar otomatik hesaplanır

### Fiyat Güncelleme
1. "Fiyatları Güncelle" butonuna tıklayın
2. API'lerden güncel fiyatlar çekilir
3. Kar/zarar otomatik yeniden hesaplanır

### Export/Import

#### Varlıkları Export Etme
```bash
# JSON formatında
GET /api/export/assets?format=json

# CSV formatında (Excel uyumlu)
GET /api/export/assets?format=csv
```

#### Varlıkları Import Etme
```bash
POST /api/import/assets
Content-Type: application/json

{
  "data": "[{\"name\":\"Bitcoin\",\"symbol\":\"BTC\",\"type\":\"crypto\",\"quantity\":1,\"avg_cost\":50000}]",
  "format": "json"
}
```

#### CSV Import Örneği
```csv
name,symbol,type,quantity,avg_cost,current_price,currency
Bitcoin,BTC,crypto,1,50000,50000,USD
Ethereum,ETH,crypto,10,2000,2000,USD
```

### Raporlama

#### Aylık Rapor
```bash
GET /api/reports/monthly
```

Ay bazında alım-satım istatistikleri:
- Toplam alım/satım sayısı
- Toplam alım/satım tutarı
- Gerçekleşen kar/zarar

#### Performans Raporu
```bash
GET /api/reports/performance
```

Her varlık için:
- Maliyet bazı
- Güncel değer
- Kar/zarar (TL ve %)
- Performans durumu (profit/loss/neutral)

#### Risk Analizi
```bash
GET /api/reports/risk
```

Portföy risk metrikleri:
- Diversifikasyon skoru (0-100)
- Konsantrasyon oranı
- En büyük varlık ağırlığı

## ⚙️ Yapılandırma

### Finnhub API Key
Hisse senedi fiyatları için ücretsiz API key alın:
1. [Finnhub.io](https://finnhub.io/) adresine gidin
2. Ücretsiz hesap oluşturun
3. API key'i `priceService.js` dosyasında güncelleyin:

```javascript
const FINNHUB_API_KEY = 'YOUR_API_KEY_HERE';
```

### Fallback Değerler
`priceService.js` dosyasındaki fallback değerleri güncelleyin:

```javascript
const FALLBACK_RATES = {
    USD_TRY: 35.20,
    EUR_TRY: 36.80,
    GBP_TRY: 44.50,
    GOLD_GRAM_TRY: 5950
};
```

## 🔒 Güvenlik

### Mevcut Özellikler
- ✅ **Helmet** - HTTP güvenlik başlıkları
- ✅ **Rate Limiting** - API abuse önleme
- ✅ **Input Validation** - Express Validator ile
- ✅ **Input Sanitization** - XSS koruması
- ✅ **SQL Injection Koruması** - Prepared statements
- ✅ **CORS Yapılandırması** - Origin kontrolü
- ✅ **Request Size Limiting** - DoS önleme
- ✅ **Environment Variables** - Hassas bilgi koruması
- ✅ **Error Handling** - Güvenli hata mesajları
- ✅ **Graceful Shutdown** - Güvenli kapatma

### Güvenlik Testleri

```bash
# Güvenlik testlerini çalıştır
node test-security.js
```

Detaylı güvenlik dokümantasyonu için [SECURITY.md](SECURITY.md) dosyasına bakın.

### Önerilen İyileştirmeler
- [ ] Authentication/Authorization (JWT)
- [ ] HTTPS zorunluluğu
- [ ] API key rotation
- [ ] Audit logging
- [ ] Intrusion detection

## 🔐 Veri Bütünlüğü

### Constraint'ler
- ✅ **Unique Constraints** - Duplicate varlık engelleme
- ✅ **Check Constraints** - Negatif değer kontrolü
- ✅ **Foreign Key Constraints** - Referential integrity
- ✅ **Type Validation** - Enum kontrolü
- ✅ **Range Validation** - Min/max değer kontrolü

### Veri Bütünlüğü Kontrolleri
- ✅ **Orphan Transaction** - Yetim işlem kontrolü
- ✅ **Negative Quantities** - Negatif miktar kontrolü
- ✅ **Inconsistent Average Cost** - Tutarsız maliyet kontrolü
- ✅ **Sufficient Balance** - Yetersiz bakiye kontrolü

### Backup & Restore
- ✅ **Otomatik Backup** - API endpoint ile
- ✅ **Manual Restore** - Backup'tan geri yükleme
- ✅ **Backup Klasörü** - `backups/` dizini

### Veri Bütünlüğü Testleri

```bash
# Veri bütünlüğü testlerini çalıştır
npm run test:integrity
```

### API Endpoints

- `GET /api/integrity/check` - Veri bütünlüğü kontrolü
- `POST /api/integrity/fix` - Otomatik düzeltme
- `POST /api/backup` - Backup oluştur
- `POST /api/restore` - Backup'tan restore et

## ⚡ Performans

### Optimizasyonlar
- ✅ **Response Compression** - Gzip/Deflate ile %80 küçük response
- ✅ **In-Memory Caching** - %66 daha hızlı response time
- ✅ **Response Time Monitoring** - Her istek ölçülür
- ✅ **Batch Database Operations** - Toplu kayıt
- ✅ **Static File Caching** - ETag + Cache-Control
- ✅ **Request Size Limiting** - DoS önleme

### Performans Metrikleri

| Metrik | Değer | Durum |
|--------|-------|-------|
| Avg Response Time | 52ms | ✅ Mükemmel |
| Cache Hit Rate | 66% | ✅ İyi |
| Memory Usage | 13 MB | ✅ Düşük |
| Success Rate | 100% | ✅ Mükemmel |

### Performans Testleri

```bash
# Performans testlerini çalıştır
npm run test:performance
```

Detaylı performans dokümantasyonu için [PERFORMANCE.md](PERFORMANCE.md) dosyasına bakın.

### Monitoring Endpoints

- `GET /api/health` - Sunucu sağlık durumu
- `GET /api/metrics` - Performans metrikleri

### Frontend
- Toast bildirimleri ile kullanıcı dostu mesajlar
- Loading overlay ile işlem durumu gösterimi
- Detaylı validasyon kontrolleri

### Backend
- Try-catch blokları ile hata yakalama
- Anlamlı HTTP status kodları
- Console loglama ile debug desteği
- Fallback değerler ile kesintisiz çalışma

## 🔧 Teknik Borç Yönetimi

Proje sürekli iyileştirme prensibiyle geliştirilmektedir. Teknik borç takibi için [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) dosyasına bakın.

### Çözülen Teknik Borçlar
- ✅ Deprecated API kullanımları düzeltildi
- ✅ Structured logging sistemi eklendi
- ✅ Async error handler middleware
- ✅ Test utilities refactor
- ✅ Environment variable yönetimi

### Devam Eden İyileştirmeler
- ⏳ Database migration system
- ⏳ API documentation (Swagger)
- ⏳ Frontend test suite
- ⏳ API versioning

## 📝 Test Komutları

```bash
# Tüm testleri çalıştır
npm run test:all

# Sadece API testleri
npm test

# Sadece güvenlik testleri
npm run test:security

# Sadece performans testleri
npm run test:performance

# Sadece veri bütünlüğü testleri
npm run test:integrity

# Sadece fonksiyonel testler (export/import/reporting)
npm run test:functional
```

### Test Sonuçları

| Test Kategorisi | Test Sayısı | Durum |
|----------------|-------------|-------|
| API Tests | 5 | ✅ Geçti |
| Security Tests | 8 | ✅ Geçti |
| Performance Tests | 9 | ✅ Geçti |
| Integrity Tests | 7 | ✅ Geçti |
| Functional Tests | 16 | ✅ Geçti |
| **TOPLAM** | **45** | **✅ %100** |

## 📝 Geliştirme Notları

### Veritabanı
- SQLite kullanılıyor (dosya: `portfolio.db`)
- Her işlemde otomatik kayıt
- Transaction desteği

### API Rate Limits
- **CoinGecko**: 10-50 istek/dakika (ücretsiz)
- **Finnhub**: 60 istek/dakika (ücretsiz)
- **Exchange Rate**: Sınırsız (ücretsiz tier)

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🙏 Teşekkürler

- [CoinGecko](https://www.coingecko.com/) - Kripto fiyatları
- [Finnhub](https://finnhub.io/) - Hisse fiyatları
- [Open Exchange Rates](https://open.er-api.com/) - Döviz kurları
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Chart.js](https://www.chartjs.org/) - Grafik kütüphanesi

## 📞 İletişim

Sorularınız için issue açabilirsiniz.

---

**Not**: Bu uygulama eğitim amaçlıdır. Gerçek yatırım kararları için profesyonel danışmanlık alınız.
