# 🔔 Faz 5: Smart Notifications & Alerts - Detaylı Spec

## 📋 Genel Bakış

**Hedef**: Akıllı fiyat alarmları ve portföy değişim bildirimleri sistemi
**Süre**: 60 dakika
**Öncelik**: Düşük-Orta
**Durum**: Planlama

## 🎯 Kullanıcı Hikayeleri

### Epic 1: Fiyat Alarmları (Price Alerts)
**Süre**: 30-40 dakika

#### User Story 1.1: Fiyat Threshold Alarmları
```
AS A investor
I WANT to set price alerts for my assets
SO THAT I get notified when prices reach my target levels
```

**Acceptance Criteria:**
- [ ] Kullanıcı "Bitcoin $100k olunca haber ver" diyebilmeli
- [ ] Hem yukarı hem aşağı yönlü threshold'lar desteklenmeli
- [ ] Yüzdelik değişim alarmları kurulabilmeli (%10 düşüş/artış)
- [ ] Alarm kurulduktan sonra otomatik kontrol edilmeli
- [ ] Alarm tetiklendiğinde browser notification gönderilmeli

#### User Story 1.2: Alarm Yönetimi
```
AS A user
I WANT to manage my price alerts
SO THAT I can add, edit, or remove alerts as needed
```

**Acceptance Criteria:**
- [ ] Varlık detay sayfasında "Zil" ikonu olmalı
- [ ] Alarm kurma modal'ı modern ve kullanıcı dostu olmalı
- [ ] Aktif alarmlar listesi görüntülenebilmeli
- [ ] Alarmlar düzenlenebilmeli ve silinebilmeli
- [ ] Alarm geçmişi tutulmalı

#### User Story 1.3: Volume Spike Alarmları
```
AS A trader
I WANT to be notified of unusual volume spikes
SO THAT I can react to market movements quickly
```

**Acceptance Criteria:**
- [ ] Hacim artışı alarmları kurulabilmeli
- [ ] Normal hacmin %200+ üzeri spike'lar tespit edilmeli
- [ ] Spike detection algoritması çalışmalı
- [ ] Volume spike bildirimleri gönderilmeli

### Epic 2: Akıllı Portföy Uyarıları (Smart Portfolio Alerts)
**Süre**: 20-30 dakika

#### User Story 2.1: Portföy Değişim Alarmları
```
AS A investor
I WANT automatic alerts for significant portfolio changes
SO THAT I stay informed about my investments without constantly checking
```

**Acceptance Criteria:**
- [ ] Portföyde ani değişim (%10 düşüş) otomatik tespit edilmeli
- [ ] Günlük/haftalık performans özeti bildirimleri
- [ ] Büyük kazanç/kayıp bildirimleri (%5+ değişim)
- [ ] Portföy değeri milestone'ları (100k, 500k, 1M)

#### User Story 2.2: Risk Uyarıları
```
AS A risk-conscious investor
I WANT to be warned about portfolio risks
SO THAT I can take preventive actions
```

**Acceptance Criteria:**
- [ ] Aşırı konsantrasyon uyarıları (tek varlık %50+)
- [ ] Volatilite artışı uyarıları
- [ ] Correlation risk uyarıları
- [ ] Rebalancing önerileri

### Epic 3: Web Push Infrastructure
**Süre**: 10-15 dakika

#### User Story 3.1: Service Worker Notifications
```
AS A user
I WANT to receive notifications even when the app is closed
SO THAT I don't miss important market movements
```

**Acceptance Criteria:**
- [ ] Service Worker push notification desteği
- [ ] Browser kapalıyken bile bildirim alabilme
- [ ] Notification permission yönetimi
- [ ] Push notification payload handling

## 🛠️ Teknik Gereksinimler

### 5.1 Fiyat Alarmları Backend

#### 5.1.1 Database Schema
**Dosya**: `database.js` (güncelleme)
```sql
CREATE TABLE price_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_symbol TEXT NOT NULL,
    alert_type TEXT NOT NULL, -- 'price_above', 'price_below', 'percent_change'
    threshold_value REAL NOT NULL,
    current_price REAL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    triggered_at DATETIME,
    user_notes TEXT
);

CREATE TABLE alert_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER,
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    trigger_price REAL,
    message TEXT,
    FOREIGN KEY (alert_id) REFERENCES price_alerts (id)
);
```

