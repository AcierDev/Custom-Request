# Lowe's Historic Interior Colors and New Palette Label Design

Date: 2026-07-26
Status: Approved

## Goal

Add every current Sherwin-Williams color in the official **Historic Interior
Color Wall** collection to **Lowe's matches**. Keep other Sherwin-Williams
colors excluded. Rename both palette-manager buttons from **Reset Palette** to
**New Palette**.

## Paint Data

The Sherwin-Williams importer will preserve the official Prism API's
`brandedCollectionNames` as optional `collections` metadata on normalized
paint records. The generated Sherwin-Williams dataset remains the source of
truth; manufacturer, code, hex, retailer, availability, and LRV stay intact.

## Matching

A current paint is eligible for **Lowe's matches** when either:

- its retailer is Lowe's, preserving Valspar and HGTV Home eligibility; or
- it is a Sherwin-Williams color tagged `Historic Interior Color Wall`.

The shared predicate will be named for Lowe's match eligibility and used by
both palette grounding and the preview paint picker. Records marked
`available: false` remain excluded by the existing consumer filters.

## Palette Label

Both responsive variants of the palette-manager action will read
**New Palette**. The destructive confirmation title remains
**Reset Palette?**, accurately describing what confirmation will do.

## Verification

Automated checks will verify that the generated dataset contains all 80
current Historic Interior colors, representative Historic Interior colors are
eligible, a non-Historic Sherwin-Williams color is excluded, and existing
Valspar/HGTV Home eligibility is unchanged. The focused tests and production
build will run, and a source search will verify both button labels.

## Non-goals

- Historic Exterior colors.
- Other Sherwin-Williams collections.
- Changing paint retailer or manufacturer metadata.
- Changing the confirmation dialog title or palette reset behavior.
