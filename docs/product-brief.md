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
