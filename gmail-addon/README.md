# Freight Assistant: Gmail add-on (MVP)

A sidebar in Gmail that reads a transport request email, shows similar transports
you've done with what you sold them for and what the carrier charged, suggests a
price, and writes the offer as a reply draft. Nothing is ever sent automatically:
the draft opens in Gmail for you to check and send.

## What it does

1. Open a transport request email in Gmail and open **Freight Assistant** in the
   right-hand side panel.
2. Click **Analyze request**. Claude reads the email and pulls out the route,
   dates, cargo, weight, truck type and anything missing.
3. The sidebar lists up to 5 similar past transports from your price history sheet
   (sold price, carrier price, margin) and suggests a price: the average of those
   transports, rounded to €10.
4. Change the price if you want, then click **Create reply draft**. Claude writes
   the offer in the customer's language and it opens as a reply draft.
5. Under **Carriers for this route**, tick the carriers to ask and click **Draft
   price requests**: one draft per carrier lands in your Drafts folder.
6. Under **Carrier quotes**, record the prices carriers give you (by email, Viber or
   phone).
7. When the order is confirmed, click **Prepare заявки**: both заявки as PDFs, the
   two email drafts, a transport folder in Drive, and a new row in your history.

## Files

| File | What it is |
|---|---|
| `appsscript.json` | Add-on settings: name, permissions, when it appears in Gmail |
| `Main.gs` | The sidebar cards and buttons |
| `Claude.gs` | The two Claude API calls: read the request, write the offer |
| `History.gs` | Reads the price history sheet and finds similar transports (plain code, no AI) |
| `Config.gs` | Defaults and fixed texts shared by every company (acknowledgment and order email texts, starting terms) |
| `Setup.gs` | Company workspace: each company's own sheet, settings, templates and order counter |
| `Brand.gs` | Each company's assistant name, logo and button color in the sidebar |
| `Requests.gs` | Saves each analysis (Requests tab), so reopening an email shows it again |
| `I18n.gs` | Every sidebar text in English and Bulgarian, and the language button |
| `Templates.gs` | Converts a company's own Word/Docs заявка into a fillable template |
| `Ack.gs` | Automatic acknowledgment of new transport requests |
| `Carriers.gs` | Finds carriers who ran similar routes and drafts price requests to them |
| `Quotes.gs` | Records carrier quotes on a Quotes tab |
| `Orders.gs` | Order confirmed: заявки PDFs from templates, email drafts, transport folder, history row |
| `sample-history.csv` | Example price history (made-up numbers) for the History tab |
| `sample-carriers.csv` | Example carriers (made-up companies, `.example` emails) for the Carriers tab |
| `test/` | Tests for matching, pricing, acknowledgments and carriers: `node --test test/*.test.js` |

## Setup (about 15 minutes)

You need a Google account and an Anthropic API key.

### 1. Get an Anthropic API key

