import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSquare, Plus, Megaphone, Eye, Calendar } from "lucide-react";

interface Communication {
  id: string;
  laboratoireId: string;
  type: string;
  category: string;
  titre: string;
  contenu: string;
  targetRoles: string | null;
  targetEntities: string | null;
  dateDebut: Date;
  dateFin: Date;
  active: boolean | null;
  vues: number | null;
  createdAt: Date;
}

function getTypeBadge(type: string) {
  switch (type) {
    case "banniere":
      return <Badge className="bg-chart-3/20 text-chart-3 no-default-hover-elevate no-default-active-elevate">Bannière</Badge>;
    case "popup":
      return <Badge className="bg-chart-2/20 text-chart-2 no-default-hover-elevate no-default-active-elevate">Pop-up</Badge>;
    case "actualite":
      return <Badge className="bg-primary/10 text-primary no-default-hover-elevate no-default-active-elevate">Actualité</Badge>;
    default:
      return <Badge>{type}</Badge>;
  }
}

function getCategoryBadge(category: string) {
  switch (category) {
    case "informative":
      return <Badge className="bg-muted text-muted-foreground no-default-hover-elevate no-default-active-elevate">Informative</Badge>;
    case "promotionnelle":
      return <Badge className="bg-chart-4/20 text-chart-4 no-default-hover-elevate no-default-active-elevate">Promotionnelle</Badge>;
    case "institutionnelle":
      return <Badge className="bg-primary/10 text-primary no-default-hover-elevate no-default-active-elevate">Institutionnelle</Badge>;
    default:
      return <Badge>{category}</Badge>;
  }
}

