import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Principal as PrincipalClass } from "@icp-sdk/core/principal";
import { useQueries } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronUp,
  Loader2,
  MessageSquare,
  Reply,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import type { ForumReply, ForumTopic, UserProfile } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateForumReply,
  useForumReplies,
  useForumTopicById,
  useUpvoteForumReply,
  useUpvoteForumTopic,
} from "../hooks/useQueries";
import { PublicProfileView } from "./PublicProfileView";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(ns: bigint): string {
  const ms = Number(ns / BigInt(1_000_000));
  const date = new Date(ms);
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString();
}

function shortPrincipal(p: { toString(): string }): string {
  const s = p.toString();
  if (s.length <= 12) return s;
  return `${s.slice(0, 5)}...${s.slice(-3)}`;
}

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

// ─── Author Avatar ────────────────────────────────────────────────────────────

function AuthorAvatar({
  profile,
  principalStr,
  size = 28,
}: {
  profile: UserProfile | null | undefined;
  principalStr: string;
  size?: number;
}) {
  const avatarUrl = profile?.avatar?.getDirectURL() ?? null;
  const initial = profile?.username
    ? profile.username[0].toUpperCase()
    : principalStr[0].toUpperCase();

  return (
    <div
      className="rounded-full overflow-hidden bg-primary/20 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={initial}
          className="w-full h-full object-cover"
        />
      ) : (
        <span
          className="font-bold text-primary"
          style={{ fontSize: size * 0.42 }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}

// ─── Reply Tree ───────────────────────────────────────────────────────────────

interface ReplyNode {
  reply: ForumReply;
  children: ReplyNode[];
}

function buildReplyTree(replies: ForumReply[]): ReplyNode[] {
  const map = new Map<string, ReplyNode>();
  const roots: ReplyNode[] = [];

  for (const r of replies) {
    map.set(r.id.toString(), { reply: r, children: [] });
  }

  for (const r of replies) {
    const node = map.get(r.id.toString());
    if (!node) continue;
    if (r.parentId !== undefined) {
      const parent = map.get(r.parentId.toString());
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ─── Reply Item ───────────────────────────────────────────────────────────────

interface ReplyItemProps {
  node: ReplyNode;
  topicId: bigint;
  depth: number;
  index: number;
  profileMap: Map<string, UserProfile | null>;
  onAuthorClick: (principalStr: string) => void;
}

function ReplyItem({
  node,
  topicId,
  depth,
  index,
  profileMap,
  onAuthorClick,
}: ReplyItemProps) {
  const { identity, login } = useInternetIdentity();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");

  const createReply = useCreateForumReply(topicId);
  const upvoteReply = useUpvoteForumReply(topicId);

  const principalStr = node.reply.author.toString();
  const profile = profileMap.get(principalStr);
  const displayName = profile?.username
    ? profile.username
    : shortPrincipal(node.reply.author);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    await createReply.mutateAsync({
      body: replyText.trim(),
      parentId: node.reply.id,
    });
    setReplyText("");
    setShowReply(false);
  };

  return (
    <div
      data-ocid={`forum.reply.item.${index}`}
      className={cn(
        "relative",
        depth > 0 && "ml-5 pl-4 border-l border-border/50",
      )}
    >
      <div className="py-3">
        {/* Nested indicator */}
        {depth > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
            <Reply className="w-3 h-3" />
            <span>Reply</span>
          </div>
        )}

        {/* Author row */}
        <div className="flex items-center gap-2 mb-2">
          <AuthorAvatar
            profile={profile}
            principalStr={principalStr}
            size={24}
          />
          <button
            type="button"
            data-ocid={`forum.reply.author.button.${index}`}
            onClick={() => onAuthorClick(principalStr)}
            className="text-xs font-semibold text-foreground hover:text-primary transition-colors hover:underline"
          >
            {displayName}
          </button>
          <span className="text-[11px] text-muted-foreground">
            {formatTimestamp(node.reply.createdAt)}
          </span>
        </div>

        {/* Body */}
        <p className="text-sm text-foreground/90 leading-relaxed mb-2 whitespace-pre-wrap">
          {node.reply.body}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-ocid={`forum.reply.toggle.${index}`}
            onClick={() => {
              if (!identity) {
                login();
                return;
              }
              upvoteReply.mutate(node.reply.id);
            }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>{Number(node.reply.upvotes)}</span>
          </button>

          {depth < 3 && (
            <button
              type="button"
              data-ocid={`forum.reply.button.${index}`}
              onClick={() => {
                if (!identity) {
                  login();
                  return;
                }
                setShowReply((v) => !v);
              }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              <Reply className="w-3.5 h-3.5" />
              Reply
            </button>
          )}
        </div>

        {/* Reply form */}
        {showReply && (
          <div className="mt-3 space-y-2">
            <Textarea
              data-ocid="forum.reply.textarea"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply…"
              rows={2}
              className="text-sm resize-none bg-input border-border"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                data-ocid="forum.reply.submit_button"
                onClick={handleReply}
                disabled={createReply.isPending || !replyText.trim()}
              >
                {createReply.isPending && (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                )}
                Reply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                data-ocid="forum.reply.cancel_button"
                onClick={() => setShowReply(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Nested children */}
      {node.children.map((child, i) => (
        <ReplyItem
          key={child.reply.id.toString()}
          node={child}
          topicId={topicId}
          depth={depth + 1}
          index={i + 1}
          profileMap={profileMap}
          onAuthorClick={onAuthorClick}
        />
      ))}
    </div>
  );
}

// ─── Forum Topic View ─────────────────────────────────────────────────────────

interface ForumTopicViewProps {
  topicId: bigint;
  onBack: () => void;
}

export function ForumTopicView({ topicId, onBack }: ForumTopicViewProps) {
  const { identity, login } = useInternetIdentity();
  const { actor } = useActor();
  const [newReplyText, setNewReplyText] = useState("");
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);

  const { data: topic, isLoading: topicLoading } = useForumTopicById(topicId);
  const { data: replies = [], isLoading: repliesLoading } =
    useForumReplies(topicId);
  const createReply = useCreateForumReply(topicId);
  const upvoteTopic = useUpvoteForumTopic();

  // Collect unique principals (topic author + reply authors)
  const uniqueAuthors = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    const addAuthor = (ps: string) => {
      if (!seen.has(ps)) {
        seen.add(ps);
        result.push(ps);
      }
    };
    if (topic) addAuthor(topic.author.toString());
    for (const r of replies) addAuthor(r.author.toString());
    return result;
  }, [topic, replies]);

  // Batch-load profiles
  const profileResults = useQueries({
    queries: uniqueAuthors.map((ps) => ({
      queryKey: ["publicProfile", ps],
      queryFn: async (): Promise<UserProfile | null> => {
        if (!actor) return null;
        try {
          const principal = PrincipalClass.fromText(ps);
          return await actor.getUserProfileByPrincipal(principal);
        } catch {
          return null;
        }
      },
      enabled: !!actor && !!ps,
      staleTime: 300_000,
    })),
  });

  const profileMap = useMemo(() => {
    const map = new Map<string, UserProfile | null>();
    uniqueAuthors.forEach((ps, i) => {
      map.set(ps, profileResults[i]?.data ?? null);
    });
    return map;
  }, [uniqueAuthors, profileResults]);

  const replyTree = useMemo(() => buildReplyTree(replies), [replies]);

  const handleSubmitReply = async () => {
    if (!newReplyText.trim()) return;
    await createReply.mutateAsync({ body: newReplyText.trim() });
    setNewReplyText("");
  };

  const topicAuthorPrincipal = topic?.author.toString() ?? "";
  const topicAuthorProfile = profileMap.get(topicAuthorPrincipal);
  const topicAuthorName = topicAuthorProfile?.username
    ? topicAuthorProfile.username
    : topicAuthorPrincipal
      ? shortPrincipal({ toString: () => topicAuthorPrincipal })
      : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen bg-background"
    >
      <div className="pt-14" />

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-6">
        {/* Back button */}
        <button
          type="button"
          data-ocid="forum.topic.back.button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Forum
        </button>

        {topicLoading ? (
          <div data-ocid="forum.topic.loading_state" className="space-y-4">
            <Skeleton className="h-8 w-3/4 rounded-xl" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-5 w-32 rounded" />
            </div>
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : !topic ? (
          <div
            data-ocid="forum.topic.error_state"
            className="text-center py-20"
          >
            <p className="text-muted-foreground">Topic not found.</p>
            <Button variant="ghost" onClick={onBack} className="mt-4">
              Back to Forum
            </Button>
          </div>
        ) : (
          <>
            {/* Topic header */}
            <div className="mb-6">
              {/* Meta badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={cn(
                    "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    getCategoryStyle(topic.category),
                  )}
                >
                  {topic.category}
                </span>
                {topic.proposalId !== undefined && (
                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary/60 border border-border/40 px-2 py-0.5 rounded-full">
                    Proposal #{topic.proposalId.toString()}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-snug mb-4">
                {topic.title}
              </h1>

              {/* Author + upvote row */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <AuthorAvatar
                    profile={topicAuthorProfile}
                    principalStr={topicAuthorPrincipal}
                    size={28}
                  />
                  <button
                    type="button"
                    data-ocid="forum.topic.author.button"
                    onClick={() =>
                      topicAuthorPrincipal &&
                      setViewingProfile(topicAuthorPrincipal)
                    }
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors hover:underline"
                  >
                    {topicAuthorName}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(topic.createdAt)}
                  </span>
                </div>

                <button
                  type="button"
                  data-ocid="forum.topic.toggle"
                  onClick={() => {
                    if (!identity) {
                      login();
                      return;
                    }
                    upvoteTopic.mutate(topicId);
                  }}
                  disabled={upvoteTopic.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span className="font-semibold tabular-nums">
                    {Number(topic.upvotes)}
                  </span>
                </button>
              </div>
            </div>

            {/* Topic body */}
            <div className="p-5 rounded-xl bg-card border border-border mb-8">
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {topic.body}
              </p>
            </div>

            {/* Replies section */}
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Replies ({repliesLoading ? "…" : replies.length})
              </span>
            </div>

            {/* New reply input */}
            <div
              data-ocid="forum.reply.panel"
              className="mb-6 p-4 rounded-xl bg-card border border-border"
            >
              {identity ? (
                <div className="space-y-3">
                  <Textarea
                    data-ocid="forum.reply.input"
                    value={newReplyText}
                    onChange={(e) => setNewReplyText(e.target.value)}
                    placeholder="Share your thoughts on this topic…"
                    rows={3}
                    className="text-sm resize-none bg-input border-border"
                  />
                  <Button
                    size="sm"
                    data-ocid="forum.reply.submit_button"
                    onClick={handleSubmitReply}
                    disabled={createReply.isPending || !newReplyText.trim()}
                  >
                    {createReply.isPending && (
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    )}
                    Post Reply
                  </Button>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground mb-3">
                    Sign in to join the discussion
                  </p>
                  <Button
                    size="sm"
                    data-ocid="forum.reply.login.button"
                    onClick={() => login()}
                  >
                    Sign In
                  </Button>
                </div>
              )}
            </div>

            {/* Reply list */}
            {repliesLoading ? (
              <div
                data-ocid="forum.replies.loading_state"
                className="flex items-center justify-center py-10 text-muted-foreground"
              >
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading replies…
              </div>
            ) : replyTree.length === 0 ? (
              <div
                data-ocid="forum.replies.empty_state"
                className="text-center py-10 text-muted-foreground text-sm"
              >
                No replies yet. Be the first to reply!
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-border/40">
                {replyTree.map((node, i) => (
                  <ReplyItem
                    key={node.reply.id.toString()}
                    node={node}
                    topicId={topicId}
                    depth={0}
                    index={i + 1}
                    profileMap={profileMap}
                    onAuthorClick={setViewingProfile}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Public profile modal */}
      <PublicProfileView
        principalStr={viewingProfile}
        onClose={() => setViewingProfile(null)}
      />
    </motion.div>
  );
}
