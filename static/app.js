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
const topics = ['prompt injection', 'rag poisoning', 'mcp'];
const levels = ['easy', 'medium', 'hard'];
const progressKey = 'cybermindspace-path-v2';
let path = {completed: [], misses: {}, last: {topic: topics[0], level: 'easy'}, bestScore: 0};
let lang = 'en';
try {
  const saved = JSON.parse(localStorage.getItem(progressKey) || 'null');
  if (saved && Array.isArray(saved.completed)) path = {...path, ...saved};
  else path.completed = (JSON.parse(localStorage.getItem('cybermindspace-labs-v1') || '[]')).filter((topic) => topics.includes(topic)).map((topic) => `${topic}|easy`);
  if (localStorage.getItem('cybermindspace-lang') === 'hi') lang = 'hi';
} catch { /* Storage is optional. */ }
path.completed = [...new Set(path.completed.filter((key) => topics.some((topic) => levels.some((level) => key === `${topic}|${level}`))))];
function savePath() { try { localStorage.setItem(progressKey, JSON.stringify(path)); } catch {} }
const translations = {
  en: {completed: 'scenarios completed', weak: 'Review', none: 'No weak topics yet.', pass: 'PASS · Defense selected', retry: 'TRY AGAIN · Review the hint', correct: 'Correct', question: 'Question', passed: 'Passed', practice: 'Keep practicing'},
  hi: {completed: 'परिदृश्य पूरे', weak: 'अभ्यास करें', none: 'अभी कोई कमज़ोर विषय नहीं।', pass: 'सही · सुरक्षित विकल्प चुना', retry: 'फिर कोशिश करें · संकेत देखें', correct: 'सही', question: 'प्रश्न', passed: 'उत्तीर्ण', practice: 'अभ्यास जारी रखें'}
};

