import {
  AlertCircle,
  CheckCircle2,
  FileWarning,
  RotateCcw,
  Search,
  Send,
  X,
} from 'lucide-react';
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, getSubmission, listSubmissions, recordDecision } from './api';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatValue,
  labelize,
} from './formatters';
import type {
  Decision,
  QueueSubmission,
  ReviewSignal,
  SortValue,
  SubmissionDetail,
} from './types';

const SORT_OPTIONS: Array<{ value: SortValue; label: string }> = [
  { value: 'priority_desc', label: 'Priority first' },
  { value: 'submitted_desc', label: 'Newest submitted' },
  { value: 'submitted_asc', label: 'Oldest submitted' },
  { value: 'applicant_asc', label: 'Applicant A-Z' },
];

const API_GROUP_OPTIONS = [
  ['grp_northstar', 'Northstar Fabrication'],
  ['grp_canyon', 'Canyon Ridge Hospitality'],
  ['grp_sol', 'Sol y Mar Foods'],
  ['grp_harbor', 'Harbor & Pine Consulting'],
  ['grp_meridian', 'Meridian Community Health'],
  [
    'grp_long',
    'The Metropolitan Association for Advanced Environmental Research and Public Infrastructure',
  ],
  ['grp_atlas', 'Atlas Retail Cooperative'],
  ['grp_lumen', 'Lumen Learning Labs'],
  ['grp_keystone', 'Keystone Civic Partners'],
] as const;

const REASON_OPTIONS = [
  'COVERAGE_MISMATCH',
  'MISSING_INFORMATION',
  'DUPLICATE_RECORD',
  'IDENTITY_MISMATCH',
  'BENEFICIARY_MISSING',
  'GROUP_NOT_FOUND',
  'ZERO_COVERAGE',
  'EVIDENCE_REQUIRED',
  'DATE_PRECISION',
  'SALARY_MISMATCH',
  'DEPENDENT_ELIGIBILITY',
  'AMOUNT_OUTLIER',
  'EMPLOYMENT_STATUS',
  'HOURS_BELOW_MINIMUM',
  'LATE_ENROLLMENT',
  'ADDRESS_MISMATCH',
  'TOBACCO_STATUS',
  'INVALID_EFFECTIVE_DATE',
  'WAITING_PERIOD',
];

type LoadState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

function useSubmissionList(filters: {
  query: string;
  group: string;
  reason: string;
  sort: SortValue;
}) {
  const [state, setState] = useState<LoadState<{ items: QueueSubmission[]; total: number }>>({
    data: null,
    loading: true,
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));

    listSubmissions(filters, controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState((current) => ({
          data: current.data,
          loading: false,
          error: error instanceof Error ? error.message : 'Unable to load submissions.',
        }));
      });

    return () => controller.abort();
  }, [filters.query, filters.group, filters.reason, filters.sort, reloadToken]);

  return {
    ...state,
    reload: () => setReloadToken((value) => value + 1),
  };
}

function useSubmissionDetail(id: string | null) {
  const [state, setState] = useState<LoadState<SubmissionDetail>>({
    data: null,
    loading: false,
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!id) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    getSubmission(id, controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unable to load submission details.',
        });
      });

    return () => controller.abort();
  }, [id, reloadToken]);

  return {
    ...state,
    setData: (data: SubmissionDetail) => setState({ data, loading: false, error: null }),
    reload: () => setReloadToken((value) => value + 1),
  };
}

