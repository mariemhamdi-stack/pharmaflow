import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User, Entity } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Users as UsersIcon, X } from "lucide-react";

export default function UsersPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const { data: entities } = useQuery<Entity[]>({
    queryKey: ["/api/entities"]
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.nom.toLowerCase().includes(search.toLowerCase()) ||
      user.prenom.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrateur",
      laboratoire: "Laboratoire",
      delegue: "Délégué",
      grossiste: "Grossiste",
      pharmacie: "Pharmacie"
    };
    return labels[role] || role;
  };

  const getEntityName = (entityId: string | null) => {
    if (!entityId) return "-";
    return entities?.find(e => e.id === entityId)?.nom || "-";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Utilisateurs</h1>
          <p className="text-muted-foreground mt-1">Gérez les utilisateurs du système</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <Plus className="w-4 h-4 mr-2" />
              Nouvel utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <UserForm 
              entities={entities || []}
              onSuccess={() => {
                setIsCreateOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/users"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48" data-testid="select-role-filter">
                <SelectValue placeholder="Filtrer par rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="laboratoire">Laboratoire</SelectItem>
                <SelectItem value="delegue">Délégué</SelectItem>
                <SelectItem value="grossiste">Grossiste</SelectItem>
                <SelectItem value="pharmacie">Pharmacie</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredUsers?.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Aucun utilisateur</h3>
              <p className="text-muted-foreground mt-1">
                {search || roleFilter !== "all" 
                  ? "Aucun utilisateur ne correspond à vos critères" 
                  : "Commencez par ajouter des utilisateurs"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Entité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id} className="hover-elevate">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {user.prenom[0]}{user.nom[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.prenom} {user.nom}</p>
                            <p className="text-xs text-muted-foreground">{user.telephone || "-"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                          {getRoleLabel(user.role)}
                        </span>
                      </TableCell>
                      <TableCell>{getEntityName(user.entityId)}</TableCell>
                      <TableCell>
                        <StatusBadge status={user.status} type="user" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingUser(user)}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          {editingUser && (
            <UserForm 
              user={editingUser}
              entities={entities || []}
              onSuccess={() => {
                setEditingUser(null);
                queryClient.invalidateQueries({ queryKey: ["/api/users"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface UserFormProps {
  user?: User;
  entities: Entity[];
  onSuccess: () => void;
}

function UserForm({ user, entities, onSuccess }: UserFormProps) {
  const { toast } = useToast();
  const [nom, setNom] = useState(user?.nom || "");
  const [prenom, setPrenom] = useState(user?.prenom || "");
  const [email, setEmail] = useState(user?.email || "");
  const [telephone, setTelephone] = useState(user?.telephone || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(user?.role || "delegue");
  const [entityId, setEntityId] = useState(user?.entityId || "");
  const [status, setStatus] = useState<string>(user?.status || "actif");
  const [selectedLaboIds, setSelectedLaboIds] = useState<string[]>([]);
  const [laboSearch, setLaboSearch] = useState("");

  const { data: existingLaboIds } = useQuery<string[]>({
    queryKey: ["/api/users", user?.id, "laboratoires"],
    enabled: !!user && user.role === "delegue",
  });

  useEffect(() => {
    if (existingLaboIds && existingLaboIds.length > 0 && selectedLaboIds.length === 0) {
      setSelectedLaboIds(existingLaboIds);
    }
  }, [existingLaboIds]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      let userId = user?.id;
      if (user) {
        await apiRequest("PATCH", `/api/users/${user.id}`, data);
      } else {
        const res = await apiRequest("POST", "/api/users", data);
        const newUser = await res.json();
        userId = newUser.id;
      }
      if (role === "delegue" && userId) {
        await apiRequest("PUT", `/api/users/${userId}/laboratoires`, { laboratoireIds: selectedLaboIds });
      }
    },
    onSuccess: () => {
      toast({ 
        title: user ? "Utilisateur modifié" : "Utilisateur créé",
        description: user ? "L'utilisateur a été mis à jour" : "L'utilisateur a été créé"
      });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Une erreur s'est produite", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !prenom || !email || (!user && !password)) {
      toast({ title: "Erreur", description: "Veuillez remplir les champs obligatoires", variant: "destructive" });
      return;
    }
    const data: any = { nom, prenom, email, telephone, role, entityId: entityId || null, status };
    if (password) data.password = password;
    mutation.mutate(data);
  };

  const labos = entities.filter(e => e.type === "laboratoire");
  const filteredLabos = labos.filter(l => 
    l.nom.toLowerCase().includes(laboSearch.toLowerCase()) && !selectedLaboIds.includes(l.id)
  );

  const toggleLabo = (laboId: string) => {
    setSelectedLaboIds(prev => 
      prev.includes(laboId) ? prev.filter(id => id !== laboId) : [...prev, laboId]
    );
  };

  const getEntitiesForRole = () => {
    if (role === "laboratoire" || role === "delegue") {
      return entities.filter(e => e.type === "laboratoire");
    }
    if (role === "grossiste") {
      return entities.filter(e => e.type === "grossiste");
    }
    if (role === "pharmacie") {
      return entities.filter(e => e.type === "pharmacie");
    }
    return [];
  };

  const filteredEntities = getEntitiesForRole();

  return (
    <>
      <DialogHeader>
        <DialogTitle>{user ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle>
        <DialogDescription>
          {user ? "Modifiez les informations de l'utilisateur" : "Créez un nouveau compte utilisateur"}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Prénom *</label>
            <Input
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Jean"
              data-testid="input-user-prenom"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nom *</label>
            <Input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Dupont"
              data-testid="input-user-nom"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email *</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jean.dupont@email.com"
            data-testid="input-user-email"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Téléphone</label>
          <Input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="+33 6 12 34 56 78"
            data-testid="input-user-telephone"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Mot de passe {user ? "(laisser vide pour ne pas modifier)" : "*"}
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            data-testid="input-user-password"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Rôle *</label>
            <Select value={role} onValueChange={(v) => { setRole(v); setEntityId(""); }}>
              <SelectTrigger data-testid="select-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="laboratoire">Laboratoire</SelectItem>
                <SelectItem value="delegue">Délégué</SelectItem>
                <SelectItem value="grossiste">Grossiste</SelectItem>
                <SelectItem value="pharmacie">Pharmacie</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Statut</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-user-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="suspendu">Suspendu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {role === "delegue" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Laboratoires associés</label>
            <Input
              value={laboSearch}
              onChange={(e) => setLaboSearch(e.target.value)}
              placeholder="Rechercher un laboratoire..."
              data-testid="input-labo-search"
            />
            {selectedLaboIds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedLaboIds.map(id => {
                  const labo = labos.find(l => l.id === id);
                  return labo ? (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs">
                      {labo.nom}
                      <button type="button" onClick={() => toggleLabo(id)} className="hover-elevate rounded-full" data-testid={`button-remove-labo-${id}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
            {laboSearch && filteredLabos.length > 0 && (
              <div className="max-h-32 overflow-auto border border-border rounded-md">
                {filteredLabos.slice(0, 20).map(l => (
                  <button
                    key={l.id}
                    type="button"
                    className="w-full text-left px-3 py-1.5 text-sm hover-elevate"
                    onClick={() => { toggleLabo(l.id); setLaboSearch(""); }}
                    data-testid={`button-add-labo-${l.id}`}
                  >
                    {l.nom}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {role !== "admin" && role !== "delegue" && filteredEntities.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Entité associée</label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger data-testid="select-user-entity">
                <SelectValue placeholder="Sélectionner une entité..." />
              </SelectTrigger>
              <SelectContent>
                {filteredEntities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-user">
            {mutation.isPending ? "Enregistrement..." : (user ? "Modifier" : "Créer")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
