// core.js - Session Management + Global Fetch Headers
let currentUser = JSON.parse(localStorage.getItem('uni_current')) || null;

// Shared global data stores
let tickets = [];
let messages = [];

/**
 * Wraps fetch to automatically inject X-User-Id and X-User-Role headers
 * on every API request. This fixes the PHP session conflict when two users
 * (e.g. Admin + Student) are open in different browser tabs simultaneously.
 */
const _originalFetch = window.fetch.bind(window);
window.fetch = function(url, options = {}) {
    if (currentUser && currentUser.id) {
        options.headers = options.headers || {};
        if (typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
            options.headers['X-User-Id']   = currentUser.id;
            options.headers['X-User-Role'] = currentUser.role;
        }
    }
    return _originalFetch(url, options);
};

function checkAccess(role) {
    if (!currentUser || currentUser.role !== role) {
        window.location.href = 'index.html';
    }
}

function globalLogout() {
    localStorage.removeItem('uni_current');
    window.location.href = 'index.html';
}