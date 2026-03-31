export interface NNSTally {
  yes?: string | number;
  no?: string | number;
  total?: string | number;
  yes_count?: string | number;
  no_count?: string | number;
}

export interface NNSProposal {
  proposal_id: number;
  title: string;
  summary?: string;
  topic?: string;
  status: string;
  deadline_timestamp_seconds?: number;
  latest_tally?: NNSTally;
  proposal_url?: string;
  payload?: Record<string, unknown>;
  action?: Record<string, unknown>;
}

export interface NNSProposalsResponse {
  data: NNSProposal[];
  total?: number;
}

export type StatusFilter =
  | "ALL"
  | "PROPOSAL_STATUS_OPEN"
  | "PROPOSAL_STATUS_ACCEPTED"
  | "PROPOSAL_STATUS_REJECTED"
  | "PROPOSAL_STATUS_EXECUTED"
  | "PROPOSAL_STATUS_FAILED";

export type SortOption = "newest" | "oldest" | "most_votes";
