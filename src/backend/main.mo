import Map "mo:core/Map";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Nat64 "mo:core/Nat64";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

import BlobStorage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";


actor {
  // Persistent state
  let accessControlState = AccessControl.initState();

  var nextCommentId = 0;
  var nextForumTopicId = 0;
  var nextForumReplyId = 0;

  let favorites = Map.empty<Principal, Set.Set<Nat64>>();
  let commentsByProposalId = Map.empty<Nat64, Map.Map<Nat, Comment>>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let usernamesToPrincipals = Map.empty<Text, Principal>();
  let deletedUsers = Map.empty<Principal, Bool>();

  let comments = Map.empty<Nat, Comment>();

  // Proposal votes — Map<Principal, Bool> used as a set (value is ignored)
  let proposalUpvotes = Map.empty<Nat64, Map.Map<Principal, Bool>>();
  let proposalDownvotes = Map.empty<Nat64, Map.Map<Principal, Bool>>();

  // Forum state
  let forumTopics = Map.empty<Nat, ForumTopic>();
  let forumRepliesByTopicId = Map.empty<Nat, Map.Map<Nat, ForumReply>>();

  // Types
  type Comment = {
    id : Nat;
    proposalId : Nat64;
    author : Principal;
    text : Text;
    parentId : ?Nat;
    upvotes : Nat;
    createdAt : Int;
  };

  public type SocialLinks = {
    x : Text;
    github : Text;
    linkedin : Text;
    telegram : Text;
  };

  public type UserProfile = {
    username : Text;
    bio : Text;
    avatar : ?BlobStorage.ExternalBlob;
    socialLinks : SocialLinks;
  };

  public type ForumTopic = {
    id : Nat;
    title : Text;
    body : Text;
    author : Principal;
    category : Text;
    proposalId : ?Nat64;
    createdAt : Int;
    replyCount : Nat;
    upvotes : Nat;
  };

  public type ForumReply = {
    id : Nat;
    topicId : Nat;
    body : Text;
    author : Principal;
    parentId : ?Nat;
    createdAt : Int;
    upvotes : Nat;
  };

  module Comment {
    public func compareByUpvotes(comment1 : Comment, comment2 : Comment) : Order.Order {
      Nat.compare(comment2.upvotes, comment1.upvotes);
    };

    public func compareByTimestamp(comment1 : Comment, comment2 : Comment) : Order.Order {
      Int.compare(comment2.createdAt, comment1.createdAt);
    };

    public func compare(comment1 : Comment, comment2 : Comment) : Order.Order {
      Nat.compare(comment1.id, comment2.id);
    };
  };

  // Add authorization mixin after persistent state so with-clause can add the migration function to the main actor without erasing persistent state.
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // User Profile methods
  public query func getUserProfileByPrincipal(principal : Principal) : async ?UserProfile {
    userProfiles.get(principal);
  };

  public query func getProfileByUsername(username : Text) : async ?UserProfile {
    if (username == "") {
      Runtime.trap("Username cannot be empty");
    };
    switch (usernamesToPrincipals.get(username)) {
      case (null) { null };
      case (?principal) { userProfiles.get(principal) };
    };
  };

  public query func isUsernameAvailable(username : Text) : async Bool {
    if (username == "") {
      return false;
    };
    not usernamesToPrincipals.containsKey(username);
  };

  public query func getPrincipalByUsername(username : Text) : async ?Principal {
    if (username == "") {
      return null;
    };
    usernamesToPrincipals.get(username);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    if (profile.username == "") {
      switch (userProfiles.get(caller)) {
        case (?existingProfile) {
          userProfiles.add(caller, { existingProfile with username = "" });
        };
        case (null) {
          userProfiles.add(
            caller,
            {
              profile with
              username = "";
            },
          );
        };
      };
    } else {
      switch (usernamesToPrincipals.get(profile.username)) {
        case (?existingPrincipal) {
          if (existingPrincipal != caller) {
            Runtime.trap("This username has already been claimed by a different user");
          };
        };
        case (null) {};
      };

      switch (userProfiles.get(caller)) {
        case (?existingProfile) {
          if (existingProfile.username != "" and existingProfile.username != profile.username) {
            usernamesToPrincipals.remove(existingProfile.username);
          };
        };
        case (null) {};
      };

      userProfiles.add(caller, profile);
      usernamesToPrincipals.add(profile.username, caller);
    };
  };

  // Favorites methods
  public shared ({ caller }) func addFavorite(proposalId : Nat64) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add favorites");
    };
    let userFavorites = switch (favorites.get(caller)) {
      case (?existing) { existing };
      case (null) { Set.empty<Nat64>() };
    };
    userFavorites.add(proposalId);
    favorites.add(caller, userFavorites);
  };

  public shared ({ caller }) func removeFavorite(proposalId : Nat64) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove favorites");
    };
    switch (favorites.get(caller)) {
      case (null) { () };
      case (?userFavorites) {
        userFavorites.remove(proposalId);
        if (userFavorites.isEmpty()) {
          favorites.remove(caller);
        } else {
          favorites.add(caller, userFavorites);
        };
      };
    };
  };

  public query ({ caller }) func getFavorites() : async [Nat64] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access favorites");
    };
    switch (favorites.get(caller)) {
      case (null) { [] };
      case (?userFavorites) { userFavorites.toArray() };
    };
  };

  // Comments methods
  public shared ({ caller }) func addComment(proposalId : Nat64, parentId : ?Nat, text : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add comments");
    };
    let commentId = nextCommentId;
    nextCommentId += 1;

    let comment : Comment = {
      id = commentId;
      proposalId;
      author = caller;
      text;
      parentId;
      upvotes = 0;
      createdAt = Time.now();
    };

    let proposalComments = switch (commentsByProposalId.get(proposalId)) {
      case (?existing) { existing };
      case (null) { Map.empty<Nat, Comment>() };
    };

    proposalComments.add(commentId, comment);
    commentsByProposalId.add(proposalId, proposalComments);
    commentId;
  };

  public query func getComments(proposalId : Nat64) : async [Comment] {
    switch (commentsByProposalId.get(proposalId)) {
      case (?proposalComments) { proposalComments.values().toArray().sort() };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func upvoteComment(commentId : Nat, proposalId : Nat64) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upvote comments");
    };
    switch (commentsByProposalId.get(proposalId)) {
      case (null) { Runtime.trap("Comment does not exist") };
      case (?proposalComments) {
        switch (proposalComments.get(commentId)) {
          case (null) { Runtime.trap("Comment does not exist") };
          case (?comment) {
            let updatedComment = {
              id = comment.id;
              proposalId = comment.proposalId;
              author = comment.author;
              text = comment.text;
              parentId = comment.parentId;
              upvotes = comment.upvotes + 1;
              createdAt = comment.createdAt;
            };
            proposalComments.add(commentId, updatedComment);
            commentsByProposalId.add(proposalId, proposalComments);
          };
        };
      };
    };
  };

  // Proposal vote methods
  public shared ({ caller }) func voteOnProposal(proposalId : Nat64, isUpvote : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can vote on proposals");
    };

    if (isUpvote) {
      let ups = switch (proposalUpvotes.get(proposalId)) {
        case (?existing) { existing };
        case (null) { Map.empty<Principal, Bool>() };
      };
      ups.add(caller, true);
      proposalUpvotes.add(proposalId, ups);

      switch (proposalDownvotes.get(proposalId)) {
        case (?downs) { downs.remove(caller) };
        case (null) {};
      };
    } else {
      let downs = switch (proposalDownvotes.get(proposalId)) {
        case (?existing) { existing };
        case (null) { Map.empty<Principal, Bool>() };
      };
      downs.add(caller, true);
      proposalDownvotes.add(proposalId, downs);

      switch (proposalUpvotes.get(proposalId)) {
        case (?ups) { ups.remove(caller) };
        case (null) {};
      };
    };
  };

  public shared ({ caller }) func removeVoteFromProposal(proposalId : Nat64) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove votes");
    };

    switch (proposalUpvotes.get(proposalId)) {
      case (?ups) { ups.remove(caller) };
      case (null) {};
    };

    switch (proposalDownvotes.get(proposalId)) {
      case (?downs) { downs.remove(caller) };
      case (null) {};
    };
  };

  public query func getProposalVoteCounts(proposalId : Nat64) : async { upvotes : Nat; downvotes : Nat } {
    let upvoteCount = switch (proposalUpvotes.get(proposalId)) {
      case (?ups) { ups.size() };
      case (null) { 0 };
    };
    let downvoteCount = switch (proposalDownvotes.get(proposalId)) {
      case (?downs) { downs.size() };
      case (null) { 0 };
    };
    { upvotes = upvoteCount; downvotes = downvoteCount };
  };

  public query ({ caller }) func getCallerVoteOnProposal(proposalId : Nat64) : async ?Bool {
    let isUpvoted = switch (proposalUpvotes.get(proposalId)) {
      case (?ups) { ups.containsKey(caller) };
      case (null) { false };
    };
    let isDownvoted = switch (proposalDownvotes.get(proposalId)) {
      case (?downs) { downs.containsKey(caller) };
      case (null) { false };
    };
    if (isUpvoted) { ?true } else if (isDownvoted) { ?false } else { null };
  };

  // ==================== OPEN FORUM METHODS ====================

  public shared ({ caller }) func createForumTopic(title : Text, body : Text, category : Text, proposalId : ?Nat64) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create forum topics");
    };
    if (title == "") {
      Runtime.trap("Title cannot be empty");
    };
    let topicId = nextForumTopicId;
    nextForumTopicId += 1;

    let topic : ForumTopic = {
      id = topicId;
      title;
      body;
      author = caller;
      category;
      proposalId;
      createdAt = Time.now();
      replyCount = 0;
      upvotes = 0;
    };

    forumTopics.add(topicId, topic);
    topicId;
  };

  public query func getForumTopics(category : ?Text, offset : Nat, limit : Nat) : async [ForumTopic] {
    let all = forumTopics.values().toArray();
    let filtered = switch (category) {
      case (null) { all };
      case (?cat) {
        if (cat == "") { all } else {
          Array.filter(all, func(t : ForumTopic) : Bool { t.category == cat })
        }
      };
    };
    // Sort by newest first (descending createdAt)
    let sorted = filtered.sort(func(a, b) { Int.compare(b.createdAt, a.createdAt) });
    let len = sorted.size();
    if (offset >= len) { return [] };
    let end = Nat.min(offset + limit, len);
    Array.tabulate<ForumTopic>(end - offset, func(i) { sorted[offset + i] });
  };

  public query func getForumTopicById(topicId : Nat) : async ?ForumTopic {
    forumTopics.get(topicId);
  };

  public query func getForumTopicsCount(category : ?Text) : async Nat {
    let all = forumTopics.values().toArray();
    switch (category) {
      case (null) { all.size() };
      case (?cat) {
        if (cat == "") { all.size() } else {
          Array.filter(all, func(t : ForumTopic) : Bool { t.category == cat }).size()
        }
      };
    };
  };

  public shared ({ caller }) func createForumReply(topicId : Nat, body : Text, parentId : ?Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can reply to forum topics");
    };
    if (body == "") {
      Runtime.trap("Reply body cannot be empty");
    };
    switch (forumTopics.get(topicId)) {
      case (null) { Runtime.trap("Topic does not exist") };
      case (?topic) {
        let replyId = nextForumReplyId;
        nextForumReplyId += 1;

        let reply : ForumReply = {
          id = replyId;
          topicId;
          body;
          author = caller;
          parentId;
          createdAt = Time.now();
          upvotes = 0;
        };

        let topicReplies = switch (forumRepliesByTopicId.get(topicId)) {
          case (?existing) { existing };
          case (null) { Map.empty<Nat, ForumReply>() };
        };
        topicReplies.add(replyId, reply);
        forumRepliesByTopicId.add(topicId, topicReplies);

        // Increment replyCount on topic
        forumTopics.add(topicId, { topic with replyCount = topic.replyCount + 1 });
        replyId;
      };
    };
  };

  public query func getForumReplies(topicId : Nat) : async [ForumReply] {
    switch (forumRepliesByTopicId.get(topicId)) {
      case (null) { [] };
      case (?replies) {
        replies.values().toArray().sort(func(a, b) { Nat.compare(a.id, b.id) })
      };
    };
  };

  public shared ({ caller }) func upvoteForumTopic(topicId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upvote forum topics");
    };
    switch (forumTopics.get(topicId)) {
      case (null) { Runtime.trap("Topic does not exist") };
      case (?topic) {
        forumTopics.add(topicId, { topic with upvotes = topic.upvotes + 1 });
      };
    };
  };

  public shared ({ caller }) func upvoteForumReply(topicId : Nat, replyId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upvote forum replies");
    };
    switch (forumRepliesByTopicId.get(topicId)) {
      case (null) { Runtime.trap("Reply does not exist") };
      case (?replies) {
        switch (replies.get(replyId)) {
          case (null) { Runtime.trap("Reply does not exist") };
          case (?reply) {
            replies.add(replyId, { reply with upvotes = reply.upvotes + 1 });
            forumRepliesByTopicId.add(topicId, replies);
          };
        };
      };
    };
  };
};
