import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Comment {
    id: bigint;
    upvotes: bigint;
    createdAt: bigint;
    text: string;
    author: Principal;
    parentId?: bigint;
    proposalId: bigint;
}
export interface SocialLinks {
    x: string;
    linkedin: string;
    telegram: string;
    github: string;
}
export interface UserProfile {
    bio: string;
    username: string;
    socialLinks: SocialLinks;
    avatar?: ExternalBlob;
}
export interface ProposalVoteCounts {
    upvotes: bigint;
    downvotes: bigint;
}
export interface ForumTopic {
    id: bigint;
    title: string;
    body: string;
    author: Principal;
    category: string;
    proposalId?: bigint;
    createdAt: bigint;
    replyCount: bigint;
    upvotes: bigint;
}
export interface ForumReply {
    id: bigint;
    topicId: bigint;
    body: string;
    author: Principal;
    parentId?: bigint;
    createdAt: bigint;
    upvotes: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(proposalId: bigint, parentId: bigint | null, text: string): Promise<bigint>;
    addFavorite(proposalId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCallerVoteOnProposal(proposalId: bigint): Promise<boolean | null>;
    getComments(proposalId: bigint): Promise<Array<Comment>>;
    getFavorites(): Promise<BigUint64Array>;
    getPrincipalByUsername(username: string): Promise<Principal | null>;
    getProfileByUsername(username: string): Promise<UserProfile | null>;
    getProposalVoteCounts(proposalId: bigint): Promise<ProposalVoteCounts>;
    getUserProfileByPrincipal(principal: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isUsernameAvailable(username: string): Promise<boolean>;
    removeFavorite(proposalId: bigint): Promise<void>;
    removeVoteFromProposal(proposalId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    upvoteComment(commentId: bigint, proposalId: bigint): Promise<void>;
    voteOnProposal(proposalId: bigint, isUpvote: boolean): Promise<void>;
    createForumTopic(title: string, body: string, category: string, proposalId: bigint | null): Promise<bigint>;
    getForumTopics(category: string | null, offset: bigint, limit: bigint): Promise<Array<ForumTopic>>;
    getForumTopicById(topicId: bigint): Promise<ForumTopic | null>;
    getForumTopicsCount(category: string | null): Promise<bigint>;
    createForumReply(topicId: bigint, body: string, parentId: bigint | null): Promise<bigint>;
    getForumReplies(topicId: bigint): Promise<Array<ForumReply>>;
    upvoteForumTopic(topicId: bigint): Promise<void>;
    upvoteForumReply(topicId: bigint, replyId: bigint): Promise<void>;
}
