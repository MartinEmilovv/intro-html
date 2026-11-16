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

## To-do

**Waiting on Martin**
- [ ] **Viber test** (decides how "Send via Viber" is built): on the Windows PC with
  Viber Desktop, paste `viber://chat?number=%2B359888123456&draft=Тест%20от%20Freight%20Assistant`
  (a real contact's number) into the browser and report: (a) chat opens with the text
  typed in, (b) chat opens empty, (c) nothing opens. Don't press Send.
- [ ] Share real заявки examples (client's заявка за транспорт and заявка към превозвач),
  anonymized, in Google Drive, and say whether the order number comes from the TMS
  or is a running number.
- [ ] Test the acknowledgment and carriers features in Gmail.
- [ ] Find out which TMS the target forwarders use, and for each: does it have an API
  or a file import (Excel/CSV/XML), and does it run in a browser or as a desktop program?

**Next to build**
- [ ] Заявки: "Order confirmed" step in the sidebar. Drafts to the client (request for
  their official заявка, pre-filled PDF at the selling price) and to the carrier
  (заявка към превозвач PDF at the carrier price), from Google Docs templates with
  `{{placeholders}}`. Always by email. Add the confirmed transport to the History tab.
- [ ] "Send via Viber" button per carrier (Viber Desktop link with the request
  pre-filled, or open chat + copy text), depending on the Viber test.
- [ ] Field in the sidebar to record a carrier's quoted price (from Viber or phone).
- [ ] Transport file: when an order is confirmed, create a Google Drive folder per
  transport (order number + route) with both заявки, the client and carrier email
  threads as PDFs, and a summary of the order data. First step towards TMS entry.

**Before selling to clients**
- [ ] Move the Anthropic API key to a small server of ours: the add-on calls our server,
  only the server calls Claude. Never ship the key inside a client's copy of the script.
  The server also tracks usage per client, enforces limits and can switch a client off.
  (Same server as the IMAP mailbox connection.)
- [ ] Set a monthly spending limit in console.anthropic.com.
- [ ] Measure real Claude cost per forwarder per month to set the subscription price.

**Later**
- [ ] Freight exchanges: ask Speditor.net whether it has an API; TIMOCOM partner
  integration. Transporeon as a source of incoming requests.
- [ ] Mailbox-level (IMAP) connection for clients not on Gmail/Outlook, saving drafts
  into any mailbox.
- [ ] Outlook add-in.
- [ ] Create the transport file in the TMS with documents attached, depending on what
  each TMS allows: API (best), file import, browser extension filling the form.
  Avoid automating desktop-only TMS programs.
- [ ] Martin's forgotten idea, when it comes back.