function updateProgress() {
  const count = path.completed.length;
  document.querySelector('#lab-progress-text').textContent = `${count} / 9 ${translations[lang].completed}`;
  document.querySelector('#lab-progress-fill').style.width = `${(count / 9) * 100}%`;
  document.querySelector('#path-count').textContent = `${count} / 9`;
  const grid = document.querySelector('#path-grid'); grid.replaceChildren();
  topics.forEach((topic) => {
    const card = document.createElement('div'); card.className = 'path-card';
    const name = document.createElement('strong'); name.textContent = topic.toUpperCase(); card.append(name);
    const steps = document.createElement('div'); steps.className = 'path-steps';
    levels.forEach((level) => {
      const step = document.createElement('button'); step.type = 'button';
      step.textContent = lang === 'hi' ? {easy:'आसान',medium:'मध्यम',hard:'कठिन'}[level] : level;
      step.className = path.completed.includes(`${topic}|${level}`) ? 'done' : '';
      step.setAttribute('aria-label', `${topic} ${level}: ${step.className ? 'completed' : 'not completed'}`);
      step.addEventListener('click', () => openPathLab(topic, level)); steps.append(step);
    }); card.append(steps); grid.append(card);
  });
  const weak = topics.filter((topic) => levels.some((level) => path.misses[`${topic}|${level}`] && !path.completed.includes(`${topic}|${level}`)));
  document.querySelector('#weak-topics').textContent = weak.length ? `${translations[lang].weak}: ${weak.join(', ')}` : translations[lang].none;
}
function openPathLab(topic, level) {
  labTopic = topic; labLevel = level; path.last = {topic, level}; savePath();
  form.querySelector(`input[value="${topic}"]`).checked = true;
  document.querySelectorAll('[data-level]').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.level === level)));
  loadLab();
}
document.querySelectorAll('[data-bonus]').forEach((button) => button.addEventListener('click', () => openPathLab(button.dataset.bonus, 'bonus')));
document.querySelector('#path-continue').addEventListener('click', () => {
  const next = topics.flatMap((topic) => levels.map((level) => ({topic, level}))).find(({topic, level}) => !path.completed.includes(`${topic}|${level}`)) || {topic: topics[0], level: 'easy'};
  const last = path.last && !path.completed.includes(`${path.last.topic}|${path.last.level}`) ? path.last : next;
  openPathLab(last.topic, last.level);
});
const englishUI = new Map();
const hindiUI = {'#page-title':'AI सुरक्षा, सरल भाषा में.', '.hero-description':'स्वीकृत जानकारी से AI सुरक्षा विषय, उदाहरण और बचाव सीखें।', '.workspace-heading h2':'आप क्या सीखना चाहेंगे?', '.topic-fieldset legend':'विषय चुनें', '.mode-control label':'मैं देखना चाहता हूँ', '#ask-button':'जवाब देखें ↗', '#start-lab':'लैब शुरू करें ↗', '#lab-form legend':'जवाब चुनें', '#lab-submit':'जवाब जाँचें ↗', '#lab-hint-button':'संकेत देखें', '#assessment-title':'अपना अभ्यास जाँचें।', '#assessment-intro':'छह सवाल। 5 सही जवाब पर प्रमाणपत्र मिलेगा। आप फिर कोशिश कर सकते हैं।', '#assessment-start':'आकलन शुरू करें ↗', '#assessment-submit':'स्कोर जाँचें ↗', '#certificate-name-label':'प्रमाणपत्र पर नाम', '#certificate-download':'सत्यापित प्रमाणपत्र डाउनलोड करें', '#instructor-title':'बिना नाम के कक्षा आँकड़े', '#instructor-token-label':'Instructor access code', '#instructor-submit':'आँकड़े देखें'};
Object.keys(hindiUI).forEach((selector) => englishUI.set(selector, document.querySelector(selector).textContent));
function setLanguage(next) {
  lang = next; document.documentElement.lang = next;
  try { localStorage.setItem('cybermindspace-lang', next); } catch {}
  document.querySelectorAll('[data-lang]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.lang === next)));
  Object.entries(hindiUI).forEach(([selector, value]) => {document.querySelector(selector).textContent = next === 'hi' ? value : englishUI.get(selector);});
  document.querySelector('[data-i18n="pathKicker"]').textContent = next === 'hi' ? 'आपका सीखने का रास्ता' : 'YOUR LEARNING PATH';
  document.querySelector('[data-i18n="pathTitle"]').textContent = next === 'hi' ? 'नौ परिदृश्य, एक साफ़ रास्ता।' : 'Nine scenarios, one clear path.';
  document.querySelector('[data-i18n="pathSummary"]').textContent = next === 'hi' ? 'आपकी प्रगति इसी browser में रहती है। हर विषय के आसान, मध्यम और कठिन अभ्यास पूरे करें।' : 'Your progress stays in this browser. Complete easy, medium, and hard labs for each topic.';
  document.querySelector('#path-continue').textContent = next === 'hi' ? 'जहाँ छोड़ा था वहाँ से जारी रखें' : 'Continue where you left off';
  document.querySelector('#bonus-kicker').textContent = next === 'hi' ? 'अतिरिक्त प्रैक्टिकल लैब' : 'BONUS PRACTICAL LABS';
  document.querySelector('#bonus-title').textContent = next === 'hi' ? 'दो असली फैसलों का अभ्यास करें।' : 'Practice two real-world decisions.';
  document.querySelector('#bonus-intro').textContent = next === 'hi' ? 'ये सुरक्षित अभ्यास हैं; कोई असली account, file या tool इस्तेमाल नहीं होता।' : 'Safe simulations: no real accounts, files, or tools are touched.';
  document.querySelectorAll('[data-bonus]').forEach((button, index) => {button.textContent = next === 'hi' ? ['Support ticket tool का जाल','Shared drive अनुमति का जाल'][index] : ['Support ticket tool trap','Shared drive permission trap'][index];});
  document.querySelectorAll('[data-level]').forEach((button) => {button.textContent = next === 'hi' ? {easy:'आसान',medium:'मध्यम',hard:'कठिन'}[button.dataset.level] : button.dataset.level;});
  [...document.querySelector('#mode').options].forEach((option, i) => {option.textContent = (next === 'hi' ? ['सरल व्याख्या','उदाहरण','जोखिम कैसे घटाएँ'] : ['A simple explanation','A real-world example','How to reduce the risk'])[i];});
  updateProgress();
}
document.querySelectorAll('[data-lang]').forEach((button) => button.addEventListener('click', () => {setLanguage(button.dataset.lang); if (labTopic && !labPanel.hidden) loadLab();}));
setLanguage(lang);

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
      body: JSON.stringify({ topic, mode, lang }),
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
  if (labLevel !== 'bonus') {path.last = {topic: labTopic, level: labLevel}; savePath();}
  updateProgress();
  labResult.hidden = true;
  labActions.replaceChildren();
  document.querySelector('#lab-hint').hidden = true;
  document.querySelector('#lab-hint-button').hidden = false;
  document.querySelector('#lab-title').textContent = 'Loading lab…';
  try {
    const response = await fetch(`/api/lab/${encodeURIComponent(labTopic)}?level=${labLevel}&lang=${lang}`);
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
      body: JSON.stringify({action_id: chosen.value, level: labLevel, lang}),
    });
    const result = await response.json();
    labResult.hidden = false;
    labEvidence.hidden = true;
    document.querySelector('#lab-status').textContent = !response.ok ? 'COULD NOT CHECK' : result.passed ? translations[lang].pass : translations[lang].retry;
    document.querySelector('#lab-feedback').textContent = result.feedback || result.error || 'Could not check this answer.';
    labResult.classList.toggle('passed', Boolean(result.passed));
    const pathItem = `${labTopic}|${labLevel}`;
    if (response.ok && !result.passed) path.misses[pathItem] = (path.misses[pathItem] || 0) + 1;
    if (result.passed) {
      if (labLevel !== 'bonus' && !path.completed.includes(pathItem)) path.completed.push(pathItem);
      updateProgress();
      for (const [id, key] of Object.entries({
        'lab-evidence-text': 'evidence', 'lab-root-cause': 'root_cause',
        'lab-vulnerable': 'vulnerable', 'lab-secure': 'secure', 'lab-secure-fix': 'secure_fix',
      })) document.getElementById(id).textContent = result[key];
      labEvidence.hidden = false;
    }
    savePath(); updateProgress();
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
let certificateProof = null;

