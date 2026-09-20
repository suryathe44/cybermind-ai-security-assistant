const form = document.querySelector('#chat-form');
const answer = document.querySelector('#answer');
const source = document.querySelector('#source');
const title = document.querySelector('#result-title');
const button = document.querySelector('#ask-button');
const panel = document.querySelector('#answer-panel');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  answer.textContent = 'Looking up approved knowledge…';
  title.textContent = 'Finding your answer';
  source.textContent = 'LOADING';
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
    panel.classList.toggle('is-filled', response.ok);
  } catch {
    title.textContent = 'Connection error';
    answer.textContent = 'The local server is unavailable. Open the app through its Flask URL and try again.';
    source.textContent = 'OFFLINE';
    panel.classList.remove('is-filled');
  } finally {
    button.disabled = false;
  }
});
