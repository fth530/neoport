console.log("App.js yüklendi - Başlatılıyor...");

// =====================
// GLOBAL STATE & CONSTANTS
// =====================
const API_BASE = '/api/v1';
const API_BASE_SECURITY = '/api/v1';

let assets = [];
let transactions = [];
let selectedAssetId = null;
let portfolioChart = null;
let typeChart = null;
let currentTab = 'portfolio';
let socket = null;
let isConnected = false;

// Pasta grafik renkleri
const chartColors = [
    '#6366f1', // indigo
    '#f59e0b', // amber
    '#10b981', // emerald
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#f97316', // orange
    '#ec4899', // pink
    '#84cc16', // lime
    '#64748b'  // slate
];

// Tür bazlı renkler
const typeColors = {
    crypto: { color: '#f59e0b', label: 'Kripto Para', icon: 'fa-brands fa-bitcoin' },
    stock: { color: '#6366f1', label: 'Hisse Senedi', icon: 'fa-solid fa-building' },
    gold: { color: '#eab308', label: 'Altın', icon: 'fa-solid fa-coins' },
    currency: { color: '#10b981', label: 'Döviz', icon: 'fa-solid fa-money-bill-wave' }
};

let currentFilter = 'all';

// Döviz kurları - başlangıçta statik, sonra API'den güncellenir
let exchangeRates = {
    USD: { TRY: 43.04, EUR: 0.86 },
    TRY: { USD: 0.0232, EUR: 0.0198 },
    EUR: { TRY: 50.46, USD: 1.17 }
};

// API'den güncel kurları al
async function fetchExchangeRates() {
    try {
        const response = await fetch('/api/v1/prices/rates');
        if (response.ok) {
            const data = await response.json();
            if (data.USD_TRY) {
                const usdTry = parseFloat(data.USD_TRY);
                const eurTry = parseFloat(data.EUR_TRY) || usdTry * 1.17;
                
                exchangeRates = {
                    USD: { TRY: usdTry, EUR: usdTry / eurTry },
                    TRY: { USD: 1 / usdTry, EUR: 1 / eurTry },
                    EUR: { TRY: eurTry, USD: eurTry / usdTry }
                };
                console.log('Döviz kurları güncellendi:', exchangeRates);
                convertCurrency(); // Yeni kurlarla hesapla
            }
        }
    } catch (error) {
        console.warn('Döviz kurları alınamadı, statik değerler kullanılıyor');
    }
}

