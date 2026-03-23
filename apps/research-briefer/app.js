// Research Briefer — VibeDepot App
// Uses window.vibeDepot Bridge API

let selectedDepth = 'standard';
let rawBriefingText = '';

const DEPTH_CONFIG = {
  quick: {
    label: 'Quick Brief',
    maxTokens: 800,
    system: 'You are a research analyst. Given a topic, produce a concise briefing with: ## Key Findings (3 main bullet points), ## Implications (brief practical takeaways). Be factual and concise. Use markdown formatting.'
  },
  standard: {
    label: 'Standard',
    maxTokens: 2048,
    system: 'You are a research analyst. Given a topic, produce a structured briefing with: ## Background (context and why this matters), ## Key Findings (3-5 main points with detail), ## Different Perspectives (if applicable, present multiple viewpoints), ## Implications (what this means practically), ## Key Takeaways (actionable bullet points). Be factual, cite specific details where possible. Use markdown formatting.'
  },
  deep: {
    label: 'Deep Dive',
    maxTokens: 4096,
    system: 'You are a senior research analyst producing an in-depth briefing. Given a topic, produce a comprehensive, detailed report with: ## Executive Summary (2-3 sentence overview), ## Background & Context (thorough context, history, and why this matters now), ## Key Findings (5-7 detailed points, each with supporting evidence or specifics), ## Different Perspectives (present multiple viewpoints with their reasoning, including contrarian views), ## Analysis (deeper synthesis connecting the findings, identifying patterns and gaps), ## Implications & Risks (practical consequences, potential risks, and uncertainties), ## Key Takeaways & Recommendations (actionable, prioritized bullet points). Be thorough, analytical, and factual. Cite specific details, data points, and examples where possible. Use markdown formatting.'
  }
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMarkdown(text) {
  const escaped = escapeHtml(text);
  let html = escaped
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bullet points
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Paragraphs: wrap remaining plain text lines
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || trimmed.startsWith('</')) {
      return trimmed;
    }
    return '<p>' + trimmed + '</p>';
  }).join('\n');

  return html;
}

function initDepthSelector() {
  const buttons = document.querySelectorAll('.depth-option');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDepth = btn.dataset.depth;
    });
  });
}

async function generateBriefing() {
  const topic = document.getElementById('topic').value.trim();
  if (!topic) return;

  const focusAreas = document.getElementById('focusAreas').value.trim();
  const config = DEPTH_CONFIG[selectedDepth];
  const loading = document.getElementById('loading');
  const outputSection = document.getElementById('outputSection');
  const output = document.getElementById('output');
  const errorMsg = document.getElementById('errorMsg');
  const generateBtn = document.getElementById('generateBtn');

  generateBtn.disabled = true;
  loading.style.display = 'flex';
  outputSection.style.display = 'none';
  errorMsg.style.display = 'none';
  rawBriefingText = '';
  output.innerHTML = '';

  let userMessage = `Research topic: ${topic}`;
  if (focusAreas) {
    userMessage += `\n\nPlease focus especially on these areas: ${focusAreas}`;
  }

  try {
    outputSection.style.display = 'block';

    await window.vibeDepot.ai.streamAI(
      {
        messages: [
          {
            role: 'system',
            content: config.system
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        maxTokens: config.maxTokens
      },
      (chunk) => {
        rawBriefingText += chunk;
        output.innerHTML = renderMarkdown(rawBriefingText);
      }
    );
  } catch (err) {
    if (!rawBriefingText) {
      outputSection.style.display = 'none';
      errorMsg.textContent = 'Error: ' + (err.message || 'Failed to generate briefing. Check your API key in Settings.');
      errorMsg.style.display = 'block';
    } else {
      output.innerHTML = renderMarkdown(rawBriefingText + '\n\n---\n\n*Generation interrupted: ' + escapeHtml(err.message) + '*');
    }
  } finally {
    loading.style.display = 'none';
    generateBtn.disabled = false;
  }
}

async function copyBriefing() {
  if (!rawBriefingText) return;
  try {
    await navigator.clipboard.writeText(rawBriefingText);
  } catch {
    const range = document.createRange();
    const output = document.getElementById('output');
    range.selectNodeContents(output);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
  }
}

async function saveBriefing() {
  const topic = document.getElementById('topic').value.trim();
  if (!rawBriefingText || !topic) return;

  const focusAreas = document.getElementById('focusAreas').value.trim();
  const briefings = (await window.vibeDepot.storage.get('briefings')) || [];

  briefings.unshift({
    topic: topic,
    focusAreas: focusAreas,
    depth: selectedDepth,
    content: rawBriefingText,
    date: new Date().toISOString()
  });

  // Cap at 15 saved briefings
  if (briefings.length > 15) briefings.length = 15;

  await window.vibeDepot.storage.set('briefings', briefings);
  loadSavedBriefings();
}

async function loadSavedBriefings() {
  const briefings = (await window.vibeDepot.storage.get('briefings')) || [];
  const section = document.getElementById('savedSection');
  const list = document.getElementById('savedList');

  if (briefings.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = briefings
    .map((b, i) => `
      <div class="saved-item" onclick="loadBriefing(${i})">
        <div class="saved-item-title">${escapeHtml(b.topic)}</div>
        <div class="saved-item-meta">
          <span class="saved-item-depth">${escapeHtml(DEPTH_CONFIG[b.depth]?.label || b.depth)}</span>
          <span>${new Date(b.date).toLocaleString()}</span>
          <button class="saved-item-delete" onclick="event.stopPropagation(); deleteBriefing(${i})" title="Delete">Delete</button>
        </div>
      </div>
    `)
    .join('');
}

async function loadBriefing(index) {
  const briefings = (await window.vibeDepot.storage.get('briefings')) || [];
  if (!briefings[index]) return;

  const b = briefings[index];
  document.getElementById('topic').value = b.topic || '';
  document.getElementById('focusAreas').value = b.focusAreas || '';

  // Set depth
  const buttons = document.querySelectorAll('.depth-option');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.depth === b.depth);
  });
  selectedDepth = b.depth || 'standard';

  rawBriefingText = b.content;
  document.getElementById('output').innerHTML = renderMarkdown(b.content);
  document.getElementById('outputSection').style.display = 'block';
  document.getElementById('errorMsg').style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteBriefing(index) {
  const briefings = (await window.vibeDepot.storage.get('briefings')) || [];
  briefings.splice(index, 1);
  await window.vibeDepot.storage.set('briefings', briefings);
  loadSavedBriefings();
}

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
  initDepthSelector();

  try {
    const info = await window.vibeDepot.shell.getAppInfo();
    if (info) {
      await window.vibeDepot.shell.setTitle(info.name);
    }
  } catch {
    // Shell API might not be available in dev
  }

  // Detect theme
  try {
    const theme = await window.vibeDepot.shell.theme();
    if (theme === 'dark') {
      document.body.classList.add('dark');
    }
  } catch {
    // Theme detection not critical
  }

  loadSavedBriefings();
});
