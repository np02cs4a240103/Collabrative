// Wait for the HTML document to fully load before running scripts
document.addEventListener('DOMContentLoaded', () => {
    // Restrict access: Only Admins can view this page
    checkAccess('Admin');
    // Load the default Overview tab immediately
    showAdminTab('admin-stats-view');
});

// Global variable to keep track of which ticket the Admin is currently chatting in
let currentAdminTicketId = null;


/**
 * Fetches dashboard statistics and the list of recent tickets from the backend.
 * Populates the 'Overview' tab cards and the recent issues table.
 */
async function fetchAndRenderTickets() {
    try {
        const response = await fetch('dashboard.php', { cache: 'no-store' });
        const result = await response.json();
        if (result.success) {
            const data = result.data;
            tickets = data.recent_tickets; // Update global variable for live chat queue display

            // Render the "Recent User Issues" table
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

            // Calculate how many tickets are currently active (not solved/closed)
            const activeCount = (data.stats['notstarted'] || 0) + (data.stats['started'] || 0) + (data.stats['process'] || 0);

            // Update the statistic cards at the top of the Overview tab
            const activeSessionsEl = document.getElementById('stat-active-sessions');
            if (activeSessionsEl) activeSessionsEl.innerText = activeCount;

            const totalUsersEl = document.getElementById('stat-total-users');
            if (totalUsersEl) totalUsersEl.innerText = data.total_users || 0;

            const totalMsgsEl = document.getElementById('stat-total-msgs');
            if (totalMsgsEl) totalMsgsEl.innerText = data.total_msgs || 0;

            const pendingEl = document.getElementById('stat-pending-approvals');
            if (pendingEl) pendingEl.innerText = data.pending_approvals || 0;

            // Automatically refresh the sidebar live chat queue with the new data
            renderAdminChatQueue();
        }
    } catch (e) {
        console.error("Error fetching dashboard data", e);
    }
}

/**
 * Navigation handler: Switches between different Admin views (Overview, Users, Live Chats)
 * @param {string} id - The ID of the HTML container to display
 */
function showAdminTab(id) {
    if (window.adminChatInterval) clearInterval(window.adminChatInterval); // Stop chat polling when switching tabs
    
    // Hide all main tabs
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));

    // Also hide the internal ticket form if it's open
    const formView = document.getElementById('admin-ticket-form-view');
    if (formView) {
        formView.classList.add('hidden');
        formView.style.display = 'none';
    }

    // Show the requested tab
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');

    // Trigger data fetching depending on which tab was opened
    if (id === 'admin-stats-view') {
        fetchAndRenderTickets(); // Refresh overview stats
    } else if (id === 'admin-users-view') {
        fetchUsers(); // Refresh the user management table
    } else if (id === 'admin-chats-view') {
        fetchAndRenderTickets(); // Refresh the live chat queue
    }
}

// ----------------------------------------------------
// USER MANAGEMENT (Tab 2)
// ----------------------------------------------------

/**
 * Fetches the list of all registered users from the backend and populates the User Management table.
 */
