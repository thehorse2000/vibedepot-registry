// Local Chat History — VibeDepot App

let currentConvId = null;
let messages = [];
let isStreaming = false;

async function initDB() {
  await window.vibeDepot.db.run(
    'CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, created_at TEXT, updated_at TEXT)'
  );
  await window.vibeDepot.db.run(
    'CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER, role TEXT, content TEXT, created_at TEXT)'
  );
}

async function loadConversations() {
  const convs = await window.vibeDepot.db.query('SELECT * FROM conversations ORDER BY updated_at DESC');
  const list = document.getElementById('conversationList');
  list.innerHTML = convs.map(c => `
    <div class="conv-item ${c.id === currentConvId ? 'active' : ''}" onclick="selectConversation(${c.id})">
      <span class="title">${escapeHtml(c.title || 'New Chat')}</span>
      <button class="delete-btn" onclick="event.stopPropagation(); deleteConversation(${c.id})">x</button>
    </div>
  `).join('');
}

async function newConversation() {
  const result = await window.vibeDepot.db.run(
    'INSERT INTO conversations (title, created_at, updated_at) VALUES (?, ?, ?)',
    ['New Chat', new Date().toISOString(), new Date().toISOString()]
  );
  // Get the new conversation id
  const rows = await window.vibeDepot.db.query('SELECT id FROM conversations ORDER BY id DESC LIMIT 1');
  if (rows.length > 0) {
    currentConvId = rows[0].id;
    messages = [{ role: 'system', content: 'You are a helpful AI assistant. Be conversational, clear, and helpful.' }];
    renderMessages([]);
    showChatUI();
    await loadConversations();
  }
}

async function selectConversation(id) {
  currentConvId = id;
  const rows = await window.vibeDepot.db.query(
    'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [id]
  );
  messages = [{ role: 'system', content: 'You are a helpful AI assistant. Be conversational, clear, and helpful.' }];
  rows.forEach(r => messages.push({ role: r.role, content: r.content }));
  renderMessages(rows);
  showChatUI();
  await loadConversations();
}

async function deleteConversation(id) {
  if (!confirm('Delete this conversation?')) return;
  await window.vibeDepot.db.run('DELETE FROM messages WHERE conversation_id = ?', [id]);
  await window.vibeDepot.db.run('DELETE FROM conversations WHERE id = ?', [id]);
  if (currentConvId === id) {
    currentConvId = null;
    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('messagesContainer').style.display = 'none';
    document.getElementById('inputBar').style.display = 'none';
  }
  await loadConversations();
}

function showChatUI() {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('messagesContainer').style.display = 'block';
  document.getElementById('inputBar').style.display = 'flex';
  document.getElementById('messageInput').focus();
}

function renderMessages(rows) {
  const container = document.getElementById('messagesContainer');
  container.innerHTML = rows.map(r =>
    `<div class="message ${r.role}">${escapeHtml(r.content)}</div>`
  ).join('');
  container.scrollTop = container.scrollHeight;
}

function addMessageBubble(role, content) {
  const container = document.getElementById('messagesContainer');
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = content;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text || isStreaming || !currentConvId) return;

  input.value = '';
  isStreaming = true;
  document.getElementById('sendBtn').disabled = true;

  // Save and display user message
  addMessageBubble('user', text);
  messages.push({ role: 'user', content: text });
  await window.vibeDepot.db.run(
    'INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)',
    [currentConvId, 'user', text, new Date().toISOString()]
  );

  // Update conversation title from first message
  const msgCount = await window.vibeDepot.db.query(
    'SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ? AND role = ?',
    [currentConvId, 'user']
  );
  if (msgCount[0].cnt === 1) {
    const title = text.substring(0, 50) + (text.length > 50 ? '...' : '');
    await window.vibeDepot.db.run('UPDATE conversations SET title = ? WHERE id = ?', [title, currentConvId]);
    await loadConversations();
  }

  // Stream AI response
  const assistantBubble = addMessageBubble('assistant', '');
  let fullResponse = '';

  try {
    await window.vibeDepot.ai.streamAI(
      { messages, maxTokens: 2048 },
      (chunk) => {
        fullResponse += chunk;
        assistantBubble.textContent = fullResponse;
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
      }
    );

    messages.push({ role: 'assistant', content: fullResponse });
    await window.vibeDepot.db.run(
      'INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)',
      [currentConvId, 'assistant', fullResponse, new Date().toISOString()]
    );
    await window.vibeDepot.db.run(
      'UPDATE conversations SET updated_at = ? WHERE id = ?',
      [new Date().toISOString(), currentConvId]
    );
  } catch (err) {
    const msg = err.code === 'MISSING_API_KEY' ? 'No API key configured. Go to VibeDepot Settings to add one.'
      : err.code === 'AI_PROVIDER_ERROR' ? 'AI service error. Please try again.'
      : `Error: ${err.message}`;
    assistantBubble.innerHTML = `<div class="error">${escapeHtml(msg)}</div>`;
  } finally {
    isStreaming = false;
    document.getElementById('sendBtn').disabled = false;
    document.getElementById('messageInput').focus();
  }
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const info = await window.vibeDepot.shell.getAppInfo();
    if (info) await window.vibeDepot.shell.setTitle(info.name);
  } catch {}
  try {
    const theme = await window.vibeDepot.shell.theme();
    document.body.classList.toggle('dark', theme === 'dark');
  } catch {}

  await initDB();
  await loadConversations();
});
