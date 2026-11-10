---
version: 1
name: MEGAP Clinic OS
description: Persian-first clinic workspace with the quiet precision of a well-kept treatment ledger.
colors:
  primary: "#145C50"
  secondary: "#C7A66A"
  background: "#F6F7F5"
  surface: "#FFFFFF"
  text: "#202724"
  muted: "#78817C"
  border: "#E5EAE6"
  success-soft: "#E7F0ED"
typography:
  sans:
    fontFamily: "Vazirmatn, Tahoma, sans-serif"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
rounded:
  sm: "0.375rem"
  md: "0.625rem"
  lg: "0.75rem"
spacing:
  page-gutter: "clamp(1.375rem, 4.5vw, 4.25rem)"
  content-max: "70rem"
  rail-width: "15.75rem"
---

# MEGAP Clinic OS Design System

## Overview

### Creative North Star

The interface takes its structure from a clinician's carefully maintained treatment ledger: ordered, legible, calm, and precise. A narrow gold registration mark and the clinic green provide the single expressive accent. The product should feel trustworthy during a busy reception shift, not like a consumer beauty storefront.

### Product context and register

- **Audience and primary job:** Persian-speaking clinic owners and staff managing daily clinic operations.
- **Target market and evidence:** Iran; specified in the product brief.
- **Locale policy:** Persian (`fa-IR`) and RTL by default. Isolate phone numbers, IDs, and Latin terms as LTR. Business timezone `Asia/Tehran`; show Jalali dates.
- **Usage scene:** Frequent desktop reception work, with tablet and mobile access while moving around a clinic.
- **Register:** Product UI, focused on scannability and clear states.
- **Memorable signature:** The ledger's fine gold index line, used sparingly to mark context.
- **Restraint:** White surfaces, quiet borders, clear hierarchy; no decorative gradients, glass effects, or beauty imagery.
- **Anti-references:** Generic analytics dashboards and luxury salon marketing pages; neither matches operational clinic work.
- **Token ownership/runtime mapping:** This file is the design source. `apps/web/src/app/globals.css` maps documented variables into runtime CSS; `premium-ui.json` declares the audit contract.

## Colors

Use the product brief's green, muted gold, pale neutral canvas, white surfaces, charcoal text, quiet muted text, and low-contrast borders. Green indicates selected/complete states; gold is a sparse context marker, never the only status cue. Keep focus visible and preserve native forced-color behavior. Runtime tokens are declared at the top of `globals.css`.

## Typography

Vazirmatn is the Persian UI face; Tahoma is a resilient system fallback. Use regular body copy, medium labels, and semibold headings. Keep Latin identifiers and technical values in a monospaced face only when they need character-level scanning. Keep numeric and mixed-script content readable and directionally isolated.

## Layout

Desktop uses a quiet, fixed-width right-side rail and a fluid content column capped near 70rem. Information cards use restrained padding and stable geometry. At narrow widths, the rail becomes a bottom navigation bar; key text remains readable and does not truncate without a recovery path.

## Elevation and shapes

Hierarchy comes from spacing, fine borders, and subtle surface differences. Use small radii on controls and cards. Avoid heavy shadows; reserve elevation for mobile navigation and overlays.

## Components and states

Navigation exposes current location and clearly marks unfinished modules as unavailable. Statuses pair text with a visual mark. The interactive preview labels its synthetic localStorage data and warns against entering real patient data. Summary counts derive from the preview store. Controls have visible keyboard focus, empty states invite the next action, and local saves report a live status. Motion is minimal and respects reduced-motion settings.

## Content

Write concise Persian in the user's working vocabulary. Label actions by their result. Empty and incomplete states explain what is needed next. Never show invented patient, appointment, or financial records outside the explicitly labelled preview.
