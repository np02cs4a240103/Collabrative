// --- INITIAL STATE ---
let currentUser = null;
let messages = []; // Array of message objects: {id, text, sender, sector, time}
let mockUsers = [
    { name: "Admin", email: "admin@uni.com", role: "admin" },
    { name: "John Doe", email: "student@uni.com", role: "user" }
];

// --- NAVIGATION & VIEW LOGIC ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
}

function toggleAuth() {
    document.getElementById('login-form').classList.toggle('hidden');
    document.getElementById('signup-form').classList.toggle('hidden');
}

// --- APP ENTRY LOGIC ---

// By default, the landing page is shown. 
// Use this to enter the login screen.
function enterApp() {
    const landing = document.getElementById('landing-page');
    const auth = document.getElementById('auth-section');

    // Add fade out animation
    landing.classList.add('animate__animated', 'animate__fadeOut');
    
    setTimeout(() => {
        landing.classList.add('hidden');
        auth.classList.remove('hidden');
        auth.classList.add('animate__animated', 'animate__fadeIn');
    }, 500);
}

// Update your logout function to return to the landing page instead of just login
function logout() {
    currentUser = null;
    showView('landing-page'); // Return to the very beginning
}

// --- AUTHENTICATION (CREATE / READ) ---

function handleSignup() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;

    if (name && email && pass) {
        mockUsers.push({ name, email, role: 'user' });
        alert("Account created successfully! Please Sign In.");
        toggleAuth();
    } else {
        alert("Please fill in all fields.");
    }
}

