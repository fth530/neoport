/**
 * PWA Install & IOS Instructions
 */

let deferredPrompt;

document.addEventListener('DOMContentLoaded', () => {
    // Check if IOS
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isIos && !isStandalone) {
        showIosInstallPrompt();
    }
});

// Handle Install Prompt (Android/Desktop)
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;

    showInstallButton();
});

function showInstallButton() {
    // Create or show install button in UI
    // For now assuming a fixed bottom bar or toast
    const container = document.createElement('div');
    container.id = 'pwa-install-toast';
    container.className = 'fixed bottom-4 left-4 right-4 bg-indigo-600 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between z-50 transform transition-transform duration-300 translate-y-full';
    container.innerHTML = `
        <div class="flex items-center gap-3">
            <i class="fa-solid fa-download"></i>
            <div>
                <div class="font-bold">Uygulamayı Yükle</div>
                <div class="text-xs opacity-80">Daha hızlı erişim için</div>
            </div>
        </div>
        <div class="flex gap-2">
            <button onclick="dismissInstall()" class="p-2 hover:bg-white/10 rounded-lg text-sm">Hayır</button>
            <button onclick="triggerInstall()" class="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm shadow-sm">Yükle</button>
        </div>
    `;

    document.body.appendChild(container);

    // Animate in
    setTimeout(() => {
        container.classList.remove('translate-y-full');
    }, 100);
}

window.triggerInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
    }
    deferredPrompt = null;
    dismissInstall();
};

window.dismissInstall = () => {
    const el = document.getElementById('pwa-install-toast');
    if (el) {
        el.classList.add('translate-y-full');
        setTimeout(() => el.remove(), 300);
    }
};

function showIosInstallPrompt() {
    // Show a specific toast for iOS
    // iOS doesn't support beforeinstallprompt, needs manual "Share -> Add to Home"
    // Only show if haven't shown recently (using localStorage)

    const lastShown = localStorage.getItem('iosInstallShown');
    const now = Date.now();

    if (lastShown && (now - parseInt(lastShown)) < 7 * 24 * 60 * 60 * 1000) {
        return; // Show once a week
    }

    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-4 right-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-4 rounded-xl shadow-2xl z-50 animate-bounce-in';
    toast.innerHTML = `
        <div class="flex flex-col gap-3">
            <div class="flex justify-between items-start">
                <div class="font-bold flex items-center gap-2">
                    <i class="fa-brands fa-apple text-xl"></i>
                    Ana Ekrana Ekle
                </div>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-400"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <p class="text-sm opacity-80">Bu uygulamayı yüklemek için:</p>
            <div class="flex items-center gap-2 text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                1. <i class="fa-solid fa-arrow-up-from-bracket text-blue-500 text-lg"></i> <b>Paylaş</b> butonuna bas
            </div>
            <div class="flex items-center gap-2 text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                2. <i class="fa-regular fa-square-plus text-gray-500 text-lg"></i> <b>Ana Ekrana Ekle</b> seç
            </div>
        </div>
    `;

    document.body.appendChild(toast);
    localStorage.setItem('iosInstallShown', now.toString());
}
