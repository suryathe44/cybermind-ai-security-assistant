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
let labLevel = 'easy';
const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
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

async function loadLab() {
  labPanel.hidden = false;
  updateProgress();
  labResult.hidden = true;
  labActions.replaceChildren();
  document.querySelector('#lab-hint').hidden = true;
  document.querySelector('#lab-hint-button').hidden = false;
  document.querySelector('#lab-title').textContent = 'Loading lab…';
  try {
    const response = await fetch(`/api/lab/${encodeURIComponent(labTopic)}?level=${labLevel}`);
    if (!response.ok) throw new Error('Lab is unavailable.');
    const lab = await response.json();
    document.querySelector('#lab-title').textContent = lab.title;
    document.querySelector('#lab-scenario').textContent = lab.scenario;
    document.querySelector('#lab-task').textContent = lab.task;
    document.querySelector('#lab-hint').textContent = lab.hint;
    const reference = document.querySelector('#lab-reference');
    reference.href = lab.reference.url;
    reference.textContent = lab.reference.title;
    const reviewed = document.querySelector('#lab-reviewed');
    reviewed.dateTime = lab.reviewed_on;
    reviewed.textContent = lab.reviewed_on;
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
  labPanel.scrollIntoView({behavior: motion, block: 'start'});
}

startLab.addEventListener('click', loadLab);
document.querySelectorAll('[data-level]').forEach((levelButton) => levelButton.addEventListener('click', () => {
  labLevel = levelButton.dataset.level;
  document.querySelectorAll('[data-level]').forEach((item) => item.setAttribute('aria-pressed', String(item === levelButton)));
  loadLab();
}));

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
      body: JSON.stringify({action_id: chosen.value, level: labLevel}),
    });
    const result = await response.json();
    labResult.hidden = false;
    labEvidence.hidden = true;
    document.querySelector('#lab-status').textContent = !response.ok ? 'COULD NOT CHECK' : result.passed ? 'PASS · Defense selected' : 'TRY AGAIN · Review the hint';
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
    labResult.focus();
  } catch {
    labResult.hidden = false;
    document.querySelector('#lab-status').textContent = 'CONNECTION ERROR';
    document.querySelector('#lab-feedback').textContent = 'Please try again shortly.';
    labResult.focus();
  } finally {
    submit.disabled = false;
  }
});

const assessmentStart = document.querySelector('#assessment-start');
const assessmentForm = document.querySelector('#assessment-form');
const assessmentQuestions = document.querySelector('#assessment-questions');
const assessmentResult = document.querySelector('#assessment-result');
let assessmentItems = [];

assessmentStart.addEventListener('click', async () => {
  assessmentStart.disabled = true;
  assessmentStart.textContent = 'Loading assessment…';
  try {
    const response = await fetch('/api/assessment');
    if (!response.ok) throw new Error('Assessment unavailable');
    const data = await response.json();
    assessmentItems = data.questions;
    assessmentQuestions.replaceChildren(...assessmentItems.map((question, index) => {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'assessment-question';
      const legend = document.createElement('legend');
      legend.textContent = `${index + 1}. ${question.topic.toUpperCase()} · ${question.level}`;
      const scenario = document.createElement('p');
      scenario.textContent = question.scenario;
      const task = document.createElement('p');
      task.textContent = question.task;
      fieldset.append(legend, scenario, task);
      question.actions.forEach((action) => {
        const label = document.createElement('label');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = question.id;
        radio.value = action.id;
        radio.required = true;
        const caption = document.createElement('span');
        caption.textContent = action.label;
        label.append(radio, caption);
        fieldset.append(label);
      });
      return fieldset;
    }));
    assessmentForm.hidden = false;
    assessmentResult.hidden = true;
    assessmentStart.hidden = true;
    assessmentForm.querySelector('input').focus();
  } catch {
    assessmentStart.textContent = 'Could not load. Try again';
    assessmentStart.disabled = false;
  }
});

assessmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const answers = Object.fromEntries(assessmentItems.map((question) => [question.id, assessmentForm.querySelector(`input[name="${question.id}"]:checked`)?.value]));
  if (Object.values(answers).some((value) => !value)) return;
  const submit = document.querySelector('#assessment-submit');
  submit.disabled = true;
  try {
    const response = await fetch('/api/assessment/submit', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({answers}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not score assessment');
    document.querySelector('#assessment-score').textContent = `${result.score}/${result.total} · ${result.passed ? 'Passed' : 'Keep practicing'}`;
    document.querySelector('#assessment-review').replaceChildren(...result.results.map((item, index) => {
      const row = document.createElement('li');
      row.textContent = `Question ${index + 1}: ${item.correct ? 'Correct' : item.explanation}`;
      return row;
    }));
    document.querySelector('#certificate-controls').hidden = !result.passed;
    assessmentResult.hidden = false;
    assessmentResult.focus();
    assessmentResult.scrollIntoView({behavior: motion, block: 'start'});
  } catch (error) {
    document.querySelector('#assessment-score').textContent = error.message;
    assessmentResult.hidden = false;
  } finally { submit.disabled = false; }
});

document.querySelector('#certificate-download').addEventListener('click', () => {
  const name = document.querySelector('#certificate-name').value.trim();
  if (!name) { document.querySelector('#certificate-name').focus(); return; }
  const canvas = document.createElement('canvas');
  canvas.width = 1600; canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b1018'; ctx.fillRect(0, 0, 1600, 1000);
  ctx.strokeStyle = '#59e3c3'; ctx.lineWidth = 6; ctx.strokeRect(42, 42, 1516, 916);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#59e3c3'; ctx.font = 'bold 36px sans-serif'; ctx.fillText('CYBERMINDSPACE', 800, 190);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 74px sans-serif'; ctx.fillText('Certificate of Completion', 800, 320);
  ctx.font = '32px sans-serif'; ctx.fillText('This certifies that', 800, 420);
  ctx.font = 'bold 64px sans-serif'; ctx.fillText(name.slice(0, 70), 800, 530, 1350);
  ctx.font = '30px sans-serif'; ctx.fillText('passed the AI Security Labs final assessment', 800, 635);
  ctx.font = '26px sans-serif'; ctx.fillText(`Issued ${new Date().toISOString().slice(0, 10)} · Self-paced learning certificate`, 800, 770);
  ctx.font = '22px sans-serif'; ctx.fillText('Prompt Injection · RAG Poisoning · MCP Access Control', 800, 835);
  const link = document.createElement('a');
  link.download = 'cybermindspace-certificate.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});
