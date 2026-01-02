/**
 * Monitors portfolio for sudden changes
 */

function detectPortfolioChanges(prevValue, currValue) {
    if (!prevValue || prevValue === 0) return null;

    const change = currValue - prevValue;
    const percentChange = (change / prevValue) * 100;
    const absPercent = Math.abs(percentChange);

    // Threshold %10
    if (absPercent >= 10) {
        const direction = change > 0 ? 'yükseldi' : 'düştü';
        return {
            type: 'PORTFOLIO_VOLATILITY',
            oldValue: prevValue,
            newValue: currValue,
            percent: percentChange.toFixed(2),
            message: `⚠️ Portföy değeriniz aniden %${absPercent.toFixed(1)} ${direction}!`
        };
    }

    return null;
}

module.exports = { detectPortfolioChanges };
