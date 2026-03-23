// Job Description Scorer — VibeDepot App

let lastAnalysis = '';
let lastScore = 0;

async function analyzeMatch() {
  const jobDesc = document.getElementById('jobDesc').value.trim();
  const resume = document.getElementById('resume').value.trim();
  if (!jobDesc || !resume) return;

  setLoading(true);
  clearOutput();
  document.getElementById('scoreSection').style.display = 'none';
  showOutputSection();

  try {
    let fullText = '';
    await window.vibeDepot.ai.streamAI(
      {
        messages: [
          {
            role: 'system',
            content: 'You are a resume-job matching expert. Given a job description and resume, provide:\n\n1) On the very first line, output ONLY the match score in this exact format: SCORE: 85\n\n2) Then provide:\n\n## Gap Analysis\nBullet list of skills/requirements in the JD that are missing or weak in the resume.\n\n## Strengths\nBullet list of areas where the resume strongly matches.\n\n## Tailored Bullets\n3-5 resume bullet points the candidate could add to better match this role. Make them specific and achievement-oriented.\n\nBe specific and actionable.'
          },
          {
            role: 'user',
            content: `## Job Description\n${jobDesc}\n\n## Resume\n${resume}`
          }
        ],
        maxTokens: 2048
      },
      (chunk) => {
        fullText += chunk;
        appendOutput(chunk);
      }
    );

    lastAnalysis = fullText;

    // Parse score from response
    const scoreMatch = fullText.match(/SCORE:\s*(\d+)/);
    if (scoreMatch) {
      lastScore = parseInt(scoreMatch[1], 10);
      displayScore(lastScore);
    }
  } catch (err) {
    showError(err);
  } finally {
    setLoading(false);
  }
}

function displayScore(score) {
  const el = document.getElementById('scoreNumber');
  el.textContent = score;
  el.className = 'score-number ' + (score >= 80 ? 'score-high' : score >= 60 ? 'score-mid' : 'score-low');
  document.getElementById('scoreSection').style.display = 'block';
}

async function saveAnalysis() {
  if (!lastAnalysis) return;
  try {
    let history = (await window.vibeDepot.storage.get('history')) || [];
    history.unshift({
      date: new Date().toISOString(),
      score: lastScore,
      preview: lastAnalysis.substring(0, 80),
      content: lastAnalysis
    });
    if (history.length > 10) history = history.slice(0, 10);
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
  } catch (err) {
    console.error('Storage load failed:', err);
  }
}

function renderHistory(history) {
  const section = document.getElementById('historySection');
  const list = document.getElementById('historyList');
  if (!history || history.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = history.map((item, i) => {
    const date = new Date(item.date).toLocaleDateString();
    return `<div class="history-item" onclick="loadHistoryItem(${i})">
      <div class="date">${escapeHtml(date)} — Score: ${item.score || '?'}</div>
      <div class="preview">${escapeHtml(item.preview)}</div>
    </div>`;
  }).join('');
}

function loadHistoryItem(index) {
  window.vibeDepot.storage.get('history').then(history => {
    if (history && history[index]) {
      showOutput(history[index].content);
      if (history[index].score) displayScore(history[index].score);
    }
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
