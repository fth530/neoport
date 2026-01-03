/**
 * Fiyat Servisi - Harici API'lerden fiyat çekme
 * 
 * APIs:
 * - CoinGecko: Kripto paralar (BTC, ETH, vb.)
 * - Open Exchange Rates / Fallback: Döviz kurları
 * - Finnhub: US Hisse senetleri (AAPL, TSLA, vb.)
 * - Fallback değerler: API başarısız olursa kullanılır
 */

// Finnhub API Key (from environment)
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';

// CoinGecko ID mapping
const CRYPTO_IDS = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'BNB': 'binancecoin',
    'XRP': 'ripple',
    'SOL': 'solana',
    'ADA': 'cardano',
    'AVAX': 'avalanche-2',
    'DOGE': 'dogecoin',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
    'SHIB': 'shiba-inu',
    'LTC': 'litecoin',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'ATOM': 'cosmos'
};

// Güncel fallback değerleri (environment'tan veya default)
const FALLBACK_RATES = {
    USD_TRY: parseFloat(process.env.FALLBACK_USD_TRY) || 36.00,
    EUR_TRY: parseFloat(process.env.FALLBACK_EUR_TRY) || 38.50,
    GBP_TRY: parseFloat(process.env.FALLBACK_GBP_TRY) || 46.00,
    GOLD_GRAM_TRY: parseFloat(process.env.FALLBACK_GOLD_GRAM_TRY) || 3000,
    BTC_USD: 98000,
    ETH_USD: 2800
};

/**
 * CoinGecko'dan kripto fiyatları çek (TRY cinsinden)
 */
async function getCryptoPrices(symbols, currency = 'try') {
    try {
        const ids = symbols
            .map(s => CRYPTO_IDS[s.toUpperCase()])
            .filter(Boolean)
            .join(',');

        if (!ids) {
            console.warn('⚠️ Geçerli kripto sembolü bulunamadı');
            return {};
        }

        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${currency.toLowerCase()}`;
        console.log('📡 CoinGecko API isteği:', url);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error('❌ CoinGecko API hatası:', response.status, response.statusText);
            return {};
        }

        const data = await response.json();
        console.log('✅ CoinGecko yanıt alındı:', Object.keys(data).length, 'kripto');

        // ID'den sembole dönüştür
        const prices = {};
        for (const [symbol, id] of Object.entries(CRYPTO_IDS)) {
            if (data[id] && data[id][currency.toLowerCase()]) {
                prices[symbol] = data[id][currency.toLowerCase()];
            }
        }

        return prices;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ CoinGecko API timeout (10s)');
        } else {
            console.error('❌ CoinGecko API hatası:', error.message);
        }
        return {};
    }
}

/**
 * Döviz kurlarını çek - birden fazla API dene
 */
async function getExchangeRates() {
    const rates = { ...FALLBACK_RATES };

    try {
        const url = 'https://open.er-api.com/v6/latest/USD';
        console.log('📡 Exchange Rate API isteği');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Exchange Rate API yanıtı alındı');

            if (data.rates) {
                if (data.rates.TRY) rates.USD_TRY = data.rates.TRY;
                if (data.rates.EUR) rates.EUR_TRY = rates.USD_TRY / data.rates.EUR;
                if (data.rates.GBP) rates.GBP_TRY = rates.USD_TRY / data.rates.GBP;

                console.log('💱 Güncel kurlar:', {
                    USD_TRY: rates.USD_TRY.toFixed(2),
                    EUR_TRY: rates.EUR_TRY.toFixed(2),
                    GBP_TRY: rates.GBP_TRY.toFixed(2)
                });
            }
        } else {
            console.warn('⚠️ Exchange Rate API başarısız, fallback kullanılıyor');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ Exchange Rate API timeout');
        } else {
            console.error('❌ Exchange Rate API hatası:', error.message);
        }
        console.log('⚠️ Fallback döviz kurları kullanılıyor');
    }

    return rates;
}

/**
 * Altın gram fiyatını hesapla
 * Not: Altın API'leri genellikle ücretli, fallback değer kullanıyoruz
 */
async function getGoldPrice() {
    // Altın için güvenilir ücretsiz API yok
    // Manuel olarak güncellenmesi gereken fallback değer
    console.log('Altın fiyatı: Fallback değer kullanılıyor:', FALLBACK_RATES.GOLD_GRAM_TRY, 'TL/gram');
    return FALLBACK_RATES.GOLD_GRAM_TRY;
}

/**
 * Finnhub'dan US hisse fiyatı çek
 */
async function getStockPrice(symbol) {
    if (!FINNHUB_API_KEY) {
        console.warn('⚠️ Finnhub API key tanımlı değil');
        return null;
    }

    try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${FINNHUB_API_KEY}`;
        console.log('📡 Finnhub API isteği:', symbol);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error('❌ Finnhub API hatası:', response.status, response.statusText);
            return null;
        }

        const data = await response.json();

        if (!data.c || data.c === 0) {
            console.warn('⚠️ Finnhub: Geçersiz fiyat verisi:', symbol);
            return null;
        }

        console.log(`✅ ${symbol}: $${data.c}`);
        return data.c;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ Finnhub API timeout:', symbol);
        } else {
            console.error('❌ Finnhub API hatası:', symbol, error.message);
        }
        return null;
    }
}

