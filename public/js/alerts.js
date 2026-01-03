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
        window.socket.on('alert_triggered', (alertData) => {
            let alertsArray = alertData;
            if (!Array.isArray(alertsArray)) alertsArray = [alertsArray]; // Handle single alert object too

            alertsArray.forEach(alert => {
                if (window.showSystemNotification) {
                    window.showSystemNotification(alert.message);
                }
                // Also toast
                if (typeof showToast === 'function') {
                    showToast(alert.message, 'warning', 5000);
                }
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

// YENİLENMİŞ FETCH FONKSİYONU
async function fetchActiveAlerts() {
    const dropdown = document.getElementById('alertsDropdown');

    try {
        const response = await fetch('/api/v1/alerts');

        // Yanıt başarısızsa boş dizi kullan
        if (!response.ok) {
            console.warn('Alarmlar çekilemedi, boş liste kullanılıyor.');
            updateAlertsDropdown([]);
            return;
        }

        // BURASI KRİTİK: 'const' yerine 'let' kullanıyoruz
        let alerts = await response.json();

        // Eğer gelen veri dizi değilse, boş diziye çevir
        if (!Array.isArray(alerts)) {
            console.warn('API geçerli bir liste döndürmedi.');
            alerts = [];
        }

        // Arayüzü güncelle
        updateAlertsDropdown(alerts);

    } catch (error) {
        console.error('Alarm verisi hatası:', error);
        // Hata durumunda da dropdown'ı temizle ki "Yükleniyor" yazısı kalmasın
        if (dropdown) {
            dropdown.innerHTML = '<div class="p-4 text-center text-gray-500">Bağlantı hatası</div>';
        }
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

// Alerts dropdown güncelleme fonksiyonu
function updateAlertsDropdown(alerts) {
    const dropdown = document.getElementById('alertsDropdown');
    const activeAlertsList = document.getElementById('activeAlertsList');
    
    if (activeAlertsList) {
        if (!alerts || alerts.length === 0) {
            activeAlertsList.innerHTML = '<div class="text-center text-gray-500 text-sm py-2">Aktif alarm yok</div>';
        } else {
            activeAlertsList.innerHTML = alerts.map(alert => `
                <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2">
                    <div>
                        <span class="font-medium text-sm">${alert.symbol}</span>
                        <span class="text-xs text-gray-500 ml-2">${alert.type === 'PRICE_ABOVE' ? '↑' : '↓'} ${alert.threshold}</span>
                    </div>
                    <button onclick="deleteAlert(${alert.id})" class="text-red-500 hover:text-red-600 text-xs">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }
    }
}
