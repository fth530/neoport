/**
 * Swagger API Documentation - Endpoint Definitions
 * Bu dosya sadece JSDoc comments içerir, kod çalıştırmaz
 */

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Sunucu sağlık kontrolü
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Sunucu sağlıklı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 uptime:
 *                   type: number
 *                   example: 3600
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 memory:
 *                   type: object
 *                 env:
 *                   type: string
 *                   example: development
 */

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Performans metrikleri
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Performans metrikleri
 */

/**
 * @swagger
 * /api/summary:
 *   get:
 *     summary: Portföy özeti
 *     tags: [Assets]
 *     responses:
 *       200:
 *         description: Portföy özet bilgileri
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Summary'
 */

/**
 * @swagger
 * /api/assets:
 *   get:
 *     summary: Tüm varlıkları listele
 *     tags: [Assets]
 *     responses:
 *       200:
 *         description: Varlık listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Asset'
 *   post:
 *     summary: Yeni varlık ekle
 *     tags: [Assets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - symbol
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 example: Bitcoin
 *               symbol:
 *                 type: string
 *                 example: BTC
 *               type:
 *                 type: string
 *                 enum: [crypto, stock, gold, currency]
 *                 example: crypto
 *               quantity:
 *                 type: number
 *                 example: 0.5
 *               avg_cost:
 *                 type: number
 *                 example: 50000
 *               currency:
 *                 type: string
 *                 example: USD
 *     responses:
 *       201:
 *         description: Varlık başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /api/assets/{id}:
 *   get:
 *     summary: Tek varlık getir
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Varlık ID
 *     responses:
 *       200:
 *         description: Varlık detayları
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     summary: Varlık güncelle
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               current_price:
 *                 type: number
 *                 example: 55000
 *               quantity:
 *                 type: number
 *                 example: 0.6
 *     responses:
 *       200:
 *         description: Varlık güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Varlık sil
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Varlık silindi
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /api/assets/{id}/buy:
 *   post:
 *     summary: Alım işlemi
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *               - price
 *             properties:
 *               quantity:
 *                 type: number
 *                 example: 0.1
 *               price:
 *                 type: number
 *                 example: 52000
 *     responses:
 *       200:
 *         description: Alım işlemi başarılı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 */

/**
 * @swagger
 * /api/assets/{id}/sell:
 *   post:
 *     summary: Satış işlemi
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *               - price
 *             properties:
 *               quantity:
 *                 type: number
 *                 example: 0.1
 *               price:
 *                 type: number
 *                 example: 55000
 *     responses:
 *       200:
 *         description: Satış işlemi başarılı
 *       400:
 *         description: Yetersiz bakiye
 */

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Tüm işlemleri listele
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: İşlem listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 */

/**
 * @swagger
 * /api/export/assets:
 *   get:
 *     summary: Varlıkları export et
 *     tags: [Export/Import]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Export formatı
 *     responses:
 *       200:
 *         description: Export başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Asset'
 *           text/csv:
 *             schema:
 *               type: string
 */

/**
 * @swagger
 * /api/export/transactions:
 *   get:
 *     summary: İşlemleri export et
 *     tags: [Export/Import]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *     responses:
 *       200:
 *         description: Export başarılı
 */

/**
 * @swagger
 * /api/export/portfolio:
 *   get:
 *     summary: Tam portföy export
 *     tags: [Export/Import]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *     responses:
 *       200:
 *         description: Export başarılı
 */

/**
 * @swagger
 * /api/import/assets:
 *   post:
 *     summary: Varlıkları import et
 *     tags: [Export/Import]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: string
 *                 description: JSON veya CSV string
 *               format:
 *                 type: string
 *                 enum: [json, csv]
 *                 default: json
 *     responses:
 *       200:
 *         description: Import sonucu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 imported:
 *                   type: integer
 *                 errors:
 *                   type: integer
 */

/**
 * @swagger
 * /api/reports/monthly:
 *   get:
 *     summary: Aylık rapor
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Aylık özet raporu
 */

/**
 * @swagger
 * /api/reports/performance:
 *   get:
 *     summary: Performans raporu
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Varlık bazlı performans raporu
 */

/**
 * @swagger
 * /api/reports/distribution:
 *   get:
 *     summary: Dağılım raporu
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Tür bazlı portföy dağılımı
 */

/**
 * @swagger
 * /api/reports/transactions:
 *   get:
 *     summary: İşlem özeti
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Başlangıç tarihi
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Bitiş tarihi
 *     responses:
 *       200:
 *         description: İşlem özeti
 */

/**
 * @swagger
 * /api/reports/history:
 *   get:
 *     summary: Portföy değer geçmişi
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Tarihsel portföy değeri
 */

/**
 * @swagger
 * /api/reports/top-performers:
 *   get:
 *     summary: En iyi performans gösterenler
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Sonuç sayısı
 *     responses:
 *       200:
 *         description: Top performers listesi
 */

/**
 * @swagger
 * /api/reports/risk:
 *   get:
 *     summary: Risk analizi
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Portföy risk analizi
 */

/**
 * @swagger
 * /api/integrity/check:
 *   get:
 *     summary: Veri bütünlüğü kontrolü
 *     tags: [Integrity]
 *     responses:
 *       200:
 *         description: Bütünlük kontrolü sonuçları
 */

/**
 * @swagger
 * /api/integrity/fix:
 *   post:
 *     summary: Veri bütünlüğü otomatik düzeltme
 *     tags: [Integrity]
 *     responses:
 *       200:
 *         description: Düzeltme sonuçları
 */

/**
 * @swagger
 * /api/backup:
 *   post:
 *     summary: Veritabanı backup oluştur
 *     tags: [Integrity]
 *     responses:
 *       200:
 *         description: Backup oluşturuldu
 */

/**
 * @swagger
 * /api/restore:
 *   post:
 *     summary: Veritabanı restore et
 *     tags: [Integrity]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - backupPath
 *             properties:
 *               backupPath:
 *                 type: string
 *                 example: ./backups/portfolio-2025-12-31.db
 *     responses:
 *       200:
 *         description: Restore başarılı
 */

/**
 * @swagger
 * /api/prices/refresh:
 *   post:
 *     summary: Fiyatları güncelle
 *     tags: [Assets]
 *     responses:
 *       200:
 *         description: Fiyatlar güncellendi
 *       429:
 *         description: Rate limit aşıldı
 */
