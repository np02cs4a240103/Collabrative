document.addEventListener('DOMContentLoaded', () => {
    checkAccess('Admin');
    showAdminTab('admin-stats-view');
});

let currentAdminTicketId = null;


async function fetchAndRenderTickets() {
    try {
        const response = await fetch('dashboard.php', { cache: 'no-store' });
        const result = await response.json();
        if (result.success) {
            const data = result.data;
            tickets = data.recent_tickets; // Update global for recent tickets display

            // Render recent tickets table
            const tbody = document.getElementById('recent-tickets-table');
            if (tbody) {
                if (tickets.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No recent issues found.</td></tr>';
                } else {
                    tbody.innerHTML = tickets.map(t => `
                        <tr>
                            <td><strong>${t.user_name}</strong></td>
                            <td>${t.dept_name}</td>
                            <td>${t.priority}</td>
                            <td><span class="status-badge ${t.status === 'solved' || t.status === 'closed' ? 'status-solved' : 'status-pending'}">${t.status}</span></td>
                            <td>${new Date(t.created_at).toLocaleString()}</td>
                        </tr>
                    `).join('');
                }
            }

            // Update stats
            const activeCount = (data.stats['notstarted'] || 0) + (data.stats['started'] || 0) + (data.stats['process'] || 0);

            const activeSessionsEl = document.getElementById('stat-active-sessions');
            if (activeSessionsEl) activeSessionsEl.innerText = activeCount;

            const totalUsersEl = document.getElementById('stat-total-users');
            if (totalUsersEl) totalUsersEl.innerText = data.total_users || 0;

            const totalMsgsEl = document.getElementById('stat-total-msgs');
            if (totalMsgsEl) totalMsgsEl.innerText = data.total_msgs || 0;

            // Render chat queue if we are on the chats tab
            renderAdminChatQueue();
        }
    } catch (e) {
        console.error("Error fetching dashboard data", e);
    }
}

function showAdminTab(id) {
    if (window.adminChatInterval) clearInterval(window.adminChatInterval);
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));

    const formView = document.getElementById('admin-ticket-form-view');
    if (formView) {
        formView.classList.add('hidden');
        formView.style.display = 'none';
    }

    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');

    if (id === 'admin-stats-view') {
        fetchAndRenderTickets();
    } else if (id === 'admin-users-view') {
        fetchUsers();
    } else if (id === 'admin-chats-view') {
        fetchAndRenderTickets(); // to refresh the queue
    }
}

// ----------------------------------------------------
// USER MANAGEMENT
// ----------------------------------------------------

async function fetchUsers() {
    try {
        const response = await fetch('users.php?action=list', { cache: 'no-store' });
        const result = await response.json();
        if (result.success) {
            const tbody = document.getElementById('user-table-body');
            tbody.innerHTML = result.data.map(u => `
                <tr>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td>${u.role} ${u.department_name ? `(${u.department_name})` : ''}</td>
                    <td>
                        <button class="btn-primary" style="padding: 5px 10px; font-size: 0.8rem;" onclick='editUser(${JSON.stringify(u)})'><i class="fas fa-edit"></i></button>
                        <button class="btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        console.error("Error fetching users", e);
    }
}

function adminAddUser() {
    document.getElementById('user-modal-title').innerText = 'Add User';
    document.getElementById('user-id').value = '';
    document.getElementById('user-name').value = '';
    document.getElementById('user-email').value = '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-role').value = 'Student';
    document.getElementById('user-department').value = '';
    toggleDepartmentSelect();

    document.getElementById('user-modal').style.display = 'flex';
}

function editUser(user) {
    document.getElementById('user-modal-title').innerText = 'Edit User';
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-name').value = user.name;
    document.getElementById('user-email').value = user.email;
    document.getElementById('user-password').value = '';
    document.getElementById('user-role').value = user.role;
    toggleDepartmentSelect();

    // Select department using text matching or skip if not staff
    if (user.role === 'Staff' && user.department_name) {
        const options = document.getElementById('user-department').options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].text === user.department_name) {
                document.getElementById('user-department').selectedIndex = i;
                break;
            }
        }
    }

    document.getElementById('user-modal').style.display = 'flex';
}

function toggleDepartmentSelect() {
    const role = document.getElementById('user-role').value;
    document.getElementById('user-dept-group').style.display = role === 'Staff' ? 'block' : 'none';
}

function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
}

async function saveUser() {
    const id = document.getElementById('user-id').value;
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;
    const department_id = role === 'Staff' ? document.getElementById('user-department').value : '';

    if (!name || !email || (!id && !password)) {
        return alert('Please fill in required fields.');
    }

    const payload = { id, name, email, password, role, department_id };
    const action = id ? 'update' : 'create';

    try {
        const response = await fetch(`users.php?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            closeUserModal();
            fetchUsers();
        } else {
            alert(result.message || 'Error saving user');
        }
    } catch (e) {
        console.error(e);
        alert('Server error');
    }
}

async function deleteUser(id) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
        const response = await fetch('users.php?action=delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            fetchUsers();
        } else {
            alert(result.message || 'Error deleting user');
        }
    } catch (e) {
        console.error(e);
        alert('Server error');
    }
}

