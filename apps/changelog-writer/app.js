// Changelog Writer — VibeDepot App

let lastChangelog = '';

const FORMAT_PROMPTS = {
  keepachangelog: 'Follow the Keep a Changelog format (keepachangelog.com). Categorize changes under: ### Added, ### Changed, ### Deprecated, ### Removed, ### Fixed, ### Security. Only include categories that have entries.',
  conventional: 'Use conventional commit style groupings: feat, fix, docs, style, refactor, perf, test, chore. Format as "- **type**: description".',
  bullets: 'Use a simple bulleted list grouped by theme (New Features, Bug Fixes, Improvements, etc.).'
};

async function generateChangelog() {
  const changes = document.getElementById('changes').value.trim();
  const format = document.getElementById('format').value;
  const version = document.getElementById('version').value.trim();
  if (!changes) return;

  setLoading(true);
  clearOutput();
  showOutputSection();

  const versionHeader = version ? `Include a version header: ## [${version}] - ${new Date().toISOString().split('T')[0]}\n` : '';

  try {
    let fullText = '';
    await window.vibeDepot.ai.streamAI(
      {
        messages: [
          {
            role: 'system',
            content: `You are a changelog writer. Given git diffs, commit messages, or change descriptions, generate a clean user-facing changelog.\n\n${FORMAT_PROMPTS[format]}\n\n${versionHeader}Focus on what matters to users, not implementation details. Be concise but informative. Use markdown formatting.`
          },
          { role: 'user', content: changes }
        ],
        maxTokens: 2048
      },
      (chunk) => {
        fullText += chunk;
        appendOutput(chunk);
      }
    );
    lastChangelog = fullText;
  } catch (err) {
    showError(err);
  } finally {
    setLoading(false);
  }
}

async function copyChangelog() {
  const text = document.getElementById('output').textContent;
  if (!text) return;
  try { await navigator.clipboard.writeText(text); showToast('Copied!'); } catch { showToast('Copy failed'); }
}

async function saveChangelog() {
  if (!lastChangelog) return;
  try {
    let history = (await window.vibeDepot.storage.get('changelogs')) || [];
    history.unshift({
      date: new Date().toISOString(),
      format: document.getElementById('format').value,
      version: document.getElementById('version').value.trim() || 'unversioned',
      preview: lastChangelog.substring(0, 80),
      content: lastChangelog
    });
    if (history.length > 15) history = history.slice(0, 15);
    await window.vibeDepot.storage.set('changelogs', history);
    renderHistory(history);
    showToast('Saved!');
  } catch (err) { console.error('Save failed:', err); }
}

async function loadHistory() {
  try {
    const history = await window.vibeDepot.storage.get('changelogs');
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
      <div class="meta">${escapeHtml(date)} — ${escapeHtml(item.format)} — v${escapeHtml(item.version)}</div>
      <div class="preview">${escapeHtml(item.preview)}</div>
    </div>`;
  }).join('');
}

function loadHistoryItem(index) {
  window.vibeDepot.storage.get('changelogs').then(history => {
    if (history && history[index]) showOutput(history[index].content);
  });
}

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
  await loadHistory();
});