// =====================
// TOAST & UI HELPERS
// =====================
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    toast.innerHTML = `
        <i class="fa-solid ${icons[type]} text-xl"></i>
        <span class="flex-1">${message}</span>
        <button class="toast-close-btn opacity-70 hover:opacity-100 transition">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    // CSP uyumlu: onclick yerine event listener
    const closeBtn = toast.querySelector('.toast-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        });
    }

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function validatePositiveNumber(value, fieldName = 'Değer') {
    const num = parseFloat(value);
    if (isNaN(num)) {
        showToast(`${fieldName} geçerli bir sayı olmalıdır`, 'error');
        return false;
    }
    if (num < 0) {
        showToast(`${fieldName} negatif olamaz`, 'error');
        return false;
    }
    if (num === 0) {
        showToast(`${fieldName} sıfırdan büyük olmalıdır`, 'warning');
        return false;
    }
    return true;
}

// =====================
// TAB & FILTER FUNCTIONS
// =====================
function switchTab(tab) {
    currentTab = tab;
    const portfolioTab = document.getElementById('portfolioTab');
    const historyTab = document.getElementById('historyTab');
    const reportsTab = document.getElementById('reportsTab');
    const tabPortfolio = document.getElementById('tabPortfolio');
    const tabHistory = document.getElementById('tabHistory');
    const tabReports = document.getElementById('tabReports');
    const filterSection = document.getElementById('filterSection');

    // Hide all tabs
    if (portfolioTab) portfolioTab.classList.add('hidden');
    if (historyTab) historyTab.classList.add('hidden');
    if (reportsTab) reportsTab.classList.add('hidden');

    // Reset styles
    const inactiveClass = 'tab-btn px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap';
    const activeClass = 'tab-btn px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 bg-blue-600 text-white whitespace-nowrap';

    if (tabPortfolio) tabPortfolio.className = inactiveClass;
    if (tabHistory) tabHistory.className = inactiveClass;
    if (tabReports) tabReports.className = inactiveClass;

    if (tab === 'portfolio') {
        if (portfolioTab) portfolioTab.classList.remove('hidden');
        if (filterSection) filterSection.classList.remove('hidden');
        if (tabPortfolio) tabPortfolio.className = activeClass;
    } else if (tab === 'history') {
        if (historyTab) historyTab.classList.remove('hidden');
        if (filterSection) filterSection.classList.add('hidden');
        if (tabHistory) tabHistory.className = activeClass;
        fetchTransactions();
    } else if (tab === 'reports') {
        if (reportsTab) reportsTab.classList.remove('hidden');
        if (filterSection) filterSection.classList.add('hidden');
        if (tabReports) tabReports.className = activeClass;
        loadReports();
    }
}

function filterByType(type) {
    currentFilter = type;
    const filters = ['All', 'Crypto', 'Stock', 'Gold', 'Currency'];
    const filterMap = { all: 'All', crypto: 'Crypto', stock: 'Stock', gold: 'Gold', currency: 'Currency' };

    filters.forEach(f => {
        const btn = document.getElementById('filter' + f);
        if (btn) {
            if (filterMap[type] === f) {
                btn.className = 'filter-btn px-3 py-1.5 rounded-lg text-xs font-medium transition bg-indigo-600 text-white';
            } else {
                btn.className = 'filter-btn px-3 py-1.5 rounded-lg text-xs font-medium transition bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600';
            }
        }
    });
    renderAssets();
}

function getFilteredAssets() {
    if (currentFilter === 'all') return assets;
    return assets.filter(a => a.type === currentFilter);
}

function fillAssetFromPreset() {
    const select = document.getElementById('presetAssetSelect');
    if (!select || !select.value) return;

    const [type, name, symbol] = select.value.split('|');
    const typeMap = {
        'crypto': 'Kripto Para',
        'stock': 'Hisse Senedi',
        'gold': 'Altın',
        'currency': 'Döviz'
    };

    const typeSelect = document.getElementById('addAssetType');
    const nameInput = document.getElementById('addAssetName');
    const symbolInput = document.getElementById('addAssetSymbol');

    if (typeSelect) typeSelect.value = typeMap[type] || 'Kripto Para';
    if (nameInput) nameInput.value = name;
    if (symbolInput) symbolInput.value = symbol;
}

function convertCurrency() {
    const input = document.getElementById('converterInput');
    const fromSelect = document.getElementById('converterFrom');
    const toSelect = document.getElementById('converterTo');
    const result = document.getElementById('converterResult');

    if (!input || !fromSelect || !toSelect || !result) return;

    const amount = parseFloat(input.value) || 0;
    const from = fromSelect.value;
    const to = toSelect.value;

    if (from === to) {
        result.textContent = amount.toFixed(2);
        return;
    }

    const rate = exchangeRates[from]?.[to] || 1;
    const converted = amount * rate;
    result.textContent = converted.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// =====================
// DASHBOARD & CHARTS
// =====================
function updateMiniDashboard() {
    try {
        const topGainerEl = document.getElementById('topGainer');
        const topGainerProfitEl = document.getElementById('topGainerProfit');
        const topLoserEl = document.getElementById('topLoser');
        const topLoserLossEl = document.getElementById('topLoserLoss');

        if (!topGainerEl || !topLoserEl) return;

        if (!assets || assets.length === 0) {
            topGainerEl.textContent = 'Veri Yok';
            topGainerProfitEl.textContent = '---';
            topLoserEl.textContent = 'Veri Yok';
            topLoserLossEl.textContent = '---';
            return;
        }

        const sortedByProfit = [...assets].sort((a, b) => (b.profit_loss || 0) - (a.profit_loss || 0));
        const gainer = sortedByProfit[0];
        const loser = sortedByProfit[sortedByProfit.length - 1];

        if (gainer && gainer.profit_loss > 0) {
            topGainerEl.textContent = gainer.name;
            const percent = gainer.profit_loss_percent || 0;
            topGainerProfitEl.textContent = `${formatCurrency(gainer.profit_loss, gainer.currency)} (+${Math.abs(percent).toFixed(1)}%)`;
        } else {
            topGainerEl.textContent = '-';
            topGainerProfitEl.textContent = 'Kar yok';
        }

        if (loser && loser.profit_loss < 0) {
            topLoserEl.textContent = loser.name;
            const percent = loser.profit_loss_percent || 0;
            topLoserLossEl.textContent = `${formatCurrency(Math.abs(loser.profit_loss), loser.currency)} (${percent.toFixed(1)}%)`;
        } else {
            topLoserEl.textContent = '-';
            topLoserLossEl.textContent = 'Zarar yok';
        }
    } catch (e) {
        console.error("Top Movers Update Failed", e);
    }
}

// =====================
// API FUNCTIONS
// =====================
async function fetchAssets() {
    try {
        const response = await fetch(`${API_BASE}/assets`);
        if (!response.ok) throw new Error('Varlıklar yüklenemedi');
        assets = await response.json();
        renderAssets();
        renderPieChart();
        renderTypeChart();
        updateSummary();
        updateMiniDashboard();
        convertCurrency();
    } catch (error) {
        console.error('Varlıklar yüklenemedi:', error);
        showToast('Varlıklar yüklenirken hata oluştu', 'error');
    }
}

async function fetchTransactions() {
    try {
        const response = await fetch(`${API_BASE}/transactions`);
        if (!response.ok) throw new Error('İşlem geçmişi yüklenemedi');
        transactions = await response.json();
        renderHistory();
    } catch (error) {
        console.error('İşlem geçmişi yüklenemedi:', error);
        showToast('İşlem geçmişi yüklenirken hata oluştu', 'error');
    }
}

function renderHistory() {
    const historyList = document.getElementById('historyList');
    const historyCount = document.getElementById('historyCount');

    if (!historyList) return;

    if (historyCount) {
        historyCount.textContent = `${transactions.length} işlem`;
    }

    if (transactions.length === 0) {
        historyList.innerHTML = `
            <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                <i class="fa-solid fa-clock-rotate-left text-4xl mb-4 block opacity-50"></i>
                <p>Henüz işlem geçmişi yok</p>
            </div>
        `;
        return;
    }

    historyList.innerHTML = transactions.map(tx => {
        const isBuy = tx.type === 'buy';
        const typeIcon = isBuy ? 'fa-arrow-down' : 'fa-arrow-up';
        const typeColor = isBuy ? 'text-green-500 bg-green-100 dark:bg-green-900/30' : 'text-red-500 bg-red-100 dark:bg-red-900/30';
        const typeText = isBuy ? 'Alım' : 'Satış';
        const date = new Date(tx.date).toLocaleString('tr-TR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        return `
            <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full ${typeColor} flex items-center justify-center">
                            <i class="fa-solid ${typeIcon}"></i>
                        </div>
                        <div>
                            <div class="font-medium text-gray-800 dark:text-gray-200">${tx.asset_name || 'Bilinmeyen'}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">${tx.asset_symbol || ''} • ${typeText}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-semibold ${isBuy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                            ${isBuy ? '+' : '-'}${tx.quantity}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">@ ${formatCurrency(tx.price, 'TRY')}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function fetchSummary() {
    try {
        const response = await fetch(`${API_BASE}/summary`);
        return await response.json();
    } catch (error) {
        console.error('Özet yüklenemedi:', error);
        return null;
    }
}

