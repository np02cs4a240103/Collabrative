document.addEventListener('DOMContentLoaded', () => {
    checkAccess('admin');
    showAdminTab('admin-stats-view');
});

function showAdminTab(id) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
    document.getElementById('admin-ticket-form-view').classList.add('hidden');
    document.getElementById('admin-ticket-form-view').style.display = 'none';

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
    const tbody = document.getElementById('recent-tickets-table');
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