# 📚 API Dokümantasyonu

## 🚀 Hızlı Başlangıç

### Swagger UI (Önerilen)
En kolay yol: Tarayıcınızda açın
```
http://localhost:3000/api-docs
```

Swagger UI özellikleri:
- ✅ Tüm endpoint'leri görüntüle
- ✅ Tarayıcıdan direkt test et
- ✅ Request/Response örnekleri
- ✅ Schema tanımları
- ✅ Try it out özelliği

### OpenAPI Specification
JSON formatında API spec:
```
http://localhost:3000/api-docs.json
```

Bu dosyayı kullanarak:
- Postman/Insomnia'ya import edin
- Code generation yapın
- API client oluşturun

---

## 📋 Endpoint Kategorileri

### 1. 🏦 Assets (Varlıklar)
Portföy varlıklarını yönetme

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/summary` | Portföy özeti |
| GET | `/api/assets` | Tüm varlıkları listele |
| GET | `/api/assets/:id` | Tek varlık getir |
| POST | `/api/assets` | Yeni varlık ekle |
| PUT | `/api/assets/:id` | Varlık güncelle |
| DELETE | `/api/assets/:id` | Varlık sil |
| POST | `/api/prices/refresh` | Fiyatları güncelle |

### 2. 💰 Transactions (İşlemler)
Alım-satım işlemleri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/assets/:id/buy` | Alım işlemi |
| POST | `/api/assets/:id/sell` | Satış işlemi |
| GET | `/api/transactions` | Tüm işlemleri listele |
| GET | `/api/assets/:id/transactions` | Varlığa ait işlemler |

### 3. 📤 Export/Import
Veri export ve import

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/export/assets` | Varlıkları export et |
| GET | `/api/export/transactions` | İşlemleri export et |
| GET | `/api/export/portfolio` | Tam portföy export |
| POST | `/api/import/assets` | Varlıkları import et |

**Query Parameters:**
- `format`: `json` veya `csv` (default: `json`)

### 4. 📊 Reports (Raporlama)
Analiz ve raporlama

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/reports/monthly` | Aylık rapor |
| GET | `/api/reports/performance` | Performans raporu |
| GET | `/api/reports/distribution` | Dağılım raporu |
| GET | `/api/reports/transactions` | İşlem özeti |
| GET | `/api/reports/history` | Portföy değer geçmişi |
| GET | `/api/reports/top-performers` | En iyi performans |
| GET | `/api/reports/risk` | Risk analizi |

### 5. 🔒 Integrity (Veri Bütünlüğü)
Veri bütünlüğü ve backup

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/integrity/check` | Bütünlük kontrolü |
| POST | `/api/integrity/fix` | Otomatik düzeltme |
| POST | `/api/backup` | Backup oluştur |
| POST | `/api/restore` | Backup restore et |

### 6. ⚙️ System (Sistem)
Sistem ve monitoring

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/health` | Sağlık kontrolü |
| GET | `/api/metrics` | Performans metrikleri |

---

## 📝 Örnek Kullanımlar

### Varlık Ekleme

**Request:**
```bash
POST /api/assets
Content-Type: application/json

{
  "name": "Bitcoin",
  "symbol": "BTC",
  "type": "crypto",
  "quantity": 0.5,
  "avg_cost": 50000,
  "currency": "USD"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Bitcoin",
  "symbol": "BTC",
  "type": "crypto",
  "quantity": 0.5,
  "avg_cost": 50000,
  "current_price": 50000,
  "currency": "USD",
  "icon": "fa-solid fa-coins",
  "icon_bg": "gray"
}
```

### Alım İşlemi

**Request:**
```bash
POST /api/assets/1/buy
Content-Type: application/json

{
  "quantity": 0.1,
  "price": 52000
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Bitcoin",
  "quantity": 0.6,
  "avg_cost": 50333.33,
  "current_value": 31200,
  "profit_loss": 1000,
  "profit_loss_percent": 3.31
}
```

### Export (CSV)

**Request:**
```bash
GET /api/export/assets?format=csv
```

**Response:**
```csv
id,name,symbol,type,quantity,avg_cost,current_price,currency
1,Bitcoin,BTC,crypto,0.6,50333.33,52000,USD
2,Ethereum,ETH,crypto,5,2000,2100,USD
```