#### 5.1.2 Alert Engine
**Dosya**: `utils/alertEngine.js` (yeni)
```javascript
// Price monitoring and alert triggering
// Background job for checking alerts
// Notification sending logic
// Alert history management
```

#### 5.1.3 API Endpoints
**Dosya**: `server.js` (güncelleme)
```javascript
// POST /api/v1/alerts - Create new alert
// GET /api/v1/alerts - List user alerts
// PUT /api/v1/alerts/:id - Update alert
// DELETE /api/v1/alerts/:id - Delete alert
// GET /api/v1/alerts/history - Alert history
```

### 5.2 Frontend Alert Management

#### 5.2.1 Alert UI Components
**Dosya**: `public/js/alerts.js` (yeni)
```javascript
// Alert creation modal
// Alert management interface
// Alert list rendering
// Alert form validation
```

#### 5.2.2 Notification Handler
**Dosya**: `public/js/notifications.js` (güncelleme)
```javascript
// Browser notification API integration
// Permission request handling
// Notification display and interaction
// Sound alerts (optional)
```

### 5.3 Smart Portfolio Monitoring

#### 5.3.1 Portfolio Analytics
**Dosya**: `utils/portfolioMonitor.js` (yeni)
```javascript
// Portfolio change detection
// Risk analysis algorithms
// Performance milestone tracking
// Rebalancing suggestions
```

#### 5.3.2 Background Monitoring
**Dosya**: Service Worker enhancement
```javascript
// Background sync for alert checking
// Periodic portfolio analysis
// Push notification sending
```

## 📁 Dosya Yapısı

```
├── utils/
│   ├── alertEngine.js          (yeni - Alert processing engine)
│   └── portfolioMonitor.js     (yeni - Portfolio monitoring)
├── public/js/
│   ├── alerts.js               (yeni - Alert UI management)
│   └── notifications.js        (güncelleme - Enhanced notifications)
├── database.js                 (güncelleme - Alert tables)
├── server.js                   (güncelleme - Alert API endpoints)
├── sw.js                       (güncelleme - Push notifications)
├── index.html                  (güncelleme - Alert UI integration)
└── test-alerts.js              (yeni - Alert system tests)
```

## 🎨 UI/UX Tasarım Gereksinimleri

### Alert Creation Modal
```html
<!-- Varlık detay sayfasında zil ikonu -->
<button class="alert-trigger-btn">
    <i class="fa-solid fa-bell"></i>
</button>

<!-- Alert kurma modal'ı -->
<div id="alertModal" class="modal">
    <div class="modal-content">
        <h3>Fiyat Alarmı Kur</h3>
        
        <!-- Alert Type Selection -->
        <div class="alert-type-selector">
            <button data-type="price_above">Fiyat Üstü</button>
            <button data-type="price_below">Fiyat Altı</button>
            <button data-type="percent_change">Yüzde Değişim</button>
        </div>
        
        <!-- Threshold Input -->
        <div class="threshold-input">
            <label>Hedef Değer:</label>
            <input type="number" id="thresholdValue" placeholder="100000">
            <span class="currency-symbol">₺</span>
        </div>
        
        <!-- Notes -->
        <textarea placeholder="Notlar (opsiyonel)"></textarea>
        
        <!-- Actions -->
        <div class="modal-actions">
            <button class="btn-cancel">İptal</button>
            <button class="btn-create">Alarm Kur</button>
        </div>
    </div>
</div>
```

### Alert Management Interface
```html
<!-- Aktif alarmlar listesi -->
<div class="alerts-list">
    <div class="alert-item">
        <div class="alert-info">
            <span class="asset-name">Bitcoin</span>
            <span class="alert-condition">≥ ₺100,000</span>
        </div>
        <div class="alert-actions">
            <button class="btn-edit"><i class="fa-solid fa-edit"></i></button>
            <button class="btn-delete"><i class="fa-solid fa-trash"></i></button>
        </div>
    </div>
</div>
```

## 🧪 Test Gereksinimleri

### Test Suite: `test-alerts.js`
```javascript
// Alert creation tests
// Alert triggering simulation
// Notification delivery tests
// Portfolio monitoring tests
// API endpoint tests
// Database integrity tests
```

