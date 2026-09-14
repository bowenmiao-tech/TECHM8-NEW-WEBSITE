// Supplier markup is reduced to text and line breaks; no source attributes survive.
const cellHtml = (value) => String(value || '')
  .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;')
  .split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('<br>');

const escapeText = (value) => String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const comparableText = (value) => String(value)
  .replace(/<br>/g, ' ')
  .replace(/&(amp|lt|gt|quot);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"' })[name])
  .replace(/\s+/g, ' ').trim().toLowerCase();

// facts are [label, plain text] pairs such as Model/SKU/Condition. With a spec table they
// become extra rows, skipping values the table already lists; otherwise short paragraphs.
export function formatCom1Details(source, fallback = '', facts = []) {
  const rows = [...String(source || '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(row => [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => cellHtml(cell[1])))
    .filter(cells => cells.length >= 2 && cells[0] && cells.slice(1).some(Boolean));
  const presentFacts = facts.filter(([, value]) => value);
  const notice = '<p class="com1-pickup-note"><strong>Store pickup only.</strong> Please wait for our ready-to-collect notification before visiting. Delivery is not available.</p>';
  if (!rows.length) {
    return notice + `<p>${cellHtml(fallback || source)}</p>`
      + presentFacts.map(([label, value]) => `<p><strong>${label}:</strong> ${escapeText(value)}</p>`).join('');
  }
  const listed = new Set(rows.flatMap(cells => cells.slice(1)).map(comparableText));
  const factRows = presentFacts
    .filter(([, value]) => !listed.has(comparableText(value)))
    .map(([label, value]) => [label, escapeText(value)]);
  return notice + `<div class="com1-specifications"><table><caption>Technical specifications</caption><tbody>${[...rows, ...factRows].map(cells => `<tr><th scope="row">${cells[0]}</th><td>${cells.slice(1).filter(Boolean).join('<br>')}</td></tr>`).join('')}</tbody></table></div>`;
}
