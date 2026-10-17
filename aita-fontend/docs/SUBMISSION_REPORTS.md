# Submission reports: data provenance

Keep the overview, lecturer rubric evaluations, actual testcase execution evidence,
code review and submission history. Remove Git/contributor/AI-contract mock reports:
a ZIP alone does not establish commits, authorship or contribution percentages.

## Source and grading

- The shared report viewer reads source through authenticated
  `GET /submissions/:id/source`, from that record's stored ZIP. It preserves actual
  paths and extensions, shows archive SHA-256, and verifies snippets against content.
  It does not insert a sample project when source is unavailable.
- Local uploads and HTTPS Cloudinary storage are supported. Source previews skip
  dependencies, build artifacts and binary files. Limits: 100 MB compressed archive,
  10,000 entries, 250 preview files, 2 MB per source file, 10 MB total preview content.
  Unsafe paths/symlinks are rejected. Preview truncation is explicitly reported.
- The grader must receive the selected published assignment and its rubric. Single
  and batch ZIP uploads cannot silently use the latest published assignment.
- Real grading refuses `AI_STUB_MODE=true`. Stub mode is now opt-in, and missing
  keys or exhausted external AI providers return errors rather than synthetic AI
  responses. An existing deployment explicitly using stub mode must disable it
  and configure a valid AI provider before grading. Existing grades are untouched.
- AI code-review evidence is checked against extracted source before grading returns.
  AI may return an exact file and an inclusive, one-based line range (up to 40
  lines); the server extracts original source rather than asking AI to copy and
  JSON-escape it. Invalid response/evidence is retried within the bounded evaluation
  loop. Validation runs inside the provider callback before its success cache;
  malformed JSON is not converted into a guessed grade by regular expressions.
  Transient provider 500/502/503/504 failures and timeouts use bounded backoff;
  validation failures stay distinct from outages. Gemini respects caller cancellation
  and `AI_TIMEOUT_MS` (60 seconds by default) rather than a separate hard-coded
  18-second timeout. Transport timeouts abort the underlying request.
  Matching tolerates formatting and archive-root prefixes while preserving string
  literals and token boundaries. Invented or mismatched snippets are discarded.
  If AI references a unique real source path, original file content may supply the
  evidence; that draft is explicitly flagged for lecturer review. Positive scores
  without either verified snippets or real file references stop grading.
- Failed grading stores an error state and leaves unearned scores null. Failed
  regrading preserves a previous valid report and records the retry error separately.
  Legacy error reports containing zero are displayed as unknown, not earned zero.
  Pending lecturer results refresh in the background; job completion follows saving
  the report rather than preceding it.
- Test summaries count explicit execution outcomes in saved rubric evidence.
  Finding a unit-test file or receiving positive AI comments does not prove tests ran.
  Compilation is unknown without a recorded compilation result. There is no fixed
  Code Quality score; quality assessment follows actual lecturer criteria.
- A report with a conflicting submission/assignment identity is rejected by the
  viewer. Missing information stays unknown; zero earned points remains zero.
  Database TotalScore is not used as a substitute for an earned grade.
- AI review still requires lecturer oversight. If a saved mobile rubric contains
  unrelated web authentication criteria, correct the lecturer rubric and regrade;
  the viewer must not silently delete or rewrite those requirements. Existing
  stored reports are not automatically regraded by these changes.

## Attempts and privacy

- Student resubmission inserts a new record/ZIP and preserves previous report,
  timestamps and grades. A PostgreSQL transaction and scope advisory lock allocate
  attempt numbers and move the latest marker atomically, including concurrent uploads.
- Normal submission lists and bulk publication operate on latest attempts.
  History explicitly requests all attempts; `GET /submissions/:id/history` authorizes
  the selected record first and restricts results to its student, exam and class.
- Students cannot see unpublished history scores. Staff use existing access rules.
  Source/history reads bypass cache and reject unauthenticated or unrelated users.
- Previously overwritten ZIPs/records cannot be recovered without an external backup.
  The change preserves future attempts; it does not fabricate missing past uploads.

## Validation

`tests/submission-provenance.test.mjs` covers missing/zero grades, testcase evidence,
report identity, snippet matching, actual ZIP reading, attempt preservation and
authorization/privacy. These tests use isolated modules and mocks, never real database
writes. `tests/submission-report.browser.cjs` exercises the production interface with
intercepted API fixtures, including mobile layout, missing evidence and source retry.
