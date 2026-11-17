# Product Brief: AI for Freight Forwarding in Bulgaria

_Status: early idea · Last updated: 2026-11-04_

## Vision

A SaaS product that brings AI into the daily work of Bulgarian freight forwarding
companies, cutting the manual effort spent on quoting, email, data entry and sales
analysis.

## Target customers

Freight forwarding companies operating in Bulgaria (road transport first), whose
staff handle a high volume of transport requests by email and re-key data into
their transport/forwarding software.

## Core capabilities

### 1. Offer automation
- Read incoming transport requests (typically by email).
- Draft a price offer for the customer.

### 2. Email reply automation
- Draft replies to customer and carrier emails about a specific transport
  (offers, follow-ups, clarifications), for a person to review and send.

### 3. Data entry automation
- Extract the transport details from the offer/email (route, dates, cargo,
  weight, truck type, price, etc.).
- Enter them into the forwarding software the company already uses, so staff
  don't re-type them.

### 4. Transport orders (заявки) after the client confirms
- **Client side:** draft an email asking the client to send an official
  заявка за транспорт, with a pre-filled заявка attached (agreed terms and the
  forwarder's **selling price**) that the client only needs to sign and stamp.
  When the signed заявка comes back, check it against the agreed terms.
- **Carrier side:** generate and send the заявка към превозвач with the
  carrier's **net price** (taken from the carrier's own confirmation), truck and
  trailer plates, and terms (CMR, payment period).
- Guard rule: the selling price never appears on a carrier document, and the
  carrier price never appears on a client document.
- Data from both signed заявки is filled into the TMS order.

### 5. Sales intelligence
For a new request, show a summary of similar past transports:
- What the company **sold** similar transports for (customer price).
- What the **net offer** from the trucking company (carrier cost) was.
- From these, the margin, to help price the new offer.

## Delivery approach

No new software for the forwarder to adopt: the product lives inside the two
places they already work.

- **Email add-in (Outlook / Gmail):** where offers, replies, заявки and the
  price summary appear. One build covers almost every customer. This is the
  first thing to build and the way customers try the product.
- **TMS integrations:** built one TMS at a time, starting with the most common
  among early customers. Per TMS, in order of preference: API, import file
  (CSV/Excel/XML), browser extension that fills the order form, copy-paste
  output as a fallback.
- **Price history without a TMS integration:** a one-time export from the TMS
  or Excel, so sales intelligence works before any TMS integration exists.
- **Behind the scenes:** our own backend (AI, price history, price-separation
  checks) and a small admin page for settings, users and заявка templates.
  Forwarders don't work in it day to day.
- **Possible channel:** partnerships with TMS vendors (API access, distribution).

## Open questions

- Which forwarding/TMS software do target customers use, and does it have an API,
  import format, or only a UI? (Determines how data entry integration works.)
- Where does historical sales/carrier-price data live (TMS, Excel, email)?
- Email platforms to support first (Outlook/Microsoft 365, Gmail, other)?
- Languages: Bulgarian and English emails, others (e.g. Romanian, Turkish, German)?
- Level of automation: draft-for-review vs. fully automatic sending?
- What defines "similar" transports (route, distance, cargo type, truck type, season)?
- Pricing model and first pilot customer(s).
- Data protection/GDPR requirements and where data may be hosted.

## Market research: TMS in Bulgaria and Europe (Nov 2026)

No public market-share data exists; this is a list of what shows up, mostly from
vendor sites. Confirm with real forwarders.

**Bulgaria: fragmented, mostly local products**
- Нюдейта (newdata.bg, FOBOS/NORD): says it leads Bulgarian forwarding and customs
  software, 1000+ clients (customs-heavy).
- Сиклам "Спедитор 4" (cyclamsoft.com): software for forwarding offices, incl. documents.
- ssTransport (sst.bg): web-based, for small and mid-size forwarders and carriers.
  **Already advertises AI that fills in data from a заявка**: competitor or partner.
- Isystems (on Microsoft Dynamics), Cargo Manage (cloud), HOGS aiTMS (claims TIMOCOM
  integration), Bisoft; some firms build their own (e.g. Raztrans) or use Excel.
- None publishes an API. Ask each vendor directly.
- Speditor.net: freight exchange run by Speditor NET OOD, Sofia (web, iOS, Mac).

**Europe**
- Forwarder/carrier TMS: Soloplan CarLo (DE, ~1,700–1,800 customers, has a Trans.eu
  interface), WinSped (LIS), Qargo (newer, cloud).
- Shipper-side platforms: Transporeon (Trimble), Alpega (incl. Teleroute), E2open/BluJay,
  Descartes. For forwarders these are a source of incoming loads, not their own TMS.
- Freight exchanges: TIMOCOM (has a partner interface program), Trans.eu (API,
  ~16,000 forwarding companies), Teleroute.

**What it means for us:** no single TMS to integrate with, so stay email-first (works
whatever TMS they use), build the Drive transport folder, and pick TMS integrations
by what pilot customers use. Talk to ssTransport early: they're either the closest
competitor or a partner with distribution.

## Mockup

[`mockups/freight-assistant.html`](../mockups/freight-assistant.html): a clickable
walkthrough of one request (inbox sidebar, drafted offer, заявки to client and
carrier, TMS order). Open it in a browser. All data in it is made up.

## MVP