assessmentStart.addEventListener('click', async () => {
  assessmentStart.disabled = true;
  assessmentStart.textContent = 'Loading assessment…';
  try {
    const response = await fetch(`/api/assessment?lang=${lang}`);
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
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({answers, lang}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not score assessment');
    certificateProof = result.certificate_proof || null;
    path.bestScore = Math.max(path.bestScore || 0, result.score); savePath();
    document.querySelector('#assessment-score').textContent = `${result.score}/${result.total} · ${result.passed ? translations[lang].passed : translations[lang].practice}`;
    document.querySelector('#assessment-review').replaceChildren(...result.results.map((item, index) => {
      const row = document.createElement('li');
      row.textContent = `${translations[lang].question} ${index + 1}: ${item.correct ? translations[lang].correct : item.explanation}`;
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

document.querySelector('#certificate-download').addEventListener('click', async () => {
  const name = document.querySelector('#certificate-name').value.trim();
  const message = document.querySelector('#certificate-message');
  if (name.length < 2) { document.querySelector('#certificate-name').focus(); return; }
  if (!certificateProof) { message.textContent = 'Certificate signing is not configured yet.'; return; }
  const button = document.querySelector('#certificate-download'); button.disabled = true;
  try {
    const response = await fetch('/api/certificate', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name, proof:certificateProof})});
    const issued = await response.json();
    if (!response.ok) throw new Error(issued.error || 'Certificate unavailable');
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0b1018'; ctx.fillRect(0, 0, 1600, 1000);
    ctx.strokeStyle = '#59e3c3'; ctx.lineWidth = 6; ctx.strokeRect(42, 42, 1516, 916);
    ctx.textAlign = 'center'; ctx.fillStyle = '#59e3c3'; ctx.font = 'bold 36px sans-serif'; ctx.fillText('CYBERMINDSPACE', 800, 190);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 74px sans-serif'; ctx.fillText('Certificate of Completion', 800, 320);
    ctx.font = '32px sans-serif'; ctx.fillText('This certifies that', 800, 420);
    ctx.font = 'bold 64px sans-serif'; ctx.fillText(name, 800, 530, 1350);
    ctx.font = '30px sans-serif'; ctx.fillText('passed the AI Security Labs final assessment', 800, 635);
    ctx.font = '26px sans-serif'; ctx.fillText(`Issued ${new Date().toISOString().slice(0, 10)} · Self-paced learning certificate`, 800, 745);
    ctx.font = '18px sans-serif'; ctx.fillText(`Certificate ID: ${issued.certificate_id}`, 800, 810, 1400);
    ctx.font = '18px sans-serif'; ctx.fillText(issued.verify_url, 800, 855, 1400);
    const link = document.createElement('a'); link.download = 'cybermindspace-certificate.png'; link.href = canvas.toDataURL('image/png'); link.click();
    const verifyLink = document.querySelector('#certificate-verify-link'); verifyLink.href = issued.verify_url; verifyLink.hidden = false;
    message.textContent = lang === 'hi' ? 'प्रमाणपत्र डाउनलोड हो गया। Verification link नीचे है।' : 'Certificate downloaded. Verification link is below.';
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});

document.querySelector('#instructor-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = document.querySelector('#instructor-token'); const token = input.value; input.value = '';
  const result = document.querySelector('#instructor-result'); result.hidden = false; result.textContent = 'Loading…';
  try {
    const response = await fetch('/api/instructor/summary', {headers: {'X-Instructor-Token': token}});
    if (!response.ok) throw new Error('Could not load insights. Check your access code.');
    const data = await response.json(); result.replaceChildren();
    const heading = document.createElement('h3'); heading.textContent = lang === 'hi' ? 'कक्षा का सारांश' : 'Class summary'; result.append(heading);
    for (const [label, values] of [['Score distribution', data.assessment_scores], ['Commonly missed questions', data.question_misses], ['Lab misses', data.lab_misses]]) {
      const title = document.createElement('h4'); title.textContent = label; result.append(title);
      const list = document.createElement('ul');
      Object.entries(values).sort((a,b) => Number(b[1])-Number(a[1])).forEach(([key, value]) => {const item = document.createElement('li'); item.textContent = `${key}: ${value}`; list.append(item);});
      if (!list.children.length) {const item=document.createElement('li'); item.textContent='No attempts yet'; list.append(item);}
      result.append(list);
    }
  } catch (error) { result.textContent = error.message; }
  result.focus();
});
