let activeSector = "";
let currentTicketId = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAccess('user');
    initUI();
});

function initUI() {
    const name = currentUser.name || "User";
    document.getElementById('sb-user-name').innerText = name;
    document.getElementById('welcome-msg').innerText = `Hello, ${name}! 👋`;
    
    // Set initials SA
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    document.querySelector('.avatar-initials').innerText = initials;
}

// UI LOGIC: Switches views
function openChat(sector) {
    activeSector = sector;
    document.querySelectorAll('.main-content-green > div').forEach(div => div.classList.add('hidden'));
    
    const formView = document.getElementById('ticket-form-view');
    formView.classList.remove('hidden');
    formView.style.display = 'flex'; 
    document.getElementById('issue-type').value = sector;
}

// FRONTEND ACTION: Collects data for backend
function submitTicket() {
    const ticketData = {
        type: document.getElementById('issue-type').value,
        priority: document.getElementById('ticket-priority').value,
        description: document.getElementById('issue-description').value,
        user: currentUser.id // Backend will need the user ID
    };

    if (!ticketData.description.trim()) return alert("Please enter a description");

    console.log("Data ready for Backend API:", ticketData);
    
    /* 
       BACKEND TEAM: 
       Insert your POST request here. 
       On success, call goToChat(newTicketId from server);
    */
}

// UI LOGIC: Rendering
function renderMessages() {
    const chatBox = document.getElementById('chat-box');
    // The backend team will populate the 'messages' array from the DB
    chatBox.innerHTML = messages.map(m => `
        <div class="msg ${m.sender === currentUser.name ? 'sent' : 'received'}">
            <div class="msg-text">${m.text}</div>
            <div class="msg-meta"><span>${m.time}</span></div>
        </div>
    `).join('');
}