function AdminLabView() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formType, setFormType] = useState("banniere");
  const [formCategory, setFormCategory] = useState("informative");
  const [formTitre, setFormTitre] = useState("");
  const [formContenu, setFormContenu] = useState("");
  const [formTargetRoles, setFormTargetRoles] = useState("");
  const [formDateDebut, setFormDateDebut] = useState("");
  const [formDateFin, setFormDateFin] = useState("");
  const [formActive, setFormActive] = useState(true);

  const { data: communications, isLoading } = useQuery<Communication[]>({
    queryKey: ["/api/communications"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("POST", "/api/communications", data);
    },
    onSuccess: () => {
      toast({ title: "Communication créée", description: "La communication a été créée avec succès" });
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Impossible de créer la communication", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return apiRequest("PATCH", `/api/communications/${id}`, { active });
    },
    onSuccess: () => {
      toast({ title: "Mise à jour effectuée" });
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Impossible de mettre à jour", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormType("banniere");
    setFormCategory("informative");
    setFormTitre("");
    setFormContenu("");
    setFormTargetRoles("");
    setFormDateDebut("");
    setFormDateFin("");
    setFormActive(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitre.trim() || !formContenu.trim() || !formDateDebut || !formDateFin) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      type: formType,
      category: formCategory,
      titre: formTitre,
      contenu: formContenu,
      targetRoles: formTargetRoles || null,
      dateDebut: formDateDebut,
      dateFin: formDateFin,
      active: formActive,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-communications-title">
            Communications
          </h1>
          <p className="text-muted-foreground mt-1">Gérez les communications in-app</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-communication">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle communication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nouvelle communication</DialogTitle>
              <DialogDescription>Créez une nouvelle communication pour les utilisateurs</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger data-testid="select-communication-type">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banniere">Bannière</SelectItem>
                      <SelectItem value="popup">Pop-up</SelectItem>
                      <SelectItem value="actualite">Actualité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Catégorie</label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger data-testid="select-communication-category">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="informative">Informative</SelectItem>
                      <SelectItem value="promotionnelle">Promotionnelle</SelectItem>
                      <SelectItem value="institutionnelle">Institutionnelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Titre</label>
                <Input
                  value={formTitre}
                  onChange={(e) => setFormTitre(e.target.value)}
                  placeholder="Titre de la communication"
                  data-testid="input-communication-titre"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contenu</label>
                <Textarea
                  value={formContenu}
                  onChange={(e) => setFormContenu(e.target.value)}
                  placeholder="Contenu de la communication..."
                  data-testid="textarea-communication-contenu"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rôles cibles (optionnel)</label>
                <Input
                  value={formTargetRoles}
                  onChange={(e) => setFormTargetRoles(e.target.value)}
                  placeholder="admin,laboratoire,delegue,grossiste,pharmacie"
                  data-testid="input-communication-target-roles"
                />
                <p className="text-xs text-muted-foreground">Séparez les rôles par des virgules. Laissez vide pour cibler tous les rôles.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date de début</label>
                  <Input
                    type="date"
                    value={formDateDebut}
                    onChange={(e) => setFormDateDebut(e.target.value)}
                    data-testid="input-communication-date-debut"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date de fin</label>
                  <Input
                    type="date"
                    value={formDateFin}
                    onChange={(e) => setFormDateFin(e.target.value)}
                    data-testid="input-communication-date-fin"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="active"
                  checked={formActive}
                  onCheckedChange={(checked) => setFormActive(checked === true)}
                  data-testid="checkbox-communication-active"
                />
                <label htmlFor="active" className="text-sm font-medium cursor-pointer">
                  Active
                </label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-communication">
                  {createMutation.isPending ? "Création..." : "Créer la communication"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <MessageSquare className="w-5 h-5" />
            Liste des communications
          </CardTitle>
          <CardDescription>Toutes les communications créées</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !communications || communications.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Aucune communication</h3>
              <p className="text-muted-foreground mt-1">Commencez par créer une nouvelle communication</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Date début</TableHead>
                    <TableHead>Date fin</TableHead>
                    <TableHead>Vues</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communications.map((comm) => (
                    <TableRow key={comm.id}>
                      <TableCell className="font-medium" data-testid={`text-comm-titre-${comm.id}`}>
                        {comm.titre}
                      </TableCell>
                      <TableCell data-testid={`text-comm-type-${comm.id}`}>
                        {getTypeBadge(comm.type)}
                      </TableCell>
                      <TableCell data-testid={`text-comm-category-${comm.id}`}>
                        {getCategoryBadge(comm.category)}
                      </TableCell>
                      <TableCell data-testid={`text-comm-date-debut-${comm.id}`}>
                        {format(new Date(comm.dateDebut), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell data-testid={`text-comm-date-fin-${comm.id}`}>
                        {format(new Date(comm.dateFin), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell data-testid={`text-comm-vues-${comm.id}`}>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          {comm.vues ?? 0}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-comm-active-${comm.id}`}>
                        <Badge
                          className={
                            comm.active
                              ? "bg-chart-3/20 text-chart-3 no-default-hover-elevate no-default-active-elevate"
                              : "bg-muted text-muted-foreground no-default-hover-elevate no-default-active-elevate"
                          }
                        >
                          {comm.active ? "Oui" : "Non"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: comm.id,
                              active: !comm.active,
                            })
                          }
                          disabled={toggleActiveMutation.isPending}
                          data-testid={`button-toggle-active-${comm.id}`}
                        >
                          {comm.active ? "Désactiver" : "Activer"}
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
    </div>
  );
}

function UserFeedView() {
  const { toast } = useToast();

  const { data: communications, isLoading } = useQuery<Communication[]>({
    queryKey: ["/api/communications"],
  });

  const viewMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/communications/${id}/view`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
    },
  });

  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (communications) {
      communications.forEach((comm) => {
        if (!viewedIds.has(comm.id)) {
          viewMutation.mutate(comm.id);
          setViewedIds((prev) => new Set(prev).add(comm.id));
        }
      });
    }
  }, [communications]);

  const activeCommunications = communications?.filter((c) => c.active) || [];
  const banners = activeCommunications.filter((c) => c.type === "banniere");
  const actualites = activeCommunications.filter((c) => c.type === "actualite");
  const popups = activeCommunications.filter((c) => c.type === "popup");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-communications-feed-title">
          Communications
        </h1>
        <p className="text-muted-foreground mt-1">Actualités et informations</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      ) : activeCommunications.length === 0 ? (
        <div className="text-center py-12">
          <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Aucune communication</h3>
          <p className="text-muted-foreground mt-1">Aucune communication active pour le moment</p>
        </div>
      ) : (
        <>
          {banners.length > 0 && (
            <div className="space-y-3">
              {banners.map((banner) => (
                <Card key={banner.id} className="border-chart-3/30" data-testid={`card-banner-${banner.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Megaphone className="w-5 h-5 text-chart-3" />
                      {getTypeBadge(banner.type)}
                      {getCategoryBadge(banner.category)}
                    </div>
                    <CardTitle className="text-lg" data-testid={`text-banner-titre-${banner.id}`}>
                      {banner.titre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground" data-testid={`text-banner-contenu-${banner.id}`}>
                      {banner.contenu}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground flex-wrap">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(new Date(banner.dateDebut), "dd MMM yyyy", { locale: fr })} -{" "}
                        {format(new Date(banner.dateFin), "dd MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {(actualites.length > 0 || popups.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...actualites, ...popups].map((comm) => (
                <Card key={comm.id} className="hover-elevate" data-testid={`card-comm-${comm.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(comm.type)}
                      {getCategoryBadge(comm.category)}
                    </div>
                    <CardTitle className="text-base" data-testid={`text-comm-titre-${comm.id}`}>
                      {comm.titre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-comm-contenu-${comm.id}`}>
                      {comm.contenu}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground flex-wrap">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(new Date(comm.dateDebut), "dd MMM yyyy", { locale: fr })} -{" "}
                        {format(new Date(comm.dateFin), "dd MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CommunicationsPage() {
  const { user } = useAuth();
  const isAdminOrLab = user?.role === "admin" || user?.role === "laboratoire";

  if (isAdminOrLab) {
    return <AdminLabView />;
  }

  return <UserFeedView />;
}