function handleLogin() {
    const email = document.getElementById('login-email').value;
    
    if (email === "admin@uni.com") {
        currentUser = { name: "Admin", role: "admin" };
        showView('admin-dashboard');
        updateAdminDashboard();
    } else {
        const user = mockUsers.find(u => u.email === email);
        if (user) {
            currentUser = { name: user.name, role: "user" };
            document.getElementById('sb-user-name').innerText = currentUser.name;
            document.getElementById('welcome-msg').innerText = `Hello, ${currentUser.name}! 👋`;
            document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${user.name}&background=10b981&color=fff`;
            showView('user-dashboard');
            updateHistoryBadge();
        } else {
            alert("User not found. Try student@uni.com or Register.");
        }
    }
}

function logout() {
    currentUser = null;
    showView('auth-section');
}

// --- CHAT SYSTEM (CRUD) ---

let activeSector = "";

function openChat(sector) {
    activeSector = sector;
    document.getElementById('user-home').classList.add('hidden');
    document.getElementById('chat-history-view').classList.add('hidden');
    document.getElementById('chat-interface').classList.remove('hidden');
    document.getElementById('current-sector-title').innerText = sector;
    
    // UI Cleanup
    document.getElementById('btn-dash').classList.remove('active');
    renderMessages();
}

function showUserHome() {
    document.getElementById('user-home').classList.remove('hidden');
    document.getElementById('chat-history-view').classList.add('hidden');
    document.getElementById('chat-interface').classList.add('hidden');
    document.getElementById('btn-dash').classList.add('active');
    document.getElementById('btn-hist').classList.remove('active');
}

// 1. CREATE MESSAGE
function sendMessage() {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    
    if (!text) return;

    const newMessage = {
        id: Date.now(),
        text: text,
        sender: currentUser.name,
        sector: activeSector,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    messages.push(newMessage);
    input.value = "";
    renderMessages();
    updateHistoryBadge();
}

// 2. READ MESSAGES
function renderMessages() {
    const chatBox = document.getElementById('chat-box');
    // Filter messages only for the current active sector
    const sectorMessages = messages.filter(m => m.sector === activeSector);

    chatBox.innerHTML = sectorMessages.map(m => `
        <div class="msg ${m.sender === currentUser.name ? 'sent' : 'received'} animate__animated animate__fadeInUp animate__faster">
            <div class="msg-text">${m.text}</div>
            <div class="msg-meta">
                <span>${m.time}</span>
                <div class="crud-links">
                    <span onclick="editMessage(${m.id})"><i class="fas fa-edit"></i></span>
                    <span onclick="deleteMessage(${m.id})"><i class="fas fa-trash"></i></span>
                </div>
            </div>
        </div>
    `).join('');
    
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 3. UPDATE MESSAGE
function editMessage(id) {
    const msgObj = messages.find(m => m.id === id);
    const newText = prompt("Update your message:", msgObj.text);
    
    if (newText !== null && newText.trim() !== "") {
        msgObj.text = newText;
        renderMessages();
    }
}

// 4. DELETE MESSAGE
function deleteMessage(id) {
    if (confirm("Delete this message permanently?")) {
        messages = messages.filter(m => m.id !== id);
        renderMessages();
        updateHistoryBadge();
    }
}

// --- HISTORY LOGIC ---

function viewChatHistory() {
    document.getElementById('user-home').classList.add('hidden');
    document.getElementById('chat-interface').classList.add('hidden');
    document.getElementById('chat-history-view').classList.remove('hidden');
    document.getElementById('btn-dash').classList.remove('active');
    document.getElementById('btn-hist').classList.add('active');

    renderHistoryList();
}

function renderHistoryList() {
    const container = document.getElementById('history-list');
    const uniqueSectors = [...new Set(messages.map(m => m.sector))];

    if (uniqueSectors.length === 0) {
        container.innerHTML = `<p style="text-align:center; opacity:0.5; margin-top:50px;">No conversation history yet.</p>`;
        return;
    }

    container.innerHTML = uniqueSectors.map(sec => `
        <div class="sector-card s-green animate__animated animate__fadeIn" onclick="openChat('${sec}')" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h4>${sec}</h4>
                <small>Open to resume chat</small>
            </div>
            <i class="fas fa-chevron-right"></i>
        </div>
    `).join('');
}

function updateHistoryBadge() {
    const uniqueSectors = [...new Set(messages.map(m => m.sector))];
    document.getElementById('history-count').innerText = uniqueSectors.length;
}

// --- ADMIN DASHBOARD LOGIC ---

function updateAdminDashboard() {
    document.getElementById('total-users').innerText = mockUsers.length;
    document.getElementById('active-chats').innerText = messages.length;
    
    const adminList = document.getElementById('admin-chat-list');
    if (messages.length === 0) {
        adminList.innerHTML = `<p class="empty-msg">No activity yet.</p>`;
    } else {
        adminList.innerHTML = messages.map(m => `
            <div class="glass" style="padding:15px; margin-bottom:10px; display:flex; justify-content:space-between;">
                <div>
                    <strong>${m.sender}</strong> (${m.sector}): ${m.text}
                </div>
                <button onclick="deleteMessageAdmin(${m.id})" style="color:red; background:none; border:none; cursor:pointer;"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }
}

function deleteMessageAdmin(id) {
    messages = messages.filter(m => m.id !== id);
    updateAdminDashboard();
}
//---------------------------------------

// --- ADMIN VIEW MANAGEMENT ---
function showAdminTab(tabId) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    // Update active button UI
    document.querySelectorAll('.sb-link').forEach(btn => btn.classList.remove('active'));
    
    if (tabId === 'admin-stats-view') {
        document.getElementById('admin-btn-dash').classList.add('active');
        updateAdminDashboard();
    } else if (tabId === 'admin-users-view') {
        document.getElementById('admin-btn-users').classList.add('active');
        renderUserTable();
    } else if (tabId === 'admin-chats-view') {
        document.getElementById('admin-btn-chats').classList.add('active');
        renderAdminChatQueue();
    }
}

// --- USER MANAGEMENT (CRUD) ---

