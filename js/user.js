// user.js - User Dashboard Functionality

// Global variables for active sector and current ticket
let activeSector = "";
let currentTicketId = null;

// Initialize user dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    checkAccess('user');
    // Initialize UI elements
    initUI();
});

// Function to initialize user interface
function initUI() {
    // Get user name or default
    const name = currentUser.name || "User";
    // Update sidebar user name
    document.getElementById('sb-user-name').innerText = name;
    // Update welcome message
    document.getElementById('welcome-msg').innerText = `Hello, ${name}! 👋`;
    
    // Set initials for avatar
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    document.querySelector('.avatar-initials').innerText = initials;
}

// UI LOGIC: Switches views to open chat for a sector
function openChat(sector) {
    // Set active sector
    activeSector = sector;
    // Hide all main content views
    document.querySelectorAll('.main-content-green > div').forEach(div => div.classList.add('hidden'));
    
    // Show ticket form view
    const formView = document.getElementById('ticket-form-view');
    formView.classList.remove('hidden');
    formView.style.display = 'flex'; 
    // Set issue type to selected sector
    document.getElementById('issue-type').value = sector;
}

// FRONTEND ACTION: Collects data for backend
function submitTicket() {
    // Collect form data
    const ticketData = {
        type: document.getElementById('issue-type').value,
        priority: document.getElementById('ticket-priority').value,
        description: document.getElementById('issue-description').value,
        user: currentUser.id // Backend will need the user ID
    };

    // Validate description
    if (!ticketData.description.trim()) return alert("Please enter a description");

    // Log data for backend
    console.log("Data ready for Backend API:", ticketData);
    
    /* 
       BACKEND TEAM: 
       Insert your POST request here. 
       On success, call goToChat(newTicketId from server);
    */
}

// UI LOGIC: Rendering messages in chat
function renderMessages() {
    // Get chat box element
    const chatBox = document.getElementById('chat-box');
    // The backend team will populate the 'messages' array from the DB
    // Render messages
    chatBox.innerHTML = messages.map(m => `
        <div class="msg ${m.sender === currentUser.name ? 'sent' : 'received'}">
            <div class="msg-text">${m.text}</div>
            <div class="msg-meta"><span>${m.time}</span></div>
        </div>
    `).join('');
}