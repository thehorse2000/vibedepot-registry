// Story World Builder — VibeDepot App

let currentTab = 'characters';
let detailType = null;
let detailId = null;

async function initDB() {
  await window.vibeDepot.db.run(
    'CREATE TABLE IF NOT EXISTS characters (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, role TEXT, description TEXT, traits TEXT, expanded TEXT, created_at TEXT)'
  );
  await window.vibeDepot.db.run(
    'CREATE TABLE IF NOT EXISTS locations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, type TEXT, description TEXT, expanded TEXT, created_at TEXT)'
  );
  await window.vibeDepot.db.run(
    'CREATE TABLE IF NOT EXISTS lore (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, category TEXT, content TEXT, expanded TEXT, created_at TEXT)'
  );
}

// ── Tab Switching ──────────────────────────────────────

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  closeDetail();
}

// ── CRUD Operations ────────────────────────────────────

async function addCharacter() {
  const name = document.getElementById('charName').value.trim();
  const role = document.getElementById('charRole').value.trim();
  const desc = document.getElementById('charDesc').value.trim();
  const traits = document.getElementById('charTraits').value.trim();
  if (!name) return;

  await window.vibeDepot.db.run(
    'INSERT INTO characters (name, role, description, traits, created_at) VALUES (?, ?, ?, ?, ?)',
    [name, role, desc, traits, new Date().toISOString()]
  );
  document.getElementById('charName').value = '';
  document.getElementById('charRole').value = '';
  document.getElementById('charDesc').value = '';
  document.getElementById('charTraits').value = '';
  await loadCharacters();
}

async function addLocation() {
  const name = document.getElementById('locName').value.trim();
  const type = document.getElementById('locType').value.trim();
  const desc = document.getElementById('locDesc').value.trim();
  if (!name) return;

  await window.vibeDepot.db.run(
    'INSERT INTO locations (name, type, description, created_at) VALUES (?, ?, ?, ?)',
    [name, type, desc, new Date().toISOString()]
  );
  document.getElementById('locName').value = '';
  document.getElementById('locType').value = '';
  document.getElementById('locDesc').value = '';
  await loadLocations();
}

async function addLore() {
  const title = document.getElementById('loreTitle').value.trim();
  const category = document.getElementById('loreCategory').value.trim();
  const content = document.getElementById('loreContent').value.trim();
  if (!title) return;

  await window.vibeDepot.db.run(
    'INSERT INTO lore (title, category, content, created_at) VALUES (?, ?, ?, ?)',
    [title, category, content, new Date().toISOString()]
  );
  document.getElementById('loreTitle').value = '';
  document.getElementById('loreCategory').value = '';
  document.getElementById('loreContent').value = '';
  await loadLore();
}

async function loadCharacters() {
  const rows = await window.vibeDepot.db.query('SELECT * FROM characters ORDER BY created_at DESC');
  document.getElementById('charactersList').innerHTML = rows.map(r => `
    <div class="entry-card" onclick="showDetail('characters', ${r.id})">
      <div class="name">${escapeHtml(r.name)}</div>
      <div class="meta">${escapeHtml(r.role || '')}${r.traits ? ' — ' + escapeHtml(r.traits) : ''}</div>
      <div class="desc">${escapeHtml((r.description || '').substring(0, 100))}</div>
    </div>
  `).join('');
}

async function loadLocations() {
  const rows = await window.vibeDepot.db.query('SELECT * FROM locations ORDER BY created_at DESC');
  document.getElementById('locationsList').innerHTML = rows.map(r => `
    <div class="entry-card" onclick="showDetail('locations', ${r.id})">
      <div class="name">${escapeHtml(r.name)}</div>
      <div class="meta">${escapeHtml(r.type || '')}</div>
      <div class="desc">${escapeHtml((r.description || '').substring(0, 100))}</div>
    </div>
  `).join('');
}

async function loadLore() {
  const rows = await window.vibeDepot.db.query('SELECT * FROM lore ORDER BY created_at DESC');
  document.getElementById('loreList').innerHTML = rows.map(r => `
    <div class="entry-card" onclick="showDetail('lore', ${r.id})">
      <div class="name">${escapeHtml(r.title)}</div>
      <div class="meta">${escapeHtml(r.category || '')}</div>
      <div class="desc">${escapeHtml((r.content || '').substring(0, 100))}</div>
    </div>
  `).join('');
}

// ── Detail Panel ───────────────────────────────────────

