import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const listResponse = {
  items: [
    {
      id: 'sub_1',
      applicant: { name: 'Alex Morgan', email: 'alex@example.com' },
      group: { id: 'grp_northstar', name: 'Northstar Fabrication' },
      product: 'Voluntary Life',
      coverageAmountCents: 25000000,
      submittedAt: '2026-11-01T08:30:00-05:00',
      effectiveDate: '2027-01-01',
      reviewReason: 'COVERAGE_MISMATCH',
      priority: 'HIGH',
      status: 'NEEDS_REVIEW',
    },
  ],
  total: 1,
};

const detailResponse = {
  ...listResponse.items[0],
  employee: { employeeId: 'NS-1842', dateOfBirth: '1987-04-18' },
  employment: { employmentStatus: 'ACTIVE', hoursPerWeek: 40 },
  election: { requestedCoverageCents: 25000000, beneficiaryCount: 1 },
  existingCoverage: { coverageAmountCents: 15000000 },
  reviewSignals: [
    {
      code: 'COVERAGE_MISMATCH',
      severity: 'HIGH',
      field: 'election.requestedCoverageCents',
      message: 'Requested coverage differs from the platform amount.',
    },
  ],
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function mockFetch(decisionResponse?: Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('/api/submissions?')) {
      return Promise.resolve(jsonResponse(listResponse));
    }
    if (url === '/api/submissions/sub_1' && !init?.method) {
      return Promise.resolve(jsonResponse(detailResponse));
    }
    if (url === '/api/submissions/sub_1/decision') {
      return decisionResponse ?? Promise.resolve(jsonResponse({ ...detailResponse, status: 'APPROVED' }));
    }
    return Promise.resolve(jsonResponse({ error: { message: 'Not found' } }, { status: 404 }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function openDetail() {
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: /Alex Morgan/i }));
  expect(await screen.findByRole('heading', { name: /Alex Morgan/i })).toBeInTheDocument();
}

describe('Enrollment Review Workbench', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requires a note before returning a submission', async () => {
    const fetchMock = mockFetch();
    await openDetail();

    await userEvent.click(screen.getByRole('button', { name: /^Return$/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Add a note');
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/submissions/sub_1/decision',
      expect.anything(),
    );
  });

  it('disables decision buttons while saving to prevent duplicate actions', async () => {
    let resolveDecision!: (value: Response) => void;
    const pendingDecision = new Promise<Response>((resolve) => {
      resolveDecision = resolve;
    });
    const fetchMock = mockFetch(pendingDecision);
    await openDetail();

    const approveButton = screen.getByRole('button', { name: /^Approve$/i });
    await userEvent.click(approveButton);

    expect(screen.getByRole('button', { name: /Approving/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Return$/i })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /Approving/i }));

    const decisionCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/decision'),
    );
    expect(decisionCalls).toHaveLength(1);

    resolveDecision(jsonResponse({ ...detailResponse, status: 'APPROVED' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Decision recorded'),
    );
  });
});
