# Original assignment files and the student document reader

The lecturer creation wizard sends the original uploaded file and a JSON `payload`
in the same multipart creation request. The creation DTO decodes that payload
without converting nested arrays, objects or boolean values to strings. Existing
JSON-only creation remains supported. The original attachment record points to
the saved file, preserves its name/MIME type and is required to persist successfully.
Vietnamese UTF-8 multipart filenames are repaired when decoded as Latin-1.

Student detail responses expose `documentContent` and a public `documentAnalysis`
projection: requirement groups, original acceptance scenarios, platform/language
and teacher review status. A rubric section description is not an assignment body.
Internal AI prompts, reference solutions and grading-only configuration are not
included in this public analysis projection.

The student page prioritizes the original assignment description/content over
grading metadata, provides document/requirements/acceptance tabs and renders text,
Markdown headings, code blocks and tables safely. Legacy HTML becomes inert text.
The reader scrolls within its panel on small screens; downloading the original
retains Word/PDF formatting.

Downloads use the authenticated attachment endpoint and the shared API transport's
binary response mode, including token refresh. The browser saves the original bytes
under the attachment's original filename. Loading, error and missing-file states
are explicit. No generated Markdown is presented as the uploaded original file.
The endpoint verifies exam/class access before reading files, checks local path
containment and does not use arbitrary remote origins as a file proxy.

Files uploaded only for AI analysis before this fix were not saved with an exam.
Those historical missing files cannot be reconstructed from their filename/size.
The UI reports that there is no original attachment instead of fabricating one.
No existing exams or student submissions are migrated by this change.

Validation: assignment document unit tests cover multipart decoding, persistence,
public projection, access, binary bytes/names, Vietnamese filenames and concurrent
token refresh. The lecturer browser test checks actual multipart file forwarding.
The student browser test checks original downloads, reader content, analysis tabs,
loading/error/missing states and mobile overflow with intercepted APIs. Tests do not
write real assignment records or call an AI provider.
