/**
 * Defaults and fixed texts, the same for every company using the add-on.
 *
 * Each company's own settings (company name, terms, templates, order counter) live
 * on the Settings tab of its company sheet, and each person's signature in the
 * sidebar (see Setup.gs). OFFER_TERMS and the payment terms below are only the
 * starting values for a new company.
 * Never put the API key here: set ANTHROPIC_API_KEY in Script Properties instead.
 */
var CONFIG = {
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
  ACK_INCLUDE_OWN_EMAILS: false,

  // Заявки (see Orders.gs): starting payment terms for a new company.
  CLIENT_PAYMENT_TERMS: '30 дни от датата на фактурата',
  CARRIER_PAYMENT_TERMS: '45 дни след получаване на оригинални CMR и фактура',
  // Texts of the emails that carry the заявки. {order} = order number.
  ORDER_EMAILS: {
    bg: {
      client: 'Благодарим Ви за потвърждението. Моля, изпратете ни официална заявка за транспорт. ' +
        'За удобство прилагаме попълнена заявка с договорените условия: необходими са само подпис и печат.',
      carrier: 'Потвърждаваме транспорта. Прилагаме заявка № {order}. ' +
        'Моля, върнете я подписана и потвърдете данните на камиона и шофьора.',
      carrierSubject: 'Заявка № {order}: {route}'
    },
    en: {
      client: 'Thank you for confirming. Please send us your official transport order. ' +
        'For your convenience, a filled-in order with the agreed terms is attached: it only needs your signature and stamp.',
      carrier: 'We confirm the transport. Please find attached transport order no. {order}. ' +
        'Please return it signed and confirm the truck and driver details.',
      carrierSubject: 'Transport order no. {order}: {route}'
    }
  }
};
