// Email Writer — VibeDepot Seed App
// Uses window.vibeDepot Bridge API

async function generateEmail() {
  const prompt = document.getElementById('prompt').value.trim();
  if (!prompt) return;

  const tone = document.getElementById('tone').value;
  const loading = document.getElementById('loading');
  const outputSection = document.getElementById('outputSection');
  const output = document.getElementById('output');
  const generateBtn = document.getElementById('generateBtn');
  const streamBtn = document.getElementById('streamBtn');

  generateBtn.disabled = true;
  streamBtn.disabled = true;
  loading.style.display = 'block';
  outputSection.style.display = 'none';

  try {
    const result = await window.vibeDepot.ai.callAI({
      messages: [
        {
          role: 'system',
          content: `You are a professional email writer. Write emails in a ${tone} tone. Output only the email text — no subject line unless asked, no explanations. Keep it concise and natural.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      maxTokens: 1024,
    });

    output.textContent = result.content;
    outputSection.style.display = 'block';
  } catch (err) {
    output.textContent = `Error: ${err.message}`;
    outputSection.style.display = 'block';
  } finally {
    loading.style.display = 'none';
    generateBtn.disabled = false;
    streamBtn.disabled = false;
  }
}

async function generateEmailStream() {
  const prompt = document.getElementById('prompt').value.trim();
  if (!prompt) return;

  const tone = document.getElementById('tone').value;
  const loading = document.getElementById('loading');
  const outputSection = document.getElementById('outputSection');
  const output = document.getElementById('output');
  const generateBtn = document.getElementById('generateBtn');
  const streamBtn = document.getElementById('streamBtn');

  generateBtn.disabled = true;
  streamBtn.disabled = true;
  loading.style.display = 'block';
  output.textContent = '';
  outputSection.style.display = 'block';

  try {
    await window.vibeDepot.ai.streamAI(
      {
        messages: [
          {
            role: 'system',
            content: `You are a professional email writer. Write emails in a ${tone} tone. Output only the email text — no subject line unless asked, no explanations. Keep it concise and natural.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        maxTokens: 1024,
      },
      (chunk) => {
        output.textContent += chunk;
      }
    );
  } catch (err) {
    output.textContent += `\n\nError: ${err.message}`;
  } finally {
    loading.style.display = 'none';
    generateBtn.disabled = false;
    streamBtn.disabled = false;
  }
}

async function copyToClipboard() {
  const output = document.getElementById('output');
  try {
    await navigator.clipboard.writeText(output.textContent);
  } catch {
    // Fallback
    const range = document.createRange();
    range.selectNodeContents(output);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
  }
}

async function saveDraft() {
  const output = document.getElementById('output').textContent;
  const prompt = document.getElementById('prompt').value;
  if (!output) return;

  const drafts = (await window.vibeDepot.storage.get('drafts')) || [];
  drafts.unshift({
    prompt,
    content: output,
    date: new Date().toISOString(),
  });

  // Keep last 20 drafts
  if (drafts.length > 20) drafts.length = 20;

  await window.vibeDepot.storage.set('drafts', drafts);
  loadDrafts();
}

async function loadDrafts() {
  const drafts = (await window.vibeDepot.storage.get('drafts')) || [];
  const section = document.getElementById('draftsSection');
  const list = document.getElementById('draftsList');

  if (drafts.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = drafts
    .map(
      (d, i) => `
    <div class="draft-item" onclick="loadDraft(${i})">
      <div class="draft-preview">${escapeHtml(d.content.slice(0, 100))}</div>
      <div class="draft-date">${new Date(d.date).toLocaleString()}</div>
    </div>
  `
    )
    .join('');
}

async function loadDraft(index) {
  const drafts = (await window.vibeDepot.storage.get('drafts')) || [];
  if (drafts[index]) {
    document.getElementById('prompt').value = drafts[index].prompt || '';
    document.getElementById('output').textContent = drafts[index].content;
    document.getElementById('outputSection').style.display = 'block';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const info = await window.vibeDepot.shell.getAppInfo();
    if (info) {
      await window.vibeDepot.shell.setTitle(info.name);
    }
  } catch {
    // Shell API might not be available in dev
  }
  loadDrafts();
});
