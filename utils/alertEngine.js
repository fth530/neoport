const database = require('../database');

/**
 * Checks active alerts against current market prices
 * @param {Object} currentPrices - Map of symbol -> current price
 * @returns {Array} - List of triggered alerts
 */
function checkPriceAlerts(currentPrices) {
    const alerts = database.getAllAlerts();
    const triggered = [];

    alerts.forEach(alert => {
        const currentPrice = currentPrices[alert.asset_symbol];

        if (!currentPrice) return;

        let isTriggered = false;
        let message = '';

        if (alert.alert_type === 'PRICE_ABOVE' && currentPrice >= alert.threshold_value) {
            isTriggered = true;
            message = `${alert.asset_symbol} hedef fiyatın üzerine çıktı: ${currentPrice}`;
        } else if (alert.alert_type === 'PRICE_BELOW' && currentPrice <= alert.threshold_value) {
            isTriggered = true;
            message = `${alert.asset_symbol} hedef fiyatın altına düştü: ${currentPrice}`;
        }

        if (isTriggered) {
            // Log history
            database.logAlertHistory(alert.id, currentPrice, message);

            // Auto deactivate one-time alerts (optional design choice, kept active for now or deactivate?)
            // Usually price alerts are one-time. Let's deactivate.
            database.deleteAlert(alert.id);

            triggered.push({
                id: alert.id,
                symbol: alert.asset_symbol,
                price: currentPrice,
                message: message
            });
        }
    });

    return triggered;
}

module.exports = { checkPriceAlerts };
