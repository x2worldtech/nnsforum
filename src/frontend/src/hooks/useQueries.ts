import type { Principal } from "@icp-sdk/core/principal";
import { Principal as PrincipalClass } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserProfile } from "../backend";
import type { Comment, ForumReply, ForumTopic } from "../backend.d";
import type { NNSProposalsResponse } from "../types/nns";
import type { SortOption, StatusFilter } from "../types/nns";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

const NNS_API = "https://ic-api.internetcomputer.org/api/v3/proposals";

export async function fetchNNSProposals(
  offset = 0,
  limit = 20,
  status?: StatusFilter,
): Promise<NNSProposalsResponse> {
  const url = new URL(NNS_API);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (status && status !== "ALL") {
    url.searchParams.set("include_status", status);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch proposals");
  return res.json();
}

export function useNNSProposals(
  offset: number,
  status: StatusFilter,
  sortOption: SortOption,
) {
  return useQuery({
    queryKey: ["nns-proposals", offset, status],
    queryFn: () => fetchNNSProposals(offset, 20, status),
    staleTime: 60_000,
    select: (data) => {
      const proposals = [...data.data];
      if (sortOption === "oldest") proposals.reverse();
      else if (sortOption === "most_votes") {
        proposals.sort((a, b) => {
          const aTotal = Number(a.latest_tally?.total ?? 0);
          const bTotal = Number(b.latest_tally?.total ?? 0);
          return bTotal - aTotal;
        });
      }
      return { ...data, data: proposals };
    },
  });
}

export function useNNSNeurons() {
  return useQuery({
    queryKey: ["nns-neurons"],
    queryFn: async () => {
      const res = await fetch(
        "https://ic-api.internetcomputer.org/api/v3/neurons/list?limit=1",
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.total as number;
    },
    refetchInterval: 30_000,
    staleTime: 30_000,
  });
}

export function useLatestProposalId() {
  return useQuery({
    queryKey: ["nns-latest-proposal"],
    queryFn: async () => {
      const res = await fetch(
        "https://ic-api.internetcomputer.org/api/v3/proposals?limit=1",
      );
      if (!res.ok) throw new Error("Failed to fetch latest proposal");
      const data = await res.json();
      const latest = data?.data?.[0];
      return latest ? (latest.proposal_id as number) : 0;
    },
    refetchInterval: 30_000,
    staleTime: 30_000,
  });
}

export function useProposalPayload(proposalId: number | null) {
  return useQuery({
    queryKey: ["nns-proposal-detail", proposalId],
    queryFn: async () => {
      const res = await fetch(
        `https://ic-api.internetcomputer.org/api/v3/proposals/${proposalId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch proposal detail");
      const data = await res.json();
      return data as Record<string, unknown>;
    },
    enabled: proposalId !== null,
    staleTime: 300_000,
  });
}

export function useGetFavorites() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      if (!actor) return [] as bigint[];
      const arr = await actor.getFavorites();
      return Array.from(arr).map(BigInt);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddFavorite() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proposalId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.addFavorite(proposalId);
    },
    onMutate: async (proposalId: bigint) => {
      await qc.cancelQueries({ queryKey: ["favorites"] });
      const previous = qc.getQueryData<bigint[]>(["favorites"]);
      qc.setQueryData<bigint[]>(["favorites"], (old) => {
        const current = old ?? [];
        if (current.some((id) => id === proposalId)) return current;
        return [...current, proposalId];
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(["favorites"], context.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });
}

export function useRemoveFavorite() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proposalId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.removeFavorite(proposalId);
    },
    onMutate: async (proposalId: bigint) => {
      await qc.cancelQueries({ queryKey: ["favorites"] });
      const previous = qc.getQueryData<bigint[]>(["favorites"]);
      qc.setQueryData<bigint[]>(["favorites"], (old) => {
        return (old ?? []).filter((id) => id !== proposalId);
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(["favorites"], context.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });
}

export function useGetComments(proposalId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Comment[]>({
    queryKey: ["comments", proposalId?.toString()],
    queryFn: async () => {
      if (!actor || proposalId === null) return [];
      return actor.getComments(proposalId);
    },
    enabled: !!actor && !isFetching && proposalId !== null,
  });
}

export function useAddComment(proposalId: bigint | null) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const qc = useQueryClient();
  const queryKey = ["comments", proposalId?.toString()];

  return useMutation({
    mutationFn: async ({
      text,
      parentId,
    }: { text: string; parentId?: bigint }) => {
      if (!actor || proposalId === null) throw new Error("Not ready");
      return actor.addComment(proposalId, parentId ?? null, text);
    },
    onMutate: async ({
      text,
      parentId,
    }: { text: string; parentId?: bigint }) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<Comment[]>(queryKey);

      const fakeAuthor =
        identity?.getPrincipal() ?? ({ toString: () => "you" } as any);
      const fakeComment: Comment = {
        id: BigInt(-Date.now()),
        text,
        author: fakeAuthor,
        createdAt: BigInt(Date.now()) * BigInt(1_000_000),
        upvotes: BigInt(0),
        parentId: parentId ?? undefined,
        proposalId: proposalId ?? BigInt(0),
      };

      qc.setQueryData<Comment[]>(queryKey, (old) => [
        fakeComment,
        ...(old ?? []),
      ]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });
}

export function useUpvoteComment(proposalId: bigint | null) {
  const { actor } = useActor();
  const qc = useQueryClient();
  const queryKey = ["comments", proposalId?.toString()];

  return useMutation({
    mutationFn: async (commentId: bigint) => {
      if (!actor || proposalId === null) throw new Error("Not ready");
      await actor.upvoteComment(commentId, proposalId);
    },
    onMutate: async (commentId: bigint) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<Comment[]>(queryKey);
      qc.setQueryData<Comment[]>(queryKey, (old) =>
        (old ?? []).map((c) =>
          c.id === commentId ? { ...c, upvotes: c.upvotes + BigInt(1) } : c,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });
}

// ─── Profile Hooks ───────────────────────────────────────────────────────────

export function useGetCallerProfile() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<UserProfile | null>({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetPublicProfile(principalStr: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["publicProfile", principalStr],
    queryFn: async () => {
      if (!actor || !principalStr) return null;
      const principal = PrincipalClass.fromText(principalStr);
      return actor.getUserProfileByPrincipal(principal);
    },
    enabled: !!actor && !isFetching && !!principalStr,
  });
}

export function useCheckUsernameAvailable(username: string) {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["usernameAvailable", username],
    queryFn: async () => {
      if (!actor || !username) return true;
      return actor.isUsernameAvailable(username);
    },
    enabled: !!actor && !isFetching && username.length >= 3,
    staleTime: 10_000,
  });
}

export function useSaveCallerProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["callerProfile"] });
      qc.invalidateQueries({ queryKey: ["publicProfile"] });
      qc.invalidateQueries({ queryKey: ["usernameAvailable"] });
    },
  });
}

// ─── Proposal Vote Hooks ─────────────────────────────────────────────────────

// The vote methods exist in backend.d.ts but the generated backend.ts wrapper
// hasn't been regenerated yet. We cast to `any` to call them at runtime.

export function useProposalVoteCounts(proposalId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<{ upvotes: bigint; downvotes: bigint }>({
    queryKey: ["proposalVotes", proposalId?.toString()],
    queryFn: async () => {
      if (!actor || proposalId === null)
        return { upvotes: BigInt(0), downvotes: BigInt(0) };
      return actor.getProposalVoteCounts(proposalId);
    },
    enabled: !!actor && !isFetching && proposalId !== null,
    staleTime: 30_000,
  });
}

export function useCallerVote(proposalId: bigint | null) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<boolean | null>({
    queryKey: ["callerVote", proposalId?.toString()],
    queryFn: async () => {
      if (!actor || proposalId === null) return null;
      return actor.getCallerVoteOnProposal(proposalId);
    },
    enabled: !!actor && !isFetching && proposalId !== null && !!identity,
  });
}

export function useVoteOnProposal(proposalId: bigint | null) {
  const { actor } = useActor();
  const qc = useQueryClient();
  const votesKey = ["proposalVotes", proposalId?.toString()];
  const callerVoteKey = ["callerVote", proposalId?.toString()];

  return useMutation({
    mutationFn: async ({
      isUpvote,
      remove,
    }: { isUpvote: boolean; remove: boolean }) => {
      if (!actor || proposalId === null) throw new Error("Not ready");
      if (remove) {
        await actor.removeVoteFromProposal(proposalId);
      } else {
        await actor.voteOnProposal(proposalId, isUpvote);
      }
    },
    onMutate: async ({
      isUpvote,
      remove,
    }: { isUpvote: boolean; remove: boolean }) => {
      await qc.cancelQueries({ queryKey: votesKey });
      await qc.cancelQueries({ queryKey: callerVoteKey });

      const previousVotes = qc.getQueryData<{
        upvotes: bigint;
        downvotes: bigint;
      }>(votesKey);
      const previousCallerVote = qc.getQueryData<boolean | null>(callerVoteKey);

      const currentVotes = previousVotes ?? {
        upvotes: BigInt(0),
        downvotes: BigInt(0),
      };
      let newUpvotes = currentVotes.upvotes;
      let newDownvotes = currentVotes.downvotes;

      if (remove) {
        if (previousCallerVote === true)
          newUpvotes =
            newUpvotes > BigInt(0) ? newUpvotes - BigInt(1) : BigInt(0);
        if (previousCallerVote === false)
          newDownvotes =
            newDownvotes > BigInt(0) ? newDownvotes - BigInt(1) : BigInt(0);
        qc.setQueryData(callerVoteKey, null);
      } else {
        if (isUpvote) {
          newUpvotes = newUpvotes + BigInt(1);
          if (previousCallerVote === false)
            newDownvotes =
              newDownvotes > BigInt(0) ? newDownvotes - BigInt(1) : BigInt(0);
        } else {
          newDownvotes = newDownvotes + BigInt(1);
          if (previousCallerVote === true)
            newUpvotes =
              newUpvotes > BigInt(0) ? newUpvotes - BigInt(1) : BigInt(0);
        }
        qc.setQueryData(callerVoteKey, isUpvote);
      }

      qc.setQueryData(votesKey, {
        upvotes: newUpvotes,
        downvotes: newDownvotes,
      });
      return { previousVotes, previousCallerVote };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousVotes !== undefined)
        qc.setQueryData(votesKey, context.previousVotes);
      if (context?.previousCallerVote !== undefined)
        qc.setQueryData(callerVoteKey, context.previousCallerVote);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: votesKey });
      qc.invalidateQueries({ queryKey: callerVoteKey });
    },
  });
}

// ─── Forum Hooks ─────────────────────────────────────────────────────────────

export function useForumTopics(category: string | null, offset: number) {
  const { actor, isFetching } = useActor();
  return useQuery<ForumTopic[]>({
    queryKey: ["forumTopics", category, offset],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getForumTopics(category, BigInt(offset), BigInt(20));
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useForumTopicById(topicId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<ForumTopic | null>({
    queryKey: ["forumTopic", topicId?.toString()],
    queryFn: async () => {
      if (!actor || topicId === null) return null;
      return actor.getForumTopicById(topicId);
    },
    enabled: !!actor && !isFetching && topicId !== null,
  });
}

export function useForumReplies(topicId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<ForumReply[]>({
    queryKey: ["forumReplies", topicId?.toString()],
    queryFn: async () => {
      if (!actor || topicId === null) return [];
      return actor.getForumReplies(topicId);
    },
    enabled: !!actor && !isFetching && topicId !== null,
    staleTime: 30_000,
  });
}

export function useCreateForumTopic() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      body,
      category,
      proposalId,
    }: {
      title: string;
      body: string;
      category: string;
      proposalId?: bigint;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.createForumTopic(title, body, category, proposalId ?? null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forumTopics"] });
    },
  });
}

export function useCreateForumReply(topicId: bigint | null) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const qc = useQueryClient();
  const queryKey = ["forumReplies", topicId?.toString()];
  return useMutation({
    mutationFn: async ({
      body,
      parentId,
    }: { body: string; parentId?: bigint }) => {
      if (!actor || topicId === null) throw new Error("Not ready");
      return actor.createForumReply(topicId, body, parentId ?? null);
    },
    onMutate: async ({
      body,
      parentId,
    }: { body: string; parentId?: bigint }) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<ForumReply[]>(queryKey);
      const fakeAuthor =
        identity?.getPrincipal() ?? ({ toString: () => "you" } as any);
      const fakeReply: ForumReply = {
        id: BigInt(-Date.now()),
        topicId: topicId ?? BigInt(0),
        body,
        author: fakeAuthor,
        parentId: parentId ?? undefined,
        createdAt: BigInt(Date.now()) * BigInt(1_000_000),
        upvotes: BigInt(0),
      };
      qc.setQueryData<ForumReply[]>(queryKey, (old) => [
        ...(old ?? []),
        fakeReply,
      ]);
      return { previous };
    },
    onError: (
      _err,
      _vars,
      context: { previous?: ForumReply[] } | undefined,
    ) => {
      if (context?.previous !== undefined)
        qc.setQueryData(queryKey, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });
}

export function useUpvoteForumTopic() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (topicId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.upvoteForumTopic(topicId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forumTopics"] });
      qc.invalidateQueries({ queryKey: ["forumTopic"] });
    },
  });
}

export function useUpvoteForumReply(topicId: bigint | null) {
  const { actor } = useActor();
  const qc = useQueryClient();
  const queryKey = ["forumReplies", topicId?.toString()];
  return useMutation({
    mutationFn: async (replyId: bigint) => {
      if (!actor || topicId === null) throw new Error("Not ready");
      await actor.upvoteForumReply(topicId, replyId);
    },
    onMutate: async (replyId: bigint) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<ForumReply[]>(queryKey);
      qc.setQueryData<ForumReply[]>(queryKey, (old) =>
        (old ?? []).map((r) =>
          r.id === replyId ? { ...r, upvotes: r.upvotes + BigInt(1) } : r,
        ),
      );
      return { previous };
    },
    onError: (
      _err,
      _vars,
      context: { previous?: ForumReply[] } | undefined,
    ) => {
      if (context?.previous !== undefined)
        qc.setQueryData(queryKey, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });
}

// Re-export Principal for convenience
export type { Principal };
