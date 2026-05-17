// admin.js - Admin Dashboard Functionality

// Initialize admin dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is admin
    checkAccess('admin');
    // Show default tab
    showAdminTab('admin-stats-view');
});

// Function to switch between admin tabs
function showAdminTab(id) {
    // Hide all admin tabs
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
    // Hide ticket form
    document.getElementById('admin-ticket-form-view').classList.add('hidden');
    document.getElementById('admin-ticket-form-view').style.display = 'none';

    // Show selected tab
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');

    /*
       BACKEND TEAM:
       Fetch data from server here and then call
       updateStats(), renderUsers(), or renderQueue()
    */
}

// UI LOGIC: Draws the table based on whatever data is in the tickets array
function renderRecentTickets() {
    // Get table body element
    const tbody = document.getElementById('recent-tickets-table');
    // Render tickets as table rows
    tbody.innerHTML = tickets.map(t => `
        <tr>
            <td><strong>${t.user}</strong></td>
            <td>${t.type}</td>
            <td>${t.priority}</td>
            <td><span class="status-badge ${t.status === 'Solved' ? 'status-solved' : 'status-pending'}">${t.status}</span></td>
            <td>${t.time}</td>
        </tr>
    `).join('');
}