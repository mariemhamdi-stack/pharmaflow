import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Entity } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Truck } from "lucide-react";

export default function GrossistesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  const { data: entities, isLoading } = useQuery<Entity[]>({
    queryKey: ["/api/entities"]
  });

  const grossistes = entities?.filter(e => e.type === "grossiste");

  const filteredGrossistes = grossistes?.filter(entity => {
    const searchLower = search.toLowerCase();
    return (
      entity.nom.toLowerCase().includes(searchLower) ||
      entity.email?.toLowerCase().includes(searchLower) ||
      entity.adresse?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-grossistes-title">Liste de grossistes</h1>
          <p className="text-muted-foreground mt-1">Gérez les grossistes et leurs informations</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-grossiste">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau grossiste
            </Button>
          </DialogTrigger>
          <DialogContent>
            <GrossisteForm
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
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un grossiste..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-grossistes"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredGrossistes?.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Aucun grossiste</h3>
              <p className="text-muted-foreground mt-1">
                {search
                  ? "Aucun grossiste ne correspond à vos critères"
                  : "Commencez par ajouter des grossistes"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrossistes?.map((entity) => (
                    <TableRow key={entity.id} className="hover-elevate" data-testid={`row-grossiste-${entity.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded flex items-center justify-center bg-chart-3/20 text-chart-3">
                            <Truck className="w-4 h-4" />
                          </div>
                          <span className="font-medium">{entity.nom}</span>
                        </div>
                      </TableCell>
                      <TableCell>{entity.email || "-"}</TableCell>
                      <TableCell>{entity.telephone || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{entity.adresse || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingEntity(entity)}
                          data-testid={`button-edit-grossiste-${entity.id}`}
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
            <GrossisteForm
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

interface GrossisteFormProps {
  entity?: Entity;
  onSuccess: () => void;
}

function GrossisteForm({ entity, onSuccess }: GrossisteFormProps) {
  const { toast } = useToast();
  const [nom, setNom] = useState(entity?.nom || "");
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
        title: entity ? "Grossiste modifié" : "Grossiste créé",
        description: entity ? "Le grossiste a été mis à jour" : "Le grossiste a été créé"
      });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Une erreur s'est produite", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom) {
      toast({ title: "Erreur", description: "Veuillez remplir le nom du grossiste", variant: "destructive" });
      return;
    }
    mutation.mutate({ nom, type: "grossiste", email, telephone, adresse });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{entity ? "Modifier le grossiste" : "Nouveau grossiste"}</DialogTitle>
        <DialogDescription>
          {entity ? "Modifiez les informations du grossiste" : "Créez un nouveau grossiste"}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nom *</label>
          <Input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom du grossiste"
            data-testid="input-grossiste-nom"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@grossiste.com"
            data-testid="input-grossiste-email"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Téléphone</label>
          <Input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="+33 1 23 45 67 89"
            data-testid="input-grossiste-telephone"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Adresse</label>
          <Input
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="123 Rue Example, 75001 Paris"
            data-testid="input-grossiste-adresse"
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-grossiste">
            {mutation.isPending ? "Enregistrement..." : (entity ? "Modifier" : "Créer")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
