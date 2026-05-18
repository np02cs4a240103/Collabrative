// Global variables to track the current state of the user interface
let activeSector = "";
let currentTicketId = null;

// Wait for the HTML document to fully load before running our scripts
document.addEventListener('DOMContentLoaded', () => {
    // Ensure only Students and Staff can access this page
    checkAccess(['Student', 'Staff']);
    // Initialize the user interface with data
    initUI();
});

/**
 * Initializes the user dashboard UI.
 * Sets the user's name, profile initials, and loads dynamic data like recent tickets.
 */
function initUI() {
    const name = currentUser.name || "User";
    
    // Set the display name in the sidebar and the welcome message
    document.getElementById('sb-user-name').innerText = name;
    document.getElementById('welcome-msg').innerText = `Hello, ${name}! 👋`;
    
    // Generate and display initials (e.g. "John Doe" -> "JD") for the avatar
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    document.querySelector('.avatar-initials').innerText = initials;

    // Load various dynamic components of the dashboard
    loadHistoryBadge();          // Updates the notification count on the Chat History button
    loadQuickAccess();           // Populates the sidebar with active ongoing issues
    loadDashboardRecentTickets(); // Populates the main dashboard area with the 3 latest tickets
}

// ============================================================================
// UI LOGIC: View Switching (Hiding/Showing different sections of the page)
// ============================================================================

/**
 * Opens the "Raise Ticket" form for a specific department (sector).
 * @param {string} sector - The name of the department (e.g. 'Finance')
 */
function openChat(sector) {
    activeSector = sector;
    
    // Hide all main content sections
    document.querySelectorAll('.main-content-green > div').forEach(div => div.classList.add('hidden'));
    
    // Show the ticket form
    const formView = document.getElementById('ticket-form-view');
    formView.classList.remove('hidden');
    formView.style.display = 'flex'; 
    
    // Auto-fill the disabled "Type of Issue" input field
    document.getElementById('issue-type').value = sector;
}

/**
 * Opens the live chat interface for a specific existing ticket.
 * @param {string} sector - The department name (for the header)
 * @param {number} ticketId - The database ID of the ticket to load
 */
function openChatInterface(sector, ticketId) {
    activeSector = sector;
    currentTicketId = ticketId;
    
    // Hide all main content sections
    document.querySelectorAll('.main-content-green > div').forEach(div => {
        div.classList.add('hidden');
        div.style.display = 'none';
    });
    
    // Show the live chat interface
    const chatInterface = document.getElementById('chat-interface');
    chatInterface.classList.remove('hidden');
    chatInterface.style.display = 'block';
    
    // Set the title of the chat window
    document.getElementById('current-sector-title').innerText = sector;
    
    // Immediately fetch and display the messages for this ticket
    loadMessages(ticketId);
    
    // Set up a polling mechanism to fetch new messages every 3 seconds
    if (window.chatInterval) clearInterval(window.chatInterval);
    window.chatInterval = setInterval(() => {
        loadMessages(ticketId);
    }, 3000);
}

// ============================================================================
// FRONTEND ACTION: Submitting data to the backend API
// ============================================================================

/**
 * Collects data from the "Raise Ticket" form and sends it to the backend.
 */
async function submitTicket() {
    const type = document.getElementById('issue-type').value;
    const priority = document.getElementById('ticket-priority').value;
    const description = document.getElementById('issue-description').value;

    // Validate that the user actually wrote a description
    if (!description.trim()) return alert("Please enter a description");

    // Map the UI department names to their respective Database ID numbers
    const deptMap = {
        'Student Support': 1, // IT Support
        'Finance': 3,         // Finance
        'Entertainment': 2,   // Administration
        'General': 2          // Administration
    };

    // Prepare the data payload to send to the server
    const payload = {
        title: type + ' Issue',
        description: description,
        department_id: deptMap[type] || 2, // Default to Administration if unknown
        priority: priority
    };

    try {
        // Send a POST request to the tickets API
        const response = await fetch('tickets.php?action=create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.success) {
            alert("Ticket raised successfully!");
            document.getElementById('issue-description').value = ''; // Clear the form
            
            // Open the live chat for this newly created ticket immediately
            openChatInterface(type, result.data.ticket_id);
        } else {
            alert(result.message || "Failed to submit ticket");
        }
    } catch (e) {
        console.error(e);
        alert("Server error. Please try again.");
    }
}

