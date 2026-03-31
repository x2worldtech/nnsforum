import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Github,
  Linkedin,
  Loader2,
  Send,
  User,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import type { SocialLinks, UserProfile } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCheckUsernameAvailable,
  useGetCallerProfile,
  useSaveCallerProfile,
} from "../hooks/useQueries";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

interface ProfilePageProps {
  onBack: () => void;
}

function UsernameStatus({
  isChecking,
  isAvailable,
}: {
  isChecking: boolean;
  isAvailable: boolean | undefined;
}) {
  if (isChecking) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Prüfen…
      </span>
    );
  }
  if (isAvailable === true) {
    return (
      <span
        data-ocid="profile.username.success_state"
        className="flex items-center gap-1 text-xs text-emerald-400"
      >
        <CheckCircle2 className="w-3 h-3" />
        Verfügbar
      </span>
    );
  }
  if (isAvailable === false) {
    return (
      <span
        data-ocid="profile.username.error_state"
        className="flex items-center gap-1 text-xs text-destructive"
      >
        <XCircle className="w-3 h-3" />
        Vergeben
      </span>
    );
  }
  return null;
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { identity, login } = useInternetIdentity();
  const isLoggedIn = !!identity;

  const { data: profileData, isLoading: isLoadingProfile } =
    useGetCallerProfile();
  const saveProfile = useSaveCallerProfile();

  // Form state
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    x: "",
    github: "",
    linkedin: "",
    telegram: "",
  });

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounced username for availability check
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const savedUsername = profileData?.username ?? "";

  // Populate form from loaded profile
  useEffect(() => {
    if (profileData) {
      setUsername(profileData.username ?? "");
      setBio(profileData.bio ?? "");
      setSocialLinks(
        profileData.socialLinks ?? {
          x: "",
          github: "",
          linkedin: "",
          telegram: "",
        },
      );
    }
  }, [profileData]);

  // Debounce username check
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUsername(username), 500);
    return () => clearTimeout(timer);
  }, [username]);

  // Revoke preview URL on cleanup
  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  // Determine whether to run availability check
  const isOwnUsername =
    debouncedUsername === savedUsername && savedUsername !== "";
  const shouldCheck =
    !isOwnUsername &&
    debouncedUsername.length >= 3 &&
    USERNAME_PATTERN.test(debouncedUsername);
  const checkTarget = shouldCheck ? debouncedUsername : "";

  const { data: isUsernameAvailable, isLoading: isCheckingUsername } =
    useCheckUsernameAvailable(checkTarget);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    const url = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreviewUrl(url);
  };

  const handleSave = async () => {
    if (!isLoggedIn) return;

    // Validate username
    if (username && !USERNAME_PATTERN.test(username)) {
      toast.error(
        "Username must be 3–30 alphanumeric characters or underscores",
      );
      return;
    }
    if (
      username !== savedUsername &&
      username.length >= 3 &&
      isUsernameAvailable === false
    ) {
      toast.error("This username is already taken");
      return;
    }

    try {
      let avatar: UserProfile["avatar"] = profileData?.avatar;
      if (avatarFile) {
        const bytes = new Uint8Array(await avatarFile.arrayBuffer());
        avatar = ExternalBlob.fromBytes(bytes);
      }

      await saveProfile.mutateAsync({
        username,
        bio,
        socialLinks,
        avatar,
      });
      toast.success("Profil gespeichert!");
      setAvatarFile(null);
    } catch {
      toast.error("Fehler beim Speichern des Profils");
    }
  };

  const currentAvatarUrl =
    avatarPreviewUrl ?? profileData?.avatar?.getDirectURL() ?? null;
  const avatarInitial = (username || savedUsername || "?")[0].toUpperCase();

  return (
    <div className="min-h-[calc(100vh-56px)] pt-14 bg-background">
      {/* Header */}
      <div className="sticky top-14 z-20 bg-background/95 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 h-14 flex items-center gap-3">
          <button
            type="button"
            data-ocid="profile.back.button"
            onClick={onBack}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base font-semibold text-foreground">Profil</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
        {!isLoggedIn ? (
          // Login gate
          <div
            data-ocid="profile.login.panel"
            className="flex flex-col items-center justify-center py-24 gap-5 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-secondary/60 flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Bitte einloggen
              </h2>
              <p className="text-sm text-muted-foreground">
                Melde dich an, um dein Profil zu bearbeiten.
              </p>
            </div>
            <Button
              data-ocid="profile.login.button"
              onClick={() => login()}
              className="gap-2 font-semibold"
            >
              <span className="text-base leading-none">∞</span>
              Login mit Internet Identity
            </Button>
          </div>
        ) : isLoadingProfile ? (
          // Loading skeleton
          <div data-ocid="profile.loading_state" className="space-y-6">
            <div className="flex items-center gap-5">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          // Profile form
          <div className="space-y-8">
            {/* Avatar section */}
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  data-ocid="profile.avatar.upload_button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full overflow-hidden bg-secondary/60 border-2 border-border hover:border-primary/60 transition-colors group relative"
                >
                  {currentAvatarUrl ? (
                    <img
                      src={currentAvatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-foreground/70">
                      {avatarInitial}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  data-ocid="profile.avatar.dropzone"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Profilbild
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  JPG, PNG oder GIF · max. 2 MB
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Bild ändern
                </button>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-sm font-medium text-foreground"
              >
                Benutzername
                <span className="text-muted-foreground font-normal ml-1">
                  (optional)
                </span>
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  data-ocid="profile.username.input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="dein_nutzername"
                  maxLength={30}
                  className="bg-card border-border text-foreground placeholder:text-muted-foreground pr-32"
                />
                {/* Availability badge */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {username.length >= 3 && !isOwnUsername && (
                    <UsernameStatus
                      isChecking={isCheckingUsername}
                      isAvailable={isUsernameAvailable}
                    />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                3–30 Zeichen, nur Buchstaben, Zahlen und Unterstriche
              </p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label
                htmlFor="bio"
                className="text-sm font-medium text-foreground"
              >
                Bio
              </Label>
              <Textarea
                id="bio"
                data-ocid="profile.bio.textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Erzähl etwas über dich…"
                rows={3}
                maxLength={300}
                className="resize-none bg-card border-border text-foreground placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/300
              </p>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Social Links
              </h3>

              <div className="space-y-3">
                {/* X / Twitter */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-foreground">𝕏</span>
                  </div>
                  <Input
                    data-ocid="profile.social.x.input"
                    value={socialLinks.x}
                    onChange={(e) =>
                      setSocialLinks((prev) => ({ ...prev, x: e.target.value }))
                    }
                    placeholder="https://x.com/dein_name"
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {/* GitHub */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center flex-shrink-0">
                    <Github className="w-4 h-4 text-foreground" />
                  </div>
                  <Input
                    data-ocid="profile.social.github.input"
                    value={socialLinks.github}
                    onChange={(e) =>
                      setSocialLinks((prev) => ({
                        ...prev,
                        github: e.target.value,
                      }))
                    }
                    placeholder="https://github.com/dein_name"
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {/* LinkedIn */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center flex-shrink-0">
                    <Linkedin className="w-4 h-4 text-foreground" />
                  </div>
                  <Input
                    data-ocid="profile.social.linkedin.input"
                    value={socialLinks.linkedin}
                    onChange={(e) =>
                      setSocialLinks((prev) => ({
                        ...prev,
                        linkedin: e.target.value,
                      }))
                    }
                    placeholder="https://linkedin.com/in/dein_name"
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {/* Telegram */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center flex-shrink-0">
                    <Send className="w-4 h-4 text-foreground" />
                  </div>
                  <Input
                    data-ocid="profile.social.telegram.input"
                    value={socialLinks.telegram}
                    onChange={(e) =>
                      setSocialLinks((prev) => ({
                        ...prev,
                        telegram: e.target.value,
                      }))
                    }
                    placeholder="https://t.me/dein_name"
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Save button */}
            <div
              className={cn(
                "flex items-center justify-between pt-2 border-t border-border/40",
              )}
            >
              <p className="text-xs text-muted-foreground">
                Alle Angaben sind optional und öffentlich sichtbar.
              </p>
              <Button
                data-ocid="profile.save.submit_button"
                onClick={handleSave}
                disabled={saveProfile.isPending}
                className="gap-2 font-semibold min-w-24"
              >
                {saveProfile.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Speichern…
                  </>
                ) : (
                  "Speichern"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
