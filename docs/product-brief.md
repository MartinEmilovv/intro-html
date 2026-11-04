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

### 4. Sales intelligence
For a new request, show a summary of similar past transports:
- What the company **sold** similar transports for (customer price).
- What the **net offer** from the trucking company (carrier cost) was.
- From these, the margin, to help price the new offer.

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
