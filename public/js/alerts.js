// ALERTS FRONTEND LOGIC

const BELL_ICON = '<i class="fa-regular fa-bell"></i>';
const BELL_FILLED = '<i class="fa-solid fa-bell text-yellow-500"></i>';

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Request permission on load or on first interaction
    if (Notification.permission === 'default') {
        // notification permission logic handled in notifications.js potentially
    }

    // Listen for alerts from server
    if (window.socket) {
        window.socket.on('alert_triggered', (alerts) => {
            alerts.forEach(alert => {
                window.showSystemNotification(alert.message);
                // Also toast
                showToast(alert.message, 'warning', 5000);
            });
            // Refresh alert list if modal open
            fetchActiveAlerts();
        });
    }

    // Initial fetch
    fetchActiveAlerts();
});

// Open Modal
window.openAlertModal = (symbol, currentPrice) => {
    const modal = document.getElementById('alertModal');
    if (!modal) return;

    document.getElementById('alertSymbol').value = symbol;
    document.getElementById('alertCurrentPrice').textContent = formatCurrency(currentPrice);
    document.getElementById('alertThreshold').value = currentPrice;

    modal.classList.remove('hidden');
};

window.closeAlertModal = () => {
    document.getElementById('alertModal').classList.add('hidden');
};

// Create Alert
window.createAlert = async () => {
    const symbol = document.getElementById('alertSymbol').value;
    const threshold = parseFloat(document.getElementById('alertThreshold').value);
    // Removing currency non-digit chars roughly or pass check
    // Actually we can get current price from assets array globally if needed, 
    // but UI shows it. We need raw number. 
    // Let's pass currentPrice as hidden field or from assets global

    const asset = assets.find(a => a.symbol === symbol);
    const currentPrice = asset ? asset.current_price : 0;

    const type = threshold > currentPrice ? 'PRICE_ABOVE' : 'PRICE_BELOW';

    try {
        const response = await fetch('/api/v1/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, type, threshold, currentPrice })
        });

        if (response.ok) {
            showToast(`${symbol} için alarm kuruldu`, 'success');
            closeAlertModal();
            fetchActiveAlerts();
        } else {
            showToast('Alarm kurulamadı', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Hata oluştu', 'error');
    }
};

// Fetch & Render Alerts
async function fetchActiveAlerts() {
    try {
        const response = await fetch('/api/v1/alerts');
        const alerts = await response.json();

        const list = document.getElementById('activeAlertsList');
        if (!list) return;

        list.innerHTML = '';
        if (alerts.length === 0) {
            list.innerHTML = '<div class="text-sm text-gray-500 text-center py-2">Aktif alarm yok</div>';
            return;
        }

        alerts.forEach(alert => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded mb-2 text-sm';
            const condition = alert.alert_type === 'PRICE_ABOVE' ? '>' : '<';
            div.innerHTML = `
                <div>
                    <span class="font-bold">${alert.asset_symbol}</span>
                    <span class="mx-1 text-gray-500">${condition}</span>
                    <span>${formatCurrency(alert.threshold_value)}</span>
                </div>
                <button onclick="deleteAlert(${alert.id})" class="text-red-500 hover:text-red-700">
                    <i class="fa-solid fa-trash"></i>
                </button>
             `;
            list.appendChild(div);
        });

    } catch (e) {
        console.error('Fetch alerts failed', e);
    }
}

window.deleteAlert = async (id) => {
    try {
        await fetch(`/api/v1/alerts/${id}`, { method: 'DELETE' });
        fetchActiveAlerts();
    } catch (e) {
        console.error(e);
    }
};
