// Tone Rewriter — VibeDepot App

let selectedTone = 'formal';
let lastRewrite = '';

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('tone-pill')) {
    document.querySelectorAll('.tone-pill').forEach(p => p.classList.remove('active'));
    e.target.classList.add('active');
    selectedTone = e.target.dataset.tone;
  }
});

async function rewriteText() {
  const input = document.getElementById('inputText').value.trim();
  if (!input) return;

  setLoading(true);
  clearOutput();
  showOutputSection();

  try {
    let fullText = '';
    await window.vibeDepot.ai.streamAI(
      {
        messages: [
          {
            role: 'system',
            content: 'You are a tone rewriting expert. Rewrite the given text in the specified tone while preserving the original meaning and key information. Only output the rewritten text, no explanations or preamble.'
          },
          {
            role: 'user',
            content: `Tone: ${selectedTone}\n\nText to rewrite:\n${input}`
          }
        ],
        maxTokens: 2048
      },
      (chunk) => {
        fullText += chunk;
        appendOutput(chunk);
      }
    );
    lastRewrite = fullText;
  } catch (err) {
    showError(err);
  } finally {
    setLoading(false);
  }
}

async function copyToClipboard() {
  const text = document.getElementById('output').textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied!');
  } catch {
    showToast('Copy failed');
  }
}

async function saveRewrite() {
  if (!lastRewrite) return;
  try {
    let history = (await window.vibeDepot.storage.get('history')) || [];
    history.unshift({
      date: new Date().toISOString(),
      tone: selectedTone,
      preview: lastRewrite.substring(0, 80),
      content: lastRewrite
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
      <div class="meta">${escapeHtml(date)} — ${escapeHtml(item.tone)}</div>
      <div class="preview">${escapeHtml(item.preview)}</div>
    </div>`;
  }).join('');
}

function loadHistoryItem(index) {
  window.vibeDepot.storage.get('history').then(history => {
    if (history && history[index]) showOutput(history[index].content);
  });
}

function setLoading(loading) {
  document.getElementById('loading').style.display = loading ? 'block' : 'none';
  document.querySelectorAll('button:not(.tone-pill)').forEach(btn => btn.disabled = loading);
}

function showOutput(text) {
  document.getElementById('output').textContent = text;
  document.getElementById('outputSection').style.display = 'block';
}

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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
  await loadHistory();
});
