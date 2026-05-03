let activeSector = "";
let currentTicketId = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAccess('Student');
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

function openChatInterface(sector, ticketId) {
    activeSector = sector;
    currentTicketId = ticketId;
    
    document.querySelectorAll('.main-content-green > div').forEach(div => {
        div.classList.add('hidden');
        div.style.display = 'none';
    });
    
    const chatInterface = document.getElementById('chat-interface');
    chatInterface.classList.remove('hidden');
    chatInterface.style.display = 'block';
    
    document.getElementById('current-sector-title').innerText = sector;
    
    loadMessages(ticketId);
    
    // Poll for new messages every 3 seconds
    if (window.chatInterval) clearInterval(window.chatInterval);
    window.chatInterval = setInterval(() => {
        loadMessages(ticketId);
    }, 3000);
}

// FRONTEND ACTION: Collects data for backend
async function submitTicket() {
    const type = document.getElementById('issue-type').value;
    const priority = document.getElementById('ticket-priority').value;
    const description = document.getElementById('issue-description').value;

    if (!description.trim()) return alert("Please enter a description");

    const deptMap = {
        'Student Support': 2, // IT
        'Finance': 4, // Finance
        'Entertainment': 3, // Administration
        'General': 3,
        'Academic': 1,
        'Library': 5,
        'Hostel': 6,
        'Examination': 7
    };

    const payload = {
        title: type + ' Issue',
        description: description,
        department_id: deptMap[type] || 2,
        priority: priority
    };

    try {
        const response = await fetch('tickets.php?action=create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.success) {
            alert("Ticket raised successfully!");
            document.getElementById('issue-description').value = '';
            
            // FIX: Open chat directly instead of returning to dashboard
            openChatInterface(type, result.data.ticket_id);
        } else {
            alert(result.message || "Failed to submit ticket");
        }
    } catch (e) {
        console.error(e);
        alert("Server error. Please try again.");
    }
}

async function loadMessages(ticketId) {
    try {
        const response = await fetch(`messages.php?action=list&ticket_id=${ticketId}`, { cache: 'no-store' });
        const result = await response.json();
        if (result.success) {
            renderMessages(result.data.messages);
            
            // Update status badge
            const statusBadge = document.getElementById('current-ticket-status');
            if (statusBadge) {
                statusBadge.innerText = result.data.status;
                if (result.data.status === 'solved' || result.data.status === 'closed') {
                    statusBadge.className = 'status-badge status-solved';
                    document.getElementById('msg-input').disabled = true;
                    document.getElementById('msg-input').placeholder = "Chat closed.";
                } else {
                    statusBadge.className = 'status-badge status-pending';
                    document.getElementById('msg-input').disabled = false;
                    document.getElementById('msg-input').placeholder = "Type here...";
                }
            }
        }
    } catch (e) {
        console.error("Error loading messages", e);
    }
}

// UI LOGIC: Rendering
function renderMessages(msgs) {
    const chatBox = document.getElementById('chat-box');

    chatBox.innerHTML = msgs.map(m => `
        <div class="msg ${m.sender_name === currentUser.name ? 'sent' : 'received'} animate__animated animate__fadeInUp animate__faster">
            <div class="msg-text">${m.message}</div>
            <div class="msg-meta">
                <span>${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>
    `).join('');
    
    // Auto-scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;
}

function showUserHome() {
    if (window.chatInterval) clearInterval(window.chatInterval);
    document.getElementById('user-home').classList.remove('hidden');
    document.getElementById('chat-history-view').classList.add('hidden');
    document.getElementById('chat-interface').classList.add('hidden');
    document.getElementById('ticket-form-view').classList.add('hidden');
    document.getElementById('ticket-form-view').style.display = 'none';
    document.getElementById('btn-dash').classList.add('active');
    document.getElementById('btn-hist').classList.remove('active');
}

async function sendMessage() {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    
    if (!text || !currentTicketId) return;

    input.value = "";

    try {
        const response = await fetch('messages.php?action=send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket_id: currentTicketId, message: text })
        });
        const result = await response.json();
        if (result.success) {
            loadMessages(currentTicketId);
        } else {
            alert("Failed to send message");
        }
    } catch (e) {
        console.error(e);
    }
}

async function viewChatHistory() {
    if (window.chatInterval) clearInterval(window.chatInterval);
    document.querySelectorAll('.main-content-green > div').forEach(div => {
        div.classList.add('hidden');
        div.style.display = 'none';
    });
    
    document.getElementById('chat-history-view').classList.remove('hidden');
    document.getElementById('chat-history-view').style.display = 'block';
    
    document.getElementById('btn-dash').classList.remove('active');
    document.getElementById('btn-hist').classList.add('active');

    // Fetch tickets for this user
    try {
        const response = await fetch('tickets.php?action=list', { cache: 'no-store' });
        const result = await response.json();
        if (result.success) {
            renderHistoryList(result.data);
            const badge = document.getElementById('history-count');
            if(badge) badge.innerText = result.data.length;
        }
    } catch (e) {
        console.error("Error loading chat history", e);
    }
}

function renderHistoryList(ticketsList) {
    const container = document.getElementById('history-list');

    if (ticketsList.length === 0) {
        container.innerHTML = `<p style="text-align:center; opacity:0.5; margin-top:50px;">No conversation history yet.</p>`;
        return;
    }

    container.innerHTML = ticketsList.map(t => `
        <div class="sector-card s-green animate__animated animate__fadeIn" onclick="openChatInterface('${t.dept_name}', ${t.id})" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
            <div>
                <h4>${t.title}</h4>
                <small>Status: ${t.status} | Priority: ${t.priority}</small>
            </div>
            <i class="fas fa-chevron-right"></i>
        </div>
    `).join('');
}