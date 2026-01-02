
(function () {
    'use strict';

    // =====================
    // GLOBAL STATE
    // =====================
    let assets = [];
    let transactions = [];
    let selectedAssetId = null;
    let portfolioChart = null;
    let typeChart = null;
    let currentTab = 'portfolio';
    const API_BASE = '/api/v1';

    // =====================
    // TOAST NOTIFICATION SYSTEM
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
        <button onclick="this.parentElement.remove()" class="opacity-70 hover:opacity-100 transition">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // =====================
    // LOADING OVERLAY
    // =====================
    function showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('hidden');
    }

    function hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('hidden');
    }

    // =====================
    // INPUT VALIDATION
    // =====================
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

    // =====================
    // TAB KONTROLÜ
    // =====================
    function switchTab(tab) {
        currentTab = tab;
        const portfolioTab = document.getElementById('portfolioTab');
        const historyTab = document.getElementById('historyTab');
        const reportsTab = document.getElementById('reportsTab');
        const securityTab = document.getElementById('securityTab');

        const tabPortfolio = document.getElementById('tabPortfolio');
        const tabHistory = document.getElementById('tabHistory');
        const tabReports = document.getElementById('tabReports');
        const tabSecurity = document.getElementById('tabSecurity');
        const filterSection = document.getElementById('filterSection');

        // Hide all tabs
        portfolioTab.classList.add('hidden');
        historyTab.classList.add('hidden');
        if (reportsTab) reportsTab.classList.add('hidden');
        if (securityTab) securityTab.classList.add('hidden');

        // Reset all tab buttons
        const inactiveClass = 'tab-btn px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap';
        const activeClass = 'tab-btn px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 bg-blue-600 text-white whitespace-nowrap';

        tabPortfolio.className = inactiveClass;
        tabHistory.className = inactiveClass;
        if (tabReports) tabReports.className = inactiveClass;
        if (tabSecurity) tabSecurity.className = inactiveClass;

        if (tab === 'portfolio') {
            portfolioTab.classList.remove('hidden');
            filterSection.classList.remove('hidden');
            tabPortfolio.className = activeClass;
        } else if (tab === 'history') {
            historyTab.classList.remove('hidden');
            filterSection.classList.add('hidden');
            tabHistory.className = activeClass;
            fetchTransactions();
        } else if (tab === 'reports') {
            if (reportsTab) reportsTab.classList.remove('hidden');
            filterSection.classList.add('hidden');
            if (tabReports) tabReports.className = activeClass;
            loadReports();
        } else if (tab === 'security') {
            if (securityTab) securityTab.classList.remove('hidden');
            filterSection.classList.add('hidden');
            if (tabSecurity) tabSecurity.className = activeClass;
            fetchBackups();
        }
    }

    function filterByType(type) {
        currentFilter = type;

        // Update filter button styles
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

    // =====================
    // HAZIR VARLIK SEÇİMİ
    // =====================
    function fillAssetFromPreset() {
        const select = document.getElementById('presetAssetSelect');
        if (!select || !select.value) return;

        const [type, name, symbol] = select.value.split('|');

        // Tür mapping
        const typeMap = {
            'crypto': 'Kripto Para',
            'stock': 'Hisse Senedi',
            'gold': 'Altın',
            'currency': 'Döviz'
        };

        document.getElementById('addAssetType').value = typeMap[type] || 'Kripto Para';
        document.getElementById('addAssetName').value = name;
        document.getElementById('addAssetSymbol').value = symbol;
    }

    // =====================
    // DÖVİZ ÇEVİRİCİ
    // =====================
    const exchangeRates = {
        USD: { TRY: 35.20, EUR: 0.92 },
        TRY: { USD: 0.0284, EUR: 0.0261 },
        EUR: { TRY: 38.26, USD: 1.09 }
    };

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
    // MINI DASHBOARD
    // =====================
    function updateMiniDashboard() {
        const topGainerEl = document.getElementById('topGainer');
        const topGainerProfitEl = document.getElementById('topGainerProfit');
        const topLoserEl = document.getElementById('topLoser');
        const topLoserLossEl = document.getElementById('topLoserLoss');

        if (!topGainerEl || !topLoserEl) return;

        if (assets.length === 0) {
            topGainerEl.textContent = '-';
            topGainerProfitEl.textContent = '₺0 (+0%)';
            topLoserEl.textContent = '-';
            topLoserLossEl.textContent = '₺0 (-0%)';
            return;
        }

        // En çok kazandıran
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
    }

    // =====================
    // API FONKSİYONLARI
    // 🚀 Portföy Verilerini Getir
    async function fetchAssets() {
        if (assets.length === 0) {
            showSkeleton('assetList', 'list');
        }
        try {
            const response = await fetch(`${API_URL}/assets`);
            if (!response.ok) throw new Error('Varlıklar yüklenemedi');
            assets = await response.json();
            renderAssets();
            renderPieChart();
            renderTypeChart();
            await updateCharts(); // History chart dahil tüm chart'ları güncelle
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
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
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
                <div class="mt-2 flex items-center justify-between text-xs">
                    <span class="text-gray-400 dark:text-gray-500">
                        <i class="fa-regular fa-clock mr-1"></i>${date}
                    </span>
                    <span class="font-medium text-gray-600 dark:text-gray-300">
                        Toplam: ${formatCurrency(tx.total, 'TRY')}
                    </span>
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
        // Check Offline first
        if (!navigator.onLine) {
            return await saveTransactionOffline(data);
        }

        try {
            showLoading();
            const response = await fetch(`${API_BASE}/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                await fetchAssets();
                showToast(`${data.name} başarıyla eklendi`, 'success');
                return true;
            } else {
                const error = await response.json();
                showToast(error.error || 'Varlık eklenemedi', 'error');
            }
        } catch (error) {
            console.error('Varlık eklenemedi:', error);

            // Fallback to offline save
            if (!navigator.onLine) {
                return await saveTransactionOffline(data);
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
            const response = await fetch(`${API_BASE}/assets/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchAssets();
                showToast(`${asset?.name || 'Varlık'} silindi`, 'success');
                return true;
            } else {
                showToast('Varlık silinemedi', 'error');
            }
        } catch (error) {
            console.error('Varlık silinemedi:', error);
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
            console.error('Alım eklenemedi:', error);
            showToast('Sunucu bağlantı hatası', 'error');
        } finally {
            hideLoading();
        }
        return false;
    }

    async function sellAsset(id, quantity, price) {
        if (!validatePositiveNumber(quantity, 'Miktar')) return false;
        if (!validatePositiveNumber(price, 'Fiyat')) return false;

        const asset = assets.find(a => a.id === id);
        if (asset && quantity > asset.quantity) {
            showToast(`Yetersiz miktar! Mevcut: ${asset.quantity}`, 'error');
            return false;
        }

        try {
            showLoading();
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
            console.error('Satış işlemi başarısız:', error);
            showToast('Sunucu bağlantı hatası', 'error');
        } finally {
            hideLoading();
        }
        return false;
    }

    async function updateAsset(id, data) {
        try {
            showLoading();
            const asset = assets.find(a => a.id === id);
            const response = await fetch(`${API_BASE}/assets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                await fetchAssets();
                showToast(`${asset?.name || 'Varlık'} güncellendi`, 'success');
                return true;
            } else {
                showToast('Varlık güncellenemedi', 'error');
            }
        } catch (error) {
            console.error('Varlık güncellenemedi:', error);
            showToast('Sunucu bağlantı hatası', 'error');
        } finally {
            hideLoading();
        }
        return false;
    }

    async function refreshPrices() {
        const btn = document.getElementById('refreshPricesBtn');
        const icon = document.getElementById('refreshIcon');

        // Butonu disable et ve animasyon başlat
        if (btn) btn.disabled = true;
        if (icon) icon.classList.add('animate-spin');

        showToast('Fiyatlar güncelleniyor...', 'info', 2000);

        try {
            const response = await fetch(`${API_BASE}/prices/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();

            if (response.ok) {
                // Varlıkları yeniden yükle
                await fetchAssets();

                // Sonuç mesajı göster
                showToast(`${result.updated} varlık güncellendi`, 'success');
                if (result.skipped > 0) {
                    showToast(`${result.skipped} varlık atlandı`, 'warning', 4000);
                }
            } else {
                showToast(result.error || 'Fiyat güncellemesi başarısız', 'error');
            }
        } catch (error) {
            console.error('Fiyat güncelleme hatası:', error);
            showToast('Sunucu bağlantı hatası', 'error');
        } finally {
            // Butonu tekrar aktif et
            if (btn) btn.disabled = false;
            if (icon) icon.classList.remove('animate-spin');
        }
    }

    // =====================
    // RENDER FONKSİYONLARI
    // =====================

    // Pasta Grafik Render
    function renderPieChart() {
        const ctx = document.getElementById('portfolioChart');
        const emptyState = document.getElementById('chartEmptyState');
        const legendContainer = document.getElementById('chartLegend');

        if (!ctx) return;

        // Varlık yoksa boş state göster
        if (assets.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            if (legendContainer) legendContainer.innerHTML = '';
            if (portfolioChart) {
                portfolioChart.destroy();
                portfolioChart = null;
            }
            // =====================
            // CHARTS
            // =====================
            let historyChart = null; // Global variable for history chart

            async function updateCharts() {
                if (assets.length === 0) return;

                // 1. Distribution Chart (Mevcut)
                renderDistributionChart();

                // 2. History Chart (Yeni)
                await renderHistoryChart();
            }

            function renderDistributionChart() {
                const ctx = document.getElementById('typeChart')?.getContext('2d');
                if (!ctx) return; // ID değişmiş olabilir, kontrol et

                // ... (Mevcut dağılım grafiği mantığı buraya taşınabilir veya ayrı tutulabilir)
                // Şimdilik mevcut yapıyı koruyalım, sadece history chart ekleyelim
            }

            async function renderHistoryChart() {
                const ctx = document.getElementById('historyChart')?.getContext('2d');
                const emptyState = document.getElementById('historyChartEmptyState');

                if (!ctx) return;

                try {
                    const response = await fetch(`${API_BASE}/reports/history`);
                    const historyData = await response.json();

                    // Empty state kontrolü
                    if (!historyData || historyData.length === 0) {
                        if (emptyState) emptyState.style.display = 'flex';
                        if (historyChart) {
                            historyChart.destroy();
                            historyChart = null;
                        }
                        return;
                    }

                    // Empty state'i gizle
                    if (emptyState) emptyState.style.display = 'none';

                    // Verileri hazırla
                    const labels = historyData.map(d => new Date(d.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
                    const investedValues = historyData.map(d => d.investedValue);
                    const totalValues = historyData.map(d => d.value);

                    // Chart oluştur veya güncelle
                    if (historyChart) {
                        historyChart.destroy();
                    }

                    historyChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [
                                {
                                    label: 'Toplam Değer',
                                    data: totalValues,
                                    borderColor: 'rgba(34, 197, 94, 1)', // Green
                                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                    borderWidth: 2,
                                    fill: true,
                                    tension: 0.4
                                },
                                {
                                    label: 'Net Yatırım',
                                    data: investedValues,
                                    borderColor: 'rgba(59, 130, 246, 1)', // Blue
                                    backgroundColor: 'rgba(59, 130, 246, 0.0)',
                                    borderWidth: 2,
                                    borderDash: [5, 5],
                                    fill: false,
                                    tension: 0.4
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'top',
                                    labels: {
                                        usePointStyle: true,
                                        color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
                                    }
                                },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    callbacks: {
                                        label: function (context) {
                                            let label = context.dataset.label || '';
                                            if (label) {
                                                label += ': ';
                                            }
                                            if (context.parsed.y !== null) {
                                                label += formatCurrency(context.parsed.y);
                                            }
                                            return label;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    grid: { display: false },
                                    ticks: {
                                        color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
                                    }
                                },
                                y: {
                                    beginAtZero: true,
                                    grid: {
                                        color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
                                    },
                                    ticks: {
                                        color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
                                        callback: function (value) {
                                            return formatCurrency(value, 'TRY', true); // Compact format
                                        }
                                    }
                                }
                            },
                            interaction: {
                                mode: 'nearest',
                                axis: 'x',
                                intersect: false
                            }
                        }
                    });

                } catch (error) {
                    console.error('Geçmiş grafiği hatası:', error);
                    if (emptyState) emptyState.style.display = 'flex';
                    if (historyChart) {
                        historyChart.destroy();
                        historyChart = null;
                    }
                }
            }

            // Tür Ağırlık Grafiği Render
            function renderTypeChart() {
                const ctx = document.getElementById('typeChart');
                const emptyState = document.getElementById('typeChartEmptyState');
                const legendContainer = document.getElementById('typeLegend');

                if (!ctx) return;

                // Varlık yoksa boş state göster
                if (assets.length === 0) {
                    if (emptyState) emptyState.style.display = 'flex';
                    if (legendContainer) legendContainer.innerHTML = '';
                    if (typeChart) {
                        typeChart.destroy();
                        typeChart = null;
                    }
                    return;
                }

                // Boş state'i gizle
                if (emptyState) emptyState.style.display = 'none';

                // Türe göre grupla
                const typeData = {};
                let totalValue = 0;

                assets.forEach(asset => {
                    const value = asset.quantity * asset.current_price;
                    totalValue += value;
                    if (!typeData[asset.type]) {
                        typeData[asset.type] = 0;
                    }
                    typeData[asset.type] += value;
                });

                const types = Object.keys(typeData);
                const values = types.map(t => typeData[t]);
                const percentages = values.map(v => totalValue > 0 ? ((v / totalValue) * 100).toFixed(1) : 0);
                const colors = types.map(t => typeColors[t]?.color || '#64748b');
                const labels = types.map(t => typeColors[t]?.label || t);

                // Önceki grafiği temizle
                if (typeChart) {
                    typeChart.destroy();
                }

                const isDark = document.documentElement.classList.contains('dark');

                // Yeni grafik oluştur
                typeChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: values,
                            backgroundColor: colors,
                            borderColor: isDark ? '#1f2937' : '#ffffff',
                            borderWidth: 3,
                            hoverBorderWidth: 0,
                            hoverOffset: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        cutout: '65%',
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: isDark ? '#374151' : '#1f2937',
                                titleColor: '#fff',
                                bodyColor: '#fff',
                                padding: 12,
                                cornerRadius: 8,
                                callbacks: {
                                    label: function (context) {
                                        const value = context.raw;
                                        const percent = percentages[context.dataIndex];
                                        return ` ${formatCurrency(value, 'TRY')} (${percent}%)`;
                                    }
                                }
                            }
                        },
                        animation: { animateRotate: true, animateScale: true }
                    }
                });

                // Custom legend
                if (legendContainer) {
                    legendContainer.innerHTML = `
            <div class="grid grid-cols-2 gap-2">
                ${types.map((type, i) => {
                        const config = typeColors[type] || { label: type, icon: 'fa-solid fa-circle', color: '#64748b' };
                        return `
                        <div class="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background-color: ${config.color}20">
                                <i class="${config.icon} text-sm" style="color: ${config.color}"></i>
                            </div>
                            <div>
                                <div class="font-medium text-gray-800 dark:text-gray-200 text-xs">${config.label}</div>
                                <div class="text-xs font-bold" style="color: ${config.color}">${percentages[i]}%</div>
                            </div>
                        </div>
                    `;
                    }).join('')}
            </div>
        `;
                }
            }

            function formatCurrency(value, currency = 'TRY', compact = false) {
                if (compact && value >= 1000) {
                    // Compact format for large numbers
                    if (value >= 1000000) {
                        return (value / 1000000).toFixed(1) + 'M ₺';
                    } else if (value >= 1000) {
                        return (value / 1000).toFixed(1) + 'K ₺';
                    }
                }

                if (currency === 'TRY') {
                    return '₺ ' + value.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                } else if (currency === 'USD') {
                    return '$ ' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
                return value.toLocaleString('tr-TR');
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
                    const filterText = currentFilter === 'all' ? '' : ` (${currentFilter} filtresi uygulandı)`;
                    const emptyMsg = `
            <tr>
                <td colspan="6" class="p-8 text-center text-gray-500 dark:text-gray-400">
                    <i class="fa-solid fa-folder-open text-4xl mb-4 block opacity-50"></i>
                    <p>Varlık bulunamadı${filterText}</p>
                    <p class="text-sm">Yeni varlık eklemek için butona tıklayın</p>
                </td>
            </tr>
        `;
                    desktopBody.innerHTML = emptyMsg;
                    mobileList.innerHTML = `
            <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                <i class="fa-solid fa-folder-open text-4xl mb-4 block opacity-50"></i>
                <p>Varlık bulunamadı${filterText}</p>
            </div>
        `;
                    return;
                }

                // Desktop render
                desktopBody.innerHTML = filteredAssets.map(asset => {
                    const iconCfg = getIconConfig(asset.type);
                    const isProfit = asset.profit_loss >= 0;
                    const profitClass = isProfit
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
                    const profitSign = isProfit ? '+' : '';

                    return `
            <tr class="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition duration-200">
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-${iconCfg.bg}-100 dark:bg-${iconCfg.bg}-900/30 text-${iconCfg.bg}-500 dark:text-${iconCfg.bg}-400 flex items-center justify-center text-lg shadow-sm">
                            <i class="${asset.icon || iconCfg.icon}"></i>
                        </div>
                        <div>
                            <div class="font-bold text-gray-800 dark:text-gray-100">${asset.name}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">${asset.symbol}</div>
                        </div>
                    </div>
                </td>
                <td class="p-4 text-right font-medium text-gray-700 dark:text-gray-300">${asset.quantity} ${asset.symbol}</td>
                <td class="p-4 text-right text-gray-500 dark:text-gray-400">${formatCurrency(asset.avg_cost, asset.currency)}</td>
                <td class="p-4 text-right font-semibold text-gray-800 dark:text-gray-200">${formatCurrency(asset.current_price, asset.currency)}</td>
                <td class="p-4 text-right">
                    <span class="${profitClass} px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                        ${profitSign} ${formatCurrency(Math.abs(asset.profit_loss || 0), asset.currency)}
                    </span>
                </td>
                <td class="p-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button onclick="openAlertModal('${asset.symbol}', ${asset.current_price})" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition" title="Alarm Kur">
                            <i class="fa-regular fa-bell"></i>
                        </button>
                        <button onclick="openEditModal(${asset.id})" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="confirmDelete(${asset.id})" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
                }).join('');

                // Mobile render
                mobileList.innerHTML = filteredAssets.map(asset => {
                    const iconCfg = getIconConfig(asset.type);
                    const isProfit = asset.profit_loss >= 0;
                    const profitClass = isProfit
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
                    const profitSign = isProfit ? '+' : '';

                    return `
            <div class="p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-${iconCfg.bg}-100 dark:bg-${iconCfg.bg}-900/30 text-${iconCfg.bg}-500 dark:text-${iconCfg.bg}-400 flex items-center justify-center text-lg shadow-sm">
                            <i class="${asset.icon || iconCfg.icon}"></i>
                        </div>
                        <div>
                            <div class="font-bold text-gray-800 dark:text-gray-100">${asset.name}</div>
                            <div class="text-xs text-gray-400 dark:text-gray-500">${asset.quantity} ${asset.symbol}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="${profitClass} px-2 py-1 rounded text-xs font-bold">
                            ${profitSign} ${formatCurrency(Math.abs(asset.profit_loss || 0), asset.currency)}
                        </span>
                        <div class="flex items-center">
                            <button onclick="openBuyModal(${asset.id})" class="text-blue-500 p-2"><i class="fa-solid fa-circle-plus text-lg"></i></button>
                            <button onclick="openSellModal(${asset.id})" class="text-orange-500 p-2"><i class="fa-solid fa-circle-minus text-lg"></i></button>
                            <button onclick="openEditModal(${asset.id})" class="text-emerald-500 p-2"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button onclick="confirmDelete(${asset.id})" class="text-gray-300 dark:text-gray-600 p-2"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div class="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-100 dark:border-gray-600">
                        <div class="text-xs text-gray-400">Ort. Alış</div>
                        <div class="font-medium text-gray-600 dark:text-gray-300">${formatCurrency(asset.avg_cost, asset.currency)}</div>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-100 dark:border-gray-600">
                        <div class="text-xs text-gray-400">Güncel</div>
                        <div class="font-semibold text-gray-800 dark:text-gray-200">${formatCurrency(asset.current_price, asset.currency)}</div>
                    </div>
                </div>
            </div>
        `;
                }).join('');
            }

            async function updateSummary() {
                const summary = await fetchSummary();
                if (!summary) return;

                const totalValueEl = document.getElementById('totalValue');
                const totalProfitEl = document.getElementById('totalProfit');
                const totalProfitPercentEl = document.getElementById('totalProfitPercent');
                const realizedProfitEl = document.getElementById('realizedProfit');
                const totalOverallProfitEl = document.getElementById('totalOverallProfit');
                const bottomTotalEl = document.getElementById('bottomTotalProfit');
                const desktopTotalEl = document.getElementById('desktopTotalProfit');

                if (totalValueEl) {
                    const formatted = formatCurrency(summary.total_value, 'TRY').split(',');
                    totalValueEl.innerHTML = `${formatted[0]}<span class="text-2xl opacity-60">,${formatted[1] || '00'}</span>`;
                }

                // Gerçekleşmemiş kar/zarar
                const unrealizedProfit = summary.total_unrealized_profit || 0;
                const isUnrealizedProfit = unrealizedProfit >= 0;
                const unrealizedSign = isUnrealizedProfit ? '+' : '';
                const unrealizedText = `${unrealizedSign} ${formatCurrency(Math.abs(unrealizedProfit), 'TRY')}`;
                const percentText = `%${Math.abs(summary.total_profit_loss_percent || 0).toFixed(1)}`;

                if (totalProfitEl) {
                    totalProfitEl.textContent = unrealizedText;
                    totalProfitEl.className = `text-2xl font-bold ${isUnrealizedProfit ? 'text-green-300' : 'text-red-300'} flex items-center gap-2`;
                }

                if (totalProfitPercentEl) {
                    totalProfitPercentEl.textContent = percentText;
                }

                // Gerçekleşmiş kar
                const realizedProfit = summary.total_realized_profit || 0;
                const isRealizedProfit = realizedProfit >= 0;
                const realizedSign = isRealizedProfit ? '+' : '';

                if (realizedProfitEl) {
                    realizedProfitEl.innerHTML = `
            <i class="fa-solid fa-check-circle text-sm"></i>
            ${realizedSign} ${formatCurrency(Math.abs(realizedProfit), 'TRY')}
        `;
                    realizedProfitEl.className = `text-xl font-bold ${isRealizedProfit ? 'text-emerald-300' : 'text-red-300'} flex items-center gap-2`;
                }

                // Toplam kar (gerçekleşmiş + gerçekleşmemiş)
                const totalProfit = unrealizedProfit + realizedProfit;
                const isTotalProfit = totalProfit >= 0;
                const totalSign = isTotalProfit ? '+' : '';

                if (totalOverallProfitEl) {
                    totalOverallProfitEl.innerHTML = `
            <i class="fa-solid fa-coins text-sm"></i>
            ${totalSign} ${formatCurrency(Math.abs(totalProfit), 'TRY')}
        `;
                    totalOverallProfitEl.className = `text-xl font-bold ${isTotalProfit ? 'text-yellow-300' : 'text-red-300'} flex items-center gap-2`;
                }

                if (bottomTotalEl) {
                    bottomTotalEl.textContent = `${totalSign} ${formatCurrency(Math.abs(totalProfit), 'TRY')}`;
                    bottomTotalEl.className = `text-xl font-bold ${isTotalProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`;
                }

                if (desktopTotalEl) {
                    desktopTotalEl.innerHTML = `${totalSign} ${formatCurrency(Math.abs(totalProfit), 'TRY')}`;
                    desktopTotalEl.className = `text-3xl font-bold ${isTotalProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} tracking-tight mt-1`;
                }
            }

            // =====================
            // MODAL İŞLEMLERİ
            // =====================
            function openBuyModal(assetId) {
                selectedAssetId = assetId;
                const asset = assets.find(a => a.id === assetId);
                if (asset) {
                    document.getElementById('buyAssetName').textContent = asset.name;
                }
                toggleModal('buyAssetModal');
            }

            function openSellModal(assetId) {
                selectedAssetId = assetId;
                const asset = assets.find(a => a.id === assetId);
                if (asset) {
                    document.getElementById('sellAssetName').textContent = asset.name;
                    document.getElementById('sellMaxQuantity').textContent = `Mevcut: ${asset.quantity} ${asset.symbol}`;
                }
                toggleModal('sellAssetModal');
            }

            function confirmDelete(assetId) {
                if (confirm('Bu varlığı silmek istediğinize emin misiniz?')) {
                    deleteAsset(assetId);
                }
            }

            async function confirmClearAll() {
                if (confirm('⚠️ TÜM KAYITLAR SİLİNECEK!\n\nBu işlem geri alınamaz. Tüm varlıklar ve işlem geçmişi silinecektir.\n\nDevam etmek istiyor musunuz?')) {
                    try {
                        showLoading();
                        const response = await fetch(`${API_BASE}/clear`, { method: 'DELETE' });
                        if (response.ok) {
                            await fetchAssets();
                            showToast('Tüm veriler temizlendi', 'success');
                        } else {
                            showToast('Veriler temizlenirken hata oluştu', 'error');
                        }
                    } catch (error) {
                        console.error('Temizleme hatası:', error);
                        showToast('Sunucu bağlantı hatası', 'error');
                    } finally {
                        hideLoading();
                    }
                }
            }

            function openEditModal(assetId) {
                selectedAssetId = assetId;
                const asset = assets.find(a => a.id === assetId);
                if (asset) {
                    document.getElementById('editAssetName').textContent = `${asset.name} (${asset.symbol})`;
                    document.getElementById('editQuantity').value = asset.quantity;
                    document.getElementById('editAvgCost').value = asset.avg_cost;
                    document.getElementById('editCurrentPrice').value = asset.current_price;
                }
                toggleModal('editAssetModal');
            }

            async function handleEditAsset(event) {
                event.preventDefault();
                const form = event.target;
                const quantity = parseFloat(form.querySelector('[name="quantity"]').value);
                const avg_cost = parseFloat(form.querySelector('[name="avg_cost"]').value);
                const current_price = parseFloat(form.querySelector('[name="current_price"]').value);

                // Validasyon
                if (!validatePositiveNumber(quantity, 'Miktar')) return;
                if (avg_cost < 0) {
                    showToast('Ortalama alış fiyatı negatif olamaz', 'error');
                    return;
                }
                if (current_price < 0) {
                    showToast('Güncel fiyat negatif olamaz', 'error');
                    return;
                }

                if (selectedAssetId) {
                    const success = await updateAsset(selectedAssetId, {
                        quantity,
                        avg_cost,
                        current_price
                    });
                    if (success) {
                        form.reset();
                        toggleModal('editAssetModal');
                    }
                }
            }

            // Form submit handlers
            async function handleAddAsset(event) {
                event.preventDefault();
                const form = event.target;
                const formData = new FormData(form);

                const typeMap = {
                    'Kripto Para': 'crypto',
                    'Hisse Senedi': 'stock',
                    'Altın': 'gold',
                    'Döviz': 'currency'
                };

                const quantity = parseFloat(formData.get('quantity')) || 0;
                const avgCost = parseFloat(formData.get('avg_cost')) || 0;

                // Validasyon
                if (!validatePositiveNumber(quantity, 'Miktar')) return;
                if (!validatePositiveNumber(avgCost, 'Alış Fiyatı')) return;

                const data = {
                    name: formData.get('name'),
                    symbol: formData.get('symbol'),
                    type: typeMap[formData.get('type')] || 'stock',
                    quantity: quantity,
                    avg_cost: avgCost,
                    current_price: avgCost, // Başlangıçta alış fiyatı ile aynı
                    currency: formData.get('currency') || 'TRY'
                };

                const success = await createAsset(data);
                if (success) {
                    form.reset();
                    document.getElementById('presetAssetSelect').value = '';
                    toggleModal('addAssetModal');
                }
            }

            async function handleBuyAsset(event) {
                event.preventDefault();
                const form = event.target;
                const quantity = parseFloat(form.querySelector('[name="quantity"]').value);
                const price = parseFloat(form.querySelector('[name="price"]').value);

                if (selectedAssetId && quantity && price) {
                    const success = await buyAsset(selectedAssetId, quantity, price);
                    if (success) {
                        form.reset();
                        toggleModal('buyAssetModal');
                    }
                }
            }

            async function handleSellAsset(event) {
                event.preventDefault();
                const form = event.target;
                const quantity = parseFloat(form.querySelector('[name="quantity"]').value);
                const price = parseFloat(form.querySelector('[name="price"]').value);

                if (selectedAssetId && quantity && price) {
                    const success = await sellAsset(selectedAssetId, quantity, price);
                    if (success) {
                        form.reset();
                        toggleModal('sellAssetModal');
                    }
                }
            }

            // =====================
            // DARK MODE
            // =====================
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }

            function toggleTheme() {
                if (document.documentElement.classList.contains('dark')) {
                    document.documentElement.classList.remove('dark');
                    localStorage.theme = 'light';
                } else {
                    document.documentElement.classList.add('dark');
                    localStorage.theme = 'dark';
                }
            }

            // =====================
            // MODAL LOGIC
            // =====================
            function toggleModal(modalId) {
                const modal = document.getElementById(modalId);
                const backdrop = modal.querySelector('.modal-backdrop');
                const panel = modal.querySelector('.modal-panel');

                if (modal.classList.contains('hidden')) {
                    modal.classList.remove('hidden');
                    setTimeout(() => {
                        backdrop.classList.remove('opacity-0');
                        panel.classList.remove('opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');
                        panel.classList.add('translate-y-0', 'sm:scale-100');
                    }, 10);
                } else {
                    backdrop.classList.add('opacity-0');
                    panel.classList.add('opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');
                    panel.classList.remove('translate-y-0', 'sm:scale-100');
                    setTimeout(() => {
                        modal.classList.add('hidden');
                    }, 300);
                }
            }

            // =====================
            // EXPORT/IMPORT FUNCTIONS
            // =====================

            // Export menu toggle
            function toggleExportMenu() {
                const menu = document.getElementById('exportMenu');
                menu.classList.toggle('hidden');
            }

            // Close export menu when clicking outside
            document.addEventListener('click', (e) => {
                const dropdown = document.getElementById('exportDropdown');
                if (dropdown && !dropdown.contains(e.target)) {
                    document.getElementById('exportMenu').classList.add('hidden');
                }
            });

            // Export data function
            async function exportData(type, format) {
                try {
                    showLoading();
                    const response = await fetch(`/api/export/${type}?format=${format}`);

                    if (!response.ok) {
                        throw new Error('Export başarısız');
                    }

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${type}-${new Date().toISOString().split('T')[0]}.${format}`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);

                    showToast(`${type} başarıyla export edildi (${format.toUpperCase()})`, 'success');
                    document.getElementById('exportMenu').classList.add('hidden');
                } catch (error) {
                    showToast('Export hatası: ' + error.message, 'error');
                } finally {
                    hideLoading();
                }
            }

            // Import data function
            async function importAssets() {
                const fileInput = document.getElementById('importFile');
                const formatSelect = document.getElementById('importFormat');

                if (!fileInput.files[0]) {
                    showToast('Lütfen bir dosya seçin', 'error');
                    return;
                }

                try {
                    showLoading();
                    const file = fileInput.files[0];
                    const format = formatSelect.value;
                    const text = await file.text();

                    const response = await fetch('/api/import/assets', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ data: text, format })
                    });

                    const result = await response.json();

                    if (result.success) {
                        showToast(`✅ ${result.imported} varlık import edildi, ${result.errors} hata`, 'success');
                        toggleModal('importModal');
                        fetchAssets();
                        fileInput.value = '';
                    } else {
                        showToast('Import başarısız', 'error');
                    }
                } catch (error) {
                    showToast('Import hatası: ' + error.message, 'error');
                } finally {
                    hideLoading();
                }
            }

            // =====================
            // REPORTS FUNCTIONS
            // =====================

            async function loadReports() {
                try {
                    showLoading();

                    // Load all reports in parallel
                    const [monthly, performance, distribution, risk, topPerformers] = await Promise.all([
                        fetch('/api/reports/monthly').then(r => r.json()),
                        fetch('/api/reports/performance').then(r => r.json()),
                        fetch('/api/reports/distribution').then(r => r.json()),
                        fetch('/api/reports/risk').then(r => r.json()),
                        fetch('/api/reports/top-performers?limit=5').then(r => r.json())
                    ]);

                    renderMonthlyReport(monthly);
                    renderPerformanceReport(performance);
                    renderDistributionReport(distribution);
                    renderRiskAnalysis(risk);
                    renderTopPerformers(topPerformers);
                } catch (error) {
                    showToast('Raporlar yüklenemedi: ' + error.message, 'error');
                } finally {
                    hideLoading();
                }
            }

            function renderMonthlyReport(data) {
                const tbody = document.getElementById('monthlyReportBody');
                if (!tbody) return;

                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Henüz işlem yok</td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(month => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="p-3">${month.month}</td>
            <td class="p-3 text-right">${month.buyCount}</td>
            <td class="p-3 text-right">${formatCurrency(month.buyTotal)}</td>
            <td class="p-3 text-right">${month.sellCount}</td>
            <td class="p-3 text-right">${formatCurrency(month.sellTotal)}</td>
            <td class="p-3 text-right ${month.realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}">
                ${formatCurrency(month.realizedProfit)}
            </td>
        </tr>
    `).join('');
            }

            function renderPerformanceReport(data) {
                const tbody = document.getElementById('performanceReportBody');
                if (!tbody) return;

                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">Henüz varlık yok</td></tr>';
                    return;
                }

                tbody.innerHTML = data.slice(0, 10).map(asset => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="p-3">${asset.name} (${asset.symbol})</td>
            <td class="p-3 text-right">${formatCurrency(asset.costBasis)}</td>
            <td class="p-3 text-right">${formatCurrency(asset.currentValue)}</td>
            <td class="p-3 text-right ${asset.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}">
                ${formatCurrency(asset.profitLoss)}
            </td>
            <td class="p-3 text-right ${asset.profitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}">
                ${asset.profitLossPercent.toFixed(2)}%
            </td>
        </tr>
    `).join('');
            }

            function renderDistributionReport(data) {
                const container = document.getElementById('distributionReport');
                if (!container) return;

                if (data.length === 0) {
                    container.innerHTML = '<p class="text-center py-8 text-gray-500">Henüz varlık yok</p>';
                    return;
                }

                container.innerHTML = data.map(item => `
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
                <div class="font-medium capitalize">${item.type}</div>
                <div class="text-sm text-gray-500">${item.count} varlık</div>
            </div>
            <div class="text-right">
                <div class="font-semibold">${formatCurrency(item.totalValue)}</div>
                <div class="text-sm text-gray-500">${item.percentage.toFixed(1)}%</div>
            </div>
        </div>
    `).join('');
            }

            function renderRiskAnalysis(data) {
                const container = document.getElementById('riskAnalysis');
                if (!container) return;

                const scoreColor = data.diversification.score >= 70 ? 'text-green-600' :
                    data.diversification.score >= 40 ? 'text-yellow-600' : 'text-red-600';

                container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div class="text-sm text-gray-500 mb-1">Diversifikasyon Skoru</div>
                <div class="text-2xl font-bold ${scoreColor}">${data.diversification.score}/100</div>
                <div class="text-xs text-gray-500 mt-1">${data.diversification.assetCount} varlık, ${data.diversification.typeCount} tür</div>
            </div>
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div class="text-sm text-gray-500 mb-1">En Büyük Varlık</div>
                <div class="text-2xl font-bold">${data.concentration.topAssetPercentage.toFixed(1)}%</div>
                <div class="text-xs text-gray-500 mt-1">Portföy ağırlığı</div>
            </div>
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div class="text-sm text-gray-500 mb-1">Top 3 Konsantrasyon</div>
                <div class="text-2xl font-bold">${data.concentration.top3Percentage.toFixed(1)}%</div>
                <div class="text-xs text-gray-500 mt-1">İlk 3 varlık</div>
            </div>
        </div>
    `;
            }

            function renderTopPerformers(data) {
                const gainersContainer = document.getElementById('topGainers');
                const losersContainer = document.getElementById('topLosers');

                if (!gainersContainer || !losersContainer) return;

                if (data.topGainers.length === 0) {
                    gainersContainer.innerHTML = '<p class="text-center py-4 text-gray-500">Henüz kazanan yok</p>';
                } else {
                    gainersContainer.innerHTML = data.topGainers.map(asset => `
            <div class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                    <div class="font-medium">${asset.name}</div>
                    <div class="text-sm text-gray-500">${asset.symbol}</div>
                </div>
                <div class="text-right">
                    <div class="font-semibold text-green-600">${formatCurrency(asset.profitLoss)}</div>
                    <div class="text-sm text-green-600">+${asset.profitLossPercent.toFixed(2)}%</div>
                </div>
            </div>
        `).join('');
                }

                if (data.topLosers.length === 0) {
                    losersContainer.innerHTML = '<p class="text-center py-4 text-gray-500">Henüz kaybeden yok</p>';
                } else {
                    losersContainer.innerHTML = data.topLosers.map(asset => `
            <div class="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div>
                    <div class="font-medium">${asset.name}</div>
                    <div class="text-sm text-gray-500">${asset.symbol}</div>
                </div>
                <div class="text-right">
                    <div class="font-semibold text-red-600">${formatCurrency(asset.profitLoss)}</div>
                    <div class="text-sm text-red-600">${asset.profitLossPercent.toFixed(2)}%</div>
                </div>
            </div>
        `).join('');
                }
            }

            // =====================
            // PWA INSTALL PROMPT
            // =====================
            let deferredPrompt;

            // PWA install prompt event
            window.addEventListener('beforeinstallprompt', (e) => {
                console.log('💾 PWA: Install prompt available');
                e.preventDefault();
                deferredPrompt = e;

                // Show install button
                const installButton = document.getElementById('installButton');
                if (installButton) {
                    installButton.classList.remove('hidden');
                }
            });

            // Install button click handler
            document.addEventListener('DOMContentLoaded', () => {
                const installButton = document.getElementById('installButton');
                if (installButton) {
                    installButton.addEventListener('click', async () => {
                        if (deferredPrompt) {
                            deferredPrompt.prompt();
                            const { outcome } = await deferredPrompt.userChoice;

                            if (outcome === 'accepted') {
                                console.log('✅ PWA: User accepted install');
                                showToast('Uygulama yükleniyor...', 'success');
                            } else {
                                console.log('❌ PWA: User dismissed install');
                            }

                            deferredPrompt = null;
                            installButton.classList.add('hidden');
                        }
                    });
                }
            });

            // PWA installed event
            window.addEventListener('appinstalled', () => {
                console.log('✅ PWA: App installed successfully');
                showToast('Uygulama başarıyla yüklendi!', 'success');

                const installButton = document.getElementById('installButton');
                if (installButton) {
                    installButton.classList.add('hidden');
                }
            });

            // =====================
            // CONNECTION STATUS MANAGEMENT
            // =====================
            // =====================
            // CONNECTION STATUS MANAGEMENT
            // =====================
            function updateConnectionStatus(status, message) {
                const dot = document.getElementById('connectionDot');
                const text = document.getElementById('connectionText');

                if (!dot || !text) return;

                if (!navigator.onLine) {
                    dot.className = 'w-2 h-2 rounded-full bg-gray-400';
                    text.textContent = 'İnternet Yok (Offline)';
                    return;
                }

                switch (status) {
                    case 'connected':
                        dot.className = 'w-2 h-2 rounded-full bg-green-400';
                        text.textContent = 'Canlı';
                        break;
                    case 'disconnected':
                        dot.className = 'w-2 h-2 rounded-full bg-red-400';
                        text.textContent = 'Sunucu Bağlantısı Yok';
                        break;
                    case 'connecting':
                        dot.className = 'w-2 h-2 rounded-full bg-yellow-400 animate-pulse';
                        text.textContent = 'Bağlanıyor...';
                        break;
                    case 'error':
                        dot.className = 'w-2 h-2 rounded-full bg-orange-400 animate-pulse';
                        text.textContent = 'Hata';
                        break;
                }
            }

            // Global Network Status Listeners
            window.addEventListener('online', () => {
                // Socket reconnection handled in realtime.js
                showToast('İnternet bağlantısı sağlandı', 'success');
            });

            window.addEventListener('offline', () => {
                updateConnectionStatus('disconnected');
                showToast('İnternet bağlantısı kesildi', 'warning');
            });

            // =====================
            // INIT & SOCKET.IO - MOVED TO REALTIME.JS
            // =====================

            // =====================
            // INIT & SOCKET.IO - MOVED TO REALTIME.JS
            // =====================
            // Socket logic removed to prevent duplicate connections.
            // handled in public/js/realtime.js

            // =====================
            // PWA PHASE 2: MOBILE UX & UPDATE
            // =====================

            // Haptic Feedback Helper
            function triggerHaptic(duration = 50) {
                if (navigator.vibrate) {
                    navigator.vibrate(duration);
                }
            }

            // Pull-to-Refresh Logic
            let touchStartY = 0;
            let pwaUpdateNotification = document.getElementById('pwaUpdateNotification');
            let pwaUpdateBtn = document.getElementById('pwaUpdateBtn');

            document.addEventListener('touchstart', (e) => {
                if (window.scrollY === 0) {
                    touchStartY = e.touches[0].clientY;
                }
            }, { passive: true });

            document.addEventListener('touchend', async (e) => {
                if (window.scrollY === 0 && touchStartY > 0) {
                    const touchEndY = e.changedTouches[0].clientY;
                    const distance = touchEndY - touchStartY;

                    // Threshold for refresh (e.g., 150px drag down)
                    if (distance > 150) {
                        triggerHaptic(70);
                        showToast('Yenileniyor...', 'info');

                        try {
                            await fetchAssets();
                            await updateCharts();
                            triggerHaptic(50);
                            showToast('Veriler güncellendi', 'success');
                        } catch (error) {
                            showToast('Yenileme hatası', 'error');
                        }
                    }
                    touchStartY = 0;
                }
            }, { passive: true });


            // Service Worker Update Check
            window.addEventListener('load', () => {
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.register('/sw.js').then(registration => {

                        // Check if there is an update waiting
                        if (registration.waiting) {
                            showUpdateNotification(registration);
                        }

                        // Check whenever a new SW is found
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    showUpdateNotification(registration);
                                }
                            });
                        });
                    });
                }
            });

            function showUpdateNotification(registration) {
                if (pwaUpdateNotification) {
                    pwaUpdateNotification.classList.remove('hidden', 'translate-y-full');
                    triggerHaptic([50, 50, 50]); // Double vibe

                    if (pwaUpdateBtn) {
                        pwaUpdateBtn.onclick = () => {
                            if (registration.waiting) {
                                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                                pwaUpdateNotification.classList.add('hidden');
                                window.location.reload();
                            }
                        };
                    }
                }
            }

            // Handle controller change (reload page when new SW takes over)
            let refreshing;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                window.location.reload();
                refreshing = true;
            });

            // Initialize
            document.addEventListener('DOMContentLoaded', () => {
                fetchAssets();
                checkNotificationPermission();
            });

            // =====================
            // PWA PHASE 3 & 4: HELPER FUNCTIONS
            // =====================

            // 1. Notification Permission
            const notificationBanner = document.getElementById('notificationBanner');
            const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');

            function checkNotificationPermission() {
                if ('Notification' in window && Notification.permission === 'default') {
                    setTimeout(() => {
                        if (notificationBanner) notificationBanner.classList.remove('hidden');
                    }, 3000);
                }
            }

            if (enableNotificationsBtn) {
                enableNotificationsBtn.addEventListener('click', () => {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            showToast('Bildirimler açıldı!', 'success');
                            if (notificationBanner) notificationBanner.classList.add('hidden');

                            // Test Notification
                            if ('serviceWorker' in navigator) {
                                navigator.serviceWorker.ready.then(registration => {
                                    registration.showNotification('NeoPort', {
                                        body: 'Bildirimler başarıyla aktif edildi.',
                                        icon: '/public/icons/icon-192.svg'
                                    });
                                });
                            }
                        }
                    });
                });
            }

            // 2. Offline Transaction Helper
            async function saveTransactionOffline(data) {
                try {
                    await idbHelper.addTransaction(data);

                    // Register Background Sync if supported
                    if ('serviceWorker' in navigator && 'SyncManager' in window) {
                        const sw = await navigator.serviceWorker.ready;
                        await sw.sync.register('sync-transactions');
                        showToast('İşlem kaydedildi (Offline). İnternet gelince gönderilecek.', 'info');
                    } else {
                        showToast('İşlem kaydedildi. Bağlantı bekleniyor.', 'warning');
                    }

                    if (typeof triggerHaptic === 'function') triggerHaptic(50);
                    return true;

                } catch (error) {
                    console.error('Offline save failed', error);
                    showToast('Kaydetme başarısız', 'error');
                    return false;
                }
            }

            // Export for testing
            if (typeof module !== 'undefined' && module.exports) {
                module.exports = {
                    validatePositiveNumber,
                    formatCurrency,
                    chartColors,
                    typeColors,
                    setAssets: (a) => { assets = a; },
                    getAssets: () => assets
                };
            }
            // =====================
            // SECURITY FUNCTIONS
            // =====================
            async function fetchBackups() {
                const list = document.getElementById('backupList');
                if (!list) return;

                try {
                    const response = await fetch(`${API_BASE}/security/backups`);
                    const backups = await response.json();

                    if (backups.length === 0) {
                        list.innerHTML = '<div class="text-center text-gray-500 text-sm py-4">Yedek bulunamadı</div>';
                        return;
                    }

                    list.innerHTML = backups.map(b => `
                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-file-shield text-indigo-500"></i>
                        <div>
                            <div class="text-sm font-medium text-gray-700 dark:text-gray-200">${b.name}</div>
                            <div class="text-xs text-gray-500">${new Date(b.created_at).toLocaleString()} • ${(b.size / 1024).toFixed(1)} KB</div>
                        </div>
                    </div>
                    <button onclick="restoreBackup('${b.name}')" class="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition">
                        Geri Yükle
                    </button>
                </div>
            `).join('');

                } catch (e) {
                    console.error(e);
                    list.innerHTML = '<div class="text-red-500 text-sm p-3">Yedekler yüklenemedi</div>';
                }
            }

            async function createBackup() {
                showLoading();
                try {
                    const response = await fetch(`${API_BASE}/security/backup`, { method: 'POST' });
                    if (response.ok) {
                        showToast('Yedekleme başarıyla tamamlandı', 'success');
                        fetchBackups();
                    } else {
                        showToast('Yedekleme başarısız', 'error');
                    }
                } catch (e) {
                    showToast('Hata oluştu', 'error');
                } finally {
                    hideLoading();
                }
            }

            async function restoreBackup(filename) {
                if (!confirm('Bu yedeği geri yüklemek istediğinize emin misiniz? Mevcut verileriniz silinecektir.')) return;

                showLoading();
                try {
                    const response = await fetch(`${API_BASE}/security/restore`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename })
                    });
                    const res = await response.json();
                    if (response.ok) {
                        alert(res.message);
                        location.reload();
                    } else {
                        showToast('Geri yükleme başarısız', 'error');
                    }
                } catch (e) {
                    showToast('Hatası oluştu', 'error');
                } finally {
                    hideLoading();
                }
            }

            function exportData() {
                window.open(`${API_BASE}/privacy/export`, '_blank');
            }

            async function startDeleteAccount() {
                const confirm1 = confirm('TÜM verileriniz silinecek. Bu işlem geri alınamaz! Devam etmek istiyor musunuz?');
                if (!confirm1) return;

                const confirm2 = prompt('Silme işlemini onaylamak için lütfen "SİL" yazınız.');
                if (confirm2 !== 'SİL') {
                    showToast('İşlem iptal edildi', 'info');
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE}/privacy/delete`, { method: 'DELETE' });
                    if (response.ok) {
                        alert('Hesabınız ve tüm verileriniz silindi.');
                        location.reload();
                    }
                } catch (e) {
                    showToast('Silme işlemi başarısız', 'error');
                }
            }

            // Expose functions
            window.fetchBackups = fetchBackups;
            window.createBackup = createBackup;
            window.restoreBackup = restoreBackup;
            window.exportData = exportData;
            window.startDeleteAccount = startDeleteAccount;

            // Initialize
            document.addEventListener('DOMContentLoaded', () => {
                if (typeof renderAssets === 'function') {
                    // Initial render if needed
                }
            });

            return {
                init: init,
                renderAssets: renderAssets,
                formatCurrency: formatCurrency
            };

        }) (); // End of IIFE
        // End of IIFE
    }) ();
    ```
