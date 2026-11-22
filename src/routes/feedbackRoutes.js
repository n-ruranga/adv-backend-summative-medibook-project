const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

const LOCALES_DIR = path.join(process.cwd(), 'locales');
const SUPPORTED = new Set(['en', 'fr']);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadLocale(lang) {
  const safeLang = SUPPORTED.has(lang) ? lang : 'en';
  const filePath = path.join(LOCALES_DIR, `${safeLang}.json`);
  const raw = await fs.readFile(filePath, 'utf8');
  return { lang: safeLang, strings: JSON.parse(raw) };
}

function renderFeedbackPage(lang, strings, formattedDate) {
  const questionsHtml = strings.questions
    .map(
      (question, index) => `
      <div class="question">
        <label for="q${index + 1}"><strong>${index + 1}.</strong> ${escapeHtml(question)}</label>
        <textarea id="q${index + 1}" name="q${index + 1}" rows="5" required></textarea>
      </div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(strings.title)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; margin: 0; background: #f6f3ee; color: #1f1a14; }
    main { max-width: 720px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
    h1 { font-size: 1.8rem; margin-bottom: 0.4rem; }
    .meta { color: #5a5147; margin-bottom: 1.25rem; }
    .lang { margin-bottom: 1.5rem; }
    .lang a { margin-right: 0.75rem; color: #0b5fff; }
    .question { margin-bottom: 1.25rem; }
    label { display: block; margin-bottom: 0.4rem; line-height: 1.4; }
    textarea { width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #cfc5b8; border-radius: 4px; font: inherit; background: #fffdf9; }
    button { margin-top: 0.5rem; padding: 0.55rem 1rem; border: 0; background: #1f1a14; color: #fffdf9; cursor: pointer; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(strings.title)}</h1>
    <p class="meta">${escapeHtml(strings.dateLabel)}: ${escapeHtml(formattedDate)}</p>
    <p class="lang">
      <a href="/feedback?lang=en">English</a>
      <a href="/feedback?lang=fr">Français</a>
    </p>
    <p>${escapeHtml(strings.instructions)}</p>
    <form method="post" action="/feedback">
      ${questionsHtml}
      <button type="submit">${escapeHtml(strings.submitLabel)}</button>
    </form>
  </main>
</body>
</html>`;
}

router.get('/', async (req, res, next) => {
  try {
    const requested = String(req.query.lang || 'en').toLowerCase();
    const { lang, strings } = await loadLocale(requested);
    const localeTag = lang === 'fr' ? 'fr-FR' : 'en-GB';
    const formattedDate = new Intl.DateTimeFormat(localeTag, {
      dateStyle: 'full',
    }).format(new Date());

    res
      .status(200)
      .type('html')
      .send(renderFeedbackPage(lang, strings, formattedDate));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