// ----------------------------------------------------
// INTERNAL TICKETS
// ----------------------------------------------------

function openAdminTicketForm() {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
    const formView = document.getElementById('admin-ticket-form-view');
    formView.classList.remove('hidden');
    formView.style.display = 'flex';
}

async function submitAdminTicket() {
    const type = document.getElementById('admin-issue-type').value;
    const priority = document.getElementById('admin-ticket-priority').value;
    const description = document.getElementById('admin-issue-description').value;

    if (!description.trim()) return alert("Please enter a description");

    const payload = {
        title: 'Internal: ' + type,
        description: description,
        department_id: 2, // Defaulting to Administration for internal
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
            alert("Internal ticket created successfully!");
            document.getElementById('admin-issue-description').value = '';
            showAdminTab('admin-stats-view');
        } else {
            alert(result.message || "Failed to create ticket");
        }
    } catch (e) {
        console.error(e);
        alert("Server error. Please try again.");
    }
}

// ----------------------------------------------------
// LIVE CHATS
// ----------------------------------------------------

function renderAdminChatQueue() {
    const queueList = document.getElementById('admin-queue-list');
    if (!queueList) return;

    // Filter tickets that are not solved or closed
    const activeTickets = tickets.filter(t => t.status !== 'solved' && t.status !== 'closed');

    // Update the Live badge count in the sidebar
    const badge = document.getElementById('admin-msg-count');
    if (badge) badge.innerText = activeTickets.length;

    if (activeTickets.length === 0) {
        queueList.innerHTML = '<p style="text-align:center; padding:20px; color:#aaa;">No active tickets.</p>';
        return;
    }

    queueList.innerHTML = activeTickets.map(t => `
        <div class="queue-item glass" onclick="openAdminChat(${t.id}, '${t.user_name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${t.title.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${t.status}')" style="cursor:pointer; margin-bottom:10px; padding:10px; border-radius:10px; transition:background 0.2s;" onmouseover="this.style.background='rgba(var(--green-rgb),0.1)'" onmouseout="this.style.background=''">
            <h4 style="margin:0 0 4px">${t.user_name}</h4>
            <p style="margin:0 0 4px; font-size:0.9rem">${t.title}</p>
            <small style="color:var(--green-primary)">Status: ${t.status} | Priority: ${t.priority}</small>
        </div>
    `).join('');
}

function openAdminChat(ticketId, userName, title, status) {
    currentAdminTicketId = ticketId;

    document.getElementById('admin-active-chat-box').classList.remove('hidden');
    document.getElementById('admin-chat-input-area').style.display = 'flex';
    document.getElementById('admin-chat-target').innerText = userName;
    document.getElementById('admin-chat-sector').innerText = title;

    const statusSelect = document.getElementById('admin-ticket-status');
    if (statusSelect && status) {
        statusSelect.value = status;
    }

    loadAdminMessages(ticketId);

    if (window.adminChatInterval) clearInterval(window.adminChatInterval);
    window.adminChatInterval = setInterval(() => {
        loadAdminMessages(ticketId);
    }, 3000);
}

async function loadAdminMessages(ticketId) {
    try {
        const response = await fetch(`messages.php?action=list&ticket_id=${ticketId}`, { cache: 'no-store' });
        const result = await response.json();
        if (result.success) {
            renderAdminMessages(result.data.messages);
        }
    } catch (e) {
        console.error("Error loading messages", e);
    }
}

function renderAdminMessages(msgs) {
    const chatBox = document.getElementById('admin-messages');

    chatBox.innerHTML = msgs.map(m => `
        <div class="msg ${m.sender_name === currentUser.name ? 'sent' : 'received'} animate__animated animate__fadeInUp animate__faster">
            <div class="msg-text"><strong>${m.sender_name}:</strong><br>${m.message}</div>
            <div class="msg-meta">
                <span>${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>
    `).join('');

    chatBox.scrollTop = chatBox.scrollHeight;
}

async function adminSendReply() {
    const input = document.getElementById('admin-reply-input');
    const text = input.value.trim();

    if (!text || !currentAdminTicketId) return;

    input.value = "";

    try {
        const response = await fetch('messages.php?action=send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket_id: currentAdminTicketId, message: text })
        });
        const result = await response.json();
        if (result.success) {
            loadAdminMessages(currentAdminTicketId);
        } else {
            alert("Failed to send message");
        }
    } catch (e) {
        console.error(e);
    }
}

async function updateTicketStatus(status) {
    if (!currentAdminTicketId) return;

    try {
        const response = await fetch('tickets.php?action=update_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentAdminTicketId, status: status })
        });
        const result = await response.json();
        if (result.success) {
            alert("Ticket status updated to " + status + "!");
            if (status === 'solved' || status === 'closed') {
                document.getElementById('admin-active-chat-box').classList.add('hidden');
                document.getElementById('admin-chat-input-area').style.display = 'none';
                document.getElementById('admin-messages').innerHTML = '';
                if (window.adminChatInterval) clearInterval(window.adminChatInterval);
            }
            fetchAndRenderTickets();
        } else {
            alert("Error updating ticket status");
        }
    } catch (e) {
        console.error(e);
    }
}