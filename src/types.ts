export type SortValue =
  | 'priority_desc'
  | 'submitted_desc'
  | 'submitted_asc'
  | 'applicant_asc';

export type Decision = 'APPROVE' | 'RETURN';

export type SubmissionStatus =
  | 'NEEDS_REVIEW'
  | 'AWAITING_DOCUMENTS'
  | 'APPROVED'
  | 'RETURNED'
  | string;

export interface Applicant {
  name?: string | null;
  email?: string | null;
}

export interface Group {
  id?: string | null;
  name?: string | null;
}

export interface QueueSubmission {
  id: string;
  applicant?: Applicant | null;
  group?: Group | null;
  product?: string | null;
  coverageAmountCents?: number | null;
  submittedAt?: string | null;
  effectiveDate?: string | null;
  reviewReason?: string | null;
  priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | string | null;
  status?: SubmissionStatus | null;
}

export interface ReviewSignal {
  code?: string | null;
  severity?: string | null;
  field?: string | null;
  message?: string | null;
}

export interface SubmissionDetail extends QueueSubmission {
  employee?: Record<string, unknown> | null;
  employment?: Record<string, unknown> | null;
  election?: Record<string, unknown> | null;
  existingCoverage?: Record<string, unknown> | null;
  reviewSignals?: ReviewSignal[] | null;
  decision?: {
    type?: Decision | null;
    note?: string | null;
    reviewedBy?: string | null;
  } | null;
  decidedAt?: string | null;
}

export interface ListResponse {
  items: QueueSubmission[];
  total: number;
}

export interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  submission?: SubmissionDetail;
}
