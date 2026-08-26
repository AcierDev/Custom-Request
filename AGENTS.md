# Project Notes

- Any change that affects viewing or interacting with the artwork itself must be applied to both the main viewer (`/viewer`) and the shared viewer (`/shared/[id]`). Prefer shared components and configuration so their behavior stays identical.

# Collaboration

- Default to working things out independently and taking action. Inspect the repository, follow existing patterns, and make reasonable assumptions instead of asking about routine, reversible, or discoverable implementation details.
- It is acceptable to make a reasonable choice that may need adjustment later; the user will ask for a fix if necessary.
- Ask only when the answer would materially change the result and cannot be inferred safely, or when the action is important, destructive, irreversible, security-sensitive, costly, or affects external systems or other people.
