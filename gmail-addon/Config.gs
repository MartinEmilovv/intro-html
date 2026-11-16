/**
 * Defaults for settings. A Script Property with the same name overrides each one.
 * Never put the API key here: set ANTHROPIC_API_KEY in Script Properties instead.
 */
var CONFIG = {
  HISTORY_SHEET_ID: '',  // ID of the price history Google Sheet
  SIGNATURE: '',         // How offers are signed; empty = no signature (Gmail can add yours)
  OFFER_TERMS: 'Price excludes VAT. Offer valid for 48 hours.'
};
