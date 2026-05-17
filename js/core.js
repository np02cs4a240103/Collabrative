// core.js - Minimal Session Management
// Stores current user session data in localStorage
let currentUser = JSON.parse(localStorage.getItem('uni_current')) || null;

// The backend team will use these to store the data they fetch from the server
// Array to hold ticket data
let tickets = [];
// Array to hold message data
let messages = [];

// Function to check if user has access to a specific role page
function checkAccess(role) {
    if (!currentUser || currentUser.role !== role) {
        // Redirect to index if not authorized
        window.location.href = 'index.html';
    }
}

// Function to handle global logout
function globalLogout() {
    // Remove user data from localStorage
    localStorage.removeItem('uni_current');
    // Redirect to landing page
    window.location.href = 'index.html';
}