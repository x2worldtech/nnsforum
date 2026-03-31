import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Heart,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useTheme } from "../hooks/useTheme";

export type Page = "all" | "favorites" | "profile";

interface TopNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function TopNav({ currentPage, onNavigate }: TopNavProps) {
  const { identity, login, clear, isLoggingIn } = useInternetIdentity();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoggedIn = !!identity;
  const principal = identity?.getPrincipal().toString();
  const shortPrincipal = principal
    ? `${principal.slice(0, 5)}...${principal.slice(-3)}`
    : null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 h-14 flex items-center px-5 sm:px-8">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border/40" />

        <div className="relative z-10 flex items-center justify-between w-full max-w-7xl mx-auto">
          {/* Brand */}
          <button
            type="button"
            data-ocid="nav.home.link"
            onClick={() => onNavigate("all")}
            className="flex items-center gap-2.5 group"
          >
            <span className="text-2xl font-bold text-foreground leading-none select-none">
              ∞
            </span>
            <span className="text-sm font-semibold text-foreground tracking-tight hidden sm:block">
              Network Nervous System
            </span>
            <span className="text-sm font-semibold text-foreground tracking-tight sm:hidden">
              NNS
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              type="button"
              data-ocid="nav.all.link"
              onClick={() => onNavigate("all")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                currentPage === "all"
                  ? "text-foreground bg-secondary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              All Proposals
            </button>
            <button
              type="button"
              data-ocid="nav.favorites.link"
              onClick={() => onNavigate("favorites")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                currentPage === "favorites"
                  ? "text-foreground bg-secondary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              )}
            >
              <Heart className="w-3.5 h-3.5" />
              Favorites
            </button>
            {isLoggedIn && (
              <button
                type="button"
                data-ocid="nav.profile.link"
                onClick={() => onNavigate("profile")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  currentPage === "profile"
                    ? "text-foreground bg-secondary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                <User className="w-3.5 h-3.5" />
                Profil
              </button>
            )}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/80 px-2.5 py-1 rounded-full border border-border/60">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--nns-teal)] inline-block" />
                {shortPrincipal}
              </span>
            )}

            {/* Theme toggle */}
            <button
              type="button"
              data-ocid="topbar.toggle"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* Auth button (desktop) */}
            {isLoggedIn ? (
              <Button
                variant="ghost"
                size="sm"
                data-ocid="nav.logout.button"
                onClick={() => clear()}
                className="hidden md:flex gap-1.5 text-muted-foreground hover:text-destructive h-8 px-3 text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </Button>
            ) : (
              <Button
                size="sm"
                data-ocid="nav.login.button"
                onClick={() => login()}
                disabled={isLoggingIn}
                className="hidden md:flex gap-1.5 h-8 px-3 text-xs font-semibold"
              >
                <span className="text-base leading-none">∞</span>
                {isLoggingIn ? "Connecting..." : "Sign In"}
              </Button>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              data-ocid="nav.menu.button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border rounded-t-2xl p-5 pb-8"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-foreground">∞</span>
                  <span className="text-sm font-semibold text-foreground">
                    NNS Dashboard
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 mb-4">
                <button
                  type="button"
                  data-ocid="nav.all.link"
                  onClick={() => {
                    onNavigate("all");
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                    currentPage === "all"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                  All Proposals
                </button>
                <button
                  type="button"
                  data-ocid="nav.favorites.link"
                  onClick={() => {
                    onNavigate("favorites");
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                    currentPage === "favorites"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <Heart className="w-4 h-4" />
                  Favorites
                </button>
                {isLoggedIn && (
                  <button
                    type="button"
                    data-ocid="nav.profile.link"
                    onClick={() => {
                      onNavigate("profile");
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                      currentPage === "profile"
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    )}
                  >
                    <User className="w-4 h-4" />
                    Profil
                  </button>
                )}
              </div>

              <div className="border-t border-border pt-4">
                {isLoggedIn ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-secondary/60 rounded-xl">
                      <span className="w-2 h-2 rounded-full bg-[var(--nns-teal)]" />
                      <span className="text-xs text-muted-foreground">
                        {shortPrincipal}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-ocid="nav.logout.button"
                      onClick={() => {
                        clear();
                        setMobileOpen(false);
                      }}
                      className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    data-ocid="nav.login.button"
                    onClick={() => {
                      login();
                      setMobileOpen(false);
                    }}
                    disabled={isLoggingIn}
                    className="w-full gap-2 font-semibold"
                  >
                    <span className="text-base leading-none">∞</span>
                    {isLoggingIn
                      ? "Connecting..."
                      : "Sign In with Internet Identity"}
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
