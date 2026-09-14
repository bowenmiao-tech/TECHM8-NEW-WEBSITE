// Search-result and answer-engine copy for COM1 pickup-only monitors. Every fact comes
// from the supplier specification table (detail_html) or, for listings without a table,
// the supplier's one-line summary (e.g. BLACK/27"/FLAT/IPS/1920x1080/100Hz/5ms/2xHDMI).
// Anything the source does not state is left out rather than guessed.

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const plainText = (html) => String(html || '')
  .replace(/<br\s*\/?>/gi, ' / ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&amp;/gi, '&')
  .replace(/[™®]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const specRows = (detailHtml) => [...String(detailHtml || '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
  .map(row => [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => plainText(cell[1])))
  .filter(cells => cells.length >= 2 && cells[0] && cells.slice(1).some(Boolean))
  .map(([label, ...values]) => [label, values.filter(Boolean).join(' / ')]);

const known = (value) => /^(n\/?a|no|none|-)$/i.test(String(value || '').trim()) ? '' : String(value || '').trim();
const spec = (rows, label) => known(rows.find(([name]) => label.test(name))?.[1]);
const andList = (items) => items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0] || '';
const orList = (items) => items.length > 1 ? `${items.slice(0, -1).join(', ')} or ${items.at(-1)}` : items[0] || '';
const inches = (value) => String(value || '').match(/(\d{1,2}(?:\.\d)?)\s*(?:"|”|″|'|’)/)?.[1] || '';
const resolutions = (value) => [...String(value || '').matchAll(/(\d{3,4})\s*[x×]\s*(\d{3,4})/gi)].map(m => `${m[1]} × ${m[2]}`);
const refreshRates = (value) => {
  const rates = [...String(value || '').matchAll(/(\d{2,3}(?:\.\d+)?)\s*Hz/gi)].map(m => m[1]);
  return rates.length || !/^\d{2,3}$/.test(String(value || '').trim()) ? rates : [String(value).trim()];
};
const RESOLUTION_CLASS = /^(?:\d+K|FHD|QHD|WQHD|UWQHD|DQHD|UHD)$/i;
const TITLE_MAX_LENGTH = 70;
const META_DESCRIPTION_MAX_LENGTH = 160;

// "2x HDMI 2.1 (FRL 6G) / 1x DisplayPort (1.4a) / 1x Type-C (DP alt.) w/ 98W PD" -> connector list.
function videoInputs(text) {
  const source = String(text || '').replace(/\(\s*(\d\.\d[a-z]?)\s*\)/gi, ' $1');
  const typeCPattern = /(?:(\d+)\s*[x×]\s*)?(?:USB\s*)?Type-?C((?:(?! \/ ).)*)/i;
  const typeC = source.match(typeCPattern);
  const others = source.replace(new RegExp(typeCPattern.source, 'gi'), ' ').replace(/\([^)]*\)/g, ' ');
  const connector = (pattern, label) => {
    const match = others.match(pattern);
    return match ? `${match[1] ? `${match[1]} × ` : ''}${label}${match[2] ? ` ${match[2]}` : ''}` : '';
  };
  const watts = typeC?.[2].match(/(\d{2,3})\s*W\b/i)?.[1];
  const typeCNotes = typeC ? [/\bDP\b|alt/i.test(typeC[2]) && 'DP Alt Mode', watts && `${watts}W PD`].filter(Boolean) : [];
  return [
    connector(/(?:(\d+)\s*[x×]\s*)?HDMI\s*(\d\.\d[a-z]?)?/i, 'HDMI'),
    connector(/(?:(\d+)\s*[x×]\s*)?(?:DisplayPort|Display Port|DP)\b\s*(\d\.\d[a-z]?)?/i, 'DisplayPort'),
    typeC && `${typeC[1] ? `${typeC[1]} × ` : ''}USB-C${typeCNotes.length ? ` (${typeCNotes.join(', ')})` : ''}`,
    connector(/(?:(\d+)\s*[x×]\s*)?(?:D-Sub|VGA)()/i, 'VGA'),
  ].filter(Boolean);
}

function supplierSummaryFacts(summary) {
  const tokens = String(summary || '').split('/').map(token => token.trim()).filter(Boolean);
  const token = (pattern) => tokens.find(item => pattern.test(item)) || '';
  const panel = token(/^(?:rapid\s+)?(?:ips|va|tn|oled|qd-oled)$/i);
  return {
    size: token(/^\d{1,2}(?:\.\d)?\s*["”]$/),
    curvature: token(/^(?:flat|curved?\b.*)$/i),
    panel: /^(ips|va|tn|oled)$/i.test(panel) ? panel.toUpperCase() : panel,
    resolution: token(/\d{3,4}\s*x\s*\d{3,4}/i),
    refresh: token(/^\d{2,3}\s*hz$/i),
    response: token(/^\d+(?:\.\d+)?\s*ms$/i),
    ports: token(/hdmi|vga|displayport|\bdp\b/i).replace(/\+/g, ' / '),
  };
}

export function com1ProductSeo(product, { priceText = '', pickupStores = [] } = {}) {
  const slug = String(product.slug || '');
  const name = String(product.name || '').trim();
  const brand = String(product.brand || '').trim();
  const model = String(product.model || '').trim();
  const brandModel = !model ? name : brand && !model.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${model}` : model;
  const rows = specRows(product.detail_html);
  const summary = rows.length ? null : supplierSummaryFacts(plainText(product.description));

  const sizeText = summary ? summary.size : spec(rows, /^(?:panel|screen) size$/i);
  const resolutionText = summary ? summary.resolution : spec(rows, /^(?:panel )?resolution$/i);
  const [resolution, dualResolution] = resolutions(resolutionText);
  const [refresh, dualRefresh] = refreshRates(summary ? summary.refresh : spec(rows, /^refresh rate$/i));
  const resolutionClasses = [...resolutionText.matchAll(/\((\d+K|FHD|QHD|WQHD|UWQHD|DQHD|UHD)\)/gi)].map(m => m[1].toUpperCase());
  const nameClass = (name.match(/\(([^)]+)\)\s*(?:gaming\s+|portable\s+)?monitor\s*$/i)?.[1] || '')
    .split(/\s+/).filter(Boolean)
    .map(word => RESOLUTION_CLASS.test(word) ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  const dualMode = /dual mode/i.test(nameClass) || Boolean(dualResolution && /dual/i.test(resolutionText));
  const displayClass = nameClass.replace(/\s*dual mode$/i, '') || resolutionClasses[0] || '';
  const sizeClass = inches(name) || inches(sizeText);
  const panelInches = inches(sizeText);
  const panel = summary ? summary.panel : spec(rows, /^panel type$/i);
  // "Rapid IPS with Mini-LED (1152 Zones)": the base panel describes the monitor, the rest is a feature.
  const [panelBase, panelExtra = ''] = panel.split(/\s+with\s+/i);
  const curveRadius = (summary ? summary.curvature : spec(rows, /^curvature$/i)).match(/(\d{3,4})\s*R\b/i)?.[1] || '';

  const responseRow = rows.find(([label]) => /^response time/i.test(label));
  const responseKind = responseRow?.[0].match(/\((MPRT|GTG)\)/i)?.[1].replace(/gtg/i, 'GtG') || '';
  let response = (responseRow ? known(responseRow[1]).split(' / ')[0] : summary?.response || '')
    .replace(/(\d)\s+ms\b/gi, '$1ms')
    .replace(/\bgtg\b/gi, 'GtG')
    .trim();
  if (response && responseKind && !/MPRT|GtG/i.test(response)) response += ` (${responseKind})`;
  const responseShort = [response.match(/\d+(?:\.\d+)?ms/i)?.[0], response.match(/MPRT|GtG/i)?.[0]].filter(Boolean).join(' ');

  const hdr = spec(rows, /^hdr(?: support)?$/i);
  const sync = spec(rows, /^dynamic refresh rate tech/i).replace(/,\s*/g, ' / ');
  const portCount = (label) => spec(rows, label);
  const inputs = videoInputs(summary ? summary.ports : spec(rows, /^video ports$/i) || [
    portCount(/^hdmi$/i) && `${portCount(/^hdmi$/i)}x HDMI ${spec(rows, /^hdmi version$/i)}`,
    portCount(/^displayport$/i) && `${portCount(/^displayport$/i)}x DisplayPort ${spec(rows, /^displayport version$/i)}`,
  ].filter(Boolean).join(' / '));
  const boxContents = spec(rows, /^accessor(?:y|ies)(?: included)?$/i)
    .split(/\s*[\/,]\s*/)
    .map(item => item.replace(/^(\d+)\s*[x×]\s*/i, '$1 × ').trim())
    .filter(Boolean);
  const consoles = ['PS5', 'Xbox'].filter(console =>
    new RegExp(console, 'i').test(`${spec(rows, /^console mode/i)} ${spec(rows, /^(?:video input )?compatibility$/i)}`));

  const kind = /\bgaming\b/i.test(name) ? 'gaming monitor' : /\bportable\b/i.test(name) ? 'portable monitor' : 'monitor';
  const condition = String(product.condition_label || '').trim().toLowerCase();

  const descriptor = [sizeClass && `${sizeClass}-inch`, curveRadius && `${curveRadius}R curved`, panelBase, kind].filter(Boolean).join(' ');
  const resolutionPhrase = resolution
    ? `a ${resolution}${resolutionClasses[0] || (!dualMode && displayClass) ? ` ${resolutionClasses[0] || displayClass}` : ''} resolution${refresh ? ` at ${refresh}Hz` : ''}`
      + (dualMode && dualResolution ? ` and a Dual Mode that switches to ${dualResolution}${resolutionClasses[1] ? ` ${resolutionClasses[1]}` : ''}${dualRefresh ? ` at ${dualRefresh}Hz` : ''}` : '')
    : refresh ? `a ${refresh}Hz refresh rate` : '';
  const sentences = [
    `The ${brandModel} is ${/^(?:8|11|18|ips|oled)/i.test(descriptor) ? 'an' : 'a'} ${descriptor}${panelInches && sizeClass && panelInches !== sizeClass ? ` (${panelInches}-inch panel)` : ''}${resolutionPhrase ? ` with ${resolutionPhrase}` : ''}.`,
  ];
  const features = [panelExtra, response && `a ${response} response time`, hdr, sync].filter(Boolean);
  if (features.length) sentences.push(`It has ${andList(features)}.`);
  if (inputs.length) sentences.push(`Its video inputs are ${andList(inputs)}.`);
  sentences.push(`TECHM8 sells it${condition ? ` ${condition}` : ''} for store pickup only; delivery isn't available.`);
  const summaryText = sentences.join(' ');

  const titleFor = (withCurve, withRefresh) => `${[
    brandModel,
    sizeClass && `${sizeClass}"`,
    displayClass,
    withRefresh && !dualMode && refresh && `${refresh}Hz`,
    dualMode && 'Dual Mode',
    withCurve && curveRadius && 'Curved',
    kind.replace(/\b\w/g, c => c.toUpperCase()),
  ].filter(Boolean).join(' ')} | TECHM8`;
  const title = [titleFor(true, true), titleFor(false, true)].find(candidate => candidate.length <= TITLE_MAX_LENGTH)
    || titleFor(false, false);

  const head = [brandModel, sizeClass && `${sizeClass}-inch`, displayClass, panel.replace(/\s*\([^)]*\)/g, '').replace(/\s+with\s+/i, ' '), kind].filter(Boolean).join(' ');
  const refreshClause = refresh ? `${refresh}Hz${dualMode && dualRefresh ? ` (${dualRefresh}Hz${resolutionClasses[1] ? ` ${resolutionClasses[1]}` : ''} Dual Mode)` : ''}` : '';
  const closing = `${priceText ? `${priceText} at TECHM8` : 'At TECHM8'}, store pickup only in South East QLD.`;
  let metaDescription = '';
  for (const extras of [[responseShort, hdr], [responseShort], []]) {
    const specs = [refreshClause, ...extras].filter(Boolean).join(', ');
    metaDescription = `${head}${specs ? `: ${specs}` : ''}. ${closing}`;
    if (metaDescription.length <= META_DESCRIPTION_MAX_LENGTH) break;
  }

  const faq = [
    {
      question: `Can the ${brandModel} be delivered?`,
      answer: `No. The ${brandModel} is available for store pickup only, so delivery isn't offered. At checkout, choose Click & Collect${pickupStores.length ? ` and select the TECHM8 store you'll collect from: ${orList(pickupStores)}` : ''}. If your cart includes this monitor, the whole order is collected in store.`,
    },
    {
      question: `When can I collect the ${brandModel}?`,
      answer: "Wait for TECHM8's ready-to-collect notification before visiting the store. An order or payment confirmation isn't a pickup-ready notice, and supplier availability doesn't mean the monitor is ready for immediate collection.",
    },
  ];
  if (boxContents.length) {
    faq.push({ question: `What's in the box with the ${brandModel}?`, answer: `The manufacturer specifications list ${andList(boxContents)}.` });
  }
  if (consoles.length) {
    faq.push({
      question: `Does the ${brandModel} work with ${andList(consoles)}?`,
      answer: `The manufacturer specifications list ${andList(consoles)} compatibility. Check the specification table for the supported console resolutions and refresh rates.`,
    });
  }

  const additionalProperty = (rows.length
    ? rows.filter(([label, value]) => !/^(?:link|notes?|ean)$/i.test(label) && !/manufacturer link/i.test(value))
    : [
      ['Screen Size', panelInches && `${panelInches}"`],
      ['Panel Type', panel],
      ['Resolution', resolution],
      ['Refresh Rate', refresh && `${refresh}Hz`],
      ['Response Time', response],
      ['Video Inputs', inputs.join(', ')],
    ].filter(([, value]) => value)
  ).map(([label, value]) => ({ '@type': 'PropertyValue', name: label, value }));

  const llmsFacts = [
    [sizeClass && `${sizeClass}-inch`, panel, kind].filter(Boolean).join(' '),
    resolution && `${resolution}${refresh ? ` at ${refresh}Hz` : ''}${dualMode && dualResolution ? ` (Dual Mode ${dualResolution}${dualRefresh ? ` at ${dualRefresh}Hz` : ''})` : ''}`,
    responseShort,
    inputs.join(', '),
  ].filter(Boolean).join('; ');

  return {
    brandModel,
    title,
    metaDescription,
    summary: summaryText,
    summaryHtml: `<p class="com1-overview" data-product-seo-summary="${escapeHtml(slug)}">${escapeHtml(summaryText)}</p>`,
    faq,
    faqHtml: `<article class="storefront-pdp__panel" data-product-seo-faq="${escapeHtml(slug)}"><div class="section-heading"><div><p class="eyebrow">FAQ</p><h2>Questions about the ${escapeHtml(brandModel)}</h2></div></div><div class="storefront-rich-content com1-faq">${faq.map(({ question, answer }) => `<h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p>`).join('')}</div></article>`,
    additionalProperty,
    llmsFacts,
  };
}
