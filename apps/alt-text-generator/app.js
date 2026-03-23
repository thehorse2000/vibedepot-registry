// Alt Text Generator — VibeDepot App

let results = [];

async function generateAltText() {
  const input = document.getElementById('descriptions').value.trim();
  const context = document.getElementById('context').value;
  if (!input) return;

  setLoading(true);
  results = [];

  try {
    const result = await window.vibeDepot.ai.callAI({
      messages: [
        {
          role: 'system',
          content: `You are an accessibility expert specializing in alt text for ${context} contexts. Given image descriptions, generate concise, descriptive alt text for each image.\n\nRules:\n- Alt text should be under 125 characters\n- Convey the purpose and content of the image\n- Be appropriate for ${context} context\n- Don't start with "Image of" or "Picture of"\n\nRespond ONLY with a valid JSON array, no markdown or code fences:\n[{"filename": "...", "altText": "..."}]`
        },
        { role: 'user', content: input }
      ],
      maxTokens: 2048
    });

    try {
      const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      results = JSON.parse(cleaned);
    } catch {
      showError({ message: 'Failed to parse response. Try again.' });
      return;
    }

    renderResults();
  } catch (err) {
    showError(err);
  } finally {
    setLoading(false);
  }
}

function renderResults() {
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = results.map(r =>
    `<tr><td>${escapeHtml(r.filename)}</td><td>${escapeHtml(r.altText)}</td></tr>`
  ).join('');
  document.getElementById('outputSection').style.display = 'block';
}

function exportJSON() {
  if (!results.length) return;
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'alt-text.json');
}

function exportCSV() {
  if (!results.length) return;
  const header = 'filename,altText\n';
  const rows = results.map(r =>
    `"${r.filename.replace(/"/g, '""')}","${r.altText.replace(/"/g, '""')}"`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  downloadBlob(blob, 'alt-text.csv');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function setLoading(loading) {
  document.getElementById('loading').style.display = loading ? 'block' : 'none';
  document.querySelectorAll('button').forEach(btn => btn.disabled = loading);
}

function showError(err) {
  const msg = err.code === 'MISSING_API_KEY' ? 'No API key configured. Go to VibeDepot Settings to add one.'
    : err.code === 'AI_PROVIDER_ERROR' ? 'AI service error. Please try again.'
    : `Error: ${err.message}`;
  document.getElementById('resultsBody').innerHTML = `<tr><td colspan="2"><div class="error">${escapeHtml(msg)}</div></td></tr>`;
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
});