async function createAsset(data) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const responseData = await response.json();

        if (response.ok) {
            // Başarılı yanıt - varlığı yeniden yükle
            await fetchAssets();
            showToast(`${data.name} başarıyla eklendi`, 'success');
            return true;
        } else {
            // Hata durumları
            if (response.status === 409 || response.status === 400) {
                // Duplicate veya validation hatası
                const errorMsg = responseData.error || responseData.details || 'Varlık eklenemedi';
                if (errorMsg.includes('zaten mevcut') || errorMsg.includes('mevcut')) {
                    showToast(`${data.symbol} zaten portföyünüzde mevcut!`, 'warning');
                } else {
                    showToast(errorMsg, 'warning');
                }
            } else if (response.status === 500) {
                // Sunucu hatası - varlığın eklenip eklenmediğini kontrol et
                console.warn('500 hatası alındı, varlıklar yeniden yükleniyor...');
                await fetchAssets();
                // Eğer varlık eklendiyse başarı mesajı göster
                const checkAsset = assets.find(a => a.symbol === data.symbol && a.type === data.type);
                if (checkAsset) {
                    showToast(`${data.name} başarıyla eklendi`, 'success');
                    return true;
                } else {
                    showToast('Sunucu hatası oluştu, lütfen tekrar deneyin', 'error');
                }
            } else {
                showToast(responseData.error || responseData.details || 'Varlık eklenemedi', 'error');
            }
        }
    } catch (error) {
        console.error('Varlık eklenemedi:', error);
        // Network hatası durumunda da varlıkları kontrol et
        await fetchAssets();
        const checkAsset = assets.find(a => a.symbol === data.symbol && a.type === data.type);
        if (checkAsset) {
            showToast(`${data.name} başarıyla eklendi`, 'success');
            return true;
        }
        showToast('Sunucu bağlantı hatası', 'error');
    } finally {
        hideLoading();
    }
    return false;
}

async function deleteAsset(id) {
    try {
        showLoading();
        const asset = assets.find(a => a.id === id);
        const response = await fetch(`${API_BASE}/assets/${id}`, { method: 'DELETE' });

        if (response.ok) {
            await fetchAssets();
            showToast(`${asset?.name || 'Varlık'} silindi`, 'success');
            return true;
        } else {
            showToast('Varlık silinemedi', 'error');
        }
    } catch (error) {
        showToast('Sunucu bağlantı hatası', 'error');
    } finally {
        hideLoading();
    }
    return false;
}