/**
 * Fetches all chat messages for a specific ticket and updates the UI.
 * @param {number} ticketId - The ID of the ticket to fetch messages for
 */
async function loadMessages(ticketId) {
    try {
        const response = await fetch(`messages.php?action=list&ticket_id=${ticketId}`, { cache: 'no-store' });
        const result = await response.json();
        if (result.success) {
            // Render the fetched messages into the chat box
            renderMessages(result.data.messages);
            
            // Update the status badge in the chat header
            const statusBadge = document.getElementById('current-ticket-status');
            if (statusBadge) {
                statusBadge.innerText = result.data.status;
                
                // If the ticket is resolved, disable the chat input
                if (result.data.status === 'solved' || result.data.status === 'closed') {
                    statusBadge.className = 'status-badge status-solved';
                    document.getElementById('msg-input').disabled = true;
                    document.getElementById('msg-input').placeholder = "Chat closed.";
                } else {
                    // Otherwise, ensure the chat is open for typing
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

// ============================================================================
// UI LOGIC: Rendering and Event Handlers
// ============================================================================

/**
 * Loops through an array of messages and renders them into HTML bubbles.
 * @param {Array} msgs - Array of message objects from the database
 */
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
    
    // Auto-scroll the chat box to the very bottom so the newest message is visible
    chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Returns the user to the main dashboard screen, hiding chat and forms.
 */
function showUserHome() {
    if (window.chatInterval) clearInterval(window.chatInterval); // Stop polling for messages
    
    // Show home container
    document.getElementById('user-home').classList.remove('hidden');
    document.getElementById('user-home').style.display = '';
    
    // Hide everything else
    document.getElementById('chat-history-view').classList.add('hidden');
    document.getElementById('chat-interface').classList.add('hidden');
    document.getElementById('ticket-form-view').classList.add('hidden');
    document.getElementById('ticket-form-view').style.display = 'none';
    
    // Update sidebar active states
    document.getElementById('btn-dash').classList.add('active');
    document.getElementById('btn-hist').classList.remove('active');
}

/**
 * Sends a new chat message to the currently open ticket.
 */
async function sendMessage() {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    
    // Don't send empty messages or if no ticket is open
    if (!text || !currentTicketId) return;

    input.value = ""; // Clear input immediately for UX

    try {
        const response = await fetch('messages.php?action=send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket_id: currentTicketId, message: text })
        });
        const result = await response.json();
        if (result.success) {
            // Reload messages so the new one appears immediately
            loadMessages(currentTicketId);
        } else {
            alert("Failed to send message");
        }
    } catch (e) {
        console.error(e);
    }
}

/**
 * Opens the Chat History view where users can see all their past tickets.
 */
async function viewChatHistory() {
    if (window.chatInterval) clearInterval(window.chatInterval); // Stop any active chat polling
    
    // Hide all main content views
    document.querySelectorAll('.main-content-green > div').forEach(div => {
        div.classList.add('hidden');
        div.style.display = 'none';
    });
    
    // Show the Chat History view
    document.getElementById('chat-history-view').classList.remove('hidden');
    document.getElementById('chat-history-view').style.display = 'block';
    
    // Update sidebar navigation active states
    document.getElementById('btn-dash').classList.remove('active');
    document.getElementById('btn-hist').classList.add('active');

    // Fetch the list of tickets for this specific user
    try {
        const response = await fetch('tickets.php?action=list', { cache: 'no-store' });
        const result = await response.json();
        if (result.success) {
            // Render the tickets into the history list container
            renderHistoryList(result.data);
            
            // Update the badge count in the sidebar
            const badge = document.getElementById('history-count');
            if(badge) badge.innerText = result.data.length;
        }
    } catch (e) {
        console.error("Error loading chat history", e);
    }
}

/**
 * Loops through the user's tickets and renders them as clickable cards in the history view.
 * @param {Array} ticketsList - Array of ticket objects
 */
function renderHistoryList(ticketsList) {
    const container = document.getElementById('history-list');

    // Display a placeholder message if the user has no tickets
    if (ticketsList.length === 0) {
        container.innerHTML = `<p style="text-align:center; opacity:0.5; margin-top:50px;">No conversation history yet.</p>`;
        return;
    }

    // Generate HTML for each ticket card
    container.innerHTML = ticketsList.map(t => `
        <div class="sector-card s-green animate__animated animate__fadeIn" onclick="openChatInterface('${t.dept_name}', ${t.id})" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
            <div>
                <h4>${t.title}</h4>
                <small>Status: <span class="${t.status === 'solved' || t.status === 'closed' ? 'status-solved' : 'status-pending'}" style="padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${t.status}</span> | Priority: ${t.priority}</small>
            </div>
            <i class="fas fa-chevron-right"></i>
        </div>
    `).join('');
}

/**
 * Silently fetches the total number of tickets the user has raised and updates the sidebar badge.
 * This runs automatically when the dashboard first loads.
 */
async function loadHistoryBadge() {
    try {
        const response = await fetch('tickets.php?action=list', { cache: 'no-store' });
        const result = await response.json();
        if (result.success) {
            const badge = document.getElementById('history-count');
            if(badge) badge.innerText = result.data.length;
        }
    } catch (e) {
        console.error("Error loading history badge", e);
    }
}

/**
 * Fetches tickets and filters for ONLY active/unsolved issues.
 * Renders these issues as quick-access buttons in the left sidebar.
 */
async function loadQuickAccess() {
    try {
        const response = await fetch('tickets.php?action=list', { cache: 'no-store' });
        const result = await response.json();
        if (result.success) {
            const container = document.getElementById('quick-access-list');
            if (!container) return;

            // Filter out tickets that are 'solved' or 'closed'
            const activeTickets = result.data.filter(t => t.status !== 'solved' && t.status !== 'closed');
            
            if (activeTickets.length === 0) {
                container.innerHTML = '<p style="font-size: 0.8rem; padding: 10px; opacity: 0.7;">No active issues.</p>';
            } else {
                container.innerHTML = activeTickets.map(t => `
                    <button class="sb-link-small" onclick="openChatInterface('${t.dept_name}', ${t.id})" title="${t.title}">
                        <i class="fas fa-ticket-alt"></i> ${t.dept_name}
                    </button>
                `).join('');
            }
        }
    } catch (e) {
        console.error("Error loading quick access", e);
    }
}

/**
 * Fetches tickets and renders the 3 most recently created ones directly on the 
 * main user dashboard underneath the department category cards.
 */
async function loadDashboardRecentTickets() {
    try {
        const response = await fetch('tickets.php?action=list', { cache: 'no-store' });
        const result = await response.json();
        if (result.success) {
            const container = document.getElementById('dashboard-recent-tickets');
            if (!container) return;
            
            // Take up to 3 most recent tickets (assuming backend returns them in DESC order)
            const recentTickets = result.data.slice(0, 3);
            
            if (recentTickets.length === 0) {
                container.innerHTML = '<p style="opacity: 0.7; padding: 10px 0;">No tickets raised yet. Click a department above to start!</p>';
            } else {
                // Generate detailed cards for each recent ticket
                container.innerHTML = recentTickets.map(t => `
                    <div class="glass animate__animated animate__fadeIn" onclick="openChatInterface('${t.dept_name}', ${t.id})" style="padding: 15px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: transform 0.2s ease;">
                        <div>
                            <h4 style="margin: 0 0 5px 0;">${t.title}</h4>
                            <div style="font-size: 0.8rem; color: #555;">
                                <span class="status-badge ${t.status === 'solved' || t.status === 'closed' ? 'status-solved' : 'status-pending'}" style="padding: 2px 6px;">${t.status}</span>
                                <span style="margin-left: 10px;"><i class="fas fa-tag"></i> ${t.dept_name}</span>
                                <span style="margin-left: 10px;"><i class="fas fa-clock"></i> ${new Date(t.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: var(--green-primary);"></i>
                    </div>
                `).join('');
            }
        }
    } catch (e) {
        console.error("Error loading dashboard recent tickets", e);
    }
}