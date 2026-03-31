import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Heart,
  Loader2,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddFavorite,
  useGetComments,
  useProposalPayload,
  useRemoveFavorite,
} from "../hooks/useQueries";
import type { NNSProposal } from "../types/nns";
import { CommentThread } from "./CommentThread";

function formatVotingPower(e8s: number): string {
  const icp = e8s / 1e8;
  return icp.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function safeStringify(obj: unknown): string {
  return JSON.stringify(
    obj,
    (_key, value) => {
      if (typeof value === "bigint") return `${value.toString()}n`;
      return value;
    },
    2,
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case "PROPOSAL_STATUS_OPEN":
      return {
        text: "text-[var(--nns-teal)]",
        border: "border-[var(--nns-teal)]/30",
        bg: "bg-[var(--nns-teal)]/10",
        dot: "bg-[var(--nns-teal)]",
      };
    case "PROPOSAL_STATUS_ACCEPTED":
    case "PROPOSAL_STATUS_EXECUTED":
      return {
        text: "text-green-400",
        border: "border-green-400/30",
        bg: "bg-green-400/10",
        dot: "bg-green-400",
      };
    case "PROPOSAL_STATUS_REJECTED":
    case "PROPOSAL_STATUS_FAILED":
      return {
        text: "text-red-400",
        border: "border-red-400/30",
        bg: "bg-red-400/10",
        dot: "bg-red-400",
      };
    default:
      return {
        text: "text-muted-foreground",
        border: "border-border",
        bg: "bg-muted",
        dot: "bg-muted-foreground",
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

function formatTimeRemaining(deadlineSecs?: number): string | null {
  if (!deadlineSecs) return null;
  const now = Math.floor(Date.now() / 1000);
  const diff = deadlineSecs - now;
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

interface ProposalDetailProps {
  proposal: NNSProposal | null;
  isFavorited: boolean;
  onClose: () => void;
}

export function ProposalDetail({
  proposal,
  isFavorited,
  onClose,
}: ProposalDetailProps) {
  const { identity, login } = useInternetIdentity();
  const proposalBigInt = proposal ? BigInt(proposal.proposal_id) : null;
  const { data: comments = [], isLoading: commentsLoading } =
    useGetComments(proposalBigInt);
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const handleToggleFavorite = () => {
    if (!identity) {
      login();
      return;
    }
    if (!proposal) return;
    if (isFavorited) {
      removeFavorite.mutate(BigInt(proposal.proposal_id));
    } else {
      addFavorite.mutate(BigInt(proposal.proposal_id));
    }
  };

  return (
    <AnimatePresence>
      {proposal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />

          {isMobile ? (
            // Mobile: bottom sheet
            <motion.div
              data-ocid="proposal.detail.panel"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 h-[88dvh] bg-background border-t border-border rounded-t-2xl z-50 flex flex-col overflow-x-hidden"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0 gap-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2 min-w-0 overflow-hidden">
                  {(() => {
                    const s = getStatusStyle(proposal.status);
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0",
                          s.text,
                          s.border,
                          s.bg,
                        )}
                      >
                        <span
                          className={cn("w-1.5 h-1.5 rounded-full", s.dot)}
                        />
                        {getStatusLabel(proposal.status)}
                      </span>
                    );
                  })()}
                  <span className="text-xs font-mono text-muted-foreground truncate">
                    #{proposal.proposal_id}
                  </span>
                  {proposal.deadline_timestamp_seconds &&
                    proposal.status === "PROPOSAL_STATUS_OPEN" && (
                      <span className="text-[11px] text-[var(--nns-amber)] flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        <span className="truncate">
                          {formatTimeRemaining(
                            proposal.deadline_timestamp_seconds,
                          )}
                        </span>
                      </span>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    data-ocid="proposal.detail.toggle"
                    onClick={handleToggleFavorite}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Heart
                      className={cn(
                        "w-4 h-4",
                        isFavorited
                          ? "fill-red-400 text-red-400"
                          : "text-muted-foreground",
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    data-ocid="proposal.detail.close_button"
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <MobileContent
                proposal={proposal}
                summaryExpanded={summaryExpanded}
                setSummaryExpanded={setSummaryExpanded}
                comments={comments}
                commentsLoading={commentsLoading}
              />
            </motion.div>
          ) : (
            // Desktop: right slide-in panel
            <motion.div
              data-ocid="proposal.detail.panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={cn(
                "fixed right-0 top-0 h-[100dvh] bg-background border-l border-border z-50 flex flex-col overflow-x-hidden transition-[width] duration-300",
                expanded ? "w-[800px]" : "w-[560px]",
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0 gap-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2 min-w-0 overflow-hidden">
                  {(() => {
                    const s = getStatusStyle(proposal.status);
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0",
                          s.text,
                          s.border,
                          s.bg,
                        )}
                      >
                        <span
                          className={cn("w-1.5 h-1.5 rounded-full", s.dot)}
                        />
                        {getStatusLabel(proposal.status)}
                      </span>
                    );
                  })()}
                  <span className="text-xs font-mono text-muted-foreground truncate">
                    #{proposal.proposal_id}
                  </span>
                  {proposal.deadline_timestamp_seconds &&
                    proposal.status === "PROPOSAL_STATUS_OPEN" && (
                      <span className="text-[11px] text-[var(--nns-amber)] flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        <span className="truncate">
                          {formatTimeRemaining(
                            proposal.deadline_timestamp_seconds,
                          )}
                        </span>
                      </span>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    data-ocid="proposal.detail.toggle"
                    onClick={handleToggleFavorite}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Heart
                      className={cn(
                        "w-4 h-4",
                        isFavorited
                          ? "fill-red-400 text-red-400"
                          : "text-muted-foreground",
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    data-ocid="proposal.detail.expand_button"
                    onClick={() => setExpanded((v) => !v)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    title={expanded ? "Collapse" : "Expand"}
                  >
                    {expanded ? (
                      <Minimize2 className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    type="button"
                    data-ocid="proposal.detail.close_button"
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <MobileContent
                proposal={proposal}
                summaryExpanded={summaryExpanded}
                setSummaryExpanded={setSummaryExpanded}
                comments={comments}
                commentsLoading={commentsLoading}
              />
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

// Shared content between mobile and desktop
function MobileContent({
  proposal,
  summaryExpanded,
  setSummaryExpanded,
  comments,
  commentsLoading,
}: {
  proposal: NNSProposal;
  summaryExpanded: boolean;
  setSummaryExpanded: (fn: (v: boolean) => boolean) => void;
  comments: any[];
  commentsLoading: boolean;
}) {
  const [payloadExpanded, setPayloadExpanded] = useState(false);

  const { data: payloadRaw, isLoading: payloadLoading } = useProposalPayload(
    payloadExpanded ? proposal.proposal_id : null,
  );

  const payloadData: unknown =
    payloadRaw != null
      ? ((payloadRaw.payload as unknown) ??
        (payloadRaw.action as unknown) ??
        null)
      : null;

  const hasPayload =
    payloadData !== null &&
    payloadData !== undefined &&
    !(
      typeof payloadData === "object" &&
      Object.keys(payloadData as object).length === 0
    );

  return (
    <ScrollArea className="flex-1 scrollbar-thin">
      <div className="px-4 py-6 space-y-6 max-w-full overflow-x-hidden">
        {/* Title */}
        <h2 className="text-xl font-bold text-foreground leading-snug break-all">
          {proposal.title || `Proposal #${proposal.proposal_id}`}
        </h2>

        {/* Metadata */}
        {proposal.topic && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs text-muted-foreground max-w-full">
            <span className="font-medium text-foreground/70 shrink-0">
              Topic
            </span>
            <span className="text-foreground truncate">{proposal.topic}</span>
          </div>
        )}

        {/* NNS Links */}
        <div className="flex flex-col gap-2">
          <a
            href={`https://nns.ic0.app/proposal/?u=qoctq-giaaa-aaaaa-aaaea-cai&proposal=${proposal.proposal_id}`}
            target="_blank"
            rel="noopener noreferrer"
            data-ocid="proposal.detail.link"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View on NNS Dashboard
          </a>
          <a
            href={`https://nns.internetcomputer.org/proposal/?proposal=${proposal.proposal_id}`}
            target="_blank"
            rel="noopener noreferrer"
            data-ocid="proposal.detail.link"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View on NNS 2.0
          </a>
        </div>

        {/* Voting */}
        {proposal.latest_tally &&
          (() => {
            const t = proposal.latest_tally;
            const yes = Number(t.yes ?? (t as any).yes_count ?? 0);
            const no = Number(t.no ?? (t as any).no_count ?? 0);
            const total = Number(t.total ?? 0);
            if (total === 0) return null;
            const yesPctNum = (yes / total) * 100;
            const noPctNum = (no / total) * 100;
            const yesPct = yesPctNum.toFixed(3);
            const noPct = noPctNum.toFixed(3);
            return (
              <div className="space-y-3 p-4 rounded-xl bg-card border border-border">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Voting Results
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold mb-1 gap-2 min-w-0">
                    <span className="text-[var(--nns-teal)] min-w-0 truncate">
                      Adopt {yesPct}%
                    </span>
                    <span className="text-red-400 min-w-0 truncate">
                      Reject {noPct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--nns-teal)]"
                      style={{ width: `${yesPctNum}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground min-w-0 mt-1">
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-[10px] mb-0.5">Voting Power</span>
                      <span className="min-w-0 truncate">
                        {formatVotingPower(yes)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end min-w-0">
                      <span className="text-[10px] mb-0.5">Voting Power</span>
                      <span className="min-w-0 truncate">
                        {formatVotingPower(no)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* Summary */}
        {proposal.summary && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Summary
            </div>
            <div
              className={cn(
                "text-sm text-foreground/80 leading-relaxed break-words",
                !summaryExpanded && "line-clamp-3",
              )}
            >
              {proposal.summary}
            </div>
            {proposal.summary.length > 200 && (
              <button
                type="button"
                onClick={() => setSummaryExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {summaryExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" /> Read more
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Payload */}
        <div className="space-y-2">
          <button
            type="button"
            data-ocid="proposal.payload.toggle"
            onClick={() => setPayloadExpanded((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full"
          >
            {payloadExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            )}
            Payload
            {payloadLoading && (
              <Loader2 className="w-3 h-3 animate-spin ml-auto shrink-0" />
            )}
          </button>

          <AnimatePresence>
            {payloadExpanded && (
              <motion.div
                key="payload-content"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                {payloadLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : hasPayload ? (
                  <pre className="text-xs font-mono bg-muted p-3 rounded-xl overflow-x-auto whitespace-pre-wrap break-all">
                    {safeStringify(payloadData)}
                  </pre>
                ) : (
                  <p
                    data-ocid="proposal.payload.empty_state"
                    className="text-xs text-muted-foreground italic py-2"
                  >
                    No payload data available for this proposal.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Comments */}
        <CommentThread
          comments={comments}
          proposalId={BigInt(proposal.proposal_id)}
          isLoading={commentsLoading}
        />
      </div>
    </ScrollArea>
  );
}
