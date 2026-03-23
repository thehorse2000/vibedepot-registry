// File Summarizer — VibeDepot App

let lastSummary = '';

const DETAIL_TOKENS = { brief: 512, standard: 1024, detailed: 2048 };

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('docText').addEventListener('input', updateWordCount);
});

function updateWordCount() {
  const text = document.getElementById('docText').value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  document.getElementById('wordCount').textContent = words > 0 ? `(${words} words)` : '';
}

async function summarize() {
  const text = document.getElementById('docText').value.trim();
  const detail = document.getElementById('detail').value;
  if (!text) return;

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
            content: `You are an expert summarizer. Given document text, produce a clear summary with:\n\n## Summary\nConcise overview of the document.\n\n## Key Points\nBulleted list of main ideas.\n\n## Important Details\nAny specific numbers, dates, names, or findings worth noting.\n\nDetail level: ${detail}. ${detail === 'brief' ? 'Keep it very concise, 1-2 short paragraphs total.' : detail === 'detailed' ? 'Be thorough and comprehensive.' : 'Balance brevity with completeness.'}\n\nIf a section has no items, omit it. Use markdown formatting.`
          },
          { role: 'user', content: text }
        ],
        maxTokens: DETAIL_TOKENS[detail]
      },
      (chunk) => { fullText += chunk; appendOutput(chunk); }
    );
    lastSummary = fullText;
  } catch (err) { showError(err); } finally { setLoading(false); }
}

async function saveSummary() {
  if (!lastSummary) return;
  try {
    let history = (await window.vibeDepot.storage.get('summaries')) || [];
    history.unshift({
      date: new Date().toISOString(),
      detail: document.getElementById('detail').value,
      preview: lastSummary.substring(0, 80),
      content: lastSummary
    });
    if (history.length > 15) history = history.slice(0, 15);
    await window.vibeDepot.storage.set('summaries', history);
    renderHistory(history);
    showToast('Saved!');
  } catch (err) { console.error('Save failed:', err); }
}

async function loadHistory() {
  try {
    const history = await window.vibeDepot.storage.get('summaries');
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
      <div class="meta">${escapeHtml(date)} — ${escapeHtml(item.detail)}</div>
      <div class="preview">${escapeHtml(item.preview)}</div>
    </div>`;
  }).join('');
}

function loadHistoryItem(index) {
  window.vibeDepot.storage.get('summaries').then(history => {
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
