import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronUp,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { ForumTopic } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  fetchNNSProposals,
  useCreateForumTopic,
  useForumTopics,
  useUpvoteForumTopic,
} from "../hooks/useQueries";
import type { NNSProposal } from "../types/nns";
import { ForumTopicView } from "./ForumTopicView";

const CATEGORIES = [
  { value: "ALL", label: "All Topics" },
  { value: "General", label: "General" },
  { value: "Governance", label: "Governance" },
  { value: "Technical", label: "Technical" },
  { value: "Ecosystem", label: "Ecosystem" },
  { value: "Proposal Discussion", label: "Proposal Discussion" },
];

const TOPIC_CATEGORIES = CATEGORIES.filter((c) => c.value !== "ALL");

function getCategoryStyle(category: string): string {
  const styles: Record<string, string> = {
    General: "text-blue-400 bg-blue-500/10 border-blue-500/25",
    Governance: "text-violet-400 bg-violet-500/10 border-violet-500/25",
    Technical: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25",
    Ecosystem: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    "Proposal Discussion": "text-amber-400 bg-amber-500/10 border-amber-500/25",
  };
  return (
    styles[category] ?? "text-muted-foreground bg-secondary/50 border-border/50"
  );
}

function formatRelativeTime(ns: bigint): string {
  const ms = Number(ns / BigInt(1_000_000));
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ms).toLocaleDateString();
}

function shortPrincipal(p: { toString(): string }): string {
  const s = p.toString();
  if (s.length <= 12) return s;
  return `${s.slice(0, 5)}...${s.slice(-3)}`;
}

// ─── Topic Row ───────────────────────────────────────────────────────────────

interface TopicRowProps {
  topic: ForumTopic;
  index: number;
  onOpen: (id: bigint) => void;
}

