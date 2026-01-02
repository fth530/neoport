/**
 * Real-time Updates & WebSocket Client
 */
(function () {
    const socket = io();
    let isConnected = false;
    let updateInterval = 60000; // Default 60s
    const connectionStatus = document.getElementById('connectionStatus');
    const connectionDot = document.getElementById('connectionDot');
    const connectionText = document.getElementById('connectionText');

    // Helper: Format Currency
    function formatCurrency(params) {
        // If it's just a number, format as currency (defaulting to TRY/USD based on context if simpler, 
        // or just re-implement the simple formatter found in app.js)
        // For safety, let's copy the logic or try to use window.formatCurrency if clear.
        // Since we are in an IIFE, we can't easily see app.js internals. 
        // Best to define a safe local version or attach the one from app.js to window.

        // Simpler approach: Check window.formatCurrency, else fallback
        if (typeof window.formatCurrency === 'function') {
            return window.formatCurrency(params);
        }

        // Fallback implementation
        const value = typeof params === 'object' ? params.value : params;
        const currency = typeof params === 'object' ? params.currency : 'TRY';
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
    }

    // UI Updates

    // UI Updates
    function updateConnectionUI(status) {
        if (!connectionDot || !connectionText) return;

        if (status === 'connected') {
            connectionDot.className = 'w-2 h-2 rounded-full bg-green-500 animate-pulse';
            connectionText.textContent = 'Canlı Bağlantı';
            connectionText.className = 'text-xs text-green-600 font-medium';
        } else {
            connectionDot.className = 'w-2 h-2 rounded-full bg-red-500';
            connectionText.textContent = 'Bağlantı Kesildi';
            connectionText.className = 'text-xs text-red-600 font-medium';
        }
    }

    // Blink Effect
    function highlightUpdate(elementId, type) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const originalClass = el.className;
        const highlightClass = type === 'up' ? 'bg-green-100 dark:bg-green-900/30 transition-colors duration-500' : 'bg-red-100 dark:bg-red-900/30 transition-colors duration-500';

        el.className = `${originalClass} ${highlightClass}`;
        setTimeout(() => {
            el.className = originalClass;
        }, 1000);
    }

    // Socket Events
    socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id);
        isConnected = true;
        updateConnectionUI('connected');
    });

    socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
        isConnected = false;
        updateConnectionUI('disconnected');
    });

    socket.on('price_update', (data) => {
        console.log('📡 Price update received:', data);

        // Update Assets Table
        if (data.assets && window.renderAssets) {
            window.renderAssets(data.assets);
            // Highlight table rows (simple effect)
            const table = document.querySelector('tbody');
            if (table) {
                table.classList.add('transition-opacity', 'duration-300', 'opacity-50');
                setTimeout(() => table.classList.remove('opacity-50'), 300);
            }
        }

        // Update Summary Cards
        if (data.summary) {
            updateSummaryCard('totalValue', data.summary.totalValue, true);
            updateSummaryCard('totalProfit', data.summary.totalProfit, true);
            updateSummaryCard('dailyChange', data.summary.dailyChange, false);
        }

        // Notify User
        if (document.visibilityState === 'hidden') {
            const up = data.summary.dailyChange >= 0;
            const icon = up ? '📈' : '📉';
            sendSystemNotification(`${icon} Portföy Güncellendi`, {
                body: `Toplam: ${formatCurrency(data.summary.totalValue)} (${data.summary.dailyChangeRate}%)`,
                tag: 'price-update'
            });
        }
    });

    function updateSummaryCard(id, value, isCurrency) {
        const el = document.getElementById(id);
        if (el) {
            const oldValue = parseFloat(el.getAttribute('data-value') || 0);
            const newValue = parseFloat(value);

            if (newValue !== oldValue) {
                el.setAttribute('data-value', newValue);
                el.textContent = isCurrency ? formatCurrency(newValue) : `%${newValue.toFixed(2)}`;
                const direction = newValue > oldValue ? 'up' : 'down';
                highlightUpdate(id, direction);
            }
        }
    }

    // Visibility Logic (Auto-refresh throttling)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('👀 Page visible - Resuming normal updates');
            // Request immediate update
            socket.emit('request_update');
        } else {
            console.log('💤 Page hidden - Pausing active effects');
        }
    });

})();

// Needs to be exposed or global? No, it runs side-effects.
