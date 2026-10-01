# Historical migration artifacts

These scripts and JSON files were used to update labels and deduplicate the old
root-level `app/`, `components/` and `lib/language-context.tsx` tree.

They are retained for reference. The scripts deliberately stop immediately:
their paths and assumptions no longer match the application. Do not run them
against `src/` without adapting and reviewing them first.

Active translations now live in `src/lib/i18n/locales/vi.ts` and `en.ts`.
This directory is excluded from application lint/typecheck and is not imported
by application code.
