# Decisions

## Product and UX decisions

I optimized the workbench for experienced operations users who may review many records during the day. The default sort is `priority_desc` because the assignment asks users to find the submissions most worth reviewing, and priority is the clearest available proxy for operational urgency. I used a queue-plus-details layout so reviewers can inspect a submission without navigating away or losing their place.

The assignment leaves the exact visual treatment open, so I chose a dense operational interface instead of a card-heavy or marketing-style layout. The queue shows applicant, email, employer, product, coverage, submitted time, review reason, priority, and status. Details open beside the queue and group the endpoint data into applicant, employment, election, existing coverage, and review signals. Missing values are shown explicitly as "Missing" and highlighted with text and contrast so reviewers do not have to infer blanks.

I assumed that employer groups and review reasons are a bounded mock-data set for this exercise. In a production version I would prefer a metadata endpoint for filter values, especially if groups can change frequently.

## Technical approach

The app is a small Vite, React, and TypeScript project. I kept server access in `src/api.ts`, domain types in `src/types.ts`, formatting helpers in `src/formatters.ts`, and the UI in `src/App.tsx`. For a larger codebase I would split the app into more component files, but here keeping related workflow pieces close makes the submission easier to review.

I used explicit hooks for list and detail loading. They use `AbortController` so stale search/filter requests do not overwrite newer results, which matters because the mock API intentionally returns shorter search queries more slowly. The decision action is handled separately and disables action buttons while saving to prevent duplicate posts.

I added `lucide-react` for consistent icons. It is a small dependency that improves visual scanning for actions and states without creating a design-system burden. The rest of the implementation uses the platform, React, and TypeScript.

## Reliability and edge cases

The UI handles loading, empty, error, retry, saving, success, and failure states. Returning for correction requires a note on the client before calling the API, while approval does not. Failed decision requests show an error and leave the action retryable. If the API returns a conflict with an updated submission, the detail panel adopts that returned submission and refreshes the queue.

The app defensively formats missing, invalid, or nullable values because the API contract says records are not equally complete. Final statuses are shown in the panel and disable further decision actions. After a successful decision, the queue is refreshed because the mock API can remove decided items from list results.

I deliberately left out authentication, routing, pagination, virtualization, and a full component library. With thousands of records, the next step would be server pagination or cursor loading plus virtualized rows.

## Accessibility

The queue uses a semantic table. Applicant cells contain real buttons for keyboard selection, and the details panel receives focus on open. Closing the panel returns focus to the selected row trigger. Form controls have labels, action buttons use text plus icons, focus outlines are visible, and status updates are announced with an `aria-live` region. Review urgency is communicated through text labels such as "Priority: High" rather than color alone.

## AI usage

I used AI assistance to interpret the assignment, plan the product workflow, scaffold the React implementation, and identify high-risk test cases. I verified the output by reading the mock API behavior, running focused tests, running a production build, and revising configuration issues found by TypeScript.

## If I had another day

I would add URL-synced filters, row keyboard shortcuts for power users, richer conflict comparison for specific fields, and server-driven filter metadata. I would also add integration tests against the real mock server to cover the intentionally failing decision paths and out-of-order search responses end to end.
