const simpleStatistics = require('simple-statistics');
const math = require('mathjs');

/**
 * Generates simulated OHLC (Open, High, Low, Close) data for a given symbol and number of days.
 * @param {string} symbol - The asset symbol.
 * @param {number} days - Number of days to generate data for.
 * @returns {Array} Array of OHLC objects.
 */
function getCandlestickData(symbol, days = 30) {
    const data = [];
    let currentPrice = Math.random() * 1000 + 100; // Random start price

    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));

        const open = currentPrice;
        const volatility = currentPrice * 0.05; // 5% volatility
        const close = open + (Math.random() - 0.5) * volatility;
        const high = Math.max(open, close) + Math.random() * (volatility / 2);
        const low = Math.min(open, close) - Math.random() * (volatility / 2);

        data.push({
            t: date.valueOf(), // Timestamp required for Chart.js financial
            o: parseFloat(open.toFixed(2)),
            h: parseFloat(high.toFixed(2)),
            l: parseFloat(low.toFixed(2)),
            c: parseFloat(close.toFixed(2))
        });

        currentPrice = close;
    }

    return data;
}

/**
 * Calculates Simple Moving Average (SMA).
 * @param {Array} prices - Array of prices (dates or just values? usually just values). 
 * But inputs might be the OHLC data. Let's assume input is array of numbers.
 * @param {number} period - SMA period.
 * @returns {Array} Array of SMA values aligned with the input array.
 */
function calculateSMA(data, period) {
    // If data is objects (OHLC), extract 'c' (close). If numbers, use as is.
    const prices = data.map(d => typeof d === 'object' ? d.c : d);

    if (prices.length < period) return [];

    const sma = [];
    for (let i = 0; i < prices.length; i++) {
        if (i < period - 1) {
            sma.push(null); // Not enough data
            continue;
        }
        const slice = prices.slice(i - period + 1, i + 1);
        const sum = slice.reduce((a, b) => a + b, 0);
        sma.push(sum / period);
    }
    return sma;
}

/**
 * Calculates Relative Strength Index (RSI).
 * @param {Array} data - Array of prices/OHLC.
 * @param {number} period - RSI period (default 14).
 * @returns {Array} RSI values.
 */
function calculateRSI(data, period = 14) {
    const prices = data.map(d => typeof d === 'object' ? d.c : d);

    if (prices.length < period + 1) return [];

    const rsiArray = [];
    // RSI logic... using simple method for now
    // Or verify if simple-statistics has it? It usually doesn't have standard RSI.
    // Implementing standard formula.

    let gains = 0;
    let losses = 0;

    // First average gain/loss
    for (let i = 1; i <= period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Initial RSI
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = 100 - (100 / (1 + rs));

    // Fill initial nulls
    for (let k = 0; k < period; k++) rsiArray.push(null);
    rsiArray.push(rsi);

    // Smoothed RSI for rest
    for (let i = period + 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        const currentGain = diff > 0 ? diff : 0;
        const currentLoss = diff < 0 ? Math.abs(diff) : 0;

        avgGain = ((avgGain * (period - 1)) + currentGain) / period;
        avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

        rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
        rsiArray.push(rsi);
    }

    return rsiArray;
}

module.exports = {
    getCandlestickData,
    calculateSMA,
    calculateRSI
};
