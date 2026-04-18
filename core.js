// core.js - Minimal Session Management
let currentUser = JSON.parse(localStorage.getItem('uni_current')) || null;

// The backend team will use these to store the data they fetch from the server
let tickets = []; 
let messages = [];

function checkAccess(role) {
    if (!currentUser || currentUser.role !== role) {
        window.location.href = 'index.html';
    }
}

function globalLogout() {
    localStorage.removeItem('uni_current');
    window.location.href = 'index.html';
}