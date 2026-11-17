# basketful-tests

Reproduction and regression tests from Basketful issue investigations.

Each folder belongs to one GitHub issue in
[ryanparrish/basketful_app](https://github.com/ryanparrish/basketful_app)
and holds the test written to prove (or eliminate) the suspected cause,
plus a short note on what the test showed.

These tests run inside the `basketful_app` codebase (they import its
components and test setup). This repo is the evidence record, not a
standalone runnable suite.

## Folders

- `issue-133-mobile-cart/` — participant on a phone has no way to open
  the cart. Tracker row: Tuesday Spanish / Nayade Zubiarre, 2026-11-10.
  Issue: https://github.com/ryanparrish/basketful_app/issues/133
