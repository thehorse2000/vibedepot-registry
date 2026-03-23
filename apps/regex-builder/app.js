// Regex Builder — VibeDepot App

let currentRegex = null;
let currentFlags = '';
let currentPattern = '';

async function buildRegex() {
  const description = document.getElementById('description').value.trim();
  if (!description) return;

  setLoading(true);

  try {
    const result = await window.vibeDepot.ai.callAI({
      messages: [
        {
          role: 'system',
          content: 'You are a regex expert. Given a description of what to match, respond in this exact JSON format and nothing else:\n{"regex": "the regex pattern without delimiters", "flags": "gi or whatever flags needed", "explanation": "plain English breakdown of each part of the regex", "shouldMatch": ["example1", "example2", "example3"], "shouldNotMatch": ["example1", "example2", "example3"]}\n\nOnly output valid JSON. No markdown, no code fences, no extra text.'
        },
        { role: 'user', content: description }
      ],
      maxTokens: 1024
    });

    let parsed;
    try {
      const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      showError({ message: 'Failed to parse AI response. Try again.' });
      return;
    }

    currentPattern = parsed.regex;
    currentFlags = parsed.flags || '';

    try {
      currentRegex = new RegExp(parsed.regex, parsed.flags);
    } catch {
      currentRegex = null;
    }

    document.getElementById('regexPattern').textContent = `/${parsed.regex}/${parsed.flags}`;
    document.getElementById('explanation').textContent = parsed.explanation;

    const shouldMatchEl = document.getElementById('shouldMatch');
    shouldMatchEl.innerHTML = (parsed.shouldMatch || []).map(s =>
      `<div class="test-item test-match">${escapeHtml(s)}</div>`
    ).join('');

    const shouldNotMatchEl = document.getElementById('shouldNotMatch');
    shouldNotMatchEl.innerHTML = (parsed.shouldNotMatch || []).map(s =>
      `<div class="test-item test-no-match">${escapeHtml(s)}</div>`
    ).join('');

    document.getElementById('outputSection').style.display = 'block';
    updateLiveTest();
  } catch (err) {
    showError(err);
  } finally {
    setLoading(false);
  }
}

function updateLiveTest() {
  const input = document.getElementById('testInput').value;
  const resultsEl = document.getElementById('testResults');
  if (!currentRegex || !input.trim()) {
    resultsEl.innerHTML = '';
    return;
  }

  const lines = input.split('\n').filter(l => l.trim());
  resultsEl.innerHTML = lines.map(line => {
    const re = new RegExp(currentPattern, currentFlags);
    const matches = re.test(line);
    return `<div class="result-line ${matches ? 'match' : 'no-match'}">${matches ? 'MATCH' : 'NO MATCH'}: ${escapeHtml(line)}</div>`;
  }).join('');
}

async function copyRegex() {
  const text = document.getElementById('regexPattern').textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied!');
  } catch { showToast('Copy failed'); }
}

async function savePattern() {
  if (!currentPattern) return;
  try {
    let history = (await window.vibeDepot.storage.get('patterns')) || [];
    history.unshift({
      date: new Date().toISOString(),
      description: document.getElementById('description').value.trim().substring(0, 60),
      pattern: currentPattern,
      flags: currentFlags
    });
    if (history.length > 30) history = history.slice(0, 30);
    await window.vibeDepot.storage.set('patterns', history);
    renderHistory(history);
    showToast('Saved!');
  } catch (err) { console.error('Save failed:', err); }
}

async function loadHistory() {
  try {
    const history = await window.vibeDepot.storage.get('patterns');
    if (history && history.length > 0) renderHistory(history);
  } catch {}
}

function renderHistory(history) {
  const section = document.getElementById('historySection');
  const list = document.getElementById('historyList');
  if (!history || history.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = history.map((item, i) => {
    return `<div class="history-item" onclick="loadHistoryItem(${i})">
      <div class="meta">${escapeHtml(new Date(item.date).toLocaleDateString())}</div>
      <div class="preview">/${escapeHtml(item.pattern)}/${escapeHtml(item.flags)}</div>
    </div>`;
  }).join('');
}

function loadHistoryItem(index) {
  window.vibeDepot.storage.get('patterns').then(history => {
    if (history && history[index]) {
      currentPattern = history[index].pattern;
      currentFlags = history[index].flags;
      try { currentRegex = new RegExp(currentPattern, currentFlags); } catch { currentRegex = null; }
      document.getElementById('regexPattern').textContent = `/${currentPattern}/${currentFlags}`;
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
  document.getElementById('explanation').innerHTML = `<div class="error">${escapeHtml(msg)}</div>`;
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

  document.getElementById('testInput').addEventListener('input', updateLiveTest);
  await loadHistory();
});