// READ Users
function renderUserTable() {
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = mockUsers.map((user, index) => `
        <tr>
            <td><strong>${user.name}</strong></td>
            <td>${user.email}</td>
            <td><span class="badge" style="background:#e2e8f0; color:#475569">${user.role.toUpperCase()}</span></td>
            <td>
                <button class="btn-icon btn-edit" onclick="adminEditUser(${index})"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-del" onclick="adminDeleteUser(${index})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// CREATE User
function adminAddUser() {
    const name = prompt("Enter User Full Name:");
    const email = prompt("Enter User Email:");
    if (name && email) {
        mockUsers.push({ name, email, role: 'user' });
        renderUserTable();
    }
}

// UPDATE User
function adminEditUser(index) {
    const newName = prompt("Edit Name:", mockUsers[index].name);
    const newEmail = prompt("Edit Email:", mockUsers[index].email);
    if (newName && newEmail) {
        mockUsers[index].name = newName;
        mockUsers[index].email = newEmail;
        renderUserTable();
    }
}

// DELETE User
function adminDeleteUser(index) {
    if (confirm("Are you sure? This will remove the user permanently.")) {
        mockUsers.splice(index, 1);
        renderUserTable();
    }
}

// --- ADMIN LIVE CHAT (Responding) ---

let adminSelectedUser = null;
let adminSelectedSector = null;

// READ: Chat Queue
function renderAdminChatQueue() {
    const queueList = document.getElementById('admin-queue-list');
    // Get unique user/sector combinations that have messages
    const activeThreads = [];
    const seen = new Set();

    messages.forEach(m => {
        const key = `${m.sender}-${m.sector}`;
        if (!seen.has(key)) {
            activeThreads.push({ sender: m.sender, sector: m.sector });
            seen.add(key);
        }
    });

    if (activeThreads.length === 0) {
        queueList.innerHTML = `<p style="font-size:0.8rem; opacity:0.5;">No active tickets.</p>`;
        return;
    }

    queueList.innerHTML = activeThreads.map(thread => `
        <div class="queue-item ${adminSelectedUser === thread.sender ? 'active' : ''}" onclick="openAdminChat('${thread.sender}', '${thread.sector}')">
            <p>${thread.sender}</p>
            <small>${thread.sector}</small>
        </div>
    `).join('');

    document.getElementById('admin-msg-count').innerText = activeThreads.length;
}

// READ: Selected User Chat
function openAdminChat(userName, sector) {
    adminSelectedUser = userName;
    adminSelectedSector = sector;

    document.getElementById('admin-chat-placeholder').classList.add('hidden');
    document.getElementById('admin-active-chat-box').classList.remove('hidden');
    document.getElementById('admin-chat-target').innerText = userName;
    document.getElementById('admin-chat-sector').innerText = sector;

    renderAdminMessages();
    renderAdminChatQueue(); // Refresh active state
}

function renderAdminMessages() {
    const chatBox = document.getElementById('admin-messages');
    // Find messages between this user and sector
    const filtered = messages.filter(m => 
        (m.sender === adminSelectedUser && m.sector === adminSelectedSector) || 
        (m.sender === "Admin" && m.targetUser === adminSelectedUser && m.sector === adminSelectedSector)
    );

    chatBox.innerHTML = filtered.map(m => `
        <div class="msg ${m.sender === "Admin" ? 'sent' : 'received'} animate__animated animate__fadeIn">
            <div class="msg-text">${m.text}</div>
            <div class="msg-meta">${m.time}</div>
        </div>
    `).join('');
    chatBox.scrollTop = chatBox.scrollHeight;
}

// CREATE: Admin Response
function adminSendReply() {
    const input = document.getElementById('admin-reply-input');
    const text = input.value.trim();
    if (!text || !adminSelectedUser) return;

    const reply = {
        id: Date.now(),
        text: text,
        sender: "Admin",
        targetUser: adminSelectedUser, // Specific to admin replies
        sector: adminSelectedSector,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    messages.push(reply);
    input.value = "";
    renderAdminMessages();
}

// --- SYSTEM STATS UPDATE ---
function updateAdminDashboard() {
    document.getElementById('stat-total-users').innerText = mockUsers.length;
    document.getElementById('stat-total-msgs').innerText = messages.length;
    
    // Active chats = unique user/sector threads
    const uniqueThreads = [...new Set(messages.map(m => `${m.sender}-${m.sector}`))];
    document.getElementById('stat-active-sessions').innerText = uniqueThreads.length;
}