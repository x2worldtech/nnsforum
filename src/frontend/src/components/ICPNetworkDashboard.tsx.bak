import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Activity, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ICPGlobe } from "./ICPGlobe";

interface NetworkStats {
  cycleBurnRate: number | null;
  transactionsPerSecond: number | null;
  ethEquivTps: number | null;
  mipsExecuted: number | null;
  totalSubnets: number | null;
  totalNodes: number | null;
  nodeProviders: number | null;
  icpTotalSupply: number | null;
  totalCanisters: number | null;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// Extracts a number from Prometheus-style vector responses:
// { status: "success", data: { result: [{ value: [ts, "1.23"] }] } }
// Also handles plain number or [timestamp, valueStr] arrays.
function extractPrometheusValue(data: unknown): number | null {
  if (data === null || data === undefined) return null;
  if (typeof data === "number") return data;

  const d = data as Record<string, unknown>;

  // Prometheus format
  const result = (d?.data as Record<string, unknown>)?.result;
  if (Array.isArray(result) && result.length > 0) {
    const first = result[0] as Record<string, unknown>;
    const value = first?.value;
    if (Array.isArray(value) && value.length >= 2) {
      const parsed = Number.parseFloat(String(value[1]));
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  // Array of [timestamp, valueStr] pairs — take last
  if (Array.isArray(data) && data.length > 0) {
    const last = data[data.length - 1];
    if (Array.isArray(last) && last.length >= 2) {
      const parsed = Number.parseFloat(String(last[1]));
      if (!Number.isNaN(parsed)) return parsed;
    }
    // Array of plain numbers — take last
    if (typeof last === "number") return last;
  }

  return null;
}

// Tries multiple field names, then falls back to counting array length.
function extractTotal(data: unknown, ...fieldNames: string[]): number | null {
  if (data === null || data === undefined) return null;
  const d = data as Record<string, unknown>;
  for (const field of fieldNames) {
    if (typeof d[field] === "number") return d[field] as number;
  }
  // Try counting arrays under known keys
  const arrayKeys = ["subnets", "nodes", "node_providers", "data", "items"];
  for (const key of arrayKeys) {
    if (Array.isArray(d[key])) return (d[key] as unknown[]).length;
  }
  if (Array.isArray(data)) return (data as unknown[]).length;
  return null;
}

// Fetch a metric from the IC API v3 path-based endpoint.
// endpointName: hyphenated path segment, e.g. "cycle-burn-rate"
// responseKey:  underscore key in the JSON response, e.g. "cycle_burn_rate"
async function fetchMetric(
  endpointName: string,
  responseKey: string,
): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(
      `https://ic-api.internetcomputer.org/api/v3/metrics/${endpointName}`,
    );
    const json = await res.json();
    // IC API v3 returns { response_key: [[timestamp, value], ...] }
    const arr = (json as Record<string, unknown>)[responseKey];
    if (Array.isArray(arr) && arr.length > 0) {
      // Flat [timestamp, value] format
      if (
        arr.length === 2 &&
        typeof arr[0] === "number" &&
        (typeof arr[1] === "number" || typeof arr[1] === "string")
      ) {
        const val = Number.parseFloat(String(arr[1]));
        if (!Number.isNaN(val)) return val;
      }
      const last = arr[arr.length - 1];
      if (Array.isArray(last) && last.length >= 2) {
        const val = Number.parseFloat(String(last[1]));
        if (!Number.isNaN(val)) return val;
      }
    }
    // fallback to existing Prometheus extractor
    return extractPrometheusValue(json);
  } catch {
    return null;
  }
}

async function fetchStats(): Promise<NetworkStats> {
  const [
    cycleBurnRateRes,
    tpsRes,
    ethTpsRes,
    mipsRes,
    subnetsRes,
    nodesRes,
    providersRes,
    supplyRes,
    canistersRes,
  ] = await Promise.allSettled([
    fetchMetric("cycle-burn-rate", "cycle_burn_rate"),
    fetchMetric("message-execution-rate", "message_execution_rate"),
    fetchMetric("eth-equivalent-txns", "eth_equivalent_txns"),
    fetchMetric("instruction-rate", "instruction_rate"),
    fetchWithTimeout("https://ic-api.internetcomputer.org/api/v3/subnets").then(
      (r) => r.json(),
    ),
    fetchWithTimeout("https://ic-api.internetcomputer.org/api/v3/nodes").then(
      (r) => r.json(),
    ),
    fetchWithTimeout(
      "https://ic-api.internetcomputer.org/api/v3/node-providers",
    ).then((r) => r.json()),
    fetchWithTimeout(
      "https://ledger-api.internetcomputer.org/supply/total/latest",
    ).then((r) => r.json()),
    fetchWithTimeout(
      "https://ic-api.internetcomputer.org/api/v3/canisters?limit=1",
    ).then((r) => r.json()),
  ]);

  const cycleBurnRate =
    cycleBurnRateRes.status === "fulfilled" ? cycleBurnRateRes.value : null;
  const transactionsPerSecond =
    tpsRes.status === "fulfilled" ? tpsRes.value : null;
  const ethEquivTps = ethTpsRes.status === "fulfilled" ? ethTpsRes.value : null;
  // instruction-rate returns raw instructions/second; divide by 1,000,000 for MIPS
  const rawMips = mipsRes.status === "fulfilled" ? mipsRes.value : null;
  const mipsExecuted = rawMips !== null ? rawMips / 1_000_000 : null;

  let totalSubnets: number | null = null;
  if (subnetsRes.status === "fulfilled") {
    totalSubnets = extractTotal(
      subnetsRes.value,
      "total",
      "total_subnets",
      "count",
    );
  }

  let totalNodes: number | null = null;
  if (nodesRes.status === "fulfilled") {
    totalNodes = extractTotal(
      nodesRes.value,
      "total",
      "total_nodes",
      "count",
      "node_count",
    );
  }

  let nodeProviders: number | null = null;
  if (providersRes.status === "fulfilled") {
    nodeProviders = extractTotal(
      providersRes.value,
      "total",
      "count",
      "node_providers_count",
    );
  }

  let icpTotalSupply: number | null = null;
  if (supplyRes.status === "fulfilled") {
    const d = supplyRes.value;
    if (Array.isArray(d) && d.length >= 2) {
      icpTotalSupply = Number.parseFloat(String(d[1]));
    } else if (typeof d === "number") {
      icpTotalSupply = d;
    } else if (typeof d === "string") {
      icpTotalSupply = Number.parseFloat(d);
    }
  }

  let totalCanisters: number | null = null;
  if (canistersRes.status === "fulfilled") {
    totalCanisters = extractTotal(
      canistersRes.value,
      "total_canisters",
      "total",
      "count",
    );
  }

  return {
    cycleBurnRate,
    transactionsPerSecond,
    ethEquivTps,
    mipsExecuted,
    totalSubnets,
    totalNodes,
    nodeProviders,
    icpTotalSupply,
    totalCanisters,
  };
}

function formatLargeNumber(n: number | null): string {
  if (n === null) return "\u2014";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

function formatTPS(n: number | null): string {
  if (n === null) return "\u2014";
  return n.toFixed(2);
}

function formatCycles(n: number | null): string {
  if (n === null) return "\u2014";
  return (n / 1e12).toFixed(3);
}

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  loading: boolean;
  index: number;
}

function StatCard({ label, value, unit, loading, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-2"
    >
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-foreground tabular-nums">
            {value}
          </span>
          {unit && (
            <span className="text-sm text-muted-foreground font-medium">
              {unit}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function ICPNetworkDashboard() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setSpinning(true);
    try {
      const data = await fetchStats();
      setStats(data);
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch (_) {
      // fail gracefully
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  useEffect(() => {
    const tick = setInterval(() => {
      if (lastUpdated)
        setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  const cards = [
    {
      label: "Cycle Burn Rate",
      value: formatCycles(stats?.cycleBurnRate ?? null),
      unit: "TCYCLES/s",
    },
    {
      label: "Transactions",
      value: formatTPS(stats?.transactionsPerSecond ?? null),
      unit: "TX/s",
    },
    {
      label: "ETH-equiv Transactions",
      value: formatTPS(stats?.ethEquivTps ?? null),
      unit: "TX/s",
    },
    {
      label: "Instructions Executed",
      value: formatTPS(stats?.mipsExecuted ?? null),
      unit: "MIPS",
    },
    {
      label: "Total Subnets",
      value:
        stats?.totalSubnets != null
          ? stats.totalSubnets.toLocaleString("en-US")
          : "\u2014",
      unit: undefined,
    },
    {
      label: "Node Machines",
      value:
        stats?.totalNodes != null
          ? stats.totalNodes.toLocaleString("en-US")
          : "\u2014",
      unit: undefined,
    },
    {
      label: "Node Providers",
      value:
        stats?.nodeProviders != null
          ? stats.nodeProviders.toLocaleString("en-US")
          : "\u2014",
      unit: undefined,
    },
    {
      label: "ICP Total Supply",
      value: formatLargeNumber(stats?.icpTotalSupply ?? null),
      unit: "ICP",
    },
    {
      label: "Total Canisters",
      value:
        stats?.totalCanisters != null
          ? formatLargeNumber(stats.totalCanisters)
          : "\u2014",
      unit: undefined,
    },
  ];

  return (
    <div
      data-ocid="dashboard.page"
      className="pt-20 pb-12 px-5 sm:px-8 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              ICP Network Dashboard
            </h1>
            <div className="flex items-center gap-1.5 bg-secondary border border-border rounded-full px-2.5 py-1">
              <span className="w-2 h-2 rounded-full bg-[var(--nns-teal)] animate-pulse" />
              <span className="text-xs font-semibold text-[var(--nns-teal)]">
                Live
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time metrics from the Internet Computer network
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Updated {secondsAgo}s ago
            </span>
          )}
          <button
            type="button"
            data-ocid="dashboard.refresh.button"
            onClick={refresh}
            disabled={spinning}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", spinning && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Globe */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <ICPGlobe />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            unit={card.unit}
            loading={loading}
            index={i}
          />
        ))}
      </div>

      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 bg-card border border-border rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[var(--nns-teal)]" />
            <span className="text-sm font-semibold text-foreground">
              Network Activity
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  Transactions/s
                </span>
                <span className="text-xs font-bold text-foreground">
                  {formatTPS(stats?.transactionsPerSecond ?? null)}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[var(--nns-teal)]"
                  initial={{ width: 0 }}
                  animate={{
                    width: stats?.transactionsPerSecond
                      ? `${Math.min((stats.transactionsPerSecond / 5000) * 100, 100)}%`
                      : "0%",
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  Cycle Burn Rate
                </span>
                <span className="text-xs font-bold text-foreground">
                  {formatCycles(stats?.cycleBurnRate ?? null)} TCYCLES/s
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[var(--nns-amber)]"
                  initial={{ width: 0 }}
                  animate={{
                    width: stats?.cycleBurnRate
                      ? `${Math.min((stats.cycleBurnRate / 1e12 / 100) * 100, 100)}%`
                      : "0%",
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  Instructions/s (M)
                </span>
                <span className="text-xs font-bold text-foreground">
                  {formatTPS(stats?.mipsExecuted ?? null)}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "oklch(0.65 0.18 290)" }}
                  initial={{ width: 0 }}
                  animate={{
                    width: stats?.mipsExecuted
                      ? `${Math.min((stats.mipsExecuted / 2000) * 100, 100)}%`
                      : "0%",
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <p className="text-xs text-muted-foreground text-center mt-8">
        Data sourced from{" "}
        <a
          href="https://dashboard.internetcomputer.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          dashboard.internetcomputer.org
        </a>{" "}
        · Auto-refreshes every 30 seconds
      </p>
    </div>
  );
}
