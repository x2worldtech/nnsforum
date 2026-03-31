import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Github, Linkedin, Send, User } from "lucide-react";
import { useIsMobile } from "../hooks/use-mobile";
import { useGetPublicProfile } from "../hooks/useQueries";

interface PublicProfileViewProps {
  principalStr: string | null;
  onClose: () => void;
}

function truncatePrincipal(p: string): string {
  if (p.length <= 12) return p;
  return `${p.slice(0, 5)}...${p.slice(-3)}`;
}

function SocialLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-xs font-medium border border-border/40 hover:border-border"
    >
      {icon}
      <span>{label}</span>
      <ExternalLink className="w-3 h-3 opacity-60" />
    </a>
  );
}

function ProfileContent({
  principalStr,
}: {
  principalStr: string;
}) {
  const { data: profile, isLoading } = useGetPublicProfile(principalStr);

  const displayName = profile?.username
    ? profile.username
    : truncatePrincipal(principalStr);
  const avatarUrl = profile?.avatar?.getDirectURL() ?? null;
  const avatarInitial = (profile?.username ?? "?")[0].toUpperCase();

  if (isLoading) {
    return (
      <div data-ocid="public-profile.loading_state" className="space-y-4 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        data-ocid="public-profile.empty_state"
        className="flex flex-col items-center justify-center py-10 gap-3 text-center p-6"
      >
        <div className="w-16 h-16 rounded-full bg-secondary/60 flex items-center justify-center">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            This profile is empty
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
            {principalStr}
          </p>
        </div>
      </div>
    );
  }

  const hasAnySocialLink =
    profile.socialLinks?.x ||
    profile.socialLinks?.github ||
    profile.socialLinks?.linkedin ||
    profile.socialLinks?.telegram;

  return (
    <div className="p-6 space-y-5">
      {/* Avatar + Name */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary/60 border-2 border-border flex-shrink-0 flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-foreground/70">
              {avatarInitial}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground truncate">
            {displayName}
          </h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5 break-all">
            {truncatePrincipal(principalStr)}
          </p>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {profile.bio}
        </p>
      )}

      {/* Social Links */}
      {hasAnySocialLink && (
        <div className="flex flex-wrap gap-2">
          {profile.socialLinks?.x && (
            <SocialLink
              href={profile.socialLinks.x}
              icon={<span className="text-xs font-bold leading-none">𝕏</span>}
              label="X"
            />
          )}
          {profile.socialLinks?.github && (
            <SocialLink
              href={profile.socialLinks.github}
              icon={<Github className="w-3.5 h-3.5" />}
              label="GitHub"
            />
          )}
          {profile.socialLinks?.linkedin && (
            <SocialLink
              href={profile.socialLinks.linkedin}
              icon={<Linkedin className="w-3.5 h-3.5" />}
              label="LinkedIn"
            />
          )}
          {profile.socialLinks?.telegram && (
            <SocialLink
              href={profile.socialLinks.telegram}
              icon={<Send className="w-3.5 h-3.5" />}
              label="Telegram"
            />
          )}
        </div>
      )}
    </div>
  );
}

export function PublicProfileView({
  principalStr,
  onClose,
}: PublicProfileViewProps) {
  const isMobile = useIsMobile();
  const isOpen = !!principalStr;

  const handleChange = (open: boolean) => {
    if (!open) onClose();
  };

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={handleChange}>
        <SheetContent
          side="bottom"
          data-ocid="public-profile.sheet"
          className="rounded-t-2xl pb-8 bg-card border-border max-h-[85vh] overflow-y-auto"
        >
          {principalStr && <ProfileContent principalStr={principalStr} />}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleChange}>
      <DialogContent
        data-ocid="public-profile.dialog"
        className="max-w-sm bg-card border-border p-0 overflow-hidden"
      >
        {principalStr && <ProfileContent principalStr={principalStr} />}
      </DialogContent>
    </Dialog>
  );
}
