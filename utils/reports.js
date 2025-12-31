/**
 * Reporting Utilities
 * Detaylı raporlama ve analiz fonksiyonları
 */

// Tarih aralığına göre filtrele
function filterByDateRange(transactions, startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    return transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= start && txDate <= end;
    });
}

// Aylık özet raporu
function getMonthlyReport(transactions) {
    const monthlyData = {};

    transactions.forEach(tx => {
        const date = new Date(tx.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                month: monthKey,
                buyCount: 0,
                sellCount: 0,
                buyTotal: 0,
                sellTotal: 0,
                realizedProfit: 0
            };
        }

        if (tx.type === 'buy') {
            monthlyData[monthKey].buyCount++;
            monthlyData[monthKey].buyTotal += tx.total;
        } else {
            monthlyData[monthKey].sellCount++;
            monthlyData[monthKey].sellTotal += tx.total;
            monthlyData[monthKey].realizedProfit += tx.realized_profit || 0;
        }
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
}

// Varlık bazlı performans raporu
function getAssetPerformanceReport(assets) {
    return assets.map(asset => {
        const currentValue = asset.quantity * asset.current_price;
        const costBasis = asset.quantity * asset.avg_cost;
        const profitLoss = currentValue - costBasis;
        const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

        return {
            id: asset.id,
            name: asset.name,
            symbol: asset.symbol,
            type: asset.type,
            quantity: asset.quantity,
            avgCost: asset.avg_cost,
            currentPrice: asset.current_price,
            costBasis,
            currentValue,
            profitLoss,
            profitLossPercent,
            performance: profitLossPercent > 0 ? 'profit' : profitLossPercent < 0 ? 'loss' : 'neutral'
        };
    }).sort((a, b) => b.profitLossPercent - a.profitLossPercent);
}

// Tür bazlı dağılım raporu
function getTypeDistributionReport(assets) {
    const distribution = {};
    let totalValue = 0;

    assets.forEach(asset => {
        const value = asset.quantity * asset.current_price;
        totalValue += value;

        if (!distribution[asset.type]) {
            distribution[asset.type] = {
                type: asset.type,
                count: 0,
                totalValue: 0,
                percentage: 0
            };
        }

        distribution[asset.type].count++;
        distribution[asset.type].totalValue += value;
    });

    // Yüzdeleri hesapla
    Object.values(distribution).forEach(item => {
        item.percentage = totalValue > 0 ? (item.totalValue / totalValue) * 100 : 0;
    });

    return Object.values(distribution).sort((a, b) => b.totalValue - a.totalValue);
}

// İşlem geçmişi özeti
function getTransactionSummary(transactions) {
    const summary = {
        totalTransactions: transactions.length,
        buyTransactions: 0,
        sellTransactions: 0,
        totalBuyAmount: 0,
        totalSellAmount: 0,
        totalRealizedProfit: 0,
        avgBuyPrice: 0,
        avgSellPrice: 0
    };

    let buyCount = 0;
    let sellCount = 0;

    transactions.forEach(tx => {
        if (tx.type === 'buy') {
            summary.buyTransactions++;
            summary.totalBuyAmount += tx.total;
            buyCount++;
        } else {
            summary.sellTransactions++;
            summary.totalSellAmount += tx.total;
            summary.totalRealizedProfit += tx.realized_profit || 0;
            sellCount++;
        }
    });

    summary.avgBuyPrice = buyCount > 0 ? summary.totalBuyAmount / buyCount : 0;
    summary.avgSellPrice = sellCount > 0 ? summary.totalSellAmount / sellCount : 0;

    return summary;
}

// Portföy değer geçmişi (simüle edilmiş)
function getPortfolioValueHistory(transactions, assets) {
    const history = [];
    const dates = [...new Set(transactions.map(tx => tx.date.split('T')[0]))].sort();

    dates.forEach(date => {
        const txUntilDate = transactions.filter(tx => tx.date.split('T')[0] <= date);
        
        // Bu tarihe kadar olan varlık durumunu hesapla
        const assetState = {};
        txUntilDate.forEach(tx => {
            if (!assetState[tx.asset_id]) {
                assetState[tx.asset_id] = { quantity: 0, totalCost: 0 };
            }

            if (tx.type === 'buy') {
                assetState[tx.asset_id].quantity += tx.quantity;
                assetState[tx.asset_id].totalCost += tx.total;
            } else {
                assetState[tx.asset_id].quantity -= tx.quantity;
            }
        });

        // Toplam değeri hesapla
        let totalValue = 0;
        Object.entries(assetState).forEach(([assetId, state]) => {
            const asset = assets.find(a => a.id == assetId);
            if (asset && state.quantity > 0) {
                totalValue += state.quantity * asset.current_price;
            }
        });

        history.push({
            date,
            value: totalValue
        });
    });

    return history;
}

// En iyi/en kötü performans gösteren varlıklar
function getTopPerformers(assets, limit = 5) {
    const performance = getAssetPerformanceReport(assets);
    
    return {
        topGainers: performance.filter(a => a.profitLoss > 0).slice(0, limit),
        topLosers: performance.filter(a => a.profitLoss < 0).slice(-limit).reverse()
    };
}

// Risk analizi
function getRiskAnalysis(assets) {
    const totalValue = assets.reduce((sum, a) => sum + (a.quantity * a.current_price), 0);
    
    const analysis = {
        diversification: {
            assetCount: assets.length,
            typeCount: new Set(assets.map(a => a.type)).size,
            score: 0
        },
        concentration: {
            topAssetPercentage: 0,
            top3Percentage: 0
        },
        volatility: {
            avgPriceChange: 0,
            maxDrawdown: 0
        }
    };

    // Diversification score (0-100)
    analysis.diversification.score = Math.min(
        (analysis.diversification.assetCount * 10) + 
        (analysis.diversification.typeCount * 20),
        100
    );

    // Concentration
    if (assets.length > 0) {
        const sorted = assets
            .map(a => ({ ...a, value: a.quantity * a.current_price }))
            .sort((a, b) => b.value - a.value);
        
        analysis.concentration.topAssetPercentage = totalValue > 0 
            ? (sorted[0].value / totalValue) * 100 
            : 0;
        
        const top3Value = sorted.slice(0, 3).reduce((sum, a) => sum + a.value, 0);
        analysis.concentration.top3Percentage = totalValue > 0 
            ? (top3Value / totalValue) * 100 
            : 0;
    }

    return analysis;
}

module.exports = {
    filterByDateRange,
    getMonthlyReport,
    getAssetPerformanceReport,
    getTypeDistributionReport,
    getTransactionSummary,
    getPortfolioValueHistory,
    getTopPerformers,
    getRiskAnalysis
};