async function buyAsset(id, quantity, price) {
    if (!validatePositiveNumber(quantity, 'Miktar')) return false;
    if (!validatePositiveNumber(price, 'Fiyat')) return false;

    try {
        showLoading();
        const asset = assets.find(a => a.id === id);
        const response = await fetch(`${API_BASE}/assets/${id}/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity, price })
        });

        if (response.ok) {
            await fetchAssets();
            showToast(`${asset?.name || 'Varlık'} için alım eklendi`, 'success');
            return true;
        } else {
            const error = await response.json();
            showToast(error.error || 'Alım eklenemedi', 'error');
        }
    } catch (error) {
        showToast('Sunucu bağlantı hatası', 'error');
    } finally {
        hideLoading();
    }
    return false;
}

async function sellAsset(id, quantity, price) {
    if (!validatePositiveNumber(quantity, 'Miktar')) return false;
    if (!validatePositiveNumber(price, 'Fiyat')) return false;

    try {
        showLoading();
        const asset = assets.find(a => a.id === id);
        const response = await fetch(`${API_BASE}/assets/${id}/sell`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity, price })
        });
        if (response.ok) {
            await fetchAssets();
            showToast(`${asset?.name || 'Varlık'} satışı tamamlandı`, 'success');
            return true;
        } else {
            const error = await response.json();
            showToast(error.error || 'Satış işlemi başarısız', 'error');
        }
    } catch (error) {
        showToast('Sunucu bağlantı hatası', 'error');
    } finally {
        hideLoading();
    }
    return false;
}

async function updateAsset(id, data) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/assets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            await fetchAssets();
            showToast('Varlık güncellendi', 'success');
            return true;
        } else {
            showToast('Varlık güncellenemedi', 'error');
        }
    } catch (error) {
        showToast('Sunucu bağlantı hatası', 'error');
    } finally {
        hideLoading();
    }
    return false;
}

async function refreshPrices() {
    const btn = document.getElementById('refreshPricesBtn');
    const icon = document.getElementById('refreshIcon');
    if (btn) btn.disabled = true;
    if (icon) icon.classList.add('animate-spin');

    showToast('Fiyatlar güncelleniyor...', 'info', 2000);
    try {
        const response = await fetch(`${API_BASE}/prices/refresh`, { method: 'POST' });
        const result = await response.json();
        if (response.ok) {
            await fetchAssets();
            showToast(`${result.updated} varlık güncellendi`, 'success');
        } else {
            showToast('Güncelleme başarısız', 'error');
        }
    } catch (error) {
        showToast('Sunucu bağlantı hatası', 'error');
    } finally {
        if (btn) btn.disabled = false;
        if (icon) icon.classList.remove('animate-spin');
    }
}

// =====================
// CHART RENDER FUNCTIONS
// =====================
function renderPieChart() {
    const ctx = document.getElementById('portfolioChart');
    const emptyState = document.getElementById('chartEmptyState');
    const legendContainer = document.getElementById('chartLegend');
    if (!ctx) return;

    if (assets.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (legendContainer) legendContainer.innerHTML = '';
        if (portfolioChart) { portfolioChart.destroy(); portfolioChart = null; }
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const labels = assets.map(a => a.name);
    // GÜVENLİ FİYAT HESAPLAMA: Canlı fiyat yoksa maliyet fiyatını kullan
    const values = assets.map(a => {
        const currentPrice = (a.current_price && a.current_price > 0)
            ? a.current_price
            : (a.avg_cost || 0);
        return a.quantity * currentPrice;
    });
    const total = values.reduce((sum, v) => sum + v, 0);
    const percentages = values.map(v => total > 0 ? ((v / total) * 100).toFixed(1) : 0);
    const colors = assets.map((_, i) => chartColors[i % chartColors.length]);

    if (portfolioChart) portfolioChart.destroy();

    const isDark = document.documentElement.classList.contains('dark');

    portfolioChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: isDark ? '#1f2937' : '#ffffff',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%',
            plugins: { legend: { display: false } }
        }
    });

    // Legend'ı manuel oluştur
    if (legendContainer) {
        legendContainer.innerHTML = assets.map((asset, i) => {
            return `
                <div class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded-full" style="background-color: ${colors[i]}"></div>
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${asset.name}</span>
                    </div>
                    <span class="text-sm font-bold text-gray-800 dark:text-gray-200">%${percentages[i]}</span>
                </div>
            `;
        }).join('');
    }
}

function renderTypeChart() {
    const ctx = document.getElementById('typeChart');
    const emptyState = document.getElementById('typeChartEmptyState');
    const legendContainer = document.getElementById('typeLegend');
    if (!ctx) return;

    if (assets.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (legendContainer) legendContainer.innerHTML = '';
        if (typeChart) { typeChart.destroy(); typeChart = null; }
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    const typeData = {};
    assets.forEach(asset => {
        // GÜVENLİ FİYAT HESAPLAMA: Canlı fiyat yoksa maliyet fiyatını kullan
        const safePrice = (asset.current_price && asset.current_price > 0)
            ? asset.current_price
            : (asset.avg_cost || 0);
        const value = asset.quantity * safePrice;
        if (!typeData[asset.type]) typeData[asset.type] = 0;
        typeData[asset.type] += value;
    });

    const types = Object.keys(typeData);
    const values = types.map(t => typeData[t]);
    const colors = types.map(t => typeColors[t]?.color || '#64748b');
    // Türkçe etiketler
    const labels = types.map(t => typeColors[t]?.label || t);
    const total = values.reduce((sum, v) => sum + v, 0);
    const percentages = values.map(v => total > 0 ? ((v / total) * 100).toFixed(1) : 0);

    if (typeChart) typeChart.destroy();

    const isDark = document.documentElement.classList.contains('dark');
    typeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: isDark ? '#1f2937' : '#ffffff',
                borderWidth: 3
            }]
        },
        options: { 
            cutout: '65%', 
            plugins: { legend: { display: false } } 
        }
    });

    // Legend'ı manuel oluştur
    if (legendContainer) {
        legendContainer.innerHTML = types.map((type, i) => {
            const typeInfo = typeColors[type] || { label: type, color: colors[i] };
            return `
                <div class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded-full" style="background-color: ${colors[i]}"></div>
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${typeInfo.label}</span>
                    </div>
                    <span class="text-sm font-bold text-gray-800 dark:text-gray-200">%${percentages[i]}</span>
                </div>
            `;
        }).join('');
    }
}

function formatCurrency(value, currency = 'TRY') {
    // GÜVENLİK KALKANI: Değer yoksa veya sayı değilse '0.00' döndür, çökme!
    if (value === undefined || value === null || isNaN(value)) {
        return '0.00';
    }

    const symbol = currency === 'TRY' ? '₺' : '$';
    return symbol + ' ' + value.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function getIconConfig(type) {
    const configs = {
        'crypto': { icon: 'fa-brands fa-bitcoin', bg: 'orange' },
        'gold': { icon: 'fa-solid fa-coins', bg: 'yellow' },
        'stock': { icon: 'fa-solid fa-building', bg: 'gray' },
        'currency': { icon: 'fa-solid fa-money-bill-wave', bg: 'green' }
    };
    return configs[type] || configs['stock'];
}

function renderAssets() {
    const desktopBody = document.getElementById('desktopTableBody');
    const mobileList = document.getElementById('mobileAssetList');
    if (!desktopBody || !mobileList) return;

    const filteredAssets = getFilteredAssets();

    if (filteredAssets.length === 0) {
        desktopBody.innerHTML = '<tr><td colspan="6" class="p-8 text-center">Varlık bulunamadı</td></tr>';
        mobileList.innerHTML = '<div class="p-8 text-center">Varlık bulunamadı</div>';
        return;
    }

    desktopBody.innerHTML = filteredAssets.map(asset => {
        const iconCfg = getIconConfig(asset.type);
        const isProfit = asset.profit_loss >= 0;
        const profitClass = isProfit ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
        return `
            <tr class="hover:bg-blue-50/50 dark:hover:bg-gray-700/50">
                <td class="p-4">
                     <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-${iconCfg.bg}-100 flex items-center justify-center"><i class="${asset.icon || iconCfg.icon}"></i></div>
                        <div><div class="font-bold">${asset.name}</div><div class="text-xs">${asset.symbol}</div></div>
                    </div>
                </td>
                <td class="p-4 text-right">${asset.quantity}</td>
                <td class="p-4 text-right">${formatCurrency(asset.avg_cost, asset.currency)}</td>
                <td class="p-4 text-right font-semibold">${formatCurrency(asset.current_price, asset.currency)}</td>
                <td class="p-4 text-right"><span class="${profitClass} px-3 py-1 rounded-full text-xs font-bold">${formatCurrency(Math.abs(asset.profit_loss), asset.currency)}</span></td>
                <td class="p-4 text-center">
                    <button class="asset-buy-btn text-blue-500 hover:text-blue-600 p-2" data-id="${asset.id}"><i class="fa-solid fa-circle-plus"></i></button>
                    <button class="asset-sell-btn text-orange-500 hover:text-orange-600 p-2" data-id="${asset.id}"><i class="fa-solid fa-circle-minus"></i></button>
                    <button class="asset-edit-btn text-emerald-500 p-2" data-id="${asset.id}"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="asset-delete-btn text-red-500 p-2" data-id="${asset.id}"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    // Butonlara event listener ekle
    attachAssetButtonListeners(desktopBody);

    // Mobile render skipped for brevity, similar structure
    renderMobileAssets(mobileList, filteredAssets);
}

// Varlık butonlarına event listener ekle
function attachAssetButtonListeners(container) {
    container.querySelectorAll('.asset-buy-btn').forEach(btn => {
        btn.addEventListener('click', () => openBuyModal(parseInt(btn.dataset.id)));
    });
    container.querySelectorAll('.asset-sell-btn').forEach(btn => {
        btn.addEventListener('click', () => openSellModal(parseInt(btn.dataset.id)));
    });
    container.querySelectorAll('.asset-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
    container.querySelectorAll('.asset-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete(parseInt(btn.dataset.id)));
    });
}

function renderMobileAssets(container, filteredAssets) {
    container.innerHTML = filteredAssets.map(asset => {
        const iconCfg = getIconConfig(asset.type);
        return `
            <div class="p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                         <div class="w-10 h-10 rounded-full bg-${iconCfg.bg}-100 flex items-center justify-center"><i class="${asset.icon || iconCfg.icon}"></i></div>
                         <div><div class="font-bold">${asset.name}</div><div class="text-xs text-gray-500">${asset.quantity} ${asset.symbol}</div></div>
                    </div>
                    <div>
                        <button class="asset-buy-btn text-blue-500 p-2" data-id="${asset.id}"><i class="fa-solid fa-circle-plus"></i></button>
                        <button class="asset-sell-btn text-orange-500 p-2" data-id="${asset.id}"><i class="fa-solid fa-circle-minus"></i></button>
                        <button class="asset-edit-btn text-emerald-500 p-2" data-id="${asset.id}"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="asset-delete-btn text-red-500 p-2" data-id="${asset.id}"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Mobile butonlara da event listener ekle
    attachAssetButtonListeners(container);
}

// Global fallback for total value
let lastKnownTotal = 0;

async function updateSummary() {
    const summary = await fetchSummary();
    const totalValueEl = document.getElementById('totalValue');

    // Eğer summary yoksa veya 0 ise, assets'ten hesapla
    let totalValue = 0;
    if (summary && summary.total_value > 0) {
        totalValue = summary.total_value;
        lastKnownTotal = totalValue;
    } else if (assets && assets.length > 0) {
        // Assets'ten manuel hesapla
        totalValue = assets.reduce((sum, a) => {
            const safePrice = (a.current_price && a.current_price > 0) ? a.current_price : (a.avg_cost || 0);
            return sum + (a.quantity * safePrice);
        }, 0);
        lastKnownTotal = totalValue;
    } else if (lastKnownTotal > 0) {
        // Son bilinen değeri kullan
        totalValue = lastKnownTotal;
        if (totalValueEl) totalValueEl.style.opacity = '0.7';
    }

    if (totalValueEl) {
        if (totalValue > 0) {
            totalValueEl.textContent = formatCurrency(totalValue, 'TRY');
            totalValueEl.style.opacity = '1';
        } else {
            totalValueEl.textContent = formatCurrency(0, 'TRY');
            totalValueEl.style.opacity = '1';
        }
    }

    // TOPLAM KÂR HESAPLAMA VE YAZDIRMA
    const totalCost = assets.reduce((sum, a) => sum + (a.quantity * (a.avg_cost || 0)), 0);
    const totalProfit = totalValue - totalCost;
    const profitEl = document.getElementById('totalProfit');
    const profitPercentEl = document.getElementById('totalProfitPercent');
    const realizedProfitEl = document.getElementById('realizedProfit');
    const totalOverallProfitEl = document.getElementById('totalOverallProfit');

    if (profitEl) {
        profitEl.textContent = formatCurrency(totalProfit, 'TRY');
        profitEl.className = `text-2xl font-bold ${totalProfit >= 0 ? 'text-green-300' : 'text-red-300'} flex items-center gap-2`;
    }

    if (profitPercentEl && totalCost > 0) {
        const percent = ((totalProfit / totalCost) * 100).toFixed(1);
        profitPercentEl.textContent = `%${percent}`;
    }

    // Gerçekleşmiş kar (summary'den al veya 0 göster)
    if (realizedProfitEl) {
        const realizedProfit = summary?.total_realized_profit || 0;
        realizedProfitEl.textContent = formatCurrency(realizedProfit, 'TRY');
    }

    // Toplam kar (gerçekleşmiş + gerçekleşmemiş)
    if (totalOverallProfitEl) {
        const realizedProfit = summary?.total_realized_profit || 0;
        const overallProfit = realizedProfit + totalProfit;
        totalOverallProfitEl.textContent = formatCurrency(overallProfit, 'TRY');
    }
}

// =====================
// MODAL & FORM FUNCTIONS
// =====================
function openBuyModal(assetId) {
    selectedAssetId = assetId;
    const asset = assets.find(a => a.id === assetId);
    if (asset) document.getElementById('buyAssetName').textContent = asset.name;
    toggleModal('buyAssetModal');
}

function openSellModal(assetId) {
    selectedAssetId = assetId;
    const asset = assets.find(a => a.id === assetId);
    if (asset) document.getElementById('sellAssetName').textContent = asset.name;
    toggleModal('sellAssetModal');
}

function openEditModal(assetId) {
    selectedAssetId = assetId;
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
        document.getElementById('editQuantity').value = asset.quantity;
        document.getElementById('editAvgCost').value = asset.avg_cost;
        document.getElementById('editCurrentPrice').value = asset.current_price;
    }
    toggleModal('editAssetModal');
}

function confirmDelete(assetId) {
    if (confirm('Silmek istediğinize emin misiniz?')) deleteAsset(assetId);
}

function confirmClearAll() {
    if (confirm('TÜM veriler silinecek!')) {
        // Mock clear for now or simple loop
        alert("Bu işlem sunucu tarafından desteklenmeli");
    }
}

async function handleAddAsset(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    data.quantity = parseFloat(data.quantity);
    data.avg_cost = parseFloat(data.avg_cost);
    data.current_price = data.avg_cost; // Init with cost

    if (await createAsset(data)) {
        toggleModal('addAssetModal');
        event.target.reset();
    }
}

async function handleBuyAsset(event) {
    event.preventDefault();
    const form = event.target;
    // ... buy logic ...
    const quantity = parseFloat(form.querySelector('[name="quantity"]').value);
    const price = parseFloat(form.querySelector('[name="price"]').value);
    if (await buyAsset(selectedAssetId, quantity, price)) {
        form.reset();
        toggleModal('buyAssetModal');
    }
}

async function handleSellAsset(event) {
    event.preventDefault();
    const form = event.target;
    const quantity = parseFloat(form.querySelector('[name="quantity"]').value);
    const price = parseFloat(form.querySelector('[name="price"]').value);
    if (await sellAsset(selectedAssetId, quantity, price)) {
        form.reset();
        toggleModal('sellAssetModal');
    }
}

async function handleEditAsset(event) {
    event.preventDefault();
    const form = event.target;
    const quantity = parseFloat(form.querySelector('[name="quantity"]').value);
    const avg_cost = parseFloat(form.querySelector('[name="avg_cost"]').value);
    const current_price = parseFloat(form.querySelector('[name="current_price"]').value);

    if (await updateAsset(selectedAssetId, { quantity, avg_cost, current_price })) {
        form.reset();
        toggleModal('editAssetModal');
    }
}

// =====================
// THEME & UI INTERACTION
// =====================
function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}

function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const backdrop = modal.querySelector('.modal-backdrop');
    const panel = modal.querySelector('.modal-panel');

    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        // Small delay for transition
        setTimeout(() => {
            if (backdrop) backdrop.classList.remove('opacity-0');
            if (panel) panel.classList.remove('opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');
        }, 10);
    } else {
        if (backdrop) backdrop.classList.add('opacity-0');
        if (panel) panel.classList.add('opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

function toggleExportMenu() {
    const menu = document.getElementById('exportMenu');
    if (menu) menu.classList.toggle('hidden');
}

// =====================
// EXPORTS & BACKUPS
// =====================
async function exportData(type, format) {
    try {
        const response = await fetch(`${API_BASE}/export/${type}?format=${format}`);
        if (!response.ok) throw new Error('Export başarısız');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio-${type}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('İndirildi', 'success');
    } catch (e) {
        showToast('Hata: ' + e.message, 'error');
    }
}

function exportPrivacyData() {
    window.open(`${API_BASE_SECURITY}/privacy/export`, '_blank');
}

async function fetchBackups() {
    try {
        const response = await fetch(`${API_BASE_SECURITY}/security/backups`);
        const backups = await response.json();
        const list = document.getElementById('backupList');
        if (list) {
            list.innerHTML = backups.length ? backups.map(b => `<div>${b.name}</div>`).join('') : 'Yedek yok';
        }
    } catch (e) { console.error(e); }
}

async function createBackup() {
    try {
        await fetch(`${API_BASE_SECURITY}/security/backup`, { method: 'POST' });
        showToast('Yedek oluşturuldu', 'success');
        fetchBackups();
    } catch (e) { showToast('Hata', 'error'); }
}

async function restoreBackup(filename) {
    if (!confirm('Geri yüklensin mi?')) return;
    try {
        await fetch(`${API_BASE_SECURITY}/security/restore`, {
            method: 'POST', body: JSON.stringify({ filename }), headers: { 'Content-Type': 'application/json' }
        });
        location.reload();
    } catch (e) { showToast('Hata', 'error'); }
}

async function startDeleteAccount() {
    if (confirm('Silinsin mi?') && prompt('SİL yazın') === 'SİL') {
        await fetch(`${API_BASE_SECURITY}/privacy/delete`, { method: 'DELETE' });
        location.reload();
    }
}

// Report functions stub needed for non-blocking
async function loadReports() { console.log("Reports loading..."); }

function updateConnectionStatus(status) {
    // Visual update
    const text = document.getElementById('connectionText');
    if (text) text.textContent = status === 'connected' ? 'Canlı' : 'Koptu';
}

function setupSocketListeners() {
    if (!socket) return;
    socket.on('connect', () => {
        isConnected = true;
        updateConnectionStatus('connected');
        showToast('Bağlandı', 'success');
    });
    socket.on('disconnect', () => {
        isConnected = false;
        updateConnectionStatus('disconnected');
    });
    socket.on('price_update', (data) => {
        if (data.type === 'full_update') {
            assets = data.assets;
            renderAssets();
            updateSummary();
            updateMiniDashboard();
            showToast('Fiyatlar güncellendi', 'info', 1000);
        }
    });
}

// =====================
// GLOBAL EXPORTS FOR HTML
// =====================
window.toggleTheme = toggleTheme;
window.toggleModal = toggleModal;
window.toggleExportMenu = toggleExportMenu;
window.refreshPrices = refreshPrices;
window.confirmClearAll = confirmClearAll;
window.exportData = exportData;
window.exportPrivacyData = exportPrivacyData;
window.switchTab = switchTab;
window.filterByType = filterByType;
window.fillAssetFromPreset = fillAssetFromPreset;
window.convertCurrency = convertCurrency;
window.handleAddAsset = handleAddAsset;
window.handleBuyAsset = handleBuyAsset;
window.handleSellAsset = handleSellAsset;
window.handleEditAsset = handleEditAsset;
window.confirmDelete = confirmDelete;
window.openBuyModal = openBuyModal;
window.openSellModal = openSellModal;
window.openEditModal = openEditModal;
window.fetchBackups = fetchBackups;
window.createBackup = createBackup;
window.restoreBackup = restoreBackup;
window.startDeleteAccount = startDeleteAccount;

// =====================
// INITIALIZATION
// =====================
document.addEventListener('DOMContentLoaded', function () {
    console.log('Sayfa hazır, uygulama başlatılıyor...');
    initApp();
});

function initApp() {
    // Theme Init
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark');
    }

    // Converter Defaults
    const convFrom = document.getElementById('converterFrom');
    const convTo = document.getElementById('converterTo');
    if (convFrom && convTo) {
        convFrom.value = 'USD';
        convTo.value = 'TRY';
    }

    // Load Data
    fetchAssets();
    fetchTransactions();
    fetchExchangeRates(); // Güncel döviz kurlarını al

    // YENİ VARLIK EKLE BUTONU
    const addAssetBtn = document.getElementById('addAssetBtn');
    if (addAssetBtn) {
        addAssetBtn.addEventListener('click', function() {
            toggleModal('addAssetModal');
        });
    }

    // TEMİZLE BUTONU
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', confirmClearAll);
    }

    // TEMA BUTONU
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
            toggleTheme();
        });
    }

    // FİYAT GÜNCELLEME BUTONU
    const refreshBtn = document.getElementById('refreshPricesBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshPrices();
        });
    }

    // TAB BUTONLARI
    const tabPortfolio = document.getElementById('tabPortfolio');
    const tabHistory = document.getElementById('tabHistory');
    if (tabPortfolio) {
        tabPortfolio.addEventListener('click', function() { switchTab('portfolio'); });
    }
    if (tabHistory) {
        tabHistory.addEventListener('click', function() { switchTab('history'); });
    }

    // FİLTRE BUTONLARI
    const filterAll = document.getElementById('filterAll');
    const filterCrypto = document.getElementById('filterCrypto');
    const filterStock = document.getElementById('filterStock');
    const filterGold = document.getElementById('filterGold');
    const filterCurrency = document.getElementById('filterCurrency');
    
    if (filterAll) filterAll.addEventListener('click', function() { filterByType('all'); });
    if (filterCrypto) filterCrypto.addEventListener('click', function() { filterByType('crypto'); });
    if (filterStock) filterStock.addEventListener('click', function() { filterByType('stock'); });
    if (filterGold) filterGold.addEventListener('click', function() { filterByType('gold'); });
    if (filterCurrency) filterCurrency.addEventListener('click', function() { filterByType('currency'); });

    // DÖVİZ ÇEVİRİCİ TETİKLEYİCİLERİ
    ['converterInput', 'converterFrom', 'converterTo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', convertCurrency);
            el.addEventListener('change', convertCurrency);
        }
    });

    // İlk döviz çevirme hesaplaması
    convertCurrency();

    // MODAL KAPATMA BUTONLARI (data-modal attribute ile)
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            if (modalId) toggleModal(modalId);
        });
    });

    // MODAL BACKDROP KAPATMA (data-modal attribute ile)
    document.querySelectorAll('.modal-close-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            if (modalId) toggleModal(modalId);
        });
    });

    // ALERT MODAL BUTONLARI
    const alertCancelBtn = document.getElementById('alertCancelBtn');
    const alertCreateBtn = document.getElementById('alertCreateBtn');
    if (alertCancelBtn) {
        alertCancelBtn.addEventListener('click', function() {
            if (typeof closeAlertModal === 'function') closeAlertModal();
        });
    }
    if (alertCreateBtn) {
        alertCreateBtn.addEventListener('click', function() {
            if (typeof createAlert === 'function') createAlert();
        });
    }

    // BİLDİRİM BANNER KAPATMA
    const closeNotificationBannerBtn = document.getElementById('closeNotificationBannerBtn');
    if (closeNotificationBannerBtn) {
        closeNotificationBannerBtn.addEventListener('click', function() {
            const banner = document.getElementById('notificationBanner');
            if (banner) banner.classList.add('hidden');
        });
    }

    // PWA UPDATE KAPATMA
    const closePwaUpdateBtn = document.getElementById('closePwaUpdateBtn');
    if (closePwaUpdateBtn) {
        closePwaUpdateBtn.addEventListener('click', function() {
            const notification = document.getElementById('pwaUpdateNotification');
            if (notification) notification.classList.add('translate-y-full');
        });
    }

    // FORM SUBMIT HANDLER'LARI
    const addAssetForm = document.getElementById('addAssetForm');
    if (addAssetForm) {
        addAssetForm.addEventListener('submit', handleAddAsset);
    }

    const sellAssetForm = document.getElementById('sellAssetForm');
    if (sellAssetForm) {
        sellAssetForm.addEventListener('submit', handleSellAsset);
    }

    const buyAssetForm = document.getElementById('buyAssetForm');
    if (buyAssetForm) {
        buyAssetForm.addEventListener('submit', handleBuyAsset);
    }

    const editAssetForm = document.getElementById('editAssetForm');
    if (editAssetForm) {
        editAssetForm.addEventListener('submit', handleEditAsset);
    }

    // PRESET ASSET SELECT
    const presetAssetSelect = document.getElementById('presetAssetSelect');
    if (presetAssetSelect) {
        presetAssetSelect.addEventListener('change', fillAssetFromPreset);
    }

    // Socket Init
    try {
        socket = io();
        setupSocketListeners();
    } catch (e) {
        console.error("Socket init error:", e);
    }
    
    console.log('Uygulama başlatıldı!');
}
