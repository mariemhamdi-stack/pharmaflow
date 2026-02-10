import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CommercialAction } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Plus, Calendar, Check, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CommercialActionWithDates extends Omit<CommercialAction, 'dateDebut' | 'dateFin' | 'createdAt'> {
  dateDebut: Date | string;
  dateFin: Date | string;
  createdAt: Date | string;
}

const typeLabels: Record<string, string> = {
  remise: "Remise",
  pack: "Pack",
  mise_en_place: "Mise en place",
};

const scopeLabels: Record<string, string> = {
  globale: "Globale",
  ciblee: "Ciblée",
};

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    remise: "bg-chart-4/20 text-chart-4",
    pack: "bg-primary/10 text-primary",
    mise_en_place: "bg-chart-2/20 text-chart-2",
  };
  return (
    <Badge variant="outline" className={`no-default-hover-elevate no-default-active-elevate ${styles[type] || ""}`}>
      {typeLabels[type] || type}
    </Badge>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  const styles: Record<string, string> = {
    globale: "bg-primary/10 text-primary",
    ciblee: "bg-chart-2/20 text-chart-2",
  };
  return (
    <Badge variant="outline" className={`no-default-hover-elevate no-default-active-elevate ${styles[scope] || ""}`}>
      {scopeLabels[scope] || scope}
    </Badge>
  );
}

export default function ActionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: actions, isLoading } = useQuery<CommercialActionWithDates[]>({
    queryKey: ["/api/actions"],
  });

  const canCreate = user?.role === "admin" || user?.role === "laboratoire";

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return apiRequest("PATCH", `/api/actions/${id}`, { active });
    },
    onSuccess: () => {
      toast({ title: "Action mise à jour" });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible de mettre à jour l'action", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-actions-title">Actions commerciales</h1>
          <p className="text-muted-foreground mt-1">Gérez vos actions commerciales initiées par le laboratoire</p>
        </div>
        {canCreate && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-action">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle action
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <CreateActionForm
                onSuccess={() => {
                  setIsCreateOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Megaphone className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Liste des actions</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !actions?.length ? (
            <div className="text-center py-12">
              <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Aucune action</h3>
              <p className="text-muted-foreground mt-1">Commencez par créer une nouvelle action commerciale</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Portée</TableHead>
                    <TableHead>Date début</TableHead>
                    <TableHead>Date fin</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.map((action) => (
                    <TableRow key={action.id} className="hover-elevate">
                      <TableCell className="font-medium" data-testid={`text-action-titre-${action.id}`}>
                        {action.titre}
                      </TableCell>
                      <TableCell data-testid={`text-action-type-${action.id}`}>
                        <TypeBadge type={action.type} />
                      </TableCell>
                      <TableCell data-testid={`text-action-scope-${action.id}`}>
                        <ScopeBadge scope={action.scope} />
                      </TableCell>
                      <TableCell data-testid={`text-action-date-debut-${action.id}`}>
                        {format(new Date(action.dateDebut), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell data-testid={`text-action-date-fin-${action.id}`}>
                        {format(new Date(action.dateFin), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell data-testid={`text-action-active-${action.id}`}>
                        {action.active ? (
                          <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-green-500/10 text-green-600">
                            <Check className="w-3 h-3 mr-1" /> Oui
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-muted text-muted-foreground">
                            <X className="w-3 h-3 mr-1" /> Non
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={action.active ? "default" : "outline"}
                          onClick={() => toggleMutation.mutate({ id: action.id, active: !action.active })}
                          disabled={toggleMutation.isPending}
                          data-testid={`button-toggle-action-${action.id}`}
                        >
                          {action.active ? (
                            <>
                              <X className="w-4 h-4 mr-1" />
                              Désactiver
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Activer
                            </>
                          )}
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

interface CreateActionFormProps {
  onSuccess: () => void;
}

function CreateActionForm({ onSuccess }: CreateActionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState("");
  const [scope, setScope] = useState("");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [remisePourcentage, setRemisePourcentage] = useState("");
  const [packQuantite, setPackQuantite] = useState("");
  const [packGratuit, setPackGratuit] = useState("");
  const [conditions, setConditions] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [active, setActive] = useState(true);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/actions", data);
    },
    onSuccess: () => {
      toast({ title: "Action créée", description: "L'action commerciale a été créée avec succès" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible de créer l'action", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !titre || !scope || !dateFin) {
      toast({ title: "Erreur", description: "Veuillez remplir les champs obligatoires (type, titre, portée, date fin)", variant: "destructive" });
      return;
    }

    const payload: any = {
      type,
      scope,
      titre,
      description: description || null,
      conditions: conditions || null,
      dateDebut: dateDebut ? new Date(dateDebut).toISOString() : new Date().toISOString(),
      dateFin: new Date(dateFin).toISOString(),
      active,
    };

    if (type === "remise" && remisePourcentage) {
      payload.remisePourcentage = remisePourcentage;
    }
    if (type === "pack") {
      if (packQuantite) payload.packQuantite = parseInt(packQuantite);
      if (packGratuit) payload.packGratuit = parseInt(packGratuit);
    }

    createMutation.mutate(payload);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nouvelle action commerciale</DialogTitle>
        <DialogDescription>Créez une action commerciale à destination des pharmacies</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type *</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger data-testid="select-action-type">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remise">Remise</SelectItem>
                <SelectItem value="pack">Pack</SelectItem>
                <SelectItem value="mise_en_place">Mise en place</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Portée *</label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger data-testid="select-action-scope">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="globale">Globale</SelectItem>
                <SelectItem value="ciblee">Ciblée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Titre *</label>
          <Input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Titre de l'action"
            data-testid="input-action-titre"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description de l'action..."
            data-testid="textarea-action-description"
          />
        </div>

        {type === "remise" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Pourcentage de remise (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={remisePourcentage}
              onChange={(e) => setRemisePourcentage(e.target.value)}
              placeholder="Ex: 15"
              data-testid="input-action-remise-pourcentage"
            />
          </div>
        )}

        {type === "pack" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantité achetée</label>
              <Input
                type="number"
                min="1"
                value={packQuantite}
                onChange={(e) => setPackQuantite(e.target.value)}
                placeholder="Ex: 10"
                data-testid="input-action-pack-quantite"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantité gratuite</label>
              <Input
                type="number"
                min="1"
                value={packGratuit}
                onChange={(e) => setPackGratuit(e.target.value)}
                placeholder="Ex: 2"
                data-testid="input-action-pack-gratuit"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Conditions</label>
          <Textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder="Conditions de l'action..."
            data-testid="textarea-action-conditions"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date de début</label>
            <Input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              data-testid="input-action-date-debut"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date de fin *</label>
            <Input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              data-testid="input-action-date-fin"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4"
              data-testid="checkbox-action-active"
            />
            <label htmlFor="active" className="text-sm font-medium cursor-pointer">
              Actif par défaut
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-action">
            {createMutation.isPending ? "Création..." : "Créer l'action"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
