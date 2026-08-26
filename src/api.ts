import type {
  ApiErrorPayload,
  Decision,
  ListResponse,
  SortValue,
  SubmissionDetail,
} from './types';

export class ApiError extends Error {
  code?: string;
  status: number;
  submission?: SubmissionDetail;

  constructor(message: string, status: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload?.error?.code;
    this.submission = payload?.submission;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => undefined)) as
    | ApiErrorPayload
    | T
    | undefined;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | undefined;
    throw new ApiError(
      errorPayload?.error?.message || 'The request failed.',
      response.status,
      errorPayload,
    );
  }

  return payload as T;
}

export interface ListParams {
  query: string;
  group: string;
  reason: string;
  sort: SortValue;
}

export async function listSubmissions(
  params: ListParams,
  signal?: AbortSignal,
): Promise<ListResponse> {
  const search = new URLSearchParams({
    query: params.query,
    group: params.group,
    reason: params.reason,
    sort: params.sort,
  });

  const response = await fetch(`/api/submissions?${search}`, { signal });
  return parseResponse<ListResponse>(response);
}

export async function getSubmission(
  id: string,
  signal?: AbortSignal,
): Promise<SubmissionDetail> {
  const response = await fetch(`/api/submissions/${encodeURIComponent(id)}`, {
    signal,
  });
  return parseResponse<SubmissionDetail>(response);
}

export async function recordDecision(
  id: string,
  decision: Decision,
  note: string,
): Promise<SubmissionDetail> {
  const response = await fetch(
    `/api/submissions/${encodeURIComponent(id)}/decision`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, note }),
    },
  );
  return parseResponse<SubmissionDetail>(response);
}
