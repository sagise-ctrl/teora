import { useState } from "react";
import { Link } from "wouter";
import {
  Users,
  Shield,
  BarChart3,
  Settings,
  UserPlus,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Crown,
  Eye,
  Pencil,
  Mail,
  ChevronRight,
  Coins,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import AdminAiTiersPanel from "@/components/admin-ai-tiers";

interface Member {
  id: number;
  projectId: number;
  userId: string;
  role: "collaborator" | "viewer";
  joinedAt: string;
  updatedAt: string;
}

function RoleBadge({ role }: { role: string }) {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    collaborator: "default",
    viewer: "secondary",
    owner: "default",
  };
  const labels: Record<string, string> = {
    collaborator: "Collaborator",
    viewer: "Viewer",
    owner: "Owner",
  };
  const icons: Record<string, React.ElementType> = {
    collaborator: Pencil,
    viewer: Eye,
    owner: Crown,
  };
  const Icon = icons[role] ?? Pencil;
  return (
    <Badge variant={variants[role] ?? "outline"} className="flex items-center gap-1 w-fit">
      <Icon className="w-3 h-3" />
      {labels[role] ?? role}
    </Badge>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<string>("members");
  const [members] = useState<Member[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("collaborator");
  const [loading, setLoading] = useState(false);

  const navItems = [
    { id: "members", label: "Member Management", icon: Users, description: "Kelola collaborator dan viewer proyek" },
    { id: "ai-tiers", label: "AI Tier Pricing", icon: Coins, description: "Konfigurasi harga AI per-tier" },
    { id: "roles", label: "Role & Permissions", icon: Shield, description: "Definisi peran dan hak akses" },
    { id: "analytics", label: "Project Analytics", icon: BarChart3, description: "Statistik penggunaan proyek" },
    { id: "settings", label: "Project Settings", icon: Settings, description: "Konfigurasi proyek" },
  ];

  const handleInvite = () => {
    if (!addEmail.trim()) {
      toast({ title: "Email diperlukan", variant: "destructive" });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      toast({ title: "Undangan dikirim", description: `Undangan ke ${addEmail} telah dikirim` });
      setLoading(false);
      setShowAddDialog(false);
      setAddEmail("");
      setAddRole("collaborator");
    }, 1000);
  };

  const tabs = [
    {
      id: "ai-tiers",
      label: "AI Tiers",
      icon: Coins,
      content: <AdminAiTiersPanel />,
    },
    {
      id: "members",
      label: "Members",
      icon: Users,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Project Members</h2>
              <p className="text-sm text-muted-foreground">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>

          {/* Invite Dialog */}
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Project Member</DialogTitle>
                <DialogDescription>
                  Kirim undangan ke email collaborator atau viewer.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={addEmail}
                    onChange={e => setAddEmail(e.target.value)}
                    placeholder="collaborator@email.com"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={addRole} onValueChange={setAddRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="collaborator">Collaborator — dapat mengedit dokumen</SelectItem>
                      <SelectItem value="viewer">Viewer — hanya dapat melihat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Batal
                </Button>
                <Button onClick={handleInvite} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                  Kirim Undangan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Members Table */}
          {members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(member => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {member.userId[0]?.toUpperCase() ?? "U"}
                        </div>
                        <span className="text-sm font-medium">{member.userId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={member.role} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Belum ada collaborator</p>
              <p className="text-xs text-muted-foreground mt-1">Tambahkan collaborator untuk mulai bekerja bersama</p>
              <Button size="sm" className="mt-4" onClick={() => setShowAddDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add First Member
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "roles",
      label: "Roles",
      icon: Shield,
      content: (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Role & Permissions</h2>
          <p className="text-sm text-muted-foreground">Definisi peran dan hak akses dalam proyek</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded bg-primary/10">
                    <Crown className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-medium">Owner</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Pemilik proyek, kontrol penuh</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Full control</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Delete project</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Manage billing</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Invite/remove members</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Resolve comments</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded bg-blue-500/10">
                    <Pencil className="w-4 h-4 text-blue-500" />
                  </div>
                  <h3 className="font-medium">Collaborator</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Dapat mengedit dokumen</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Edit documents</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Add comments</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Chat with AI</li>
                  <li className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> Delete project</li>
                  <li className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> Manage billing</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded bg-muted-foreground/10">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">Viewer</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Hanya dapat melihat</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> View documents</li>
                  <li className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> Edit documents</li>
                  <li className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> Chat with AI</li>
                  <li className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> Add comments</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Institutional Management</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    Fitur manajemen sekolah/institusi (admin dashboard, student quota, teacher accounts) memerlukan schema tambahan dan memerlukan owner decision sebelum implementasi.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      content: (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Project Analytics</h2>
          <p className="text-sm text-muted-foreground">Statistik penggunaan proyek ini</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Documents</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">References</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">AI Chats</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Quizzes</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-2">AI Token Usage (bulan ini)</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Chat AI</span>
                  <span>0 tokens</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Document Generation</span>
                  <span>0 tokens</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Quiz Generation</span>
                  <span>0 tokens</span>
                </div>
                <div className="flex justify-between text-xs font-medium pt-2 border-t">
                  <span>Total</span>
                  <span>0 tokens</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      content: (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Project Settings</h2>
          <p className="text-sm text-muted-foreground">Konfigurasi lanjutan proyek</p>

          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <div>
                  <p className="text-sm font-medium">Delete Project</p>
                  <p className="text-xs text-muted-foreground">Permanently delete this project and all its data</p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Kelola member, role, dan konfigurasi proyek</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="md:w-56 shrink-0">
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left ${
                    selectedTab === item.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Card className="bg-card border-0 shadow-sm">
            <CardContent className="p-6">
              {tabs.find(t => t.id === selectedTab)?.content ?? tabs[0].content}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
