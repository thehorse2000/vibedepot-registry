// CSV Analyzer — VibeDepot App

let parsedRows = [];
let headers = [];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('csvData').addEventListener('input', parseAndPreview);
});

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const h = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers: h, rows };
}

function parseAndPreview() {
  const text = document.getElementById('csvData').value.trim();
  if (!text) {
    document.getElementById('previewSection').style.display = 'none';
    return;
  }

  const { headers: h, rows } = parseCSV(text);
  headers = h;
  parsedRows = rows;

  document.getElementById('stats').textContent = `${rows.length} rows, ${h.length} columns: ${h.join(', ')}`;

  const preview = rows.slice(0, 5);
  const table = document.getElementById('previewTable');
  table.innerHTML = `<thead><tr>${h.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
    <tbody>${preview.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;

  document.getElementById('previewSection').style.display = 'block';
}

function askQuick(q) {
  document.getElementById('question').value = q;
  analyze();
}

async function analyze() {
  const csvText = document.getElementById('csvData').value.trim();
  const question = document.getElementById('question').value.trim();
  if (!csvText || !question) return;

  setLoading(true);
  clearOutput();
  showOutputSection();

  // Send first 50 rows to stay within token limits
  const lines = csvText.split('\n').filter(l => l.trim());
  const truncated = lines.slice(0, 51).join('\n');
  const totalRows = lines.length - 1;

  try {
    let fullText = '';
    await window.vibeDepot.ai.streamAI(
      {
        messages: [
          {
            role: 'system',
            content: 'You are a data analyst. Given CSV data and a question, analyze the data and provide clear, actionable insights. Include specific numbers and percentages where relevant. If the data is truncated, note that your analysis covers the provided sample. Use markdown formatting with tables where helpful.'
          },
          {
            role: 'user',
            content: `Data (${totalRows} total rows, showing first ${Math.min(50, totalRows)}):\n\n${truncated}\n\nQuestion: ${question}`
          }
        ],
        maxTokens: 2048
      },
      (chunk) => { fullText += chunk; appendOutput(chunk); }
    );
  } catch (err) { showError(err); } finally { setLoading(false); }
}

function setLoading(loading) {
  document.getElementById('loading').style.display = loading ? 'block' : 'none';
  document.querySelectorAll('button:not(.pill)').forEach(btn => btn.disabled = loading);
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

function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

window.addEventListener('DOMContentLoaded', async () => {
  try { const info = await window.vibeDepot.shell.getAppInfo(); if (info) await window.vibeDepot.shell.setTitle(info.name); } catch {}
  try { const theme = await window.vibeDepot.shell.theme(); document.body.classList.toggle('dark', theme === 'dark'); } catch {}
});
