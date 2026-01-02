/**
 * Loading States & Skeleton Screens
 */

const skeletonTemplates = {
    list: `
        <div class="animate-pulse space-y-3">
            <div class="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
            <div class="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
            <div class="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
        </div>
    `,
    chart: `
        <div class="animate-pulse flex items-end space-x-4 h-full w-full p-4">
            <div class="w-1/6 bg-gray-200 dark:bg-gray-700 h-1/3 rounded-t"></div>
            <div class="w-1/6 bg-gray-200 dark:bg-gray-700 h-1/2 rounded-t"></div>
            <div class="w-1/6 bg-gray-200 dark:bg-gray-700 h-2/3 rounded-t"></div>
            <div class="w-1/6 bg-gray-200 dark:bg-gray-700 h-1/2 rounded-t"></div>
            <div class="w-1/6 bg-gray-200 dark:bg-gray-700 h-3/4 rounded-t"></div>
            <div class="w-1/6 bg-gray-200 dark:bg-gray-700 h-1/4 rounded-t"></div>
        </div>
    `,
    card: `
        <div class="animate-pulse space-y-2">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
    `
};

const savedContent = new Map();

function showSkeleton(containerId, type = 'list') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Content is explicitly saved before showing skeleton if not empty
    // But usually we show skeleton when content is empty or reloading entirely
    // If container has content we might just want options to overlay or replace

    // For this implementation, we replace content but save it to restore if needed? 
    // Actually, usually we fetch new data and then overwrite. 
    // So we just overwrite with skeleton.

    savedContent.set(containerId, container.innerHTML);
    container.innerHTML = skeletonTemplates[type] || skeletonTemplates.list;
}

function hideSkeleton(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.classList.remove('animate-pulse');

    // Clean up if it still contains skeleton structure
    // This prevents skeleton ghosting if data load fails or is partial
    const hasSkeleton = container.innerHTML.includes('animate-pulse') ||
        container.innerHTML.includes('bg-gray-200');

    if (hasSkeleton) {
        container.innerHTML = '';
    }
}

// Expose globally
window.showSkeleton = showSkeleton;
window.hideSkeleton = hideSkeleton;