export function App() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [reason, setReason] = useState('');
  const [sort, setSort] = useState<SortValue>('priority_desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const filters = useMemo(() => ({ query, group, reason, sort }), [query, group, reason, sort]);
  const list = useSubmissionList(filters);
  const detail = useSubmissionDetail(selectedId);
  const selectedButtonRef = useRef<HTMLButtonElement | null>(null);

  const items = list.data?.items ?? [];
  const urgentCount = items.filter((item) => item.priority === 'URGENT').length;
  const highCount = items.filter((item) => item.priority === 'HIGH').length;
  const activeFilters = [query, group, reason].filter(Boolean).length;
  const selectedIsVisible = selectedId ? items.some((item) => item.id === selectedId) : true;

  useEffect(() => {
    if (selectedId && !selectedIsVisible && !detail.loading) {
      setSelectedId(null);
    }
  }, [selectedId, selectedIsVisible, detail.loading]);

  function clearFilters() {
    setQuery('');
    setGroup('');
    setReason('');
    setSort('priority_desc');
  }

  function closeDetails() {
    setSelectedId(null);
    window.setTimeout(() => selectedButtonRef.current?.focus(), 0);
  }

  async function handleDecision(decision: Decision, note: string) {
    if (!selectedId) return;
    setAnnouncement(decision === 'APPROVE' ? 'Approving submission.' : 'Returning submission.');
    try {
      const updated = await recordDecision(selectedId, decision, note);
      detail.setData(updated);
      list.reload();
      setAnnouncement(
        decision === 'APPROVE'
          ? 'Submission approved successfully.'
          : 'Submission returned for correction.',
      );
    } catch (error) {
      if (error instanceof ApiError && error.submission) {
        detail.setData(error.submission);
        list.reload();
      }
      setAnnouncement(error instanceof Error ? error.message : 'Decision failed.');
      throw error;
    }
  }

  return (
    <main className="shell">
      <section className="workbench" aria-labelledby="page-title">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operations</p>
            <h1 id="page-title">Enrollment Review Workbench</h1>
            <p className="page-subtitle">
              Prioritize exceptions, inspect evidence, and record decisions without leaving the queue.
            </p>
          </div>
          <div className="summary-grid" aria-label="Queue status">
            <div className="summary">
              <span className="summary-number">{list.data?.total ?? 0}</span>
              <span>open</span>
            </div>
            <div className="summary">
              <span className="summary-number">{urgentCount + highCount}</span>
              <span>high touch</span>
            </div>
            <div className="summary">
              <span className="summary-number">{activeFilters}</span>
              <span>filters</span>
            </div>
          </div>
        </header>

        <section className="toolbar" aria-label="Queue controls">
          <label className="search-field">
            <span>Search applicant</span>
            <Search aria-hidden="true" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or email"
            />
          </label>

          <label>
            <span>Employer group</span>
            <select value={group} onChange={(event) => setGroup(event.target.value)}>
              <option value="">All groups</option>
              {API_GROUP_OPTIONS.map(([id, name]) => (
                <option value={id} key={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Review reason</span>
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              <option value="">All reasons</option>
              {REASON_OPTIONS.map((option) => (
                <option value={option} key={option}>
                  {labelize(option)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortValue)}>
              {SORT_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button className="ghost-button" type="button" onClick={clearFilters}>
            <RotateCcw aria-hidden="true" size={16} />
            Reset
          </button>
        </section>

        <div className={`content ${selectedId ? 'details-open' : ''}`}>
          <section className="queue-panel" aria-label="Review queue">
            <div className="queue-header">
              <div>
                <p className="eyebrow">Review queue</p>
                <h2>{list.loading && !list.data ? 'Loading submissions' : `${items.length} submissions shown`}</h2>
              </div>
              <span className="queue-hint">Sorted by {SORT_OPTIONS.find((option) => option.value === sort)?.label}</span>
            </div>
            {list.error ? (
              <Notice
                tone="danger"
                title="Unable to load queue"
                message={list.error}
                actionLabel="Retry"
                onAction={list.reload}
              />
            ) : null}

            <QueueTable
              items={items}
              loading={list.loading}
              selectedId={selectedId}
              onSelect={(submission, button) => {
                selectedButtonRef.current = button;
                setSelectedId(submission.id);
              }}
            />

            {!list.loading && items.length === 0 && !list.error ? (
              <div className="empty-state">
                <h2>No submissions match</h2>
                <p>Try a different search, clear one filter, or reset the queue controls.</p>
                <button type="button" className="primary-button" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : null}
          </section>

          <DetailsPanel
            detail={detail.data}
            loading={detail.loading}
            error={detail.error}
            open={Boolean(selectedId)}
            onClose={closeDetails}
            onRetry={detail.reload}
            onDecision={handleDecision}
          />
        </div>
      </section>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </main>
  );
}

interface QueueTableProps {
  items: QueueSubmission[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (submission: QueueSubmission, button: HTMLButtonElement) => void;
}

function QueueTable({ items, loading, selectedId, onSelect }: QueueTableProps) {
  return (
    <div className="table-wrap" aria-busy={loading}>
      <table>
        <caption className="sr-only">Enrollment submissions needing review</caption>
        <colgroup>
          <col className="col-applicant" />
          <col className="col-employer" />
          <col className="col-product" />
          <col className="col-coverage" />
          <col className="col-submitted" />
          <col className="col-reason" />
          <col className="col-status" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Applicant</th>
            <th scope="col">Employer</th>
            <th scope="col">Product</th>
            <th scope="col">Coverage</th>
            <th scope="col">Submitted</th>
            <th scope="col">Reason</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {loading && items.length === 0
            ? Array.from({ length: 5 }, (_, index) => (
                <tr className="skeleton-row" key={index}>
                  <td colSpan={7}>Loading submission row</td>
                </tr>
              ))
            : null}
          {items.map((item) => (
            <SubmissionRow
              item={item}
              selected={item.id === selectedId}
              key={item.id}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </table>
      {loading && items.length > 0 ? <div className="loading-strip">Refreshing queue</div> : null}
    </div>
  );
}

function SubmissionRow({
  item,
  selected,
  onSelect,
}: {
  item: QueueSubmission;
  selected: boolean;
  onSelect: (submission: QueueSubmission, button: HTMLButtonElement) => void;
}) {
  function choose(event: React.MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) {
    onSelect(item, event.currentTarget);
  }

  return (
    <tr className={selected ? 'selected-row' : undefined}>
      <td>
        <button
          type="button"
          className="row-button"
          aria-pressed={selected}
          onClick={choose}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') choose(event);
          }}
        >
          <strong>{item.applicant?.name || 'Missing applicant'}</strong>
          <span>{item.applicant?.email || 'Missing email'}</span>
          <em>{selected ? 'Open in details' : 'Inspect submission'}</em>
        </button>
      </td>
      <td>
        <span className="cell-text clamp-2">{item.group?.name || 'Missing group'}</span>
      </td>
      <td>
        <span className="cell-text clamp-2">{item.product || 'Missing product'}</span>
      </td>
      <td>
        <strong>{formatMoney(item.coverageAmountCents)}</strong>
        <span className="muted">Effective {formatDate(item.effectiveDate)}</span>
      </td>
      <td>
        <span className="cell-text">{formatDateTime(item.submittedAt)}</span>
      </td>
      <td>
        <Reason reason={item.reviewReason} priority={item.priority} />
      </td>
      <td>
        <StatusBadge status={item.status} />
      </td>
    </tr>
  );
}

function DetailsPanel({
  detail,
  loading,
  error,
  open,
  onClose,
  onRetry,
  onDecision,
}: {
  detail: SubmissionDetail | null;
  loading: boolean;
  error: string | null;
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
  onDecision: (decision: Decision, note: string) => Promise<void>;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) window.setTimeout(() => closeRef.current?.focus(), 0);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <aside className="details-panel" aria-label="Submission details">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Submission details</p>
          <h2>{detail?.applicant?.name || 'Loading submission'}</h2>
          {detail?.applicant?.email ? <p className="panel-subtitle">{detail.applicant.email}</p> : null}
        </div>
        <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Close details">
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      {loading ? <div className="panel-loading">Loading details</div> : null}

      {error ? (
        <Notice
          tone="danger"
          title="Unable to load details"
          message={error}
          actionLabel="Retry"
          onAction={onRetry}
        />
      ) : null}

      {detail && !loading ? (
        <>
          <section className="detail-summary" aria-label="Selected submission summary">
            <div>
              <span>Employer</span>
              <strong>{detail.group?.name || 'Missing'}</strong>
            </div>
            <div>
              <span>Coverage</span>
              <strong>{formatMoney(detail.coverageAmountCents)}</strong>
            </div>
            <div>
              <span>Reason</span>
              <strong>{labelize(detail.reviewReason)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{labelize(detail.status)}</strong>
            </div>
          </section>

          <SignalList signals={detail.reviewSignals ?? []} reason={detail.reviewReason} />

          <DetailSection title="Applicant" data={detail.employee} />
          <DetailSection title="Employment" data={detail.employment} />
          <DetailSection title="Election" data={detail.election} />
          <DetailSection title="Existing coverage" data={detail.existingCoverage} />

          <ReviewActions status={detail.status} onDecision={onDecision} />
        </>
      ) : null}
    </aside>
  );
}

function ReviewActions({
  status,
  onDecision,
}: {
  status?: string | null;
  onDecision: (decision: Decision, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<Decision | null>(null);
  const [error, setError] = useState('');
  const isFinal = status === 'APPROVED' || status === 'RETURNED';
  const noteMissing = note.trim().length === 0;

  async function submit(decision: Decision) {
    if (saving || isFinal) return;
    if (decision === 'RETURN' && noteMissing) {
      setError('Add a note before returning this submission.');
      return;
    }

    setSaving(decision);
    setError('');
    try {
      await onDecision(decision, note.trim());
      setNote('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save decision.');
    } finally {
      setSaving(null);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form className="actions" onSubmit={onSubmit}>
      <h3>Record decision</h3>
      {isFinal ? (
        <Notice tone="success" title="Decision recorded" message={`Status is ${labelize(status)}.`} />
      ) : (
        <>
          <label>
            <span>Return note</span>
            <textarea
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Required only when returning for correction"
            />
          </label>
          <div className="action-row">
            <button
              type="button"
              className="primary-button"
              disabled={Boolean(saving)}
              onClick={() => void submit('APPROVE')}
            >
              <CheckCircle2 aria-hidden="true" size={17} />
              {saving === 'APPROVE' ? 'Approving' : 'Approve'}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={Boolean(saving)}
              onClick={() => void submit('RETURN')}
            >
              <Send aria-hidden="true" size={17} />
              {saving === 'RETURN' ? 'Returning' : 'Return'}
            </button>
          </div>
          <p className="note-count">{note.length}/500 characters</p>
          {error ? (
            <p className="inline-error" role="alert">
              {error}
            </p>
          ) : null}
        </>
      )}
    </form>
  );
}

function SignalList({ signals, reason }: { signals: ReviewSignal[]; reason?: string | null }) {
  if (signals.length === 0) {
    return (
      <section className="signals">
        <h3>Review signals</h3>
        <div className="signal">
          <FileWarning aria-hidden="true" size={18} />
          <div>
            <strong>{labelize(reason)}</strong>
            <p>No detailed signal was supplied by the API.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="signals">
      <h3>Review signals</h3>
      {signals.map((signal, index) => (
        <div className="signal" key={`${signal.code}-${signal.field}-${index}`}>
          <AlertCircle aria-hidden="true" size={18} />
          <div>
            <strong>{labelize(signal.code)} · {labelize(signal.severity)}</strong>
            <p>{signal.message || 'No signal message supplied.'}</p>
            {signal.field ? <span className="muted">Field: {signal.field}</span> : null}
          </div>
        </div>
      ))}
    </section>
  );
}

function DetailSection({ title, data }: { title: string; data?: Record<string, unknown> | null }) {
  const entries = flattenData(data);
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      {entries.length === 0 ? (
        <p className="missing-line">Missing section data</p>
      ) : (
        <dl>
          {entries.map(([key, value]) => {
            const missing = value === 'Missing';
            return (
              <div className={missing ? 'missing-field' : undefined} key={key}>
                <dt>{labelize(key)}</dt>
                <dd>{value}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}

function flattenData(data?: Record<string, unknown> | null, prefix = ''): Array<[string, string]> {
  if (!data) return [];
  return Object.entries(data).flatMap(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenData(value as Record<string, unknown>, nextKey);
    }
    const formatted =
      key.toLowerCase().includes('cents') && typeof value === 'number'
        ? formatMoney(value)
        : key.toLowerCase().includes('date') && typeof value === 'string'
          ? formatDate(value)
          : formatValue(value);
    return [[nextKey, formatted]];
  });
}

function Reason({ reason, priority }: { reason?: string | null; priority?: string | null }) {
  return (
    <div className="reason">
      <span>{labelize(reason)}</span>
      <span className={`priority priority-${String(priority || 'unknown').toLowerCase()}`}>
        {labelize(priority)}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  return <span className="status-badge">{labelize(status)}</span>;
}

function Notice({
  tone,
  title,
  message,
  actionLabel,
  onAction,
}: {
  tone: 'danger' | 'success';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {actionLabel && onAction ? (
        <button type="button" className="ghost-button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