Create one at [console.anthropic.com](https://console.anthropic.com) (Settings → API keys)
and add some credit. Each analyzed email plus draft costs a few cents.

### 2. Create the Apps Script project

1. Go to [script.google.com](https://script.google.com) and click **New project**.
   Name it "Freight Assistant".
2. Open **Project Settings** (gear icon) and tick
   **Show "appsscript.json" manifest file in editor**.
3. Back in the **Editor**, replace the contents of `appsscript.json` with this
   folder's `appsscript.json`, and paste all the `.gs` files into `Code.gs` (or one
   script file each; Apps Script treats them as one program). Save.
4. In **Project Settings → Script Properties**, add `ANTHROPIC_API_KEY` with your key.
   It's the only setting kept there: everything else belongs to each company.

### 3. Install it in Gmail

1. Click **Deploy → Test deployments**, choose **Gmail**, click **Install**.
2. Reload Gmail and open Freight Assistant in the right-hand side panel (with no email
   selected). Google asks you to authorize it the first time.

### 4. Set up the company

In the sidebar, under **Set up your company**:

- **Create company workspace** (a new company): creates a Google Sheet with the tabs
  **History**, **Carriers**, **Quotes** and **Settings**, plus the two заявки templates,
  in a "Freight Assistant" folder in your Drive.
- **Use this sheet** (an existing company): paste the link of a company sheet, e.g. one
  a colleague shared, or a price history sheet you made before. Missing tabs are added.

Then, in the sidebar with no email open, expand **Company settings**: company name,
terms, assistant name, logo and button color, then **Save company settings**. They're
stored on the sheet's **Settings** tab (you can also edit them there). Save your own
signature under **Your signature**. To start with sample data, import
`sample-history.csv` into the History tab and `sample-carriers.csv` into Carriers.

**History tab** columns (header row, any order):

| Column | Example | Notes |
|---|---|---|
| `date` | 2026-09-18 | |
| `from_city` | Sofia | City name in English |
| `from_country` | BG | 2-letter country code |
| `to_city` | Duisburg | City name in English |
| `to_country` | DE | 2-letter country code |
| `truck_type` | curtainsider | One of: curtainsider, reefer, mega, box, flatbed, other |
| `sold_eur` | 2450 | What you charged the client |
| `carrier_eur` | 2050 | What the carrier charged you |
| `carrier` | Пример Транс ЕООД | The carrier's name, exactly as on the Carriers tab |
| `delivery_date` | 2026-09-21 | When the transport happened: shown in the sidebar, newest first. If empty, `date` (loading) is used |
| `order_number` | 2026-0001 | Filled in for orders created by the add-on |

**Carriers tab**:

| Column | Example | Notes |
|---|---|---|
| `carrier` | Пример Транс ЕООД | Same name as in the History tab's `carrier` column |
| `contact_person` | Георги Иванов | Used in the greeting of price requests and заявки |
| `email` | georgi@… | Carriers without an email are listed but can't be emailed |
| `phone` | +359 88 … | Shown in the sidebar. In Google Sheets, type a `'` before a leading `+` |
| `language` | bg | `bg` or `en`: the language of emails to them (empty = bg) |

**Settings tab**: `COMPANY_NAME`, `OFFER_TERMS`, `CLIENT_PAYMENT_TERMS`,
`CARRIER_PAYMENT_TERMS`; branding (`ASSISTANT_NAME`, `LOGO_URL`, `BRAND_COLOR`); and,
filled in automatically, the template IDs and the order counter (`NEXT_ORDER_NUMBER`,
`ORDER_NUMBER_YEAR`).

### Branding

Each company can make the sidebar its own, under **Company settings** in the sidebar
(stored on the Settings tab):

- `ASSISTANT_NAME`: the title at the top of every card, e.g. "Orbit Assistant"
  (empty = Freight Assistant).
- `LOGO_URL`: a public `https` link to a PNG or JPG logo, shown next to the title. A
  logo file on the company's own website works well.
- `BRAND_COLOR`: the color of the main buttons, e.g. `#1d5b86`.

Invalid values fall back to the defaults. The small icon and name in Gmail's side
panel come from `appsscript.json` and are the same for every company using one
deployment; a company that wants those too needs its own copy of the add-on. Only
use a company's name and logo with its permission.

### Several companies, several colleagues

- **Each company's data stays in that company's own Google account**: its sheet, its
  templates, its transport folders, its order numbers. The add-on runs as the person
  using it, so it can only open what that person can open.
- **Colleagues at the same company:** share the "Freight Assistant" folder with them
  (Editor). Each colleague then pastes the company sheet link under **Use this sheet**.
  They share the history, carriers, quotes, settings, templates and order counter; each
  keeps their own signature.
- **Shared by everyone:** only the Anthropic API key (Script Properties), which users
  never see. Before selling, it moves to our own server.
- **Updating from an earlier version:** paste your existing price history sheet link
  under **Use this sheet**. Template IDs, the order counter and the signature that
  earlier versions kept in Script Properties move to that sheet's Settings tab (and
  your user settings), then are removed from Script Properties.

## Try it

Send yourself this email, open it, and click **Analyze request**:

> **Subject:** Запитване за транспорт София – Дуисбург
>
> Здравейте,
>
> Моля за оферта за следния превоз:
>
> Товарене: София, кв. Враждебна, 12.11
> Разтоварване: Дуисбург, Германия, до 15.11
> Стока: строителни материали на палети, 33 палета, 22 т
> Тип: тент, 13,6 м
>
> Благодаря,
> Иван Петров

With the sample history you should see 5 similar BG → DE transports and a
suggested price of €2,500.

## Automatic acknowledgments