/**
 * Tüm varlıkların fiyatlarını güncelle
 */
async function updateAllPrices(assets, updateAssetFn) {
    const results = {
        updated: 0,
        failed: 0,
        skipped: 0,
        details: []
    };

    console.log('\n========== FİYAT GÜNCELLEME BAŞLADI ==========');
    console.log('📊 Toplam varlık:', assets.length);

    if (assets.length === 0) {
        console.log('⚠️ Güncellenecek varlık yok');
        return results;
    }

    try {
        // Döviz kurlarını al
        const rates = await getExchangeRates();

        // Kripto varlıkları grupla ve fiyatları çek
        const cryptoAssets = assets.filter(a => a.type === 'crypto');
        const cryptoSymbols = cryptoAssets.map(a => a.symbol);

        let cryptoPrices = {};
        if (cryptoSymbols.length > 0) {
            console.log(`🪙 ${cryptoSymbols.length} kripto para güncelleniyor...`);
            cryptoPrices = await getCryptoPrices(cryptoSymbols, 'try');
        }

        // Altın fiyatını al
        const goldPrice = await getGoldPrice();

        // Her varlığı güncelle
        for (const asset of assets) {
            let newPrice = null;
            let priceSource = '';

            try {
                switch (asset.type) {
                    case 'crypto':
                        newPrice = cryptoPrices[asset.symbol.toUpperCase()];
                        priceSource = 'CoinGecko';
                        break;

                    case 'gold':
                        newPrice = goldPrice;
                        priceSource = 'Fallback';
                        break;

                    case 'currency':
                        const symbol = asset.symbol.toUpperCase();
                        if (symbol === 'USD') {
                            newPrice = rates.USD_TRY;
                            priceSource = 'Exchange Rate API';
                        } else if (symbol === 'EUR') {
                            newPrice = rates.EUR_TRY;
                            priceSource = 'Exchange Rate API';
                        } else if (symbol === 'GBP') {
                            newPrice = rates.GBP_TRY;
                            priceSource = 'Exchange Rate API';
                        }
                        break;

                    case 'stock':
                        const stockPriceUSD = await getStockPrice(asset.symbol);
                        if (stockPriceUSD) {
                            newPrice = stockPriceUSD * rates.USD_TRY;
                            priceSource = 'Finnhub';
                        }
                        break;
                }

                if (newPrice !== null && newPrice > 0) {
                    await updateAssetFn(asset.id, { current_price: newPrice });
                    results.updated++;
                    console.log(`✅ ${asset.name} (${asset.symbol}): ${asset.current_price.toFixed(2)} → ${newPrice.toFixed(2)} TL [${priceSource}]`);
                    results.details.push({
                        name: asset.name,
                        symbol: asset.symbol,
                        oldPrice: asset.current_price,
                        newPrice: newPrice,
                        source: priceSource,
                        status: 'updated'
                    });
                } else {
                    results.skipped++;
                    console.log(`⚠️ ${asset.name} (${asset.symbol}): Atlandı - Fiyat alınamadı`);
                    results.details.push({
                        name: asset.name,
                        symbol: asset.symbol,
                        status: 'skipped',
                        reason: 'Fiyat alınamadı'
                    });
                }
            } catch (error) {
                results.failed++;
                console.error(`❌ ${asset.name}: Güncelleme hatası - ${error.message}`);
                results.details.push({
                    name: asset.name,
                    symbol: asset.symbol,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        console.log('========== GÜNCELLEME TAMAMLANDI ==========');
        console.log(`✅ Güncellenen: ${results.updated}`);
        console.log(`⚠️ Atlanan: ${results.skipped}`);
        console.log(`❌ Başarısız: ${results.failed}\n`);

    } catch (error) {
        console.error('❌ Fiyat güncelleme genel hatası:', error);
        throw new Error('Fiyat güncelleme başarısız: ' + error.message);
    }

    return results;
}

module.exports = {
    getCryptoPrices,
    getExchangeRates,
    getGoldPrice,
    getStockPrice,
    updateAllPrices,
    CRYPTO_IDS,
    FALLBACK_RATES
};