async function fetchUsers() {
    try {
        const response = await fetch('users.php?action=list', { cache: 'no-store' });
        const result = await response.json();
        if (result.success) {
            const tbody = document.getElementById('user-table-body');
            tbody.innerHTML = result.data.map(u => {
                const isActive = parseInt(u.is_active);
                const isApproved = parseInt(u.is_approved);
                
                // Determine the action buttons available for this user
                // By default, show Enable/Disable if they are already approved
                let actionBtns = `
                    <button class="${isActive ? 'btn-danger' : 'btn-success'}" style="padding: 6px 10px; font-size: 0.8rem; border: none; border-radius: 6px; cursor: pointer; color: #fff; font-weight: 600; transition: all 0.2s ease;" onclick="toggleUserStatus(${u.id}, ${isActive})">
                        <i class="fas ${isActive ? 'fa-ban' : 'fa-check-circle'}" style="margin-right: 4px;"></i>${isActive ? 'Disable' : 'Enable'}
                    </button>
                `;

                // If the user is newly registered and hasn't been approved yet, show Approve/Reject instead
                if (!isApproved) {
                    actionBtns = `
                        <button class="btn-success" style="padding: 6px 10px; font-size: 0.8rem; border: none; border-radius: 6px; cursor: pointer; color: #fff; font-weight: 600; margin-right: 5px;" onclick="approveUser(${u.id})">
                            <i class="fas fa-user-check"></i> Approve
                        </button>
                        <button class="btn-danger" style="padding: 6px 10px; font-size: 0.8rem; border: none; border-radius: 6px; cursor: pointer; color: #fff; font-weight: 600;" onclick="toggleUserStatus(${u.id}, 1)">
                            <i class="fas fa-ban"></i> Reject
                        </button>
                    `;
                }

                // Render the table row. Disabled users are faded, unapproved users have a yellow background.
                return `
                <tr style="${!isActive ? 'opacity: 0.55;' : (!isApproved ? 'background-color: #fef9c3;' : '')}">
                    <td><strong>${u.name}</strong> ${!isApproved ? '<span class="status-badge status-pending" style="font-size:0.6rem; padding:2px 4px; margin-left:5px;">Pending</span>' : ''}</td>
                    <td>${u.email}</td>
                    <td>${u.role} ${u.department_name ? `(${u.department_name})` : ''}</td>
                    <td>${actionBtns}</td>
                </tr>
            `}).join('');
        }
    } catch (e) {
        console.error("Error fetching users", e);
    }
}

/**
 * Prepares and opens the User Modal for creating a brand new user.
 * (Note: The button for this is currently hidden in the UI per user request, but the logic remains.)
 */
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

/**
 * Prepares and opens the User Modal for editing an existing user.
 * Populates the modal fields with the user's current data.
 * @param {Object} user - The user object to edit
 */
function editUser(user) {
    document.getElementById('user-modal-title').innerText = 'Edit User';
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-name').value = user.name;
    document.getElementById('user-email').value = user.email;
    document.getElementById('user-password').value = ''; // Don't show password hash
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

/**
 * Dynamically shows/hides the Department dropdown in the User Modal.
 * Only Staff members need a department assigned to them.
 */
function toggleDepartmentSelect() {
    const role = document.getElementById('user-role').value;
    document.getElementById('user-dept-group').style.display = role === 'Staff' ? 'block' : 'none';
}

/**
 * Hides the User Add/Edit modal.
 */
function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
}

/**
 * Validates and submits the User Add/Edit form data to the backend.
 */
async function saveUser() {
    const id = document.getElementById('user-id').value;
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;
    const department_id = role === 'Staff' ? document.getElementById('user-department').value : '';

    // Basic form validation
    if (!name || !email || (!id && !password)) {
        return alert('Please fill in required fields.');
    }

    const payload = { id, name, email, password, role, department_id };
    // Decide whether to call the create or update endpoint based on if an ID exists
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
            closeUserModal(); // Hide modal on success
            fetchUsers();     // Refresh the table to show the change
        } else {
            alert(result.message || 'Error saving user');
        }
    } catch (e) {
        console.error(e);
        alert('Server error');
    }
}

/**
 * Flips a user's active status (Enabled <-> Disabled).
 * Disabled users cannot log in.
 * @param {number} id - The database ID of the user
 * @param {number|boolean} currentStatus - 1 if currently active, 0 if disabled
 */
async function toggleUserStatus(id, currentStatus) {
    const action = currentStatus ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
        const response = await fetch('users.php?action=toggle_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            fetchUsers(); // Refresh the table
        } else {
            alert(result.message || 'Error updating user status');
        }
    } catch (e) {
        console.error(e);
        alert('Server error');
    }
}

/**
 * Grants access to a newly registered user who is pending approval.
 * Sets their `is_approved` status to 1 in the database.
 * @param {number} id - User ID
 */
