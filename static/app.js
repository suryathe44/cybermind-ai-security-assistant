const form = document.querySelector('#chat-form');
const answer = document.querySelector('#answer');
const source = document.querySelector('#source');
const title = document.querySelector('#result-title');
const button = document.querySelector('#ask-button');
const panel = document.querySelector('#answer-panel');
const details = document.querySelector('#answer-details');
const detailsHeading = document.querySelector('#details-heading');
const detailsPoints = document.querySelector('#details-points');
const detailsTakeaway = document.querySelector('#details-takeaway');
const startLab = document.querySelector('#start-lab');
const labPanel = document.querySelector('#lab-panel');
const labForm = document.querySelector('#lab-form');
const labActions = document.querySelector('#lab-actions');
const labResult = document.querySelector('#lab-result');
const labEvidence = document.querySelector('#lab-evidence');
let labTopic = '';
const progressKey = 'cybermindspace-labs-v1';
let completedLabs = [];
try {
  const saved = JSON.parse(localStorage.getItem(progressKey) || '[]');
  if (Array.isArray(saved)) completedLabs = saved.filter((topic) => ['prompt injection', 'rag poisoning', 'mcp'].includes(topic));
} catch { /* Browsers without storage can still use every lab. */ }

function updateProgress() {
  const count = new Set(completedLabs).size;
  document.querySelector('#lab-progress-text').textContent = `${count} of 3 labs completed`;
  document.querySelector('#lab-progress-fill').style.width = `${(count / 3) * 100}%`;
}
updateProgress();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  answer.textContent = 'Looking up approved knowledge…';
  title.textContent = 'Finding your answer';
  source.textContent = 'LOADING';
  details.hidden = true;
  startLab.hidden = true;
  labPanel.hidden = true;
  try {
    const topic = form.querySelector('input[name="topic"]:checked').value;
    const mode = document.querySelector('#mode').value;
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, mode }),
    });
    const data = await response.json();
    title.textContent = response.ok ? topic.toUpperCase() : 'Request could not be completed';
    answer.textContent = data.answer || data.error || 'Unexpected response';
    source.textContent = response.ok ? data.source.replaceAll('-', ' ').toUpperCase() : `HTTP ${response.status}`;
    if (response.ok && data.details) {
      detailsHeading.textContent = data.details.heading;
      detailsPoints.replaceChildren(...data.details.points.map((point) => {
        const item = document.createElement('li');
        item.textContent = point;
        return item;
      }));
      detailsTakeaway.textContent = data.details.takeaway;
      details.hidden = false;
    }
    panel.classList.toggle('is-filled', response.ok);
    if (response.ok && data.source === 'approved-local-knowledge') {
      labTopic = topic;
      startLab.hidden = false;
    }
  } catch {
    title.textContent = 'Connection error';
    answer.textContent = 'The server is unavailable. Please try again shortly.';
    source.textContent = 'OFFLINE';
    panel.classList.remove('is-filled');
  } finally {
    button.disabled = false;
  }
});

startLab.addEventListener('click', async () => {
  labPanel.hidden = false;
  updateProgress();
  labResult.hidden = true;
  document.querySelector('#lab-hint').hidden = true;
  document.querySelector('#lab-hint-button').hidden = false;
  document.querySelector('#lab-title').textContent = 'Loading lab…';
  try {
    const response = await fetch(`/api/lab/${encodeURIComponent(labTopic)}`);
    if (!response.ok) throw new Error('Lab is unavailable.');
    const lab = await response.json();
    document.querySelector('#lab-title').textContent = lab.title;
    document.querySelector('#lab-scenario').textContent = lab.scenario;
    document.querySelector('#lab-task').textContent = lab.task;
    document.querySelector('#lab-hint').textContent = lab.hint;
    labActions.replaceChildren(...lab.actions.map((action) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      const text = document.createElement('span');
      radio.type = 'radio';
      radio.name = 'action_id';
      radio.value = action.id;
      radio.required = true;
      text.textContent = action.label;
      label.append(radio, text);
      return label;
    }));
  } catch {
    document.querySelector('#lab-title').textContent = 'Lab unavailable';
    document.querySelector('#lab-scenario').textContent = 'Please try again shortly.';
  }
  labPanel.scrollIntoView({behavior: 'smooth', block: 'start'});
});

document.querySelector('#lab-hint-button').addEventListener('click', () => {
  document.querySelector('#lab-hint').hidden = false;
  document.querySelector('#lab-hint-button').hidden = true;
});

labForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const chosen = labForm.querySelector('input[name="action_id"]:checked');
  if (!chosen) return;
  const submit = document.querySelector('#lab-submit');
  submit.disabled = true;
  try {
    const response = await fetch(`/api/lab/${encodeURIComponent(labTopic)}/submit`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action_id: chosen.value}),
    });
    const result = await response.json();
    labResult.hidden = false;
    labEvidence.hidden = true;
    document.querySelector('#lab-status').textContent = result.passed ? 'PASS · Defense selected' : 'TRY AGAIN · Review the hint';
    document.querySelector('#lab-feedback').textContent = result.feedback || result.error || 'Could not check this answer.';
    labResult.classList.toggle('passed', Boolean(result.passed));
    if (result.passed) {
      if (!completedLabs.includes(labTopic)) {
        completedLabs.push(labTopic);
        try { localStorage.setItem(progressKey, JSON.stringify(completedLabs)); } catch { /* Storage is optional. */ }
        updateProgress();
      }
      for (const [id, key] of Object.entries({
        'lab-evidence-text': 'evidence', 'lab-root-cause': 'root_cause',
        'lab-vulnerable': 'vulnerable', 'lab-secure': 'secure', 'lab-secure-fix': 'secure_fix',
      })) document.getElementById(id).textContent = result[key];
      labEvidence.hidden = false;
    }
  } catch {
    labResult.hidden = false;
    document.querySelector('#lab-status').textContent = 'CONNECTION ERROR';
    document.querySelector('#lab-feedback').textContent = 'Please try again shortly.';
  } finally {
    submit.disabled = false;
  }
});