function TopicRow({ topic, index, onOpen }: TopicRowProps) {
  const upvote = useUpvoteForumTopic();
  const { identity, login } = useInternetIdentity();

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!identity) {
      login();
      return;
    }
    upvote.mutate(topic.id);
  };

  return (
    <motion.div
      data-ocid={`forum.topic.item.${index}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      onClick={() => onOpen(topic.id)}
      className="group flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-card hover:bg-secondary/40 hover:border-border transition-all cursor-pointer"
    >
      {/* Category dot */}
      <div className="mt-1 flex-shrink-0">
        <span
          className={cn(
            "inline-block w-2.5 h-2.5 rounded-full",
            getCategoryDot(topic.category),
          )}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0 h-4 border",
              getCategoryStyle(topic.category),
            )}
          >
            {topic.category}
          </Badge>
          {topic.proposalId !== undefined && (
            <span className="text-[10px] font-mono text-muted-foreground bg-secondary/60 border border-border/40 px-1.5 py-0 rounded">
              Proposal #{topic.proposalId.toString()}
            </span>
          )}
        </div>

        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
          {topic.title}
        </h3>

        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
          <span className="font-mono">{shortPrincipal(topic.author)}</span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {Number(topic.replyCount)}
          </span>
          <span>{formatRelativeTime(topic.createdAt)}</span>
        </div>
      </div>

      {/* Upvote */}
      <button
        type="button"
        data-ocid={`forum.topic.toggle.${index}`}
        onClick={handleUpvote}
        disabled={upvote.isPending}
        className="flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
      >
        <ChevronUp className="w-4 h-4" />
        <span className="text-[10px] font-semibold tabular-nums">
          {Number(topic.upvotes)}
        </span>
      </button>
    </motion.div>
  );
}

function getCategoryDot(category: string): string {
  const dots: Record<string, string> = {
    General: "bg-blue-400",
    Governance: "bg-violet-400",
    Technical: "bg-cyan-400",
    Ecosystem: "bg-emerald-400",
    "Proposal Discussion": "bg-amber-400",
  };
  return dots[category] ?? "bg-muted-foreground";
}

// ─── Create Topic Modal ───────────────────────────────────────────────────────

interface CreateTopicModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (topicId: bigint) => void;
}

function CreateTopicModal({ open, onClose, onSuccess }: CreateTopicModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="forum.create_topic.dialog"
        className="max-w-lg bg-card border-border"
      >
        {open && <CreateTopicForm onClose={onClose} onSuccess={onSuccess} />}
      </DialogContent>
    </Dialog>
  );
}

function CreateTopicForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (topicId: bigint) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [body, setBody] = useState("");
  const [proposalSearch, setProposalSearch] = useState("");
  const [selectedProposal, setSelectedProposal] = useState<NNSProposal | null>(
    null,
  );
  const [showDropdown, setShowDropdown] = useState(false);

  const createTopic = useCreateForumTopic();

  const { data: nnsData } = useQuery({
    queryKey: ["nns-recent-for-forum"],
    queryFn: () => fetchNNSProposals(0, 30),
    staleTime: 300_000,
  });

  const filteredProposals: NNSProposal[] = proposalSearch
    ? (nnsData?.data ?? [])
        .filter(
          (p) =>
            p.title?.toLowerCase().includes(proposalSearch.toLowerCase()) ||
            String(p.proposal_id).includes(proposalSearch),
        )
        .slice(0, 6)
    : [];

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    const topicId = await createTopic.mutateAsync({
      title: title.trim(),
      body: body.trim(),
      category,
      proposalId: selectedProposal
        ? BigInt(selectedProposal.proposal_id)
        : undefined,
    });
    onSuccess(topicId);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-foreground">New Topic</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Title */}
        <div className="space-y-1.5">
          <Label
            htmlFor="topic-title"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          >
            Title
          </Label>
          <Input
            id="topic-title"
            data-ocid="forum.create_topic.input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's this discussion about?"
            className="bg-input border-border"
            maxLength={200}
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Category
          </Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              data-ocid="forum.create_topic.select"
              className="bg-input border-border"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOPIC_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <Label
            htmlFor="topic-body"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          >
            Content
          </Label>
          <Textarea
            id="topic-body"
            data-ocid="forum.create_topic.textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts, questions, or ideas…"
            rows={5}
            className="resize-none bg-input border-border text-sm"
          />
        </div>

        {/* Link to NNS Proposal */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Link to NNS Proposal{" "}
            <span className="normal-case font-normal">(optional)</span>
          </Label>

          {selectedProposal ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25">
              <span className="text-xs font-mono text-amber-400 flex-1 truncate">
                #{selectedProposal.proposal_id} — {selectedProposal.title}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedProposal(null);
                  setProposalSearch("");
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  data-ocid="forum.proposal_search.search_input"
                  value={proposalSearch}
                  onChange={(e) => {
                    setProposalSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Search by title or proposal ID…"
                  className="pl-9 bg-input border-border text-sm"
                />
              </div>
              {showDropdown && filteredProposals.length > 0 && (
                <div
                  data-ocid="forum.proposal_search.dropdown_menu"
                  className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
                >
                  {filteredProposals.map((p) => (
                    <button
                      key={p.proposal_id}
                      type="button"
                      onClick={() => {
                        setSelectedProposal(p);
                        setProposalSearch("");
                        setShowDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary transition-colors border-b border-border/40 last:border-b-0"
                    >
                      <span className="text-[10px] font-mono text-muted-foreground w-16 flex-shrink-0">
                        #{p.proposal_id}
                      </span>
                      <span className="text-xs text-foreground truncate">
                        {p.title ?? "Untitled"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button
          variant="ghost"
          data-ocid="forum.create_topic.cancel_button"
          onClick={onClose}
          disabled={createTopic.isPending}
        >
          Cancel
        </Button>
        <Button
          data-ocid="forum.create_topic.submit_button"
          onClick={handleSubmit}
          disabled={createTopic.isPending || !title.trim() || !body.trim()}
        >
          {createTopic.isPending && (
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
          )}
          Create Topic
        </Button>
      </DialogFooter>
    </>
  );
}

// ─── Main Forum Component ─────────────────────────────────────────────────────

interface OpenForumProps {
  onSelectProposalId?: (id: bigint) => void;
}

export function OpenForum({
  onSelectProposalId: _onSelectProposalId,
}: OpenForumProps) {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [offset, setOffset] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<bigint | null>(null);

  const { identity, login } = useInternetIdentity();
  const categoryFilter = selectedCategory === "ALL" ? null : selectedCategory;
  const { data: topics = [], isLoading } = useForumTopics(
    categoryFilter,
    offset,
  );

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setOffset(0);
  };

  // Show topic view if selected
  if (selectedTopicId !== null) {
    return (
      <ForumTopicView
        topicId={selectedTopicId}
        onBack={() => setSelectedTopicId(null)}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen bg-background"
    >
      {/* Top padding for fixed nav */}
      <div className="pt-14" />

      {/* Forum header */}
      <div className="border-b border-border/40">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Open Forum
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Discuss governance, proposals, and everything Internet Computer
              </p>
            </div>
            {identity ? (
              <Button
                data-ocid="forum.new_topic.primary_button"
                onClick={() => setCreateOpen(true)}
                className="flex-shrink-0 gap-2"
              >
                <Plus className="w-4 h-4" />
                New Topic
              </Button>
            ) : (
              <Button
                variant="outline"
                data-ocid="forum.signin.secondary_button"
                onClick={() => login()}
                className="flex-shrink-0 gap-1.5 text-sm"
              >
                Sign in to post
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Category sidebar — desktop */}
          <aside className="hidden md:flex flex-col gap-1 w-44 flex-shrink-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-1">
              Categories
            </p>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                data-ocid="forum.category.tab"
                onClick={() => handleCategoryChange(cat.value)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                  selectedCategory === cat.value
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                {cat.value !== "ALL" && (
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      getCategoryDot(cat.value),
                    )}
                  />
                )}
                {cat.value === "ALL" && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0 bg-muted-foreground/50" />
                )}
                {cat.label}
              </button>
            ))}
          </aside>

          {/* Category tabs — mobile */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                data-ocid="forum.category.tab"
                onClick={() => handleCategoryChange(cat.value)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  selectedCategory === cat.value
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Topic list */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div data-ocid="forum.topics.loading_state" className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-card"
                  >
                    <Skeleton className="w-2.5 h-2.5 rounded-full mt-1" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-20 rounded" />
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-40 rounded" />
                    </div>
                    <Skeleton className="w-10 h-10 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : topics.length === 0 ? (
              <div
                data-ocid="forum.topics.empty_state"
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-4" />
                <p className="text-sm font-medium text-foreground mb-1">
                  No topics yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Be the first to start a discussion!
                </p>
                {identity && (
                  <Button
                    size="sm"
                    className="mt-4 gap-2"
                    data-ocid="forum.empty.primary_button"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Topic
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {topics.map((topic, i) => (
                    <TopicRow
                      key={topic.id.toString()}
                      topic={topic}
                      index={i + 1}
                      onOpen={setSelectedTopicId}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-3 mt-8">
                  {offset > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      data-ocid="forum.topics.pagination_prev"
                      onClick={() => setOffset((o) => Math.max(0, o - 20))}
                      className="border-border"
                    >
                      Previous
                    </Button>
                  )}
                  {topics.length === 20 && (
                    <Button
                      variant="outline"
                      size="sm"
                      data-ocid="forum.topics.pagination_next"
                      onClick={() => setOffset((o) => o + 20)}
                      className="border-border"
                    >
                      Load More
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create Topic Modal */}
      <CreateTopicModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(topicId) => {
          setCreateOpen(false);
          setSelectedTopicId(topicId);
        }}
      />
    </motion.div>
  );
}
