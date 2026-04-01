import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Loader2, LogIn, RefreshCw, Search } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { ICPNetworkDashboard } from "./components/ICPNetworkDashboard";
import { NetworkBackground } from "./components/NetworkBackground";
import { OpenForum } from "./components/OpenForum";
import { ProfilePage } from "./components/ProfilePage";
import { ProposalCard } from "./components/ProposalCard";
import { ProposalDetail } from "./components/ProposalDetail";
import type { Page } from "./components/TopNav";
import { TopNav } from "./components/TopNav";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useAddFavorite,
  useGetFavorites,
  useLatestProposalId,
  useNNSProposals,
  useRemoveFavorite,
} from "./hooks/useQueries";
import { ThemeProvider } from "./hooks/useTheme";
import type { NNSProposal, SortOption, StatusFilter } from "./types/nns";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PROPOSAL_STATUS_OPEN", label: "Open" },
  { value: "PROPOSAL_STATUS_ACCEPTED", label: "Adopted" },
  { value: "PROPOSAL_STATUS_REJECTED", label: "Rejected" },
  { value: "PROPOSAL_STATUS_EXECUTED", label: "Executed" },
  { value: "PROPOSAL_STATUS_FAILED", label: "Failed" },
];

function HeroSection({
  proposalCount,
  onLogin,
  isLoggingIn,
  showLoginCard,
}: {
  proposalCount: number;
  onLogin: () => void;
  isLoggingIn: boolean;
  showLoginCard: boolean;
}) {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "420px" }}
    >
      {/* Animated canvas network background */}
      <NetworkBackground />

      {/* Bottom-fade gradient overlay */}
      <div className="absolute inset-0 hero-gradient" />

      <div className="relative z-10 flex flex-col justify-end h-full pb-8 pt-20 px-5 sm:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-6"
        >
          <h1 className="text-[clamp(32px,5vw,58px)] font-extrabold text-white leading-[1.04] tracking-tight max-w-2xl">
            Build value by
            <br />
            thinking
            <br />
            together
          </h1>

          <div className="flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <div className="text-[clamp(24px,3.5vw,36px)] font-bold text-white tabular-nums">
                {proposalCount > 0
                  ? proposalCount.toLocaleString("en-US")
                  : "—"}
              </div>
              <div className="text-sm text-white/60 mt-0.5">
                Governance Proposals
              </div>
            </div>
          </div>

          {showLoginCard && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <div
                data-ocid="cta.card"
                className="bg-white rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl"
              >
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-[#111316] leading-snug">
                    Access ICP vault and voting functionality
                  </h2>
                  <p className="text-xs text-[#9AA3AD] mt-1">
                    Sign in to favorite proposals, join discussions, and
                    participate in governance.
                  </p>
                </div>
                <div className="w-full sm:w-auto flex flex-row flex-wrap items-center gap-3 flex-shrink-0">
                  <Button
                    data-ocid="cta.login.button"
                    onClick={onLogin}
                    disabled={isLoggingIn}
                    className="gap-2 bg-[#111316] hover:bg-[#1d2027] text-white font-semibold px-5 py-2.5 h-auto text-sm rounded-xl shadow-none w-auto"
                  >
                    <span className="text-lg leading-none">∞</span>
                    {isLoggingIn
                      ? "Connecting..."
                      : "Login with Internet Identity"}
                  </Button>
                  <a
                    href="https://nns.ic0.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ocid="cta.nns.link"
                    className="text-xs text-[#9AA3AD] hover:text-[#111316] transition-colors flex items-center gap-1 whitespace-nowrap"
                  >
                    <LogIn className="w-3 h-3" />
                    Open NNS
                  </a>
                  <a
                    href="https://nns.internetcomputer.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ocid="cta.nns2.link"
                    className="text-xs text-[#9AA3AD] hover:text-[#111316] transition-colors flex items-center gap-1 whitespace-nowrap"
                  >
                    <LogIn className="w-3 h-3" />
                    Open NNS 2.0
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function Dashboard() {
  const [currentPage, setCurrentPage] = useState<Page>("all");
  const [selectedProposal, setSelectedProposal] = useState<NNSProposal | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [offset, setOffset] = useState(0);
  const { identity, login, isLoggingIn } = useInternetIdentity();

  const {
    data: proposalData,
    isLoading,
    isError,
    refetch,
  } = useNNSProposals(offset, statusFilter, sortOption);
  const { data: favorites = [] } = useGetFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const favoriteSet = useMemo(
    () => new Set(favorites.map((id) => id.toString())),
    [favorites],
  );

  const handleToggleFavorite = useCallback(
    (proposalId: bigint) => {
      if (favoriteSet.has(proposalId.toString())) {
        removeFavorite.mutate(proposalId);
      } else {
        addFavorite.mutate(proposalId);
      }
    },
    [favoriteSet, addFavorite, removeFavorite],
  );

  const allProposals = proposalData?.data ?? [];
  const { data: latestProposalId } = useLatestProposalId();
  const proposalCount = latestProposalId ?? proposalData?.total ?? 0;

  const filteredProposals = useMemo(() => {
    let list = allProposals;
    if (currentPage === "favorites") {
      list = list.filter((p) => favoriteSet.has(p.proposal_id.toString()));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.summary?.toLowerCase().includes(q) ||
          String(p.proposal_id).includes(q),
      );
    }
    return list;
  }, [allProposals, currentPage, favoriteSet, search]);

  const isProposalsPage = currentPage === "all" || currentPage === "favorites";

  return (
    <div className="min-h-screen bg-background pt-14">
      <TopNav currentPage={currentPage} onNavigate={setCurrentPage} />

      {/* Profile page */}
      {currentPage === "profile" && (
        <ProfilePage onBack={() => setCurrentPage("all")} />
      )}

      {/* Open Forum page */}
      {currentPage === "forum" && (
        <OpenForum
          onSelectProposalId={() => {
            setCurrentPage("all");
          }}
        />
      )}

      {/* ICP Network Dashboard */}
      {currentPage === "dashboard" && <ICPNetworkDashboard />}

      {/* Hero section — only on All Proposals */}
      {currentPage === "all" && (
        <HeroSection
          proposalCount={proposalCount}
          onLogin={login}
          isLoggingIn={isLoggingIn}
          showLoginCard={!identity}
        />
      )}

      {currentPage === "favorites" && (
        <div className="pt-20 pb-4 px-5 sm:px-8 max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Favorites
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Proposals you've bookmarked
          </p>
        </div>
      )}

      {/* Main proposals content — only on proposals pages */}
      {isProposalsPage && (
        <main className="max-w-7xl mx-auto px-5 sm:px-8 pb-12">
          {currentPage === "all" && (
            <div className="mb-5 mt-6">
              <h2 className="text-lg font-semibold text-foreground">
                Proposals
              </h2>
            </div>
          )}

          <div className="space-y-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-ocid="proposals.search_input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search proposals by title, summary, or ID…"
                className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground h-10"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_FILTERS.map((f) => (
                <button
                  type="button"
                  key={f.value}
                  data-ocid={`proposals.filter.${f.value.toLowerCase().replace(/_/g, "-")}.tab`}
                  onClick={() => {
                    setStatusFilter(f.value);
                    setOffset(0);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    statusFilter === f.value
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}

              <div className="ml-auto">
                <Select
                  value={sortOption}
                  onValueChange={(v) => setSortOption(v as SortOption)}
                >
                  <SelectTrigger
                    data-ocid="proposals.sort.select"
                    className="w-[160px] h-8 text-xs border-border bg-card"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="most_votes">
                      Most Voting Power
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div
              data-ocid="proposals.loading_state"
              className="flex items-center justify-center py-24 text-muted-foreground"
            >
              <Loader2 className="w-5 h-5 animate-spin mr-3" />
              Loading proposals…
            </div>
          ) : isError ? (
            <div
              data-ocid="proposals.error_state"
              className="flex flex-col items-center justify-center py-24 gap-4 text-center"
            >
              <p className="text-muted-foreground">Failed to load proposals</p>
              <Button
                variant="outline"
                size="sm"
                data-ocid="proposals.retry.button"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </Button>
            </div>
          ) : filteredProposals.length === 0 ? (
            <div
              data-ocid="proposals.empty_state"
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <p className="text-muted-foreground">
                {search
                  ? "No proposals match your search"
                  : currentPage === "favorites"
                    ? "No favorites yet — star a proposal to save it here"
                    : "No proposals found"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProposals.map((proposal, i) => (
                  <ProposalCard
                    key={proposal.proposal_id}
                    proposal={proposal}
                    isFavorited={favoriteSet.has(
                      proposal.proposal_id.toString(),
                    )}
                    onToggleFavorite={handleToggleFavorite}
                    onClick={() => setSelectedProposal(proposal)}
                    onDiscuss={() => setSelectedProposal(proposal)}
                    index={i + 1}
                  />
                ))}
              </div>

              <div className="flex items-center justify-center gap-3 mt-10">
                {offset > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    data-ocid="proposals.pagination_prev"
                    onClick={() => setOffset((o) => Math.max(0, o - 20))}
                    className="border-border"
                  >
                    Previous
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  data-ocid="proposals.pagination_next"
                  onClick={() => setOffset((o) => o + 20)}
                  className="border-border"
                >
                  Load More
                </Button>
              </div>
            </>
          )}
        </main>
      )}

      <ProposalDetail
        proposal={selectedProposal}
        isFavorited={
          selectedProposal
            ? favoriteSet.has(selectedProposal.proposal_id.toString())
            : false
        }
        onClose={() => setSelectedProposal(null)}
      />

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
}
