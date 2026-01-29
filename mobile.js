@ -1,49 +0,0 @@
// ============================================================
// NEXUS MOBILE LOGIC (mobile.js)
// Handles touch navigation, sticky stream behavior, and overlays
// ============================================================

// --- MOBILE APP NAVIGATION ---
window.switchMobileView = function(viewName) {
    // 1. Close Store if open
    document.body.classList.remove('show-mobile-store');

    // 2. Update Body Class (CSS handles visibility)
    document.body.classList.remove('view-chat', 'view-games', 'view-profile');
    document.body.classList.add('view-' + viewName);

    // 3. Update Active Button State
    const buttons = document.querySelectorAll('.nav-item');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Icon mapping to identify button
    const iconMap = { 'chat': 'Chat', 'games': 'History', 'profile': 'Rank' };
    buttons.forEach(btn => {
        if (btn.innerText.includes(iconMap[viewName])) btn.classList.add('active');
    });

    // 4. Scroll Reset (Optional)
    if (viewName !== 'chat') window.scrollTo(0, 0);
};

window.toggleMobileStore = function() {
    // Toggle the class that forces #marketplacePanel to show on top
    document.body.classList.toggle('show-mobile-store');
    
    // Ensure we render the store contents when opening
    // Try global `renderStore` first, otherwise dynamically import the ES module
    if (document.body.classList.contains('show-mobile-store')) {
        if (typeof renderStore === 'function') {
            renderStore();
        } else {
            import('./modules/store.js').then(mod => {
                if (typeof mod.renderStore === 'function') mod.renderStore();
            }).catch(() => {});
        }
    }
};

// --- MOBILE INITIALIZATION ---
// Runs on load to set the default view
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth <= 1000) {
        document.body.classList.add('view-chat');
        console.log("Mobile View Initialized");
    }
});
