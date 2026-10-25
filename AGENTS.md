# Project Notes

- Any change that affects viewing or interacting with the artwork itself must be applied to both the main viewer (`/viewer`) and the shared viewer (`/shared/[id]`). Prefer shared components and configuration so their behavior stays identical.

# Collaboration

- Default to working things out independently and taking action. Inspect the repository, follow existing patterns, and make reasonable assumptions instead of asking about routine, reversible, or discoverable implementation details.
- It is acceptable to make a reasonable choice that may need adjustment later; the user will ask for a fix if necessary.
- Ask only when the answer would materially change the result and cannot be inferred safely, or when the action is important, destructive, irreversible, security-sensitive, costly, or affects external systems or other people.

# Everwood customer support continuity

- Before Etsy/customer-support, custom-order, shipping, repair, or Tuesday intake work, read `/Users/akivaweil/Everwood Photo Studio/Workflows/Everwood SOP Manual.md` (the old `output/customer-support/EVERWOOD_SUPPORT_PLAYBOOK.md` now points there) and consult the relevant section before drafting or acting. Reuse already-read context during the task unless it changes.
- Treat Everwood SOP Manual as the single living reference for messaging and shipping. Update its relevant section in the same turn whenever Akiva provides a reusable fact, preference, correction, or workflow. Replace superseded rules and record a dated source note; no extra permission is needed for this local maintenance.
- Keep individual offers, addresses, pending work, and actual outcomes in the relevant case records and `output/customer-support/everwood-daily-operational-review-log.json`, not as general policy. Preserve manual edits and distinguish prepared, sent, purchased, and shipped.
- Before finishing support work, verify the actual result and that new instructions and useful state have been saved. Do not rely on this chat remaining available. Read the live customer thread before relying on saved status.
- Never send a customer message without explicit direction to send that specific message. Replies stay as drafts. Keep writing succinct and natural, and do not use em dashes.
