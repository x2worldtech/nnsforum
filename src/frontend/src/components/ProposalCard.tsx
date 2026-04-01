import { cn } from "@/lib/utils";
import {
  Clock,
  ExternalLink,
  Heart,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCallerVote,
  useProposalVoteCounts,
  useVoteOnProposal,
} from "../hooks/useQueries";
import type { NNSProposal } from "../types/nns";

function formatTimeRemaining(deadlineSecs?: number): string | null {
  if (!deadlineSecs) return null;
  const now = Math.floor(Date.now() / 1000);
  const diff = deadlineSecs - now;
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function getStatusStyle(status: string) {
  switch (status) {
    case "PROPOSAL_STATUS_OPEN":
      return {
        dot: "bg-[var(--nns-teal)]",
        text: "text-[var(--nns-teal)]",
        border: "border-[var(--nns-teal)]/30",
        bg: "bg-[var(--nns-teal)]/10",
      };
    case "PROPOSAL_STATUS_ACCEPTED":
    case "PROPOSAL_STATUS_EXECUTED":
      return {
        dot: "bg-green-400",
        text: "text-green-400",
        border: "border-green-400/30",
        bg: "bg-green-400/10",
      };
    case "PROPOSAL_STATUS_REJECTED":
    case "PROPOSAL_STATUS_FAILED":
      return {
        dot: "bg-red-400",
        text: "text-red-400",
        border: "border-red-400/30",
        bg: "bg-red-400/10",
      };
    default:
      return {
        dot: "bg-muted-foreground",
        text: "text-muted-foreground",
        border: "border-border",
        bg: "bg-muted/50",
      };
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "PROPOSAL_STATUS_OPEN":
      return "Open";
    case "PROPOSAL_STATUS_ACCEPTED":
      return "Adopted";
    case "PROPOSAL_STATUS_REJECTED":
      return "Rejected";
    case "PROPOSAL_STATUS_EXECUTED":
      return "Executed";
    case "PROPOSAL_STATUS_FAILED":
      return "Failed";
    default:
      return status.replace("PROPOSAL_STATUS_", "");
  }
}

function VotingBar({ tally }: { tally?: NNSProposal["latest_tally"] }) {
  if (!tally) return null;
  const yes = Number(tally.yes ?? tally.yes_count ?? 0);
  const no = Number(tally.no ?? tally.no_count ?? 0);
  const total = Number(tally.total ?? 0);
  if (total === 0) return null;
  const yesPctNum = (yes / total) * 100;
  const noPctNum = (no / total) * 100;
  const yesPct = yesPctNum.toFixed(3);
  const noPct = noPctNum.toFixed(3);

  return (
    <div className="mt-4 space-y-1.5">
      <div className="flex justify-between text-[11px] font-medium">
        <span className="text-[var(--nns-teal)]">Adopt {yesPct}%</span>
        <span className="text-red-400">Reject {noPct}%</span>
      </div>
      {/* Dual bar: green from left, red from right, center marker at 50% */}
      <div className="relative h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-visible">
        {/* Green adopt bar from left */}
        <div
          className="absolute left-0 top-0 h-full rounded-l-full bg-[var(--nns-teal)] transition-all duration-700"
          style={{ width: `${Math.min(yesPctNum, 100)}%` }}
        />
        {/* Red reject bar from right */}
        <div
          className="absolute right-0 top-0 h-full rounded-r-full bg-red-500 transition-all duration-700"
          style={{ width: `${Math.min(noPctNum, 100)}%` }}
        />
        {/* Center 50% marker */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-black/50 dark:bg-white/60 rounded-full z-10" />
      </div>
    </div>
  );
}

interface ProposalCardProps {
  proposal: NNSProposal;
  isFavorited: boolean;
  onToggleFavorite: (proposalId: bigint) => void;
  onClick: () => void;
  onDiscuss: () => void;
  index: number;
}

export function ProposalCard({
  proposal,
  isFavorited,
  onToggleFavorite,
  onClick,
  onDiscuss,
  index,
}: ProposalCardProps) {
  const { identity } = useInternetIdentity();
  const timeLeft = formatTimeRemaining(proposal.deadline_timestamp_seconds);
  const style = getStatusStyle(proposal.status);
  const statusLabel = getStatusLabel(proposal.status);

  const proposalBigInt = BigInt(proposal.proposal_id);
  const { data: voteCounts } = useProposalVoteCounts(proposalBigInt);
  const { data: userVote = null } = useCallerVote(
    identity ? proposalBigInt : null,
  );
  const voteOnProposal = useVoteOnProposal(proposalBigInt);

  const upvotes = voteCounts?.upvotes ?? BigInt(0);
  const downvotes = voteCounts?.downvotes ?? BigInt(0);

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!identity) return;
    voteOnProposal.mutate({ isUpvote: true, remove: userVote === true });
  };

  const handleDownvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!identity) return;
    voteOnProposal.mutate({ isUpvote: false, remove: userVote === false });
  };

  return (
    <div
      data-ocid={`proposal.item.${index}`}
      className="group relative bg-card border border-border rounded-2xl p-5 [@media(hover:hover)]:hover:border-black/40 dark:[@media(hover:hover)]:hover:border-white/40 transition-all duration-200 cursor-pointer"
    >
      {/* Clickable overlay */}
      <button
        type="button"
        onClick={onClick}
        className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`View proposal ${proposal.proposal_id}`}
      />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
              style.text,
              style.border,
              style.bg,
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
            {statusLabel}
          </span>
          {proposal.topic && (
            <span className="text-[11px] text-muted-foreground truncate max-w-[110px]">
              {proposal.topic}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <a
            href={`https://nns.ic0.app/proposal/?u=qoctq-giaaa-aaaaa-aaaea-cai&proposal=${proposal.proposal_id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            data-ocid={`proposal.link.${index}`}
            className="relative z-10 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            data-ocid={`proposal.toggle.${index}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!identity) return;
              onToggleFavorite(BigInt(proposal.proposal_id));
            }}
            title={
              identity
                ? isFavorited
                  ? "Remove favorite"
                  : "Add favorite"
                : "Login to favorite"
            }
            className="relative z-10 p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-colors",
                isFavorited
                  ? "fill-red-400 text-red-400"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            />
          </button>
        </div>
      </div>

      {/* ID */}
      <div className="relative z-10 text-[11px] font-mono text-muted-foreground mb-1.5">
        #{proposal.proposal_id}
      </div>

      {/* Title */}
      <h3 className="relative z-10 text-sm font-semibold text-foreground line-clamp-2 leading-snug mb-2">
        {proposal.title || `Proposal #${proposal.proposal_id}`}
      </h3>

      {/* Summary */}
      {proposal.summary && (
        <p
          className="relative z-10 text-xs text-muted-foreground line-clamp-2 leading-relaxed break-all"
          style={{ overflowWrap: "anywhere" }}
        >
          {proposal.summary}
        </p>
      )}

      {/* Time remaining */}
      {timeLeft && proposal.status === "PROPOSAL_STATUS_OPEN" && (
        <div className="relative z-10 mt-3 flex items-center gap-1 text-[11px] text-[var(--nns-amber)]">
          <Clock className="w-3 h-3" />
          {timeLeft} remaining
        </div>
      )}

      {/* Voting bar */}
      <div className="relative z-10">
        <VotingBar tally={proposal.latest_tally} />
      </div>

      {/* Action bar — upvote / downvote / discuss */}
      <div className="relative z-10 mt-4 flex items-center gap-2 pt-3 border-t border-border/50">
        {/* Upvote */}
        <button
          type="button"
          data-ocid={`proposal.toggle.${index}`}
          onClick={handleUpvote}
          disabled={!identity}
          title={
            !identity
              ? "Login to vote"
              : userVote === true
                ? "Remove upvote"
                : "Upvote"
          }
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
            userVote === true
              ? "bg-[var(--nns-teal)]/20 text-[var(--nns-teal)] border border-[var(--nns-teal)]/40"
              : "bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 border border-transparent",
            !identity && "opacity-40 cursor-not-allowed",
          )}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>{Number(upvotes)}</span>
        </button>

        {/* Downvote */}
        <button
          type="button"
          data-ocid={`proposal.toggle.${index}`}
          onClick={handleDownvote}
          disabled={!identity}
          title={
            !identity
              ? "Login to vote"
              : userVote === false
                ? "Remove downvote"
                : "Downvote"
          }
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
            userVote === false
              ? "bg-red-400/20 text-red-400 border border-red-400/40"
              : "bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 border border-transparent",
            !identity && "opacity-40 cursor-not-allowed",
          )}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
          <span>{Number(downvotes)}</span>
        </button>

        {/* Discuss */}
        <button
          type="button"
          data-ocid={`proposal.button.${index}`}
          onClick={(e) => {
            e.stopPropagation();
            onDiscuss();
          }}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 border border-transparent transition-all"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Discuss
        </button>
      </div>
    </div>
  );
}