async function showDetail(type, id) {
  detailType = type;
  detailId = id;

  const rows = await window.vibeDepot.db.query(`SELECT * FROM ${type} WHERE id = ?`, [id]);
  if (rows.length === 0) return;
  const entry = rows[0];

  let title, content;
  if (type === 'characters') {
    title = entry.name;
    content = `Role: ${entry.role || 'N/A'}\nTraits: ${entry.traits || 'N/A'}\n\n${entry.description || ''}`;
  } else if (type === 'locations') {
    title = entry.name;
    content = `Type: ${entry.type || 'N/A'}\n\n${entry.description || ''}`;
  } else {
    title = entry.title;
    content = `Category: ${entry.category || 'N/A'}\n\n${entry.content || ''}`;
  }

  document.getElementById('detailTitle').textContent = title;
  document.getElementById('detailContent').textContent = content;
  document.getElementById('expandedContent').textContent = entry.expanded || '';
  document.getElementById('detailPanel').style.display = 'block';
}

function closeDetail() {
  document.getElementById('detailPanel').style.display = 'none';
  detailType = null;
  detailId = null;
}

async function deleteEntry() {
  if (!detailType || !detailId || !confirm('Delete this entry?')) return;
  await window.vibeDepot.db.run(`DELETE FROM ${detailType} WHERE id = ?`, [detailId]);
  closeDetail();
  await loadAll();
}

// ── AI Functions ───────────────────────────────────────

async function getWorldContext() {
  const chars = await window.vibeDepot.db.query('SELECT name, role, description, traits FROM characters');
  const locs = await window.vibeDepot.db.query('SELECT name, type, description FROM locations');
  const loreEntries = await window.vibeDepot.db.query('SELECT title, category, content FROM lore');

  let ctx = '';
  if (chars.length) ctx += 'CHARACTERS:\n' + chars.map(c => `- ${c.name} (${c.role}): ${c.description} [${c.traits}]`).join('\n') + '\n\n';
  if (locs.length) ctx += 'LOCATIONS:\n' + locs.map(l => `- ${l.name} (${l.type}): ${l.description}`).join('\n') + '\n\n';
  if (loreEntries.length) ctx += 'LORE:\n' + loreEntries.map(l => `- ${l.title} (${l.category}): ${l.content}`).join('\n');
  return ctx || 'The world is empty. No entries yet.';
}

async function expandWithAI() {
  if (!detailType || !detailId) return;
  const content = document.getElementById('detailContent').textContent;
  const worldContext = await getWorldContext();

  document.getElementById('expandLoading').style.display = 'block';
  document.getElementById('expandedContent').textContent = '';

  try {
    let expanded = '';
    await window.vibeDepot.ai.streamAI(
      {
        messages: [
          {
            role: 'system',
            content: 'You are a creative worldbuilding assistant. Given an existing world element and the broader world context, expand on it with rich detail that fits the established world. Maintain consistency with other elements. Add history, relationships, secrets, or notable features. Be creative but grounded in the existing lore.'
          },
          {
            role: 'user',
            content: `World context:\n${worldContext}\n\nExpand on this entry:\n${content}`
          }
        ],
        maxTokens: 1500
      },
      (chunk) => {
        expanded += chunk;
        document.getElementById('expandedContent').textContent = expanded;
      }
    );

    await window.vibeDepot.db.run(
      `UPDATE ${detailType} SET expanded = ? WHERE id = ?`,
      [expanded, detailId]
    );
  } catch (err) {
    document.getElementById('expandedContent').textContent = `Error: ${err.message}`;
  } finally {
    document.getElementById('expandLoading').style.display = 'none';
  }
}

async function askWorld() {
  const input = document.getElementById('chatInput');
  const question = input.value.trim();
  if (!question) return;
  input.value = '';

  const container = document.getElementById('chatMessages');
  const userMsg = document.createElement('div');
  userMsg.className = 'chat-msg user';
  userMsg.textContent = question;
  container.appendChild(userMsg);

  const assistantMsg = document.createElement('div');
  assistantMsg.className = 'chat-msg assistant';
  assistantMsg.textContent = '';
  container.appendChild(assistantMsg);
  container.scrollTop = container.scrollHeight;

  const worldContext = await getWorldContext();

  try {
    await window.vibeDepot.ai.streamAI(
      {
        messages: [
          {
            role: 'system',
            content: `You are a worldbuilding consultant. Here is the context of a fictional world:\n\n${worldContext}\n\nAnswer questions about this world, suggest connections between elements, or generate new content that fits. Be creative and specific.`
          },
          { role: 'user', content: question }
        ],
        maxTokens: 1500
      },
      (chunk) => {
        assistantMsg.textContent += chunk;
        container.scrollTop = container.scrollHeight;
      }
    );
  } catch (err) {
    assistantMsg.textContent = `Error: ${err.message}`;
  }
}

async function loadAll() {
  await loadCharacters();
  await loadLocations();
  await loadLore();
}

function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

window.addEventListener('DOMContentLoaded', async () => {
  try { const info = await window.vibeDepot.shell.getAppInfo(); if (info) await window.vibeDepot.shell.setTitle(info.name); } catch {}
  try { const theme = await window.vibeDepot.shell.theme(); document.body.classList.toggle('dark', theme === 'dark'); } catch {}

  await initDB();
  await loadAll();
});
