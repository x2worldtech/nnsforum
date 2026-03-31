import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Principal as PrincipalClass } from "@icp-sdk/core/principal";
import { useQueries } from "@tanstack/react-query";
import { ChevronUp, Loader2, MessageSquare, Reply } from "lucide-react";
import { useMemo, useState } from "react";
import type { UserProfile } from "../backend.d";
import type { Comment } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useAddComment, useUpvoteComment } from "../hooks/useQueries";
import { PublicProfileView } from "./PublicProfileView";

interface CommentNode {
  comment: Comment;
  children: CommentNode[];
}

function buildTree(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of comments) {
    map.set(c.id.toString(), { comment: c, children: [] });
  }

  for (const c of comments) {
    const node = map.get(c.id.toString())!;
    if (c.parentId !== undefined && c.parentId !== null) {
      const parent = map.get(c.parentId.toString());
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

function formatTimestamp(ns: bigint): string {
  const ms = Number(ns / BigInt(1_000_000));
  const date = new Date(ms);
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString();
}

function shortPrincipal(p: { toString(): string }): string {
  const s = p.toString();
  return `${s.slice(0, 5)}...${s.slice(-3)}`;
}

function AuthorAvatar({
  profile,
  principalStr,
  size = 24,
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

interface CommentNodeProps {
  node: CommentNode;
  proposalId: bigint;
  depth?: number;
  index: number;
  onAuthorClick: (principalStr: string) => void;
  profileMap: Map<string, UserProfile | null>;
}

function CommentItem({
  node,
  proposalId,
  depth = 0,
  index,
  onAuthorClick,
  profileMap,
}: CommentNodeProps) {
  const { identity, login } = useInternetIdentity();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const addComment = useAddComment(proposalId);
  const upvote = useUpvoteComment(proposalId);

  const principalStr = node.comment.author.toString();
  const profile = profileMap.get(principalStr);
  const displayName = profile?.username
    ? profile.username
    : shortPrincipal(node.comment.author);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    await addComment.mutateAsync({
      text: replyText.trim(),
      parentId: node.comment.id,
    });
    setReplyText("");
    setShowReply(false);
  };

  return (
    <div
      data-ocid={`comment.item.${index}`}
      className={cn(
        "relative",
        depth > 0 && "ml-4 pl-4 border-l border-border/60",
      )}
    >
      <div className="py-3">
        {/* Author row */}
        <div className="flex items-center gap-2 mb-1.5">
          <AuthorAvatar
            profile={profile}
            principalStr={principalStr}
            size={24}
          />
          <button
            type="button"
            data-ocid={`comment.author.button.${index}`}
            onClick={() => onAuthorClick(principalStr)}
            className="text-xs font-semibold text-foreground hover:text-primary transition-colors hover:underline cursor-pointer"
          >
            {displayName}
          </button>
          <span className="text-[11px] text-muted-foreground">
            {formatTimestamp(node.comment.createdAt)}
          </span>
        </div>

        {/* Text */}
        <p className="text-sm text-foreground/90 leading-relaxed mb-2">
          {node.comment.text}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-ocid={`comment.toggle.${index}`}
            onClick={() => {
              if (!identity) {
                login();
                return;
              }
              upvote.mutate(node.comment.id);
            }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>{Number(node.comment.upvotes)}</span>
          </button>
          {depth < 5 && (
            <button
              type="button"
              data-ocid={`comment.reply.${index}`}
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
              data-ocid="comment.textarea"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              className="text-sm resize-none bg-input border-border"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                data-ocid="comment.reply.submit_button"
                onClick={handleReply}
                disabled={addComment.isPending || !replyText.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {addComment.isPending && (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                )}
                Reply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                data-ocid="comment.reply.cancel_button"
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
        <CommentItem
          key={child.comment.id.toString()}
          node={child}
          proposalId={proposalId}
          depth={depth + 1}
          index={i + 1}
          onAuthorClick={onAuthorClick}
          profileMap={profileMap}
        />
      ))}
    </div>
  );
}

interface CommentThreadProps {
  comments: Comment[];
  proposalId: bigint;
  isLoading: boolean;
}

export function CommentThread({
  comments,
  proposalId,
  isLoading,
}: CommentThreadProps) {
  const { identity, login } = useInternetIdentity();
  const { actor } = useActor();
  const [newText, setNewText] = useState("");
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const addComment = useAddComment(proposalId);

  const tree = buildTree(comments);

  // Collect unique author principals
  const uniqueAuthors = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const c of comments) {
      const ps = c.author.toString();
      if (!seen.has(ps)) {
        seen.add(ps);
        result.push(ps);
      }
    }
    return result;
  }, [comments]);

  // Batch-load profiles for all unique authors
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

  // Build a map principal -> profile
  const profileMap = useMemo(() => {
    const map = new Map<string, UserProfile | null>();
    uniqueAuthors.forEach((ps, i) => {
      const data = profileResults[i]?.data;
      map.set(ps, data ?? null);
    });
    return map;
  }, [uniqueAuthors, profileResults]);

  const handleSubmit = async () => {
    if (!newText.trim()) return;
    await addComment.mutateAsync({ text: newText.trim() });
    setNewText("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquare className="w-4 h-4 text-primary" />
        Comments ({comments.length})
      </div>

      {/* Add comment */}
      <div
        data-ocid="comment.panel"
        className="space-y-2 p-3 rounded-lg bg-card border border-border"
      >
        {identity ? (
          <>
            <Textarea
              data-ocid="comment.input"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              className="text-sm resize-none bg-input border-border"
            />
            <Button
              size="sm"
              data-ocid="comment.submit_button"
              onClick={handleSubmit}
              disabled={addComment.isPending || !newText.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {addComment.isPending && (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              )}
              Post Comment
            </Button>
          </>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground mb-2">
              Sign in to join the discussion
            </p>
            <Button
              size="sm"
              data-ocid="comment.login.button"
              onClick={() => login()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Sign In
            </Button>
          </div>
        )}
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div
          data-ocid="comment.loading_state"
          className="flex items-center justify-center py-8 text-muted-foreground"
        >
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading comments...
        </div>
      ) : tree.length === 0 ? (
        <div
          data-ocid="comment.empty_state"
          className="text-center py-8 text-muted-foreground text-sm"
        >
          No comments yet. Be the first!
        </div>
      ) : (
        <div className="space-y-1 divide-y divide-border/40">
          {tree.map((node, i) => (
            <CommentItem
              key={node.comment.id.toString()}
              node={node}
              proposalId={proposalId}
              index={i + 1}
              onAuthorClick={(principalStr) => setViewingProfile(principalStr)}
              profileMap={profileMap}
            />
          ))}
        </div>
      )}

      {/* Public profile modal */}
      <PublicProfileView
        principalStr={viewingProfile}
        onClose={() => setViewingProfile(null)}
      />
    </div>
  );
}
