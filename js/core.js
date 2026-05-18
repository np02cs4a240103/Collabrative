// ============================================================================
// core.js - Session Management + Global Fetch Headers
// This file handles the core logic that applies to all pages across the app.
// ============================================================================

// 1. Retrieve the currently logged-in user from localStorage
// We parse the JSON string back into a JavaScript object. If no user is found, it defaults to null.
let currentUser = JSON.parse(localStorage.getItem('uni_current')) || null;

// 2. Shared global data stores (Arrays to hold lists of tickets and messages temporarily)
let tickets = [];
let messages = [];

/**
 * 3. Global Fetch Override
 * We wrap the browser's native fetch() function to automatically inject custom headers 
 * (X-User-Id and X-User-Role) into every single API request. 
 * This ensures the backend always knows EXACTLY which tab/user is making the request, 
 * fixing conflicts when an Admin and Student are logged in on different tabs.
 */
const _originalFetch = window.fetch.bind(window); // Save the original fetch function
window.fetch = async function(url, options = {}) {
    // If a user is currently logged in and has an ID
    if (currentUser && currentUser.id) {
        options.headers = options.headers || {};
        
        // Ensure we are working with a standard JS object for headers, not a Headers instance
        if (typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
            options.headers['X-User-Id']   = currentUser.id;       // Attach User ID
            options.headers['X-User-Role'] = currentUser.role;     // Attach User Role
        }
    }
    
    // Call the original fetch with our modified options containing the new headers
    const response = await _originalFetch(url, options);
    
    // Globally intercept responses to catch unauthorized access (e.g. account disabled)
    try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const clonedResponse = response.clone();
            const data = await clonedResponse.json();
            if (data && data.status === 'error' && data.message && data.message.includes('Unauthorized')) {
                alert("Your session is invalid or your account has been disabled. You will be logged out.");
                globalLogout();
            }
        }
    } catch (e) {
        // Ignore errors if the response is not valid JSON
    }
    
    return response;
};

/**
 * 4. Access Control Checker
 * This function is called at the top of every secured page to verify the user is allowed to be there.
 * @param {string|Array} role - The required role (e.g. 'Admin') or array of roles (e.g. ['Student', 'Staff'])
 */
function checkAccess(role) {
    // If nobody is logged in, redirect to the login page immediately
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    // Check if the 'role' parameter is an array of multiple allowed roles
    if (Array.isArray(role)) {
        // If the current user's role is NOT in the allowed list, kick them out
        if (!role.includes(currentUser.role)) {
            window.location.href = 'index.html';
        }
    } else {
        // If it's just a single string role, do a direct strict comparison
        if (currentUser.role !== role) {
            window.location.href = 'index.html';
        }
    }
}

/**
 * 5. Global Logout Handler
 * Completely removes the user from local storage and sends them back to the login screen.
 */
function globalLogout() {
    localStorage.removeItem('uni_current'); // Erase the saved session data
    window.location.href = 'index.html';    // Redirect to login page
}

// ============================================================================
// --- Auto Logout System (90 Seconds Inactivity) ---
// Logs the user out if they stop interacting with the page for 90 seconds.
// ============================================================================
let inactivityTimer; // Variable to hold the countdown timer
const INACTIVITY_LIMIT = 90 * 1000; // 90 seconds converted to milliseconds

/**
 * Resets the countdown timer back to 90 seconds. 
 * If it hits 0, the user is logged out automatically.
 */
function resetInactivityTimer() {
    clearTimeout(inactivityTimer); // Stop the current timer
    
    // Only start a new timer if someone is actively logged in
    if (currentUser) {
        inactivityTimer = setTimeout(() => {
            // Once the 90 seconds pass, show an alert and trigger the logout
            alert("Session expired due to inactivity. You have been logged out.");
            globalLogout();
        }, INACTIVITY_LIMIT);
    }
}

// Initialize activity tracking ONLY if a user is currently logged in
if (currentUser) {
    // Listen for any major physical interaction with the page (mouse movement, typing, clicking, scrolling, touching screen)
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
        // Whenever one of these events happens, reset the timer back to 90 seconds
        document.addEventListener(evt, resetInactivityTimer, { passive: true });
    });
    
    // Start the initial countdown as soon as the page loads
    resetInactivityTimer();
}