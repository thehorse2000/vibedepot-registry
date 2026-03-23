// Prompt Lab — VibeDepot App

let currentTemplateId = null;
let detectedVars = [];

async function initDB() {
  await window.vibeDepot.db.run(
    'CREATE TABLE IF NOT EXISTS templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, system_prompt TEXT, user_message TEXT, created_at TEXT)'
  );
  await window.vibeDepot.db.run(
    'CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY AUTOINCREMENT, template_id INTEGER, variables_json TEXT, output TEXT, created_at TEXT)'
  );
}

// ── Variable Detection ─────────────────────────────────

function detectVariables() {
  const prompt = document.getElementById('systemPrompt').value;
  const matches = prompt.match(/\{\{(\w+)\}\}/g) || [];
  const vars = [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  detectedVars = vars;

  const section = document.getElementById('variablesSection');
  const container = document.getElementById('variableInputs');

  if (vars.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  container.innerHTML = vars.map(v => `
    <div class="var-input">
      <label>{{${escapeHtml(v)}}}</label>
      <input type="text" id="var-${escapeHtml(v)}" placeholder="Value for ${escapeHtml(v)}..." />
    </div>
  `).join('');
}

function resolvePrompt() {
  let prompt = document.getElementById('systemPrompt').value;
  detectedVars.forEach(v => {
    const input = document.getElementById(`var-${v}`);
    const value = input ? input.value : '';
    prompt = prompt.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), value);
  });
  return prompt;
}

// ── Run Prompt ─────────────────────────────────────────

async function runPrompt() {
  const systemPrompt = resolvePrompt();
  const userMessage = document.getElementById('userMessage').value.trim();
  if (!systemPrompt.trim() || !userMessage) return;

  const temperature = parseFloat(document.getElementById('temperature').value);
  const maxTokens = parseInt(document.getElementById('maxTokens').value, 10);

  setLoading(true);
  clearOutput();
  showOutputSection();

  try {
    let fullText = '';
    await window.vibeDepot.ai.streamAI(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature,
        maxTokens
      },
      (chunk) => { fullText += chunk; appendOutput(chunk); }
    );

    // Save run
    if (currentTemplateId) {
      const varsJson = JSON.stringify(
        detectedVars.reduce((acc, v) => {
          const input = document.getElementById(`var-${v}`);
          acc[v] = input ? input.value : '';
          return acc;
        }, {})
      );
      await window.vibeDepot.db.run(
        'INSERT INTO runs (template_id, variables_json, output, created_at) VALUES (?, ?, ?, ?)',
        [currentTemplateId, varsJson, fullText, new Date().toISOString()]
      );
      await loadRunHistory();
    }
  } catch (err) {
    showError(err);
  } finally {
    setLoading(false);
  }
}

// ── Templates ──────────────────────────────────────────

async function saveTemplate() {
  const systemPrompt = document.getElementById('systemPrompt').value.trim();
  const userMessage = document.getElementById('userMessage').value.trim();
  if (!systemPrompt) return;

  const name = systemPrompt.substring(0, 40) + (systemPrompt.length > 40 ? '...' : '');

  try {
    if (currentTemplateId) {
      await window.vibeDepot.db.run(
        'UPDATE templates SET name = ?, system_prompt = ?, user_message = ? WHERE id = ?',
        [name, systemPrompt, userMessage, currentTemplateId]
      );
    } else {
      await window.vibeDepot.db.run(
        'INSERT INTO templates (name, system_prompt, user_message, created_at) VALUES (?, ?, ?, ?)',
        [name, systemPrompt, userMessage, new Date().toISOString()]
      );
      const rows = await window.vibeDepot.db.query('SELECT id FROM templates ORDER BY id DESC LIMIT 1');
      if (rows.length > 0) currentTemplateId = rows[0].id;
    }
    await loadTemplates();
    showToast('Template saved!');
  } catch (err) { console.error('Save failed:', err); }
}

async function loadTemplates() {
  const templates = await window.vibeDepot.db.query('SELECT * FROM templates ORDER BY created_at DESC');
  const list = document.getElementById('templateList');
  list.innerHTML = templates.map(t => `
    <div class="template-item ${t.id === currentTemplateId ? 'active' : ''}" onclick="selectTemplate(${t.id})">
      ${escapeHtml(t.name)}
    </div>
  `).join('');
}

async function selectTemplate(id) {
  currentTemplateId = id;
  const rows = await window.vibeDepot.db.query('SELECT * FROM templates WHERE id = ?', [id]);
  if (rows.length === 0) return;

  document.getElementById('systemPrompt').value = rows[0].system_prompt;
  document.getElementById('userMessage').value = rows[0].user_message || '';
  detectVariables();
  await loadTemplates();
  await loadRunHistory();
}

function newTemplate() {
  currentTemplateId = null;
  document.getElementById('systemPrompt').value = '';
  document.getElementById('userMessage').value = '';
  document.getElementById('variablesSection').style.display = 'none';
  document.getElementById('outputSection').style.display = 'none';
  document.getElementById('historySection').style.display = 'none';
  loadTemplates();
}

async function loadRunHistory() {
  if (!currentTemplateId) return;
  const runs = await window.vibeDepot.db.query(
    'SELECT * FROM runs WHERE template_id = ? ORDER BY created_at DESC LIMIT 10',
    [currentTemplateId]
  );
  const section = document.getElementById('historySection');
  const list = document.getElementById('historyList');
  if (runs.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = runs.map(r => {
    const date = new Date(r.created_at).toLocaleString();
    return `<div class="history-item" onclick="showRunOutput('${escapeHtml(r.output.replace(/'/g, "\\'"))}')">
      <div class="meta">${escapeHtml(date)}</div>
      <div class="preview">${escapeHtml(r.output.substring(0, 80))}</div>
    </div>`;
  }).join('');
}

function showRunOutput(text) {
  showOutput(text);
}

// ── UI Helpers ─────────────────────────────────────────

function setLoading(loading) {
  document.getElementById('loading').style.display = loading ? 'block' : 'none';
  document.querySelectorAll('button').forEach(btn => btn.disabled = loading);
}

function showOutput(text) { document.getElementById('output').textContent = text; document.getElementById('outputSection').style.display = 'block'; }
function clearOutput() { document.getElementById('output').textContent = ''; }
function appendOutput(text) { document.getElementById('output').textContent += text; }
function showOutputSection() { document.getElementById('outputSection').style.display = 'block'; }

function showError(err) {
  const msg = err.code === 'MISSING_API_KEY' ? 'No API key configured. Go to VibeDepot Settings to add one.'
    : err.code === 'AI_PROVIDER_ERROR' ? 'AI service error. Please try again.'
    : `Error: ${err.message}`;
  document.getElementById('output').innerHTML = `<div class="error">${escapeHtml(msg)}</div>`;
  document.getElementById('outputSection').style.display = 'block';
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#6c5ce7;color:#fff;padding:10px 20px;border-radius:8px;font-size:0.85rem;z-index:999;';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

window.addEventListener('DOMContentLoaded', async () => {
  try { const info = await window.vibeDepot.shell.getAppInfo(); if (info) await window.vibeDepot.shell.setTitle(info.name); } catch {}
  try { const theme = await window.vibeDepot.shell.theme(); document.body.classList.toggle('dark', theme === 'dark'); } catch {}

  document.getElementById('systemPrompt').addEventListener('input', detectVariables);

  await initDB();
  await loadTemplates();
});
