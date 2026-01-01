# 🚀 Production Deployment Guide

## 📋 Ön Gereksinimler

- Docker & Docker Compose
- Git
- Domain name (opsiyonel)

## 🔧 Kurulum Adımları

### 1. Repository'yi Clone Et
```bash
git clone https://github.com/fth530/neoport.git
cd neoport
```

### 2. Environment Variables Ayarla
```bash
# Production environment dosyasını düzenle
cp .env.example .env.production
nano .env.production
```

**Önemli**: API key'leri production değerleriyle değiştir!

### 3. SSL Sertifikaları Oluştur

#### Development/Test için:
```bash
chmod +x scripts/generate-ssl.sh
./scripts/generate-ssl.sh
```

#### Production için (Let's Encrypt):
```bash
# Certbot kurulumu (Ubuntu/Debian)
sudo apt install certbot

# Sertifika al
sudo certbot certonly --standalone -d yourdomain.com

# Sertifikaları kopyala
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/nginx.crt
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/nginx.key
sudo chown $USER:$USER nginx/ssl/*
```

### 4. Nginx Config Güncelle (Production)
```bash
# Domain name'i güncelle
sed -i 's/localhost/yourdomain.com/g' nginx/conf.d/default.conf
```

### 5. Uygulamayı Başlat
```bash
# Build ve start
docker-compose up -d

# Logları kontrol et
docker-compose logs -f
```

### 6. Health Check
```bash
# HTTP (redirect test)
curl -I http://localhost

# HTTPS
curl -k https://localhost/api/v1/health
```

## 🔍 Monitoring

### Container Status
```bash
docker-compose ps
```

### Logs
```bash
# Tüm servisler
docker-compose logs -f

# Sadece app
docker-compose logs -f app

# Sadece nginx
docker-compose logs -f nginx
```

### Resource Usage
```bash
docker stats
```

## 🔄 Güncelleme

```bash
# Yeni kodu çek
git pull origin main

# Rebuild ve restart
docker-compose down
docker-compose up -d --build
```

## 🛠️ Troubleshooting

### Port Çakışması
```bash
# Port 80/443 kullanımını kontrol et
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Çakışan servisleri durdur
sudo systemctl stop apache2  # veya nginx
```

### SSL Sorunları
```bash
# Sertifika geçerliliğini kontrol et
openssl x509 -in nginx/ssl/nginx.crt -text -noout

# Sertifika yenile
./scripts/generate-ssl.sh
docker-compose restart nginx
```

### Database Sorunları
```bash
# Database backup
docker-compose exec app node -e "
const db = require('./database');
db.initDatabase().then(() => {
  const backup = db.backupDatabase();
  console.log('Backup:', backup);
});
"

# Container içine gir
docker-compose exec app sh
```

## 🔒 Güvenlik

### Firewall (Ubuntu/Debian)
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### SSL Rating Test
```bash
# SSL Labs test (production domain için)
curl -s "https://api.ssllabs.com/api/v3/analyze?host=yourdomain.com"
```

### Security Headers Test
```bash
curl -I https://localhost
```

## 📊 Performance

### Database Optimization
```bash
# SQLite VACUUM (disk temizleme)
docker-compose exec app sqlite3 portfolio.db "VACUUM;"

# Database size
docker-compose exec app ls -lh portfolio.db
```

### Log Rotation
```bash
# Docker log rotation (docker-compose.yml'e ekle)
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 🔄 Backup & Restore

### Otomatik Backup (Crontab)
```bash
# Crontab düzenle
crontab -e

# Her gün 02:00'da backup (ekle)
0 2 * * * cd /path/to/neoport && docker-compose exec -T app node -e "require('./database').initDatabase().then(db => console.log(db.backupDatabase()))"
```

### Manual Backup
```bash
# Database backup
cp portfolio.db backups/portfolio-$(date +%Y%m%d-%H%M%S).db

# Full backup
tar -czf neoport-backup-$(date +%Y%m%d).tar.gz \
  portfolio.db backups/ logs/ .env.production
```

## 🌐 Domain Setup

### DNS Records
```
A     @           YOUR_SERVER_IP
A     www         YOUR_SERVER_IP
AAAA  @           YOUR_SERVER_IPv6  (opsiyonel)
```

### Nginx Config (Production Domain)
```nginx
server_name yourdomain.com www.yourdomain.com;
```

## 📈 Scaling (İleri Seviye)

### Load Balancer
```yaml
# docker-compose.yml'e ekle
nginx:
  deploy:
    replicas: 2
```

### Database Replication
```bash
# SQLite → PostgreSQL migration (büyük ölçek için)
# Ayrı guide gerekir
```

## 🆘 Support

- **GitHub Issues**: https://github.com/fth530/neoport/issues
- **Documentation**: README.md
- **API Docs**: https://yourdomain.com/api-docs

---

**Son Güncelleme**: 2025-12-31  
**Docker Version**: 24.0+  
**Compose Version**: 2.0+