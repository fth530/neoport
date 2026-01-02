# NeoPort v1.0.0 🚀

Profesyonel, gerçek zamanlı ve güvenli kişisel finans portföy takip uygulaması.

![NeoPort Dashboard](https://via.placeholder.com/800x400?text=NeoPort+Dashboard)

## 🌟 Özellikler

*   **Gerçek Zamanlı Takip:** WebSocket ile anlık fiyat güncellemeleri.
*   **Gelişmiş Analitik:** Teknik indikatörler (RSI, SMA), risk analizi ve portföy dağılımı.
*   **Akıllı Bildirimler:** Fiyat alarmları ve volatilite uyarıları (Web Push).
*   **Güvenlik:** AES-256-GCM ile şifrelenmiş veritabanı ve yedekleme.
*   **Yedekleme:** Otomatik günlük yedekleme ve bulut entegrasyonu.
*   **PWA Desteği:** Mobil uyumlu, offline çalışabilen modern arayüz.
*   **Gizlilik Odaklı:** Verileriniz tamamen cihazınızda saklanır, GDPR uyumlu dışa aktarım.

## 🛠️ Teknolojiler

*   **Backend:** Node.js, Express, SQLite (sql.js)
*   **Frontend:** HTML5, TailwindCSS, Vanilla JS
*   **Real-time:** Socket.IO
*   **Security:** Helmet, AES-256, Rate Limiting
*   **Docs:** Swagger UI

## 📦 Kurulum

1.  **Gereksinimler:** Node.js v18+ yüklü olmalıdır.
2.  **Repoyu Klonlayın:**
    ```bash
    git clone https://github.com/yourusername/neoport.git
    cd neoport
    ```
3.  **Paketleri Yükleyin:**
    ```bash
    npm install
    ```
4.  **Uygulamayı Başlatın:**
    ```bash
    npm start
    ```
    Tarayıcıda `http://localhost:3000` adresine gidin.

## 🚀 Üretim (Production) Dağıtımı

Docker kullanarak dağıtım yapmak için:

```bash
# Docker imajını oluşturun
docker build -t neoport:latest -f Dockerfile.production .

# Konteyneri başlatın
docker run -d -p 3000:3000 --env-file .env.production neoport:latest
```

## 🔒 Güvenlik

NeoPort, verilerinizi korumak için endüstri standardı güvenlik önlemleri kullanır. Veritabanı ve yedekler AES-256 ile şifrelenir. Hassas verileriniz sunucularımızda değil, sizin kontrolünüzdedir.

## 📄 Lisans

MIT License.
