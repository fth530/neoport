const ss = require('simple-statistics');

/**
 * Calculates portfolio risk metrics (Volatility, Sharpe Ratio).
 * @param {Array} assets - List of assets.
 * @returns {Object} Risk metrics.
 */
function calculatePortfolioRisk(assets) {
    // Simulation: Generate random daily returns for each asset
    // In a real app, we'd need historical data.

    // Simulating portfolio returns
    const simulatedReturns = Array.from({ length: 30 }, () => (Math.random() - 0.48) * 0.05); // slightly positive bias

    // Volatility (Standard Deviation of returns)
    const volatility = ss.standardDeviation(simulatedReturns);

    // Sharpe Ratio ( (Rx - Rf) / StdDev )
    // Risk-free rate assumed 0.02 (annual) -> ~0.00008 daily
    const riskFreeRate = 0.00008;
    const avgReturn = ss.mean(simulatedReturns);
    const sharpeRatio = (avgReturn - riskFreeRate) / (volatility || 1); // Avoid div by zero

    return {
        volatility: (volatility * 100).toFixed(2), // as percentage
        sharpeRatio: sharpeRatio.toFixed(2),
        riskScore: Math.min(10, Math.max(1, Math.round(volatility * 1000))), // 1-10 scale
        projectedReturn: (avgReturn * 365 * 100).toFixed(2) // Annualized
    };
}

/**
 * Calculates correlation between two assets.
 * @param {string} asset1 
 * @param {string} asset2 
 * @returns {number} Correlation coefficient (-1 to 1).
 */
function calculateCorrelation(asset1, asset2) {
    // Mock correlation
    return (Math.random() * 2 - 1).toFixed(2);
}

module.exports = {
    calculatePortfolioRisk,
    calculateCorrelation
};
