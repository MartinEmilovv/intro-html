/**
 * Defaults for settings. A Script Property with the same name overrides each one.
 * Never put the API key here: set ANTHROPIC_API_KEY in Script Properties instead.
 */
var CONFIG = {
  HISTORY_SHEET_ID: '',  // ID of the price history Google Sheet
  SIGNATURE: '',         // How offers and acknowledgments are signed; empty = no signature
  OFFER_TERMS: 'Price excludes VAT. Offer valid for 48 hours.',

  // Automatic acknowledgment of new transport requests (see Ack.gs).
  // Turn on by running setUpAutoReply, off by running stopAutoReply.
  // Emails in other languages get the English text.
  ACK_TEMPLATES: {
    bg: {
      greeting: 'Здравейте,',
      greetingWithName: 'Здравейте, {name},',
      body: 'Благодарим Ви за запитването. Работим по него и ще Ви изпратим оферта възможно най-скоро.',
      closing: 'Поздрави,'
    },
    en: {
      greeting: 'Hello,',
      greetingWithName: 'Hello {name},',
      body: 'Thank you for your inquiry. We are working on it and will get back to you with an offer as soon as possible.',
      closing: 'Best regards,'
    }
  },
  // Also acknowledge emails you send to yourself. Only for testing.
  ACK_INCLUDE_OWN_EMAILS: false
};
