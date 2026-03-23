// Tweet Thread Expander — VibeDepot App

let lastPost = '';

async function expandThread() {
  const thread = document.getElementById('threadText').value.trim();
  const style = document.getElementById('style').value;
  if (!thread) return;

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
            content: `You are an expert content writer. Given a series of tweet-style short posts (a thread), expand them into a polished, well-structured long-form ${style}. Add smooth transitions between ideas, expand on key points, add an engaging introduction and conclusion. Maintain the author's voice and key insights. Use markdown formatting with headers, paragraphs, and emphasis where appropriate.`
          },
          { role: 'user', content: thread }
        ],
        maxTokens: 3000
      },
      (chunk) => {
        fullText += chunk;
        appendOutput(chunk);
      }
    );
    lastPost = fullText;
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
  } catch { showToast('Copy failed'); }
}

async function savePost() {
  if (!lastPost) return;
  try {
    let history = (await window.vibeDepot.storage.get('history')) || [];
    history.unshift({
      date: new Date().toISOString(),
      style: document.getElementById('style').value,
      preview: lastPost.substring(0, 80),
      content: lastPost
    });
    if (history.length > 10) history = history.slice(0, 10);
    await window.vibeDepot.storage.set('history', history);
    renderHistory(history);
    showToast('Saved!');
  } catch (err) { console.error('Storage save failed:', err); }
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
      <div class="meta">${escapeHtml(date)} — ${escapeHtml(item.style)}</div>
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
  document.querySelectorAll('button').forEach(btn => btn.disabled = loading);
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

function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

window.addEventListener('DOMContentLoaded', async () => {
  try { const info = await window.vibeDepot.shell.getAppInfo(); if (info) await window.vibeDepot.shell.setTitle(info.name); } catch {}
  try { const theme = await window.vibeDepot.shell.theme(); document.body.classList.toggle('dark', theme === 'dark'); } catch {}
  await loadHistory();
});
