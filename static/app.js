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

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  answer.textContent = 'Looking up approved knowledge…';
  title.textContent = 'Finding your answer';
  source.textContent = 'LOADING';
  details.hidden = true;
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
  } catch {
    title.textContent = 'Connection error';
    answer.textContent = 'The server is unavailable. Please try again.';
    source.textContent = 'OFFLINE';
    panel.classList.remove('is-filled');
  } finally {
    button.disabled = false;
  }
});
