/**
 * Automatic acknowledgment: every 10 minutes, checks new inbox emails and replies
 * to new transport requests with a fixed "thank you, we're working on your offer"
 * message (CONFIG.ACK_TEMPLATES), addressed by name when the sender signed one.
 *
 * Claude only decides whether an email is a transport request, its language and
 * the sender's name. The text sent is always the fixed template.
 *
 * Turn on: run setUpAutoReply once from the Apps Script editor.
 * Turn off: run stopAutoReply.
 */

var ACK_SENT_LABEL = 'Freight Assistant/Acknowledged';
var ACK_CHECKED_LABEL = 'Freight Assistant/Checked';
var ACK_MAX_PER_RUN = 10;
var ACK_SKIP_SENDERS = /(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?@|bounce)/i;

function setUpAutoReply() {
  stopAutoReply();
  getOrCreateLabel_(ACK_SENT_LABEL);
  getOrCreateLabel_(ACK_CHECKED_LABEL);
  ScriptApp.newTrigger('autoAcknowledge').timeBased().everyMinutes(10).create();
  console.log('Auto-reply is on. New transport requests are checked every 10 minutes.');
}

function stopAutoReply() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'autoAcknowledge') ScriptApp.deleteTrigger(t);
  });
  console.log('Auto-reply is off.');
}

/** Runs on the 10-minute trigger. */
function autoAcknowledge() {
  var settings = getSettings_();
  var me = Session.getEffectiveUser().getEmail();
  var sentLabel = getOrCreateLabel_(ACK_SENT_LABEL);
  var checkedLabel = getOrCreateLabel_(ACK_CHECKED_LABEL);
  var query = 'in:inbox newer_than:1h -label:"' + ACK_CHECKED_LABEL + '"' +
    ' -category:promotions -category:social -category:updates -category:forums';

  GmailApp.search(query, 0, ACK_MAX_PER_RUN).forEach(function (thread) {
    var message = thread.getMessages()[0];
    var candidate = isAckCandidate_({
      messageCount: thread.getMessageCount(),
      from: message.getFrom(),
      me: me,
      includeOwn: CONFIG.ACK_INCLUDE_OWN_EMAILS,
      isList: !!message.getHeader('List-Unsubscribe')
    });
    if (candidate) {
      try {
        var request = extractRequest_(message.getSubject(), message.getFrom(), message.getPlainBody());
        if (request.is_transport_request) {
          message.reply(buildAckBody_(request.language, request.contact_name, settings.signature));
          thread.addLabel(sentLabel);
        }
      } catch (err) {
        // Not marked as checked, so the next run tries again (within the 1-hour window).
        console.error('Could not process "' + message.getSubject() + '": ' + err.message);
        return;
      }
    }
    thread.addLabel(checkedLabel);
  });
}

/** Only new single-message threads from a real person, never mailing lists. */
function isAckCandidate_(m) {
  if (m.messageCount !== 1) return false;
  if (m.isList) return false;
  var match = String(m.from).match(/<([^>]+)>/);
  var email = (match ? match[1] : String(m.from)).trim().toLowerCase();
  if (ACK_SKIP_SENDERS.test(email)) return false;
  if (email === String(m.me).toLowerCase() && !m.includeOwn) return false;
  return true;
}

/** The fixed acknowledgment text, in Bulgarian or English. */
function buildAckBody_(language, name, signature) {
  var t = CONFIG.ACK_TEMPLATES[language] || CONFIG.ACK_TEMPLATES.en;
  var cleanName = String(name || '').trim();
  var lines = [
    cleanName ? t.greetingWithName.replace('{name}', cleanName) : t.greeting,
    '',
    t.body,
    '',
    t.closing
  ];
  if (signature) lines.push(signature);
  return lines.join('\n');
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}
