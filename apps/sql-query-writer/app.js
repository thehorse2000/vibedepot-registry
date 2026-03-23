// SQL Query Writer — VibeDepot App

let lastSql = '';
let lastFull = '';

async function generateQuery() {
  const description = document.getElementById('description').value.trim();
  const schema = document.getElementById('schema').value.trim();
  const dialect = document.getElementById('dialect').value;
  if (!description) return;

  setLoading(true);
  document.getElementById('sqlOutput').textContent = '';
  document.getElementById('explanation').textContent = '';
  document.getElementById('outputSection').style.display = 'block';

  const schemaSection = schema ? `\n\nDatabase schema:\n${schema}` : '';

  try {
    let fullText = '';
    await window.vibeDepot.ai.streamAI(
      {
        messages: [
          {
            role: 'system',
            content: `You are an expert SQL developer. Given a natural language description of desired data and optionally a database schema, generate a production-ready SQL query for ${dialect}.\n\nFormat your response exactly as:\n\`\`\`sql\n{the query}\n\`\`\`\n\nExplanation:\n{step-by-step explanation of the query}\n\nWrite clean, efficient queries with proper aliases and formatting.`
          },
          {
            role: 'user',
            content: `${description}${schemaSection}`
          }
        ],
        maxTokens: 2048
      },
      (chunk) => {
        fullText += chunk;
        parseAndDisplay(fullText);
      }
    );
    lastFull = fullText;
  } catch (err) {
    showError(err);
  } finally {
    setLoading(false);
  }
}

function parseAndDisplay(text) {
  const sqlMatch = text.match(/```sql\n([\s\S]*?)```/);
  if (sqlMatch) {
    lastSql = sqlMatch[1].trim();
    document.getElementById('sqlOutput').textContent = lastSql;

    const afterSql = text.substring(text.indexOf('```', text.indexOf('```sql') + 6) + 3).trim();
    const explanation = afterSql.replace(/^Explanation:\s*/i, '');
    document.getElementById('explanation').textContent = explanation;
  } else {
    document.getElementById('sqlOutput').textContent = text;
  }
}

async function copySql() {
  if (!lastSql) return;
  try {
    await navigator.clipboard.writeText(lastSql);
    showToast('SQL copied!');
  } catch { showToast('Copy failed'); }
}

async function saveQuery() {
  if (!lastSql) return;
  try {
    let history = (await window.vibeDepot.storage.get('queries')) || [];
    history.unshift({
      date: new Date().toISOString(),
      dialect: document.getElementById('dialect').value,
      description: document.getElementById('description').value.trim().substring(0, 60),
      sql: lastSql,
      full: lastFull
    });
    if (history.length > 20) history = history.slice(0, 20);
    await window.vibeDepot.storage.set('queries', history);
    renderHistory(history);
    showToast('Saved!');
  } catch (err) { console.error('Save failed:', err); }
}

async function loadHistory() {
  try {
    const history = await window.vibeDepot.storage.get('queries');
    if (history && history.length > 0) renderHistory(history);
  } catch {}
}

function renderHistory(history) {
  const section = document.getElementById('historySection');
  const list = document.getElementById('historyList');
  if (!history || history.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = history.map((item, i) => {
    const date = new Date(item.date).toLocaleDateString();
    return `<div class="history-item" onclick="loadHistoryItem(${i})">
      <div class="meta">${escapeHtml(date)} — ${escapeHtml(item.dialect)}</div>
      <div class="preview">${escapeHtml(item.description)}</div>
    </div>`;
  }).join('');
}

function loadHistoryItem(index) {
  window.vibeDepot.storage.get('queries').then(history => {
    if (history && history[index]) {
      lastSql = history[index].sql;
      lastFull = history[index].full;
      parseAndDisplay(lastFull);
      document.getElementById('outputSection').style.display = 'block';
    }
  });
}

function setLoading(loading) {
  document.getElementById('loading').style.display = loading ? 'block' : 'none';
  document.querySelectorAll('button').forEach(btn => btn.disabled = loading);
}

function showError(err) {
  const msg = err.code === 'MISSING_API_KEY' ? 'No API key configured. Go to VibeDepot Settings to add one.'
    : err.code === 'AI_PROVIDER_ERROR' ? 'AI service error. Please try again.'
    : `Error: ${err.message}`;
  document.getElementById('sqlOutput').innerHTML = `<div class="error">${escapeHtml(msg)}</div>`;
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
  await loadHistory();
});