[`gmail-addon/`](../gmail-addon/): Gmail add-on (Google Apps Script). Reads a
transport request, shows similar past transports from a Google Sheet with sold
price, carrier price and margin, suggests a price, and creates the offer as a
reply draft. Setup steps in its README.

Built so far in the Gmail add-on:
- Offer: read request, similar transports, suggested price, offer reply draft.
- Automatic acknowledgment of new transport requests (fixed template, by name).
- Carriers for the route (Carriers tab) and price request drafts to them.
- Carrier quotes (Quotes tab), from email, Viber or phone.
- Order confirmed: both заявки as PDFs from editable starter templates, email drafts
  to client and carrier, running order numbers, transport folder in Drive, and the
  transport added to the History tab.

## To-do

**Waiting on Martin**
- [ ] **Viber test** (decides how "Send via Viber" is built): on the Windows PC with
  Viber Desktop, paste `viber://chat?number=%2B359888123456&draft=Тест%20от%20Freight%20Assistant`
  (a real contact's number) into the browser and report: (a) chat opens with the text
  typed in, (b) chat opens empty, (c) nothing opens. Don't press Send.
- [ ] Share real заявки examples (client's заявка за транспорт and заявка към превозвач),
  anonymized, in Google Drive, to replace the starter templates; and say whether the
  order number should come from the TMS (the MVP uses a running number).
- [ ] Fill in COMPANY_NAME and payment terms in Config.gs.
- [ ] Test the acknowledgment, carriers, quotes and заявки features in Gmail.
- [ ] Find out which TMS the target forwarders use, and for each: does it have an API
  or a file import (Excel/CSV/XML), and does it run in a browser or as a desktop program?

**Next to build**
- [ ] "Send via Viber" button per carrier (Viber Desktop link with the request
  pre-filled, or open chat + copy text), depending on the Viber test.
- [ ] Save the carrier's email thread to the transport folder too.

**Before the second client (multi-company)**
- [ ] Per-company settings: template IDs, order number counter and sheet ID are in Script
  Properties, which every user of a published add-on shares. Move them to per-company
  storage (per user now, our database later), so order numbers and templates never mix.
- [ ] First-run setup: create the price history sheet (History, Carriers, Quotes tabs) and
  the templates in the new company's own Drive, instead of the built-in sheet ID.
- [ ] Several forwarders in one company share one sheet, one order counter and the same
  templates (through normal Google sharing).

**Before selling to clients**
- [ ] Move the Anthropic API key to a small server of ours: the add-on calls our server,
  only the server calls Claude. Never ship the key inside a client's copy of the script.
  The server also tracks usage per client, enforces limits and can switch a client off.
  (Same server as the IMAP mailbox connection.)
- [ ] Move client data (price history, carriers, orders) from Google Sheets into our own
  database on the same server, shared by Gmail, Outlook and IMAP clients. Host in the EU,
  sign a data processing agreement (GDPR) with each client, back it up, and offer an
  Excel export. Pilots can stay on Google Sheets (or Excel in OneDrive for Outlook users).
- [ ] Data security for the database: each client's data fully separated (AI uses only
  their own history); EU hosting; encrypted at rest and in transit; encrypted daily
  backups with tested restores; 2FA for users; staff access limited and logged; store
  only the pricing memory, not whole mailboxes.
- [ ] Contracts: GDPR data processing agreement (lawyer-checked template), subprocessor
  list (hosting, Anthropic), privacy policy, export anytime, deletion within 30 days of
  cancelling, breach notification within 72 hours. Check Anthropic's current API terms
  on training and data retention before promising anything to clients.
- [ ] Narrow the add-on's Google permissions: Drive access only to files the add-on
  created or the user picks (drive.file) instead of the whole Drive; review the
  Gmail and Sheets scopes the same way.
- [ ] Google Workspace Marketplace listing: OAuth verification, and the outside security
  assessment Google requires for broad Gmail/Drive access (budget time and cost).
- [ ] Later: ISO 27001 when bigger clients ask for it.
- [ ] Set a monthly spending limit in console.anthropic.com.
- [ ] Measure real Claude cost per forwarder per month to set the subscription price.

**Later**
- [ ] Freight exchanges (Speditor.net first, then TIMOCOM, Trans.eu):
  - **A. Carriers by destination:** suggest carriers whose profiles list the request's
    destination country, marked as new next to our own carriers.
  - **B. Truck matching:** match the load against posted trucks: free near the loading
    address (real distance), around the loading date, heading towards the destination,
    enough free loading meters (load converted to LDM, e.g. 33 EUR pallets = 13.6 m).
    Rank, explain why, draft the quote request.
  - Data access is the blocker; never scrape against the platform's terms (risks the
    forwarder's account). Ask Speditor.net: (1) API or data partnership? (2) email alerts
    for matching postings (the add-on could read them in Gmail)? (3) do terms allow
    automated/AI-assisted access by a logged-in user? Fallback: forwarder pastes search
    results into the sidebar.
  - Transporeon as a source of incoming requests.
- [ ] Mailbox-level (IMAP) connection for clients not on Gmail/Outlook, saving drafts
  into any mailbox.
- [ ] Outlook add-in.
- [ ] Create the transport file in the TMS with documents attached, depending on what
  each TMS allows: API (best), file import, browser extension filling the form.
  Avoid automating desktop-only TMS programs.
- [ ] Martin's forgotten idea, when it comes back.