### Performans Raporu

**Request:**
```bash
GET /api/reports/performance
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Bitcoin",
    "symbol": "BTC",
    "type": "crypto",
    "quantity": 0.6,
    "avgCost": 50333.33,
    "currentPrice": 52000,
    "costBasis": 30200,
    "currentValue": 31200,
    "profitLoss": 1000,
    "profitLossPercent": 3.31,
    "performance": "profit"
  }
]
```

---

## 🔐 Güvenlik

### Rate Limiting
- **Genel API**: 100 istek / 15 dakika
- **Fiyat Güncelleme**: 5 istek / 5 dakika

Rate limit aşıldığında:
```json
{
  "error": "Çok fazla istek",
  "message": "Lütfen bir süre bekleyip tekrar deneyin",
  "retryAfter": 900
}
```

### Input Validation
Tüm endpoint'ler input validation kullanır:
- String length kontrolü (max 100 karakter)
- Numeric range kontrolü (0-1,000,000,000)
- Type validation (enum kontrolü)
- XSS koruması
- SQL injection koruması

### Error Responses
Standart hata formatı:
```json
{
  "error": "Hata mesajı",
  "details": "Detaylı açıklama",
  "timestamp": "2025-12-31T12:00:00.000Z",
  "path": "/api/assets/999"
}
```

HTTP Status Codes:
- `200` - Başarılı
- `201` - Oluşturuldu
- `400` - Geçersiz istek
- `404` - Bulunamadı
- `429` - Rate limit aşıldı
- `500` - Sunucu hatası

---

## 🧪 Test Etme

### cURL ile Test

```bash
# Health check
curl http://localhost:3000/api/health

# Varlıkları listele
curl http://localhost:3000/api/assets

# Yeni varlık ekle
curl -X POST http://localhost:3000/api/assets \
  -H "Content-Type: application/json" \
  -d '{"name":"Bitcoin","symbol":"BTC","type":"crypto","quantity":0.5,"avg_cost":50000}'

# Alım işlemi
curl -X POST http://localhost:3000/api/assets/1/buy \
  -H "Content-Type: application/json" \
  -d '{"quantity":0.1,"price":52000}'
```

### Postman ile Test

1. Postman'ı açın
2. Import → Link
3. URL: `http://localhost:3000/api-docs.json`
4. Import butonuna tıklayın
5. Collection oluşturuldu!

### JavaScript ile Test

```javascript
// Varlıkları getir
fetch('http://localhost:3000/api/assets')
  .then(res => res.json())
  .then(data => console.log(data));

// Yeni varlık ekle
fetch('http://localhost:3000/api/assets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Bitcoin',
    symbol: 'BTC',
    type: 'crypto',
    quantity: 0.5,
    avg_cost: 50000
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

---

## 📊 Response Schemas

### Asset Schema
```typescript
interface Asset {
  id: number;
  name: string;
  symbol: string;
  type: 'crypto' | 'stock' | 'gold' | 'currency';
  quantity: number;
  avg_cost: number;
  current_price: number;
  currency: string;
  icon?: string;
  icon_bg?: string;
  current_value?: number;      // Calculated
  profit_loss?: number;         // Calculated
  profit_loss_percent?: number; // Calculated
}
```

### Transaction Schema
```typescript
interface Transaction {
  id: number;
  asset_id: number;
  asset_name: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  realized_profit?: number;
  date: string; // ISO 8601
}
```

### Summary Schema
```typescript
interface Summary {
  total_value: number;
  total_cost: number;
  total_profit_loss: number;
  total_profit_loss_percent: number;
  asset_count: number;
}
```

---

## 🔗 Faydalı Linkler

- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI Spec**: http://localhost:3000/api-docs.json
- **Health Check**: http://localhost:3000/api/health
- **Metrics**: http://localhost:3000/api/metrics

---

## 📞 Destek

Sorularınız için:
- GitHub Issues açın
- API dokümantasyonunu inceleyin
- Swagger UI'da "Try it out" kullanın

---

**Son Güncelleme**: 2025-12-31  
**API Versiyonu**: 1.3.0  
**OpenAPI Versiyonu**: 3.0.0
