# Assignment analysis from the source document

The lecturer upload wizard now treats the uploaded assignment as the authority,
not the selected language preset or a similarly named subject's rubric.

- Detect supported programming languages from explicit document/source evidence,
  including Kotlin, Dart and Swift. An application that uses Room/SQLite, JDBC
  or a database is not automatically a SQL assignment. Unclear languages remain
  Unknown and require teacher confirmation.
- Preserve the extracted assignment body instead of rewriting it as a console
  menu assignment. Extract required, advanced and excluded scope separately.
- Read original component weights from rubric tables, including flattened Word
  table text. Preserve original weights; total mismatches require teacher review.
- AI proposals must cite source requirements. Without reliable AI output, return
  extraction-only status and source-derived unweighted criteria for manual setup.
  No generic SQL/auth/session rubric, sample solution or default tests are inserted.
- Preserve source acceptance scenarios separately from executable cases. Android,
  Web and Desktop actions are not stdin/stdout. Unknown project runners stay
  unconfigured rather than claiming Docker can execute them. Console examples
  require actual I/O evidence; SQL schema/seed statements require source text.
- The wizard applies all returned runtime/submission settings, replaces old arrays
  even when empty, ignores responses for older files and displays review warnings,
  source quotes and acceptance scenarios. Presets are explicit teacher choices.
- Publishing analyzed work requires teacher acknowledgment, a known language,
  consistent total points and execution cases for automatic-test criteria. The
  server enforces this before writes. Drafts can retain unfinished configuration.
- Cache version/context prevents old analysis or another teacher's context from
  being reused. Failed AI responses are not cached as successful analysis.

## Regression coverage

The supplied Personal Expense Tracker text is included as a fixture. It contains
the full assignment, including six original rubric items totaling 10 points and
ten acceptance scenarios (TC09/TC10 advanced). Tests intentionally inject an AI
SQL answer and ensure it cannot replace the Android/Kotlin source or original rubric.

Other fixtures cover Java Web, Python/Django, C# desktop, C++ console, SQL,
Dart/Flutter, Swift/iOS and ambiguous documents. Browser tests run the real wizard
with isolated API responses, review/publication checks and stale upload responses.
Tests do not call a paid AI provider or write the real database.

AI interpretation still needs lecturer review. OCR failures, unfamiliar formats
and underspecified requirements are exposed as uncertainty rather than certified
correct analysis. Previously published assignments are not automatically modified;
their lecturer must reanalyze and verify them.
