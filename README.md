# Enrollment Review Workbench

A React and TypeScript single-page workbench for reviewing enrollment submissions that need operations attention.

## Setup

```bash
npm install
```

## Run locally

Start the mock API in one terminal:

```bash
npm run api
```

Start the frontend in another terminal:

```bash
npm run dev
```

The app runs at `http://localhost:5173` and proxies `/api` requests to the mock server at `http://localhost:4000`.

## Test and build

```bash
npm run test
npm run build
```

## Notes

- The mock API and data from the assignment are included as `mock-api.js` and `mock-data.json`.
- The default queue sort is priority-first so the highest-value reviews appear first.
- Decision requests can fail in the mock API; failed actions remain retryable.
