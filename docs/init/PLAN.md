# is-in.nz — Product Brief

## Overview

is-in.nz is a lightweight, identity-linked subdomain platform that allows users to create and control a personal “internet presence” under a shared domain space. Each user can configure a small set of expressive, structured services attached to their subdomain.

The platform prioritises simplicity, low maintenance, and creative expression while avoiding heavy identity systems or complex infrastructure.

---

## Core Philosophy

- No JavaScript execution in user-generated content
- Structured configuration over free-form hosting
- Identity via magic-link email authentication
- Subdomains as “internet objects” with configurable behaviours
- Edge-first architecture (Cloudflare Workers + KV/D1)

---

## Core Features (MVP)

### 1. Profile Pages (CSS-Only Customisation)

Each user gets a profile page at:

username.is-in.nz

### Features:
- Custom CSS styling (no JavaScript allowed)
- Profile picture
- Bio text
- Links (list of URLs with labels)
- Status system:
  - Current status
  - Status history log (timestamped entries)

### Constraints:
- Fixed HTML structure provided by platform
- CSS overrides only
- Safe rendering (no script injection)

---

### 2. URL Forwarding Service

Users can create short, memorable links under their namespace:

username.is-in.nz/go/example

### Features:
- Redirect URLs (HTTP 301/302 configurable)
- Optional expiry dates
- Optional title metadata
- QR code generation per link
- Path-based routing support

Example use cases:
- Personal links
- Event pages
- Social redirects
- Print-friendly QR codes

---

### 3. Email Forwarding Service

Users can configure email routing for their subdomain:

anything@username.is-in.nz

### Features:
- Add/remove aliases
- Wildcard support (*@username.is-in.nz)
- Forwarding destinations (external email addresses)
- Optional multiple destinations per alias

### Constraints:
- No full mailbox hosting (forwarding only)
- Verified destination emails required

---

### 4. Magic Link Authentication

Authentication is handled via passwordless email login.

### Flow:
1. User enters email
2. System sends magic login link
3. User clicks link to establish session
4. Session grants access to their namespace

### Features:
- No passwords
- No OAuth providers
- Session-based access control
- Email is the only identity requirement

---

## Data Model (Conceptual)

Each user controls one or more subdomains:

User  ├── email  ├── session(s)  └── subdomains[]

Each subdomain:

Subdomain  ├── profile  │    ├── bio  │    ├── avatar  │    ├── status  │    ├── status_history[]  │    └── links[]  ├── redirects[]  └── email_routes[]

---

## Non-Goals (Important)

- No JavaScript execution in user pages
- No full web hosting or file uploads
- No social network features (feeds, followers, likes)
- No team/org management
- No password-based authentication
- No general-purpose DNS control interface

---

## Abuse Prevention Principles

- Structured data only (no raw HTML/JS)
- Rate limits on creation and updates
- Verified email required for ownership
- Safe URL validation for redirects
- Reserved system namespaces
- Change cooldowns for sensitive operations

---

## Target Experience

Users should feel:

- Instant setup (under 2 minutes)
- Creative control over appearance (CSS)
- Ownership of a personal internet “space”
- Low cognitive load (no complex configuration)

---

## Technical Direction

- Cloudflare Workers (edge logic)
- Cloudflare KV / D1 (state storage)
- Cloudflare Pages (dashboard UI)
- Email Routing (forwarding service)
- Magic link authentication via signed tokens
