import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Entity, Order } from "@shared/schema";
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
import { Tag, Plus, Eye, Check, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CommercialOffer {
  id: string;
  type: string;
  laboratoireId: string;
  delegueId: string | null;
  pharmacieId: string | null;
  orderId: string | null;
  titre: string;
  description: string | null;
  productIds: string | null;
  remisePourcentage: string | null;
  packQuantite: number | null;
  packGratuit: number | null;
  miseEnPlaceQuantite: number | null;
  conditions: string | null;
  dateDebut: Date;
  dateFin: Date | null;
  validee: boolean | null;
  valideeParLabo: boolean | null;
  valideeParPharmacie: boolean | null;
  impactFinancier: string | null;
  createdAt: Date;
}

const typeLabels: Record<string, string> = {
  remise: "Remise",
  pack: "Pack promotionnel",
  mise_en_place: "Mise en place",
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

export default function OffersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<CommercialOffer | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const { data: offers, isLoading } = useQuery<CommercialOffer[]>({
    queryKey: ["/api/offers"],
  });

  const { data: entities } = useQuery<Entity[]>({
    queryKey: ["/api/entities"],
  });

  const { data: ordersList } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const pharmacies = entities?.filter((e) => e.type === "pharmacie" && !e.blocked) || [];

  const canCreate = user?.role === "admin" || user?.role === "laboratoire" || user?.role === "delegue";
  const canEdit = user?.role === "admin" || user?.role === "laboratoire";

  const validateMutation = useMutation({
    mutationFn: async ({ id, validee }: { id: string; validee: boolean }) => {
      return apiRequest("PATCH", `/api/offers/${id}`, { validee });
    },
    onSuccess: () => {
      toast({ title: "Offre mise à jour" });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible de mettre à jour l'offre", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-offers-title">Offres commerciales</h1>
          <p className="text-muted-foreground mt-1">Gérez les offres négociées avec les pharmacies</p>
        </div>
        {canCreate && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-offer">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle offre
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <CreateOfferForm
                pharmacies={pharmacies}
                orders={ordersList || []}
                onSuccess={() => {
                  setIsCreateOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Liste des offres</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !offers?.length ? (
            <div className="text-center py-12">
              <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Aucune offre</h3>
              <p className="text-muted-foreground mt-1">Commencez par créer une nouvelle offre commerciale</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Pharmacie</TableHead>
                    <TableHead>Validée</TableHead>
                    <TableHead>Date début</TableHead>
                    <TableHead>Date fin</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => {
                    const pharmacie = entities?.find((e) => e.id === offer.pharmacieId);
                    return (
                      <TableRow key={offer.id} className="hover-elevate">
                        <TableCell className="font-medium" data-testid={`text-offer-titre-${offer.id}`}>
                          {offer.titre}
                        </TableCell>
                        <TableCell data-testid={`text-offer-type-${offer.id}`}>
                          <TypeBadge type={offer.type} />
                        </TableCell>
                        <TableCell data-testid={`text-offer-pharmacie-${offer.id}`}>
                          {pharmacie?.nom || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-offer-validee-${offer.id}`}>
                          {offer.validee ? (
                            <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-green-500/10 text-green-600">
                              <Check className="w-3 h-3 mr-1" /> Oui
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-muted text-muted-foreground">
                              <X className="w-3 h-3 mr-1" /> Non
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-offer-date-debut-${offer.id}`}>
                          {format(new Date(offer.dateDebut), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell data-testid={`text-offer-date-fin-${offer.id}`}>
                          {offer.dateFin ? format(new Date(offer.dateFin), "dd MMM yyyy", { locale: fr }) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedOffer(offer);
                                setIsViewOpen(true);
                              }}
                              data-testid={`button-view-offer-${offer.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canEdit && !offer.validee && (
                              <Button
                                size="sm"
                                onClick={() => validateMutation.mutate({ id: offer.id, validee: true })}
                                disabled={validateMutation.isPending}
                                data-testid={`button-validate-offer-${offer.id}`}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Valider
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          {selectedOffer && <OfferDetails offer={selectedOffer} entities={entities || []} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CreateOfferFormProps {
  pharmacies: Entity[];
  orders: Order[];
  onSuccess: () => void;
}

function CreateOfferForm({ pharmacies, orders, onSuccess }: CreateOfferFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState("");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [pharmacieId, setPharmacieId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [remisePourcentage, setRemisePourcentage] = useState("");
  const [packQuantite, setPackQuantite] = useState("");
  const [packGratuit, setPackGratuit] = useState("");
  const [miseEnPlaceQuantite, setMiseEnPlaceQuantite] = useState("");
  const [conditions, setConditions] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/offers", data);
    },
    onSuccess: () => {
      toast({ title: "Offre créée", description: "L'offre commerciale a été créée avec succès" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible de créer l'offre", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !titre) {
      toast({ title: "Erreur", description: "Veuillez remplir les champs obligatoires (type, titre)", variant: "destructive" });
      return;
    }

    const payload: any = {
      type,
      titre,
      description: description || null,
      laboratoireId: user?.entityId,
      pharmacieId: pharmacieId || null,
      orderId: orderId || null,
      conditions: conditions || null,
      dateDebut: dateDebut ? new Date(dateDebut).toISOString() : new Date().toISOString(),
      dateFin: dateFin ? new Date(dateFin).toISOString() : null,
    };

    if (type === "remise" && remisePourcentage) {
      payload.remisePourcentage = remisePourcentage;
    }
    if (type === "pack") {
      if (packQuantite) payload.packQuantite = parseInt(packQuantite);
      if (packGratuit) payload.packGratuit = parseInt(packGratuit);
    }
    if (type === "mise_en_place" && miseEnPlaceQuantite) {
      payload.miseEnPlaceQuantite = parseInt(miseEnPlaceQuantite);
    }

    createMutation.mutate(payload);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nouvelle offre commerciale</DialogTitle>
        <DialogDescription>Créez une offre pour une pharmacie</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type *</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger data-testid="select-offer-type">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remise">Remise</SelectItem>
                <SelectItem value="pack">Pack promotionnel</SelectItem>
                <SelectItem value="mise_en_place">Mise en place</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Titre *</label>
            <Input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Titre de l'offre"
              data-testid="input-offer-titre"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description de l'offre..."
            data-testid="textarea-offer-description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pharmacie</label>
            <Select value={pharmacieId} onValueChange={setPharmacieId}>
              <SelectTrigger data-testid="select-offer-pharmacie">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {pharmacies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Commande (optionnel)</label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger data-testid="select-offer-order">
                <SelectValue placeholder="Aucune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.id.slice(0, 8)}...</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              data-testid="input-offer-remise-pourcentage"
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
                data-testid="input-offer-pack-quantite"
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
                data-testid="input-offer-pack-gratuit"
              />
            </div>
          </div>
        )}

        {type === "mise_en_place" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Quantité mise en place</label>
            <Input
              type="number"
              min="1"
              value={miseEnPlaceQuantite}
              onChange={(e) => setMiseEnPlaceQuantite(e.target.value)}
              placeholder="Ex: 50"
              data-testid="input-offer-mise-en-place-quantite"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Conditions</label>
          <Textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder="Conditions de l'offre..."
            data-testid="textarea-offer-conditions"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date de début</label>
            <Input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              data-testid="input-offer-date-debut"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date de fin</label>
            <Input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              data-testid="input-offer-date-fin"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-offer">
            {createMutation.isPending ? "Création..." : "Créer l'offre"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

interface OfferDetailsProps {
  offer: CommercialOffer;
  entities: Entity[];
}

function OfferDetails({ offer, entities }: OfferDetailsProps) {
  const pharmacie = entities.find((e) => e.id === offer.pharmacieId);
  const laboratoire = entities.find((e) => e.id === offer.laboratoireId);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{offer.titre}</DialogTitle>
        <DialogDescription>Détails de l'offre commerciale</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-muted-foreground">Type</span>
            <div className="mt-1"><TypeBadge type={offer.type} /></div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Validée</span>
            <p className="font-medium" data-testid="text-detail-validee">{offer.validee ? "Oui" : "Non"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-muted-foreground">Laboratoire</span>
            <p className="font-medium">{laboratoire?.nom || "-"}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Pharmacie</span>
            <p className="font-medium">{pharmacie?.nom || "-"}</p>
          </div>
        </div>

        {offer.description && (
          <div>
            <span className="text-sm text-muted-foreground">Description</span>
            <p className="font-medium">{offer.description}</p>
          </div>
        )}

        {offer.type === "remise" && offer.remisePourcentage && (
          <div>
            <span className="text-sm text-muted-foreground">Remise</span>
            <p className="font-medium">{offer.remisePourcentage}%</p>
          </div>
        )}

        {offer.type === "pack" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Quantité achetée</span>
              <p className="font-medium">{offer.packQuantite ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Quantité gratuite</span>
              <p className="font-medium">{offer.packGratuit ?? "-"}</p>
            </div>
          </div>
        )}

        {offer.type === "mise_en_place" && offer.miseEnPlaceQuantite && (
          <div>
            <span className="text-sm text-muted-foreground">Quantité mise en place</span>
            <p className="font-medium">{offer.miseEnPlaceQuantite}</p>
          </div>
        )}

        {offer.conditions && (
          <div>
            <span className="text-sm text-muted-foreground">Conditions</span>
            <p className="font-medium">{offer.conditions}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-muted-foreground">Date de début</span>
            <p className="font-medium">{format(new Date(offer.dateDebut), "dd MMM yyyy", { locale: fr })}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Date de fin</span>
            <p className="font-medium">{offer.dateFin ? format(new Date(offer.dateFin), "dd MMM yyyy", { locale: fr }) : "-"}</p>
          </div>
        </div>

        <div>
          <span className="text-sm text-muted-foreground">Créée le</span>
          <p className="font-medium">{format(new Date(offer.createdAt), "dd MMM yyyy à HH:mm", { locale: fr })}</p>
        </div>
      </div>
    </>
  );
}
