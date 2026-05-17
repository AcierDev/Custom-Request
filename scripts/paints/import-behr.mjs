// STUB importer for Behr.
//
// Behr is sold via "The Home Depot". A code-bearing public feed
// (Behr ColorSmart) has not been wired up yet, so this script
// intentionally does NOT overwrite public/paints/behr/colors.json.
// The existing {name,hex,brand} data keeps working; the app falls
// back to a brand-prefixed name until real codes are imported.
//
// To implement: see scripts/paints/README.md ("Adding a brand
// importer") and model it on import-sherwin.mjs.

process.stdout.write(
  "import-behr: stub — no code-bearing source wired up yet.\n" +
  "Existing public/paints/behr/colors.json left unchanged.\n"
);