Every 10 minutes the add-on checks new inbox emails. When one is a new transport
request, it replies straight away with a fixed message, using the sender's name if
they signed one:

> Здравейте, Иван Петров,
>
> Благодарим Ви за запитването. Работим по него и ще Ви изпратим оферта възможно най-скоро.
>
> Поздрави,

- **Turn on:** in the Apps Script editor, choose `setUpAutoReply` in the function
  list and click **Run**. Google asks for Gmail permission the first time.
- **Turn off:** run `stopAutoReply`.
- **Edit the wording** in `ACK_TEMPLATES` in `Config.gs` (Bulgarian and English;
  other languages get English).
- **What gets a reply:** only new threads (one message, nothing from you yet) from
  the last hour, in the inbox, not in Promotions/Social/Updates/Forums, not from
  mailing lists or no-reply addresses, and only if Claude says it's a transport
  request. Claude never writes the text that is sent; it only decides whether to
  send it, the language and the name.
- **Labels:** every checked thread gets `Freight Assistant/Checked`, so it's only
  looked at once; acknowledged ones also get `Freight Assistant/Acknowledged`.
- **Testing with your own emails:** emails you send yourself are skipped. Set
  `ACK_INCLUDE_OWN_EMAILS: true` in `Config.gs` to test, then set it back.
- **Cost:** each new inbox email that passes the filters is one Claude call
  (about 1–2 cents).

## Price requests to carriers

After **Analyze request**, the sidebar lists up to 6 carriers who ran transports on
the same country pair, best match first (same ranking as the price suggestion):
their contact person and phone, their price on the closest route, and how many
times they've run this country pair. The top 3 with an email are pre-ticked.

**Draft price requests** creates one Gmail draft per ticked carrier, greeting the
contact by name, in the carrier's language. Nothing is sent.

The request is written only from the load: route (cities and countries), dates,
cargo, pallets, weight and truck type. Your selling price, your client's name and
the exact addresses are never passed to Claude for this, so they can't end up in a
carrier email.

## Request details and missing information