**Test Kategorileri:**
1. Alert Creation Tests (4 tests)
2. Alert Triggering Tests (5 tests)
3. Portfolio Monitoring Tests (4 tests)
4. Notification Tests (3 tests)
5. API Integration Tests (6 tests)
6. Database Tests (3 tests)

**Toplam**: 25 test

## 📊 Alert Engine Algoritmaları

### Price Alert Algorithm
```javascript
function checkPriceAlerts(currentPrices) {
    const alerts = getActiveAlerts();
    
    alerts.forEach(alert => {
        const currentPrice = currentPrices[alert.asset_symbol];
        let shouldTrigger = false;
        
        switch(alert.alert_type) {
            case 'price_above':
                shouldTrigger = currentPrice >= alert.threshold_value;
                break;
            case 'price_below':
                shouldTrigger = currentPrice <= alert.threshold_value;
                break;
            case 'percent_change':
                const changePercent = ((currentPrice - alert.current_price) / alert.current_price) * 100;
                shouldTrigger = Math.abs(changePercent) >= alert.threshold_value;
                break;
        }
        
        if (shouldTrigger) {
            triggerAlert(alert, currentPrice);
        }
    });
}
```

### Portfolio Change Detection
```javascript
function detectPortfolioChanges(previousValue, currentValue) {
    const changePercent = ((currentValue - previousValue) / previousValue) * 100;
    
    if (Math.abs(changePercent) >= 10) {
        sendPortfolioAlert({
            type: 'significant_change',
            change: changePercent,
            previousValue,
            currentValue
        });
    }
}
```

### Volume Spike Detection
```javascript
function detectVolumeSpike(asset, currentVolume, historicalAverage) {
    const spikeThreshold = historicalAverage * 2; // 200% of average
    
    if (currentVolume > spikeThreshold) {
        sendVolumeAlert({
            asset,
            currentVolume,
            averageVolume: historicalAverage,
            spikeRatio: currentVolume / historicalAverage
        });
    }
}
```

## 🔔 Notification Types

### 1. Price Alert Notifications
```javascript
{
    title: "Fiyat Alarmı Tetiklendi!",
    body: "Bitcoin ₺100,000 seviyesine ulaştı",
    icon: "/public/icons/icon-192.svg",
    badge: "/public/icons/icon-192.svg",
    tag: "price-alert",
    data: {
        alertId: 123,
        assetSymbol: "BTC",
        currentPrice: 100000,
        url: "/?asset=BTC"
    }
}
```

### 2. Portfolio Change Notifications
```javascript
{
    title: "Portföy Değişimi",
    body: "Portföyünüz %12 değer kaybetti",
    icon: "/public/icons/icon-192.svg",
    tag: "portfolio-change",
    data: {
        changePercent: -12,
        previousValue: 500000,
        currentValue: 440000,
        url: "/"
    }
}
```

### 3. Volume Spike Notifications
```javascript
{
    title: "Hacim Artışı Tespit Edildi",
    body: "Ethereum hacmi normal seviyenin 3x üzerinde",
    icon: "/public/icons/icon-192.svg",
    tag: "volume-spike",
    data: {
        assetSymbol: "ETH",
        spikeRatio: 3.2,
        url: "/?asset=ETH"
    }
}
```

## ⚙️ Background Processing

### Alert Checking Interval
```javascript
// Her 30 saniyede bir fiyat kontrolü
setInterval(checkAllAlerts, 30000);

// Her 5 dakikada bir portföy analizi
setInterval(analyzePortfolio, 300000);

// Her saatte bir hacim analizi
setInterval(analyzeVolume, 3600000);
```

### Service Worker Integration
```javascript
// sw.js enhancement
self.addEventListener('sync', (event) => {
    if (event.tag === 'check-alerts') {
        event.waitUntil(checkAlertsInBackground());
    }
});

// Background alert checking
async function checkAlertsInBackground() {
    const alerts = await getActiveAlerts();
    const prices = await fetchCurrentPrices();
    
    alerts.forEach(alert => {
        if (shouldTriggerAlert(alert, prices)) {
            self.registration.showNotification(
                generateAlertNotification(alert, prices)
            );
        }
    });
}
```

## 📈 Başarı Metrikleri

