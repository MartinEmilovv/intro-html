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
| `Config.gs` | Default settings (sheet ID, signature, offer terms, acknowledgment texts); Script Properties override them |
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

### 2. Create the price history sheet

1. In Google Sheets, create a new spreadsheet and use **File → Import → Upload**
   to import `sample-history.csv` (or paste in your own data in the same columns).
2. Copy the sheet ID from its URL: the long part between `/d/` and `/edit`.

Columns (first tab, first row is the header):

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
| `carrier` | Пример Транс ЕООД | Optional. The carrier's name, exactly as on the Carriers tab |

Add a second tab named **Carriers** (import `sample-carriers.csv` into it to start):

| Column | Example | Notes |
|---|---|---|
| `carrier` | Пример Транс ЕООД | Same name as in the history tab's `carrier` column |
| `contact_person` | Георги Иванов | Used in the greeting of price requests |
| `email` | georgi@… | Carriers without an email are listed but can't be ticked |
| `phone` | +359 88 … | Shown in the sidebar. In Google Sheets, type a `'` before a leading `+` |
| `language` | bg | `bg` or `en`: the language of price requests (empty = bg) |

### 3. Create the Apps Script project

1. Go to [script.google.com](https://script.google.com) and click **New project**.
   Name it "Freight Assistant".
2. Open **Project Settings** (gear icon) and tick
   **Show "appsscript.json" manifest file in editor**.
3. Back in the **Editor**, replace the contents of `appsscript.json` with this
   folder's `appsscript.json`.
4. Rename `Code.gs` to `Main` and paste in `Main.gs`. Add three more script files
   (**+** → Script) named `Claude`, `History` and `Config`, and paste in
   `Claude.gs`, `History.gs` and `Config.gs`. Save. (All four can also go into one
   file: Apps Script treats them as one program.)

### 4. Add your settings

In **Project Settings → Script Properties**, add your API key. The other settings
can go either here or in `Config.gs`:

| Property | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your API key from step 1 |
| `HISTORY_SHEET_ID` | The sheet ID from step 2 |
| `SIGNATURE` | How offers are signed, e.g. `Martin Emilov, Your Company Ltd, +359 ...` |
| `OFFER_TERMS` | Optional. Defaults to "Price excludes VAT. Offer valid for 48 hours." |

### 5. Install it in your Gmail

1. In the editor, click **Deploy → Test deployments**.
2. Under **Application(s)**, choose **Gmail**, then click **Install**.
3. Open Gmail (reload it). Open any email, then click the Freight Assistant icon in
   the right-hand side panel. The first time, Google asks you to authorize it.

Only you can see a test deployment, and it updates whenever you save the script.

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

1. The order gets a running number: `2026-0001`, `2026-0002`, ... (restarts each year;
   stored in Script Properties as `NEXT_ORDER_NUMBER`).
2. Both заявки are filled from Google Docs templates and saved as PDFs: the client's
   with the **selling price**, the carrier's with the **carrier price**.
3. Two drafts: a reply to the client asking for their official заявка (their PDF
   attached), and an email to the carrier (their PDF attached). Nothing is sent.
4. A folder `Freight Assistant/Transports/2026-0001 Sofia–Duisburg` in Drive with both
   заявки (Doc and PDF), the client email thread as a PDF, and an order summary.
5. The transport is added to the History tab, so future suggestions learn from it.

**Templates.** Run `setUpTemplates` once from the editor: it creates two starter
templates in Drive (`Freight Assistant` folder) and logs their links. Edit them freely
(logo, company details, terms) or point `CLIENT_TEMPLATE_ID` / `CARRIER_TEMPLATE_ID`
in Script Properties at your own Google Docs. Placeholders: `{{order_number}}`
`{{date}}` `{{company}}` `{{client}}` `{{carrier}}` `{{carrier_contact}}`
`{{truck_plates}}` `{{loading_place}}` `{{loading_date}}` `{{unloading_place}}`
`{{delivery_date}}` `{{cargo}}` `{{pallets}}` `{{weight}}` `{{truck_type}}` `{{price}}`
`{{payment_terms}}`.

**Prices never cross.** The client's document only ever gets the client, the selling
price and the client payment terms; the carrier's only the carrier, the carrier price
and the carrier payment terms (tested in `test/orders.test.js`). A placeholder with no
value for that side is left blank.

**Settings** in `Config.gs`: `COMPANY_NAME`, `CLIENT_PAYMENT_TERMS`,
`CARRIER_PAYMENT_TERMS`, and the email texts in `ORDER_EMAILS`.

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