Besides route, dates, cargo and truck, Claude reads the **number of trucks**, **loading
time**, **consignee (CMR)**, **customs points** and **special requirements** when the
email mentions them. They're shown in the sidebar and used in the offer (restated for
the client to confirm), in carrier price requests (all except the consignee, who is the
client's customer), in the заявки, and in the price: the suggestion is per truck, so 2
trucks show the total for both.

**Dates without a year** get the current year, or next year if that date has already
passed (a "05.01" request in December is for January). A delivery date without a year
is placed on or after the loading date.

**When the client leaves things out**, two company settings go into the offer:
`CARGO_EXCLUSIONS` (a sentence used when the cargo type is missing) and
`WEIGHT_ASSUMPTION` (the weight the price assumes when none is given). Both are empty
until set under Company settings.

## Your own заявка templates

Under **Transport order templates** on the start screen: put the company's own заявка
(Word .doc/.docx or a Google Doc) in Google Drive, paste its link, choose **Clients** or
**Carriers**, and **Import template**. The add-on copies it into the company's Freight
Assistant folder as a Google Doc (layout, logo and legal text kept; the original isn't
changed), Claude finds the blanks ("Дата и час на товарене: ……") and they're replaced
with field markers (`{{loading_date}} {{loading_time}}`). You get a list of what was
placed and what to add by hand, and the Doc becomes the company's template.

Blanks that need a field the add-on doesn't know (say, an ADR class) get a new marker,
and the **order form** then shows a box for it. The order form always shows boxes for
the template's fields the add-on reads from the email (consignee, customs, ...) so you
can check them. Values typed there never change a price, a party or the payment terms.

## Transport folder

Each order's folder holds both заявки, an order summary, and the email conversations
with the client and the carrier as PDFs (carrier conversations that started after the
client's request, or that mention the order number). Reopen the request email and click
**Update transport folder** when signed заявки or new emails arrive; files are updated
in place, not duplicated.

## Language

The sidebar works in **English** or **Bulgarian**. The button **Български** / **English**
(on the start screen, and next to **Analyze again**) switches every title, button,
label and message. Each person chooses their own; the first time it follows their
Google account language. Emails and documents to clients and carriers aren't affected:
they follow the client's or carrier's language. To change a wording, edit `UI_TEXT` in
`I18n.gs` (`test/i18n.test.js` checks both languages are complete).

What Claude reads from the email (cargo description, missing details) is shown as Claude
writes it, in English.

## Reopening an analyzed email

Every analysis is saved for that email: in the cache for 6 hours, and on the company
sheet's **Requests** tab permanently. Reopening the email shows the analysis straight
away (no Claude call, no cost), with up-to-date history, carriers and quotes. **Analyze
again** re-reads the email. Requests the automatic acknowledgment already read open
pre-analyzed too. The offered price is saved with the analysis and pre-fills the order
form.

## Carrier quotes

Under **Carrier quotes**, choose the carrier, type their price and where it came
from (Email, Viber, Phone), and click **Save quote**. Quotes go to a **Quotes** tab
(created on first use) and are listed for the request, cheapest first. The cheapest
one pre-fills the order form.

## Заявки (order confirmed)

Click **Prepare заявки** when the client has accepted and a carrier is confirmed.
The form is pre-filled: client company (from the sender), agreed price (your
offer, or the suggestion), carrier and carrier price (the cheapest quote). Add the
truck plates if you have them, then **Create заявки**:

1. The order gets the company's next running number: `2026-0001`, `2026-0002`, ...
   (restarts each year; kept on the Settings tab as `NEXT_ORDER_NUMBER`).
2. Both заявки are filled from Google Docs templates and saved as PDFs: the client's
   with the **selling price**, the carrier's with the **carrier price**.
3. Two drafts: a reply to the client asking for their official заявка (their PDF
   attached), and an email to the carrier (their PDF attached). Nothing is sent.
4. A folder `Transports/2026-0001 Sofia–Duisburg` in the company's Freight Assistant folder, with both
   заявки (Doc and PDF), the client email thread as a PDF, and an order summary.
5. The transport is added to the History tab, so future suggestions learn from it.

**Templates.** Each company gets two starter templates in its Freight Assistant folder
(created with the workspace, or on the first order). Edit them freely (logo, company
details, terms) or point `CLIENT_TEMPLATE_ID` / `CARRIER_TEMPLATE_ID` on the Settings
tab at your own Google Docs. `setUpTemplates` (run from the editor) logs their links. Placeholders: `{{order_number}}`
`{{date}}` `{{company}}` `{{client}}` `{{carrier}}` `{{carrier_contact}}`
`{{truck_plates}}` `{{loading_place}}` `{{loading_date}}` `{{unloading_place}}`
`{{delivery_date}}` `{{cargo}}` `{{pallets}}` `{{weight}}` `{{truck_type}}` `{{price}}`
`{{payment_terms}}`.

**Prices never cross.** The client's document only ever gets the client, the selling
price and the client payment terms; the carrier's only the carrier, the carrier price
and the carrier payment terms (tested in `test/orders.test.js`). A placeholder with no
value for that side is left blank.

**Settings:** company name and payment terms on the company sheet's Settings tab; the
email texts in `ORDER_EMAILS` in `Config.gs`.

## Known limits of this MVP

- **Matching is by country pair, city name and truck type, not distance.** City
  names must be in English in the sheet, because that's how Claude returns them.
- **Each button has about 30 seconds** before Gmail gives up. If you see a timeout,
  click again.
- **History is a one-time sheet.** Orders aren't added to it automatically yet.
- **Not included yet:** Viber sending, freight exchanges, TMS integration, Outlook.
- **The carrier's email thread** isn't saved to the transport folder yet (only the
  client's), because carrier conversations may happen on Viber or in another thread.
- **The prompts have not been tested against real emails yet.** Your first
  real tests will show what to adjust in `Claude.gs`.

## Technical notes

- Model: `claude-opus-5-5` at low effort, called over HTTP from Apps Script
  (Apps Script cannot use the npm SDK).
- Claude returns the request details as JSON validated against a schema
  (`EXTRACT_SCHEMA` in `Claude.gs`), so the sidebar never has to parse free text.
- Requests use the API's server-side fallback: if Claude's safety checks decline a
  request, the API retries it on another model. To turn this off, remove
  `fallbacks` and the `anthropic-beta` header in `callClaude_`.
- Email text is treated as data: the prompts tell Claude to ignore instructions
  inside emails, and every draft is reviewed by a person before sending.
