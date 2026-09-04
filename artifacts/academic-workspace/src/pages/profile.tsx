import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  useGetMyProfile,
  useUpdateMyProfile,
  useUploadMyAvatar,
  useDeleteMyAccount,
  useGetMyUsageStats,
  getGetMyProfileQueryKey,
} from "@/lib/api-client-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User as UserIcon,
  Mail,
  Calendar,
  Coins,
  Camera,
  Trash2,
  Save,
  Loader2,
  CoinsIcon,
} from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [nameLoaded, setNameLoaded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useGetMyProfile();
  const { data: usage } = useGetMyUsageStats({ period: "all" });
  const updateProfile = useUpdateMyProfile();
  const uploadAvatar = useUploadMyAvatar();
  const deleteAccount = useDeleteMyAccount();

  // Sync displayName from profile
  useEffect(() => {
    if (profile && !nameLoaded) {
      setDisplayName(profile.displayName ?? "");
      setNameLoaded(true);
    }
  }, [profile, nameLoaded]);

  const handleSave = () => {
    updateProfile.mutate(
      { data: { displayName: displayName.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Profil diperbarui" });
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        },
        onError: (err) => toast({ title: String(err), variant: "destructive" }),
      }
    );
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File terlalu besar. Maksimal 5MB.", variant: "destructive" });
      return;
    }

    // Validate type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Format harus JPEG, PNG, atau WebP.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const stripped = result.split(",")[1] ?? "";
          resolve(stripped);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      uploadAvatar.mutate(
        { data: { base64Content: base64, filename: file.name } },
        {
          onSuccess: () => {
            toast({ title: "Avatar diperbarui" });
            queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
          },
          onError: (err) => toast({ title: String(err), variant: "destructive" }),
        }
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = () => {
    if (!deletePassword) {
      toast({ title: "Masukkan password", variant: "destructive" });
      return;
    }
    deleteAccount.mutate(
      { data: { password: deletePassword } },
      {
        onSuccess: () => {
          toast({ title: "Akun dihapus. Anda akan dialihkan." });
          window.location.href = "/login";
        },
        onError: (err) =>
          toast({ title: String(err), variant: "destructive" }),
      }
    );
  };

  const initials = (profile?.displayName || profile?.email || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">Profil Saya</h1>
        <p className="text-muted-foreground mt-1">Kelola informasi akun dan preferensi Anda</p>
      </div>

      <div className="space-y-6">
        {/* Avatar + Display Name */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Informasi Dasar
            </CardTitle>
            <CardDescription>
              Avatar dan nama yang ditampilkan di workspace Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              {isLoading ? (
                <Skeleton className="w-24 h-24 rounded-full" />
              ) : (
                <div className="relative group">
                  <Avatar className="w-24 h-24 border-2 border-border">
                    <AvatarImage src={profile?.avatarUrl ?? undefined} alt={profile?.displayName ?? "Anda"} />
                    <AvatarFallback className="text-lg font-serif">{initials}</AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    aria-label="Upload avatar"
                  >
                    {uploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">JPG, PNG, atau WebP. Maksimal 5MB.</p>
              </div>
            </div>

            <Separator />

            {/* Display Name */}
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="displayName">Nama Tampilan</Label>
                <div className="flex gap-2">
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nama tampilan"
                    maxLength={100}
                  />
                  <Button
                    onClick={handleSave}
                    disabled={updateProfile.isPending || displayName === (profile?.displayName ?? "")}
                  >
                    {updateProfile.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Simpan
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Akun</CardTitle>
            <CardDescription>Detail akun Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-6 w-1/3" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{profile?.email}</span>
                </div>
                {profile?.username && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-center text-muted-foreground text-xs">@</span>
                    <span className="text-muted-foreground">Username:</span>
                    <span className="font-mono font-medium">@{profile?.username}</span>
                  </div>
                )}
                {profile?.createdAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Bergabung:</span>
                    <span className="font-medium">
                      {format(new Date(profile.createdAt), "d MMM yyyy")}
                    </span>
                  </div>
                )}
                {profile?.isOwner && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Owner
                  </Badge>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Usage Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Ringkasan Penggunaan
            </CardTitle>
            <CardDescription>Total token dan biaya Teora yang digunakan</CardDescription>
          </CardHeader>
          <CardContent>
            {usage ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Request</p>
                  <p className="text-2xl font-serif font-bold">{usage.totalRequests.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Input Tokens</p>
                  <p className="text-2xl font-serif font-bold">{usage.totalInputTokens.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Output Tokens</p>
                  <p className="text-2xl font-serif font-bold">{usage.totalOutputTokens.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="text-2xl font-serif font-bold">${usage.totalCostUsd.toFixed(4)}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Zona Berbahaya
            </CardTitle>
            <CardDescription>
              Tindakan ini tidak dapat dibatalkan. Semua project dan data Anda akan dihapus permanen.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Hapus Akun Permanen</DialogTitle>
                  <DialogDescription>
                    Masukkan password Anda untuk menghapus akun ini secara permanen.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <Label htmlFor="delete-password">Password</Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Password Anda"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                    Batal
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteAccount.isPending}
                  >
                    {deleteAccount.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Hapus Permanen
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              Hapus Akun
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}