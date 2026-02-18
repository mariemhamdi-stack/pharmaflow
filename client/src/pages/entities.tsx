import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Entity } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Building2, FlaskConical, Truck, Store } from "lucide-react";

export default function EntitiesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  const { data: entities, isLoading } = useQuery<Entity[]>({
    queryKey: ["/api/entities"]
  });

  const filteredEntities = entities?.filter(entity => {
    const matchesSearch = 
      entity.nom.toLowerCase().includes(search.toLowerCase()) ||
      entity.email?.toLowerCase().includes(search.toLowerCase()) ||
      entity.adresse?.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter === "all" || entity.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "laboratoire":
        return <FlaskConical className="w-4 h-4" />;
      case "grossiste":
        return <Truck className="w-4 h-4" />;
      case "pharmacie":
        return <Store className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      laboratoire: "Laboratoire",
      grossiste: "Grossiste",
      pharmacie: "Pharmacie"
    };
    return labels[type] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      laboratoire: "bg-primary/10 text-primary",
      grossiste: "bg-chart-3/20 text-chart-3",
      pharmacie: "bg-chart-4/20 text-chart-4"
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Liste de pharmacies</h1>
          <p className="text-muted-foreground mt-1">Gérez les laboratoires, grossistes et pharmacies</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-entity">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle entité
            </Button>
          </DialogTrigger>
          <DialogContent>
            <EntityForm 
              onSuccess={() => {
                setIsCreateOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
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
                placeholder="Rechercher une entité..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-entities"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48" data-testid="select-type-filter">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="laboratoire">Laboratoires</SelectItem>
                <SelectItem value="grossiste">Grossistes</SelectItem>
                <SelectItem value="pharmacie">Pharmacies</SelectItem>
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
          ) : filteredEntities?.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Aucune entité</h3>
              <p className="text-muted-foreground mt-1">
                {search || typeFilter !== "all" 
                  ? "Aucune entité ne correspond à vos critères" 
                  : "Commencez par ajouter des entités"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntities?.map((entity) => (
                    <TableRow key={entity.id} className="hover-elevate">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded flex items-center justify-center ${getTypeBadgeColor(entity.type)}`}>
                            {getTypeIcon(entity.type)}
                          </div>
                          <span className="font-medium">{entity.nom}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getTypeBadgeColor(entity.type)} border-transparent`}>
                          {getTypeLabel(entity.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{entity.email || "-"}</TableCell>
                      <TableCell>{entity.telephone || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{entity.adresse || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingEntity(entity)}
                          data-testid={`button-edit-entity-${entity.id}`}
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

      <Dialog open={!!editingEntity} onOpenChange={() => setEditingEntity(null)}>
        <DialogContent>
          {editingEntity && (
            <EntityForm 
              entity={editingEntity}
              onSuccess={() => {
                setEditingEntity(null);
                queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EntityFormProps {
  entity?: Entity;
  onSuccess: () => void;
}

function EntityForm({ entity, onSuccess }: EntityFormProps) {
  const { toast } = useToast();
  const [nom, setNom] = useState(entity?.nom || "");
  const [type, setType] = useState(entity?.type || "pharmacie");
  const [email, setEmail] = useState(entity?.email || "");
  const [telephone, setTelephone] = useState(entity?.telephone || "");
  const [adresse, setAdresse] = useState(entity?.adresse || "");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (entity) {
        return apiRequest("PATCH", `/api/entities/${entity.id}`, data);
      }
      return apiRequest("POST", "/api/entities", data);
    },
    onSuccess: () => {
      toast({ 
        title: entity ? "Entité modifiée" : "Entité créée",
        description: entity ? "L'entité a été mise à jour" : "L'entité a été créée"
      });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Une erreur s'est produite", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !type) {
      toast({ title: "Erreur", description: "Veuillez remplir les champs obligatoires", variant: "destructive" });
      return;
    }
    mutation.mutate({ nom, type, email, telephone, adresse });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{entity ? "Modifier l'entité" : "Nouvelle entité"}</DialogTitle>
        <DialogDescription>
          {entity ? "Modifiez les informations de l'entité" : "Créez un nouveau laboratoire, grossiste ou pharmacie"}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nom *</label>
          <Input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom de l'entité"
            data-testid="input-entity-nom"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Type *</label>
          <Select value={type} onValueChange={setType} disabled={!!entity}>
            <SelectTrigger data-testid="select-entity-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="laboratoire">Laboratoire</SelectItem>
              <SelectItem value="grossiste">Grossiste</SelectItem>
              <SelectItem value="pharmacie">Pharmacie</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@entite.com"
            data-testid="input-entity-email"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Téléphone</label>
          <Input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="+33 1 23 45 67 89"
            data-testid="input-entity-telephone"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Adresse</label>
          <Input
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="123 Rue Example, 75001 Paris"
            data-testid="input-entity-adresse"
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-entity">
            {mutation.isPending ? "Enregistrement..." : (entity ? "Modifier" : "Créer")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
