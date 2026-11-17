/**
 * Branding: each company can give its assistant its own name, logo and color
 * (Settings tab: ASSISTANT_NAME, LOGO_URL, BRAND_COLOR), shown on every card in
 * the sidebar. The icon and name in Gmail's side panel itself come from
 * appsscript.json and are the same for every company using this deployment.
 *
 * Invalid values fall back to the defaults, so a typo never breaks the sidebar.
 */

var DEFAULT_ASSISTANT_NAME = 'Freight Assistant';
var DEFAULT_BRAND_COLOR = '#1d5b86';

// ---- Pure helpers (tested in test/brand.test.js) -----------------------------

/** "#1D5B86", "1d5b86" or "#abc" -> "#1d5b86" / "#aabbcc"; anything else -> default. */
function safeColor_(value) {
  var v = String(value || '').trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(v)) v = v.replace(/(.)/g, '$1$1');
  return /^[0-9a-f]{6}$/.test(v) ? '#' + v : DEFAULT_BRAND_COLOR;
}

/** Only https links are used for the logo; anything else -> no logo. */
function safeLogoUrl_(value) {
  var v = String(value || '').trim();
  return /^https:\/\/[^\s"'<>]+$/.test(v) ? v : '';
}

function assistantName_(settings) {
  var name = String(settings.assistantName || '').trim();
  return name ? name.slice(0, 40) : DEFAULT_ASSISTANT_NAME;
}

// ---- Card pieces -------------------------------------------------------------

/** The header on every card: the company's assistant name and logo. */
function brandHeader_(settings, subtitle) {
  var name = assistantName_(settings);
  var header = CardService.newCardHeader().setTitle(name);
  if (subtitle) header.setSubtitle(subtitle);
  var logo = safeLogoUrl_(settings.logoUrl);
  if (logo) {
    header.setImageUrl(logo).setImageAltText(name).setImageStyle(CardService.ImageStyle.SQUARE);
  }
  return header;
}

/** A solid button in the company's color, for the main action of a section. */
function primaryButton_(text, settings) {
  var button = CardService.newTextButton().setText(text);
  if (CardService.TextButtonStyle && CardService.TextButtonStyle.FILLED) {
    button.setTextButtonStyle(CardService.TextButtonStyle.FILLED);
    if (typeof button.setBackgroundColor === 'function') button.setBackgroundColor(safeColor_(settings.brandColor));
  }
  return button;
}

/** A label/value line with an icon (skipped if Gmail doesn't know the icon). */
function iconField_(iconName, label, value) {
  var item = CardService.newDecoratedText().setText(value || '—').setWrapText(true);
  if (label) item.setTopLabel(label);
  var icon = CardService.Icon && CardService.Icon[iconName];
  if (icon) item.setStartIcon(CardService.newIconImage().setIcon(icon));
  return item;
}