async function approveUser(id) {
    if (!confirm("Approve this user for system access?")) return;
    try {
        const response = await fetch('users.php?action=approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const result = await response.json();
        if (result.success) {
            alert("User approved successfully!");
            fetchUsers();            // Refresh user table
            fetchAndRenderTickets(); // Refresh dashboard stats to update the "Pending Approvals" count
        } else {
            alert(result.message || 'Error approving user');
        }
    } catch (e) {
        console.error(e);
        alert('Server error');
    }
}

// ----------------------------------------------------
// USER DETAIL MODAL (Admin Viewer)
// ----------------------------------------------------

/**
 * Opens a detailed modal for a specific user, showing their profile and complete ticket history.
 * @param {number} id - User ID
 */
async function viewUserDetail(id) {
    document.getElementById('user-detail-modal').style.display = 'flex';
    document.getElementById('ud-name').innerText = 'Loading...';
    document.getElementById('ud-tickets-body').innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>';

    try {
        // Fetch basic user information
        const userRes = await fetch(`users.php?action=detail&id=${id}`, { cache: 'no-store' });
        const userResult = await userRes.json();
        
        if (userResult.success) {
            const u = userResult.data;
            document.getElementById('ud-name').innerText = u.name;
            document.getElementById('ud-email').innerText = u.email;
            document.getElementById('ud-role').innerText = u.role;
            document.getElementById('ud-dept').innerText = u.department_name || '-';
            
            const isActive = parseInt(u.is_active);
            const isApproved = parseInt(u.is_approved);
            
            // Format the user's status string with icons and colors
            let statusHtml = isActive ? '<span style="color:var(--green-primary);"><i class="fas fa-check-circle"></i> Active</span>' : '<span style="color:red;"><i class="fas fa-ban"></i> Disabled</span>';
            if (!isApproved) statusHtml += ' | <span style="color:orange;"><i class="fas fa-clock"></i> Pending Approval</span>';
            
            document.getElementById('ud-status').innerHTML = statusHtml;
            document.getElementById('ud-joined').innerText = new Date(u.created_at).toLocaleString();
        }

        // Fetch the user's entire ticket history
        const tixRes = await fetch(`tickets.php?action=list&user_id=${id}`, { cache: 'no-store' });
        const tixResult = await tixRes.json();
        
        if (tixResult.success) {
            const tbody = document.getElementById('ud-tickets-body');
            if (tixResult.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No tickets found.</td></tr>';
            } else {
                tbody.innerHTML = tixResult.data.map(t => `
                    <tr>
                        <td>${t.dept_name}</td>
                        <td>${t.title}</td>
                        <td>${t.priority}</td>
                        <td><span class="status-badge ${t.status === 'solved' || t.status === 'closed' ? 'status-solved' : 'status-pending'}">${t.status}</span></td>
                        <td>${new Date(t.created_at).toLocaleString()}</td>
                        <td>
                            <!-- Button to jump directly into the live chat for this specific ticket -->
                            <button class="btn-icon" style="background:var(--green-light); color:var(--green-primary);" onclick="openAdminChatFromDetail(${t.id}, '${t.user_name.replace(/'/g, "\\'")}', '${t.title.replace(/'/g, "\\'")}', '${t.status}')" title="Open Chat">
                                <i class="fas fa-comment"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (e) {
        console.error("Error viewing user details", e);
    }
}

/**
 * Closes the User Detail modal.
 */
function closeUserDetailModal() {
    document.getElementById('user-detail-modal').style.display = 'none';
}

/**
 * Helper function to transition from the User Detail modal directly into the Live Chat tab.
 */
function openAdminChatFromDetail(ticketId, userName, title, status) {
    closeUserDetailModal();
    showAdminTab('admin-chats-view');
    openAdminChat(ticketId, userName, title, status);
}

// ----------------------------------------------------
// INTERNAL TICKETS
// ----------------------------------------------------

/**
 * Opens the form for administrators to log internal maintenance/system issues.
 */
function openAdminTicketForm() {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
    const formView = document.getElementById('admin-ticket-form-view');
    formView.classList.remove('hidden');
    formView.style.display = 'flex';
}

/**
 * Submits the internal admin ticket to the database.
 */
async function submitAdminTicket() {
    const type = document.getElementById('admin-issue-type').value;
    const priority = document.getElementById('admin-ticket-priority').value;
    const description = document.getElementById('admin-issue-description').value;

    if (!description.trim()) return alert("Please enter a description");

    const payload = {
        title: 'Internal: ' + type,
        description: description,
        department_id: 2, // Hardcoded to Administration department for internal issues
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
            showAdminTab('admin-stats-view'); // Return to overview on success
        } else {
            alert(result.message || "Failed to create ticket");
        }
    } catch (e) {
        console.error(e);
        alert("Server error. Please try again.");
    }
}

// ----------------------------------------------------
// LIVE CHATS (Tab 3)
// ----------------------------------------------------

/**
 * Renders the sidebar queue of active tickets on the Live Chats tab.
 * Allows the admin to quickly click between ongoing user issues.
 */
function renderAdminChatQueue() {
    const queueList = document.getElementById('admin-queue-list');
    if (!queueList) return;

    // Filter tickets to show ONLY those that are NOT solved or closed
    const activeTickets = tickets.filter(t => t.status !== 'solved' && t.status !== 'closed');

    // Update the notification badge on the "Live" sidebar button
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

/**
 * Opens a specific ticket's live chat window.
 */
function openAdminChat(ticketId, userName, title, status) {
    currentAdminTicketId = ticketId; // Remember which ticket we are chatting in

    // Show the chat interface
    document.getElementById('admin-active-chat-box').classList.remove('hidden');
    document.getElementById('admin-chat-input-area').style.display = 'flex';
    
    // Set chat header details
    document.getElementById('admin-chat-target').innerText = userName;
    document.getElementById('admin-chat-sector').innerText = title;

    // Set the ticket status dropdown to match the current status
    const statusSelect = document.getElementById('admin-ticket-status');
    if (statusSelect && status) {
        statusSelect.value = status;
    }

    loadAdminMessages(ticketId);

    // Set up polling to check for new user replies every 3 seconds
    if (window.adminChatInterval) clearInterval(window.adminChatInterval);
    window.adminChatInterval = setInterval(() => {
        loadAdminMessages(ticketId);
    }, 3000);
}

/**
 * Fetches all messages for the currently open chat.
 */
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

/**
 * Renders the fetched messages into HTML bubbles.
 */
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

    // Auto-scroll to the bottom of the chat
    chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Sends the admin's typed reply to the database.
 */
async function adminSendReply() {
    const input = document.getElementById('admin-reply-input');
    const text = input.value.trim();

    if (!text || !currentAdminTicketId) return;

    input.value = ""; // Clear input immediately for UX

    try {
        const response = await fetch('messages.php?action=send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket_id: currentAdminTicketId, message: text })
        });
        const result = await response.json();
        if (result.success) {
            loadAdminMessages(currentAdminTicketId); // Refresh messages to show the new one
        } else {
            alert("Failed to send message");
        }
    } catch (e) {
        console.error(e);
    }
}

/**
 * Updates the overall status of the ticket (e.g. from 'started' to 'solved').
 * Triggered when the admin changes the dropdown select in the chat header.
 */
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
            
            // If the ticket is marked as solved/closed, remove it from the active chat view
            if (status === 'solved' || status === 'closed') {
                document.getElementById('admin-active-chat-box').classList.add('hidden');
                document.getElementById('admin-chat-input-area').style.display = 'none';
                document.getElementById('admin-messages').innerHTML = '';
                if (window.adminChatInterval) clearInterval(window.adminChatInterval);
            }
            fetchAndRenderTickets(); // Refresh queue and dashboard stats
        } else {
            alert("Error updating ticket status");
        }
    } catch (e) {
        console.error(e);
    }
}