// Meeting Notes Cleaner — VibeDepot App
// Uses window.vibeDepot Bridge API

// ── State ──────────────────────────────────────────────
let lastCleaned = '';

// ── AI Functions ───────────────────────────────────────

async function cleanNotes() {
  const notes = document.getElementById('notes').value.trim();
  if (!notes) return;

  setLoading(true);
  clearOutput();
  showOutputSection();

  try {
    await window.vibeDepot.ai.streamAI(
      {
        messages: [
          {
            role: 'system',
            content: 'You are a meeting notes organizer. Given raw meeting notes or transcript, produce a clean structured summary with these sections:\n\n## Summary\n2-3 sentence overview of the meeting.\n\n## Key Decisions\nBulleted list of decisions made.\n\n## Action Items\nBulleted list with owner names in bold if mentioned (e.g., "- **Alice**: Follow up with vendor by Friday").\n\n## Open Questions\nAny unresolved items or questions raised.\n\nIf a section has no items, omit it. Use markdown formatting.'
          },
          { role: 'user', content: notes }
        ],
        maxTokens: 2048
      },
      (chunk) => {
        appendOutput(chunk);
      }
    );
    lastCleaned = document.getElementById('output').textContent;
  } catch (err) {
    showError(err);
  } finally {
    setLoading(false);
  }
}

// ── Clipboard ──────────────────────────────────────────

async function copyToClipboard() {
  const text = document.getElementById('output').textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  } catch {
    showToast('Copy failed');
  }
}

// ── Storage Functions ──────────────────────────────────

async function saveCleanup() {
  if (!lastCleaned) return;
  try {
    let history = (await window.vibeDepot.storage.get('history')) || [];
    history.unshift({
      date: new Date().toISOString(),
      preview: lastCleaned.substring(0, 80),
      content: lastCleaned
    });
    if (history.length > 20) history = history.slice(0, 20);
    await window.vibeDepot.storage.set('history', history);
    renderHistory(history);
    showToast('Saved!');
  } catch (err) {
    console.error('Storage save failed:', err);
  }
}

async function loadHistory() {
  try {
    const history = await window.vibeDepot.storage.get('history');
    if (history && history.length > 0) {
      renderHistory(history);
    }
  } catch (err) {
    console.error('Storage load failed:', err);
  }
}

function renderHistory(history) {
  const section = document.getElementById('historySection');
  const list = document.getElementById('historyList');
  if (!history || history.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';
  list.innerHTML = history.map((item, i) => {
    const date = new Date(item.date).toLocaleDateString();
    return `<div class="history-item" onclick="loadHistoryItem(${i})">
      <div class="date">${escapeHtml(date)}</div>
      <div class="preview">${escapeHtml(item.preview)}</div>
    </div>`;
  }).join('');
}

function loadHistoryItem(index) {
  window.vibeDepot.storage.get('history').then(history => {
    if (history && history[index]) {
      showOutput(history[index].content);
    }
  });
}

// ── UI Helpers ─────────────────────────────────────────

function setLoading(loading) {
  document.getElementById('loading').style.display = loading ? 'block' : 'none';
  document.querySelectorAll('button').forEach(btn => btn.disabled = loading);
}

function showOutput(text) {
  const output = document.getElementById('output');
  output.textContent = text;
  document.getElementById('outputSection').style.display = 'block';
}

function clearOutput() {
  document.getElementById('output').textContent = '';
}

function appendOutput(text) {
  document.getElementById('output').textContent += text;
}

function showOutputSection() {
  document.getElementById('outputSection').style.display = 'block';
}

function showError(err) {
  const msg = err.code === 'MISSING_API_KEY'
    ? 'No API key configured. Go to VibeDepot Settings to add one.'
    : err.code === 'AI_PROVIDER_ERROR'
    ? 'AI service error. Please try again.'
    : `Error: ${err.message}`;

  const output = document.getElementById('output');
  output.innerHTML = `<div class="error">${escapeHtml(msg)}</div>`;
  document.getElementById('outputSection').style.display = 'block';
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#6c5ce7;color:#fff;padding:10px 20px;border-radius:8px;font-size:0.85rem;z-index:999;';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── Init ───────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const info = await window.vibeDepot.shell.getAppInfo();
    if (info) await window.vibeDepot.shell.setTitle(info.name);
  } catch {}

  try {
    const theme = await window.vibeDepot.shell.theme();
    document.body.classList.toggle('dark', theme === 'dark');
  } catch {}

  await loadHistory();
});