### Alert System Metrics
- [ ] Alert creation success rate > 95%
- [ ] Alert triggering accuracy > 98%
- [ ] Notification delivery rate > 90%
- [ ] False positive rate < 5%

### User Experience Metrics
- [ ] Alert setup time < 30 seconds
- [ ] Notification response time < 5 seconds
- [ ] Alert management efficiency
- [ ] User satisfaction with alert relevance

### Performance Metrics
- [ ] Alert checking latency < 1 second
- [ ] Database query performance < 100ms
- [ ] Memory usage optimization
- [ ] Background processing efficiency

## 🚀 Implementation Plan

### Phase 5.1: Price Alerts (30-40 min)
1. **Database Schema** (5-8 min)
   - Create alert tables
   - Add indexes for performance
   - Migration script

2. **Alert Engine** (10-15 min)
   - Create `utils/alertEngine.js`
   - Price monitoring logic
   - Alert triggering system
   - Background job setup

3. **API Endpoints** (8-10 min)
   - CRUD operations for alerts
   - Alert history endpoints
   - Input validation
   - Error handling

4. **Frontend UI** (7-10 min)
   - Alert creation modal
   - Alert management interface
   - Zil ikonu integration
   - Form validation

### Phase 5.2: Smart Portfolio Alerts (20-30 min)
1. **Portfolio Monitor** (10-15 min)
   - Create `utils/portfolioMonitor.js`
   - Change detection algorithms
   - Risk analysis
   - Milestone tracking

2. **Notification Enhancement** (5-8 min)
   - Enhance `public/js/notifications.js`
   - Portfolio alert types
   - Smart notification logic

3. **Background Processing** (5-7 min)
   - Service Worker enhancement
   - Background sync setup
   - Periodic monitoring

### Phase 5.3: Testing & Integration (10-15 min)
1. **Test Suite** (8-10 min)
   - Create `test-alerts.js`
   - Alert system tests
   - Integration tests

2. **UI Integration** (2-5 min)
   - HTML updates
   - CSS styling
   - JavaScript integration

## 🎯 Definition of Done

### Price Alerts
- [ ] Kullanıcı fiyat alarmları kurabilir
- [ ] Alarmlar otomatik kontrol edilir
- [ ] Tetiklenen alarmlar bildirim gönderir
- [ ] Alarm yönetimi tam fonksiyonel

### Smart Portfolio Alerts
- [ ] Portföy değişimleri otomatik tespit edilir
- [ ] Risk uyarıları çalışır
- [ ] Milestone bildirimleri aktif

### Infrastructure
- [ ] Service Worker push notifications
- [ ] Background processing çalışır
- [ ] Database performansı optimize

### Quality Assurance
- [ ] Tüm alert testleri geçiyor (25/25)
- [ ] Performance metrikleri karşılanıyor
- [ ] Cross-browser compatibility
- [ ] Mobile notification support

## 📝 Notlar

### Mevcut Altyapı Avantajları
**✅ Kullanılabilir:**
- Service Worker (`sw.js`) - Push notification altyapısı mevcut
- Notification system (`public/js/notifications.js`) - Toast notifications
- Real-time updates (WebSocket) - Fiyat güncellemeleri
- Database system (`database.js`) - SQLite altyapısı
- API structure (`server.js`) - RESTful API pattern

### Teknik Kararlar
- **Alert Storage**: SQLite database (mevcut altyapı)
- **Background Processing**: Service Worker + setInterval
- **Notifications**: Browser Notification API
- **Real-time Updates**: Mevcut WebSocket integration
- **UI Framework**: Vanilla JS + Tailwind CSS (consistency)

### Risk Faktörleri
- **Düşük Risk**: Database ve API geliştirmeleri
- **Orta Risk**: Browser notification permissions
- **Düşük Risk**: Background processing performance

### Öncelik Sırası
1. **Yüksek**: Temel fiyat alarmları
2. **Orta**: Alert management UI
3. **Orta**: Portfolio change detection
4. **Düşük**: Volume spike detection
5. **Düşük**: Advanced risk alerts

---

**Hazırlayan**: Kiro AI Assistant  
**Tarih**: 2025-01-02  
**Versiyon**: 1.0  
**Durum**: Ready for Implementation  
**Bağımlılıklar**: Faz 4 (UX/UI Polish) tamamlanmış olmalı