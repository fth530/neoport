// Advanced Analytics Logic

let advancedChart = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchAssetsForAnalytics();
    fetchRiskMetrics();
});

// Populate Asset Select
async function fetchAssetsForAnalytics() {
    try {
        const response = await fetch('/api/v1/assets');
        const assets = await response.json();

        const select = document.getElementById('analyticsAssetSelect');
        if (!select) return;

        select.innerHTML = '';
        if (assets.length === 0) {
            const option = document.createElement('option');
            option.text = 'Varlık Yok';
            select.add(option);
            return;
        }

        assets.forEach(asset => {
            const option = document.createElement('option');
            option.value = asset.symbol;
            option.text = `${asset.symbol} - ${asset.name}`;
            select.add(option);
        });

        // Initialize chart with first asset
        if (assets.length > 0) {
            updateAdvancedChart();
        }
    } catch (error) {
        console.error('Asset list fetch failed:', error);
    }
}

// Fetch and Render Chart
async function updateAdvancedChart() {
    const select = document.getElementById('analyticsAssetSelect');
    const symbol = select.value;
    if (!symbol) return;

    // Advanced chart container is 'advancedChart' canvas parent usually. 
    // But skeleton replaces content. Canvas parent is div.relative.
    // Let's create a wrapper or use the parent of canvas.
    const container = document.getElementById('advancedChart').parentElement;
    if (container) {
        // Can't use showSkeleton on the wrapper directly if it removes canvas.
        // The canvas needs to exist for Chart.js.
        // Actually Chart.js needs canvas. If we replace innerHTML, canvas is gone.
        // So we need to re-add canvas after fetch.
        container.id = "advancedChartContainer";
        showSkeleton("advancedChartContainer", "chart");
    }

    try {
        // Add artificial delay to see skeleton (optional, for UX feeling)
        // await new Promise(r => setTimeout(r, 500)); 

        const response = await fetch(`/api/v1/charts/candlestick/${symbol}?days=30`);
        const ohlcData = await response.json();

        // Calculate simple SMA
        const smaData = calculateSMA(ohlcData, 5);

        // Restore Canvas
        if (container) {
            container.innerHTML = '<canvas id="advancedChart"></canvas>';
        }

        renderFinancialChart(symbol, ohlcData, smaData);
    } catch (error) {
        console.error('Chart data fetch failed:', error);
        if (container) container.innerHTML = '<div class="text-center text-red-500 py-10">Veri yüklenemedi</div>';
    }
}

// Fetch Risk Metrics
async function fetchRiskMetrics() {
    try {
        const response = await fetch('/api/v1/analytics/risk');
        const metrics = await response.json();

        updateMetric('metricRiskScore', `${metrics.riskScore}/10`, getColorForScore(metrics.riskScore));
        updateMetric('metricVolatility', `%${metrics.volatility}`);
        updateMetric('metricSharpe', metrics.sharpeRatio);
        updateMetric('metricProjection', `%${metrics.projectedReturn}`);
    } catch (error) {
        console.error('Risk metrics fetch failed:', error);
    }
}

function updateMetric(id, value, colorClass = '') {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
        if (colorClass) el.className = `text-xl font-bold ${colorClass}`;
    }
}

function getColorForScore(score) {
    if (score <= 3) return 'text-green-500';
    if (score <= 7) return 'text-yellow-500';
    return 'text-red-500';
}

function calculateSMA(data, period) {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            sma.push({ x: data[i].t, y: null });
            continue;
        }
        const slice = data.slice(i - period + 1, i + 1);
        const sum = slice.reduce((a, b) => a + b.c, 0); // b.c is close price
        sma.push({ x: data[i].t, y: sum / period });
    }
    return sma;
}

function renderFinancialChart(symbol, ohlcData, smaData) {
    const ctx = document.getElementById('advancedChart').getContext('2d');

    // Global or module scope chart instance check
    if (window.advancedChart instanceof Chart) {
        window.advancedChart.destroy();
    } else if (advancedChart) {
        // Fallback to local variable if window property not set yet
        advancedChart.destroy();
    }

    advancedChart = new Chart(ctx, {
        type: 'candlestick',
        data: {
            datasets: [{
                label: `${symbol} OHLC`,
                data: ohlcData,
                color: {
                    up: '#10b981',
                    down: '#ef4444',
                    unchanged: '#6b7280',
                },
                borderColor: {
                    up: '#10b981',
                    down: '#ef4444',
                    unchanged: '#6b7280',
                }
            }, {
                label: 'SMA (5)',
                type: 'line',
                data: smaData,
                borderColor: '#6366f1', // Indigo
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    },
                    grid: {
                        color: 'rgba(200, 200, 200, 0.1)'
                    }
                },
                y: {
                    position: 'right',
                    grid: {
                        color: 'rgba(200, 200, 200, 0.1)'
                    }
                }
            }
        }
    });

    // Assign to window for global access/check
    window.advancedChart = advancedChart;
}
