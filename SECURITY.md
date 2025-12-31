# 🔒 Güvenlik Dokümantasyonu

Bu dokümanda uygulamada kullanılan güvenlik önlemleri ve en iyi pratikler açıklanmaktadır.

## 📋 İçindekiler

1. [Güvenlik Özellikleri](#güvenlik-özellikleri)
2. [Güvenlik Testleri](#güvenlik-testleri)
3. [Yapılandırma](#yapılandırma)
4. [En İyi Pratikler](#en-iyi-pratikler)
5. [Güvenlik Açığı Bildirimi](#güvenlik-açığı-bildirimi)

## 🛡️ Güvenlik Özellikleri

### 1. HTTP Security Headers (Helmet)

**Helmet** middleware'i ile aşağıdaki güvenlik başlıkları otomatik eklenir:

- **Content-Security-Policy**: XSS saldırılarına karşı koruma
- **X-Content-Type-Options**: MIME type sniffing engelleme
- **X-Frame-Options**: Clickjacking saldırılarına karşı koruma
- **X-XSS-Protection**: Tarayıcı XSS filtreleme
- **Referrer-Policy**: Referrer bilgisi kontrolü
- **Strict-Transport-Security**: HTTPS zorunluluğu (production)

```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            // ...
        }
    }
}));
```

### 2. Rate Limiting

**Express Rate Limit** ile API abuse önlenir:

#### Genel API Rate Limit
- **Pencere**: 15 dakika
- **Maksimum İstek**: 100
- **Yanıt**: 429 Too Many Requests

#### Fiyat Güncelleme Rate Limit
- **Pencere**: 5 dakika
- **Maksimum İstek**: 5
- **Sebep**: Pahalı API çağrıları

```javascript
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Çok fazla istek' }
});
```

### 3. Input Validation

**Express Validator** ile tüm girişler doğrulanır:

#### Varlık Ekleme Validasyonu
- ✅ Varlık adı: 1-100 karakter, alfanumerik
- ✅ Sembol: 1-20 karakter, büyük harf ve rakam
- ✅ Tür: crypto, stock, gold, currency
- ✅ Miktar: 0 ile 1 milyar arası
- ✅ Fiyat: 0 ile 1 milyar arası

#### Alım/Satım Validasyonu
- ✅ Miktar: 0.00000001 ile 1 milyar arası
- ✅ Fiyat: 0 ile 1 milyar arası
- ✅ ID: Pozitif integer

### 4. Input Sanitization

**Custom Sanitization Middleware** ile zararlı içerik temizlenir:

- ✅ HTML tag'leri kaldırılır (`<script>`, `<iframe>`, vb.)
- ✅ JavaScript protokolleri engellenir (`javascript:`)
- ✅ Event handler'lar temizlenir (`onclick=`, `onerror=`, vb.)
- ✅ Maksimum uzunluk kontrolü (1000 karakter)
- ✅ Whitespace temizleme

```javascript
function sanitizeString(str) {
    return str
        .trim()
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .substring(0, 1000);
}
```

### 5. SQL Injection Koruması

**Prepared Statements** kullanılarak SQL injection engellenir:

```javascript
db.run(`
    INSERT INTO assets (name, symbol, type, quantity, avg_cost)
    VALUES (?, ?, ?, ?, ?)
`, [name, symbol, type, quantity, avg_cost]);
```

### 6. CORS Yapılandırması

**CORS** politikası ile cross-origin istekler kontrol edilir:

- **Development**: Tüm origin'lere izin (`*`)
- **Production**: Sadece belirtilen origin'e izin
- **Methods**: GET, POST, PUT, DELETE
- **Credentials**: Desteklenir

```javascript
const corsOptions = {
    origin: NODE_ENV === 'production' 
        ? process.env.CORS_ORIGIN 
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
};
```

### 7. Request Size Limiting

**Body Parser** ile istek boyutu sınırlanır:

- **JSON Body**: Maksimum 1MB
- **URL Encoded**: Maksimum 1MB
- **Sebep**: DoS saldırılarını önleme

### 8. Error Handling

**Güvenli Hata Mesajları**:

- **Development**: Detaylı hata mesajları ve stack trace
- **Production**: Genel hata mesajları, detay gizlenir
- **Loglama**: Tüm hatalar console'a loglanır

```javascript
const errorResponse = {
    error: 'Sunucu hatası',
    message: NODE_ENV === 'development' ? err.message : 'Bir hata oluştu',
    timestamp: new Date().toISOString()
};
```

### 9. Environment Variables

**Hassas Bilgiler** environment variables'da saklanır:

- ✅ API Keys (Finnhub)
- ✅ Database path
- ✅ CORS origin
- ✅ Rate limit ayarları
- ✅ Fallback değerler

**`.env` dosyası `.gitignore`'a eklenmiştir!**

### 10. Graceful Shutdown

**SIGTERM/SIGINT** sinyalleri ile güvenli kapatma:

```javascript
process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Sunucu başarıyla kapatıldı');
        process.exit(0);
    });
});
```

## 🧪 Güvenlik Testleri

### Test Komutları

```bash
# API testleri
node test-api.js

# Güvenlik testleri
node test-security.js
```

### Test Senaryoları

1. ✅ XSS Injection
2. ✅ SQL Injection
3. ✅ Uzun Input
4. ✅ Geçersiz Karakter
5. ✅ Negatif Değer
6. ✅ Çok Büyük Sayı
7. ✅ Geçersiz Tür
8. ✅ Rate Limiting

### Test Sonuçları

```
🔒 Güvenlik Testleri Başlıyor...

Test 1: XSS Injection Koruması
✅ XSS engellendi: Validasyon hatası

Test 2: SQL Injection Koruması
✅ SQL Injection engellendi: Validasyon hatası

Test 3: Uzun Input Validasyonu
✅ Uzun input engellendi: Validasyon hatası

Test 4: Geçersiz Karakter Validasyonu
✅ Geçersiz karakter engellendi: Validasyon hatası

Test 5: Negatif Değer Validasyonu
✅ Negatif değer engellendi: Validasyon hatası

Test 6: Büyük Sayı Validasyonu
✅ Çok büyük sayı engellendi: Validasyon hatası

Test 7: Geçersiz Tür Validasyonu
✅ Geçersiz tür engellendi: Validasyon hatası

✅ Güvenlik testleri tamamlandı!
```

## ⚙️ Yapılandırma

### Environment Variables

`.env` dosyası oluşturun:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# API Keys
FINNHUB_API_KEY=your_api_key_here

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Database
DB_PATH=./portfolio.db
```

### Production Checklist

- [ ] `NODE_ENV=production` ayarla
- [ ] CORS origin'i belirli domain'e kısıtla
- [ ] HTTPS kullan
- [ ] API key'leri environment variables'da sakla
- [ ] Rate limit değerlerini ayarla
- [ ] Loglama sistemini yapılandır
- [ ] Backup stratejisi oluştur
- [ ] Monitoring/alerting ekle

## 🔐 En İyi Pratikler

### 1. API Key Yönetimi

```bash
# ❌ YANLIŞ - Kod içinde
const API_KEY = 'd5afurpr01qn2tau0mk0';

# ✅ DOĞRU - Environment variable
const API_KEY = process.env.FINNHUB_API_KEY;
```

### 2. HTTPS Kullanımı

Production'da mutlaka HTTPS kullanın:

```javascript
// Nginx reverse proxy ile
server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

### 3. Database Backup

Düzenli backup alın:

```bash
# Günlük backup
0 2 * * * cp /path/to/portfolio.db /path/to/backups/portfolio-$(date +\%Y\%m\%d).db
```

### 4. Monitoring

Sunucu durumunu izleyin:

- CPU/Memory kullanımı
- API response time
- Error rate
- Rate limit hit count

### 5. Logging

Önemli olayları logla:

- ✅ Başarısız login denemeleri
- ✅ Rate limit aşımları
- ✅ Sunucu hataları
- ✅ Kritik işlemler

## 🚨 Güvenlik Açığı Bildirimi

Güvenlik açığı bulursanız:

1. **Hemen bildirin** - Public issue açmayın
2. **Detay verin** - Açığı nasıl reproduce edebiliriz?
3. **Bekleyin** - 90 gün içinde yanıt vereceğiz

**İletişim**: [email@example.com]

## 📚 Kaynaklar

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

## 📝 Değişiklik Geçmişi

### v1.1.0 (2025-12-31)
- ✅ Helmet güvenlik başlıkları eklendi
- ✅ Rate limiting implementasyonu
- ✅ Input validation ve sanitization
- ✅ Environment variables desteği
- ✅ Güvenlik testleri eklendi
- ✅ CORS yapılandırması
- ✅ Graceful shutdown

### v1.0.0 (2025-12-30)
- 🎉 İlk sürüm

---

**Not**: Bu dokümantasyon düzenli olarak güncellenmektedir. Son güncelleme: 31 Aralık 2025
