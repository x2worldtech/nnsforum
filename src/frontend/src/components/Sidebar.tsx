import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Heart, LayoutGrid, LogIn, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

type Page = "all" | "favorites";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { identity, login, clear, isLoggingIn } = useInternetIdentity();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoggedIn = !!identity;
  const principal = identity?.getPrincipal().toString();
  const shortPrincipal = principal
    ? `${principal.slice(0, 5)}...${principal.slice(-3)}`
    : null;

  const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
    {
      page: "all",
      label: "All Proposals",
      icon: <LayoutGrid className="w-4 h-4" />,
    },
    {
      page: "favorites",
      label: "Favorites",
      icon: <Heart className="w-4 h-4" />,
    },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground text-xs font-bold">ICP</span>
        </div>
        <div>
          <div className="text-sidebar-foreground font-bold text-sm tracking-widest uppercase">
            NNS
          </div>
          <div className="text-muted-foreground text-[10px] tracking-wider uppercase">
            Proposals
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            type="button"
            key={item.page}
            data-ocid={`nav.${item.page}.link`}
            onClick={() => {
              onNavigate(item.page);
              setMobileOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              currentPage === item.page
                ? "bg-primary/15 text-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        {isLoggedIn ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary text-[10px] font-bold">ID</span>
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {shortPrincipal}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              data-ocid="nav.logout.button"
              onClick={() => clear()}
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
            onClick={() => login()}
            disabled={isLoggingIn}
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <LogIn className="w-4 h-4" />
            {isLoggingIn ? "Connecting..." : "Sign In"}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 h-screen fixed left-0 top-0 bg-sidebar border-r border-sidebar-border z-30">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        type="button"
        data-ocid="nav.menu.button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-sidebar border border-sidebar-border text-sidebar-foreground"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close menu"
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border z-50 transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent />
      </aside>
    </>
  );
}
