# Opt-in /custom preparation

Prepare this app for a future `https://everwoodus.com/custom` deployment without
activating it. Default root hosting, artwork and rendering behavior stay intact.
Do not commit, push, deploy or modify external settings for this request.

1. Add a tested shared URL/path helper and opt-in Next build configuration.
2. Update client APIs, native navigation, share links and route guards.
3. Update server share/email URLs and OAuth redirects.
4. Update public asset, export and WASM request boundaries.
5. Document the dormant configuration and later routing/provider requirements.
6. Run focused tests, type checks and builds in both configurations; verify
   local HTTP/browser routes without rendering; review the combined changes.
7. Copy verified changes to the original checkout, preserving existing work.
