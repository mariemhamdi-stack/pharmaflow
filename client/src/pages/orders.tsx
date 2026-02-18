import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { OrderWithRelations, Entity, Product } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Eye, 
  Send, 
  Check, 
  X, 
  Package, 
  Truck, 
  AlertTriangle,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  Ban,
  CheckCircle2,
  Clock,
  Percent,
  Gift,
  Ticket,
  PackageOpen,
  Star,
  ChevronDown,
  ChevronUp,
  SplitSquareHorizontal,
  Upload,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function OrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pharmacieFilter, setPharmacieFilter] = useState<string>("all");
  const [grossisteFilter, setGrossisteFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const { data: orders, isLoading } = useQuery<OrderWithRelations[]>({
    queryKey: ["/api/orders"]
  });

  const { data: allGrossistesList } = useQuery<Entity[]>({
    queryKey: ["/api/entities"],
    select: (data: Entity[]) => data.filter(e => e.type === "grossiste"),
  });

  const allGrossistes = allGrossistesList || [];

  const { data: allPharmaciesList } = useQuery<Entity[]>({
    queryKey: ["/api/entities"],
    select: (data: Entity[]) => data.filter(e => e.type === "pharmacie"),
  });
  const allPharmacies = allPharmaciesList || [];

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.pharmacie?.nom?.toLowerCase().includes(search.toLowerCase()) ||
      order.grossiste?.nom?.toLowerCase().includes(search.toLowerCase()) ||
      order.laboratoire?.nom?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPharmacie = pharmacieFilter === "all" || order.pharmacieId === pharmacieFilter;
    const matchesGrossiste = grossisteFilter === "all" || order.grossisteId === grossisteFilter;
    const matchesDateFrom = !dateFrom || new Date(order.createdAt) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(order.createdAt) <= new Date(dateTo + "T23:59:59");
    
    return matchesSearch && matchesStatus && matchesPharmacie && matchesGrossiste && matchesDateFrom && matchesDateTo;
  });

  const canCreateOrder = user?.role === "delegue" || user?.role === "admin";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-orders-title">Commandes</h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === "delegue" ? "Gérez vos commandes" : 
             user?.role === "grossiste" ? "Traitez les commandes" :
             user?.role === "pharmacie" ? "Suivez et validez vos commandes" :
             user?.role === "laboratoire" ? "Suivi des commandes de votre laboratoire" :
             "Toutes les commandes du système"}
          </p>
        </div>
        {canCreateOrder && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-order">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle commande
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <CreateOrderForm 
                onSuccess={() => {
                  setIsCreateOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-orders"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-56" data-testid="select-status-filter">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="brouillon">Brouillon</SelectItem>
                  <SelectItem value="validee_delegue">Validée délégué</SelectItem>
                  <SelectItem value="validee_pharmacie">Validée pharmacie</SelectItem>
                  <SelectItem value="envoyee">Envoyée</SelectItem>
                  <SelectItem value="acceptee">Acceptée</SelectItem>
                  <SelectItem value="refusee">Refusée</SelectItem>
                  <SelectItem value="partiellement_acceptee">Partiellement acceptée</SelectItem>
                  <SelectItem value="en_preparation">En préparation</SelectItem>
                  <SelectItem value="livree">Livrée</SelectItem>
                  <SelectItem value="cloturee">Clôturée</SelectItem>
                  <SelectItem value="litige">Litige</SelectItem>
                  <SelectItem value="annulee">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={pharmacieFilter} onValueChange={setPharmacieFilter}>
              <SelectTrigger className="w-48" data-testid="select-pharmacie-filter">
                <SelectValue placeholder="Pharmacie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les pharmacies</SelectItem>
                {allPharmacies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={grossisteFilter} onValueChange={setGrossisteFilter}>
              <SelectTrigger className="w-48" data-testid="select-grossiste-filter">
                <SelectValue placeholder="Grossiste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les grossistes</SelectItem>
                {allGrossistes.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
              data-testid="input-date-from"
            />
            <span className="text-muted-foreground text-sm">à</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
              data-testid="input-date-to"
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
          ) : filteredOrders?.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Aucune commande</h3>
              <p className="text-muted-foreground mt-1">
                {search || statusFilter !== "all" 
                  ? "Aucune commande ne correspond à vos critères" 
                  : "Commencez par créer une nouvelle commande"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Laboratoire</TableHead>
                    <TableHead>Pharmacie</TableHead>
                    <TableHead>Grossiste</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.map((order) => (
                    <TableRow key={order.id} className="hover-elevate">
                      <TableCell className="font-mono text-sm" data-testid={`text-order-ref-${order.id}`}>
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell data-testid={`text-order-labo-${order.id}`}>{order.laboratoire?.nom || "-"}</TableCell>
                      <TableCell data-testid={`text-order-pharmacie-${order.id}`}>{order.pharmacie?.nom || "-"}</TableCell>
                      <TableCell data-testid={`text-order-grossiste-${order.id}`}>{order.grossiste?.nom || "-"}</TableCell>
                      <TableCell data-testid={`text-order-status-${order.id}`}>
                        <StatusBadge status={order.status} type="order" />
                      </TableCell>
                      <TableCell data-testid={`text-order-docs-${order.id}`}>
                        <div className="flex items-center gap-1">
                          {order.bonLivraisonUrl && (
                            <a href={order.bonLivraisonUrl} target="_blank" rel="noopener noreferrer" title="Bon de livraison" className="text-foreground underline" data-testid={`link-bl-${order.id}`}>
                              <FileText className="w-4 h-4" />
                            </a>
                          )}
                          {order.bonReceptionUrl && (
                            <a href={order.bonReceptionUrl} target="_blank" rel="noopener noreferrer" title="Bon de reception" className="text-chart-4 underline" data-testid={`link-br-${order.id}`}>
                              <FileText className="w-4 h-4" />
                            </a>
                          )}
                          {!order.bonLivraisonUrl && !order.bonReceptionUrl && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.createdAt), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsViewOpen(true);
                            }}
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <OrderActions 
                            order={order} 
                            userRole={user?.role || ""} 
                            allGrossistes={allGrossistes}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <OrderDetails 
              order={selectedOrder} 
              userRole={user?.role || ""}
              onClose={() => setIsViewOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


interface CreateOrderFormProps {
  onSuccess: () => void;
}

interface OrderLineState {
  productId: string;
  productNom: string;
  quantite: string;
  remise: string;
  gratuite: string;
  bonAchat: string;
  pack: string;
  miseEnPlace: boolean;
  autreEnabled: boolean;
  autre: string;
  expanded: boolean;
}

const emptyLine = (): OrderLineState => ({
  productId: "",
  productNom: "",
  quantite: "1",
  remise: "",
  gratuite: "",
  bonAchat: "",
  pack: "",
  miseEnPlace: false,
  autreEnabled: false,
  autre: "",
  expanded: false,
});

function CreateOrderForm({ onSuccess }: CreateOrderFormProps) {
  const { toast } = useToast();
  const [pharmacieId, setPharmacieId] = useState("");
  const [pharmacieNom, setPharmacieNom] = useState("");
  const [grossisteId, setGrossisteId] = useState("");
  const [grossisteNom, setGrossisteNom] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [lines, setLines] = useState<OrderLineState[]>([emptyLine()]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/orders", data);
    },
    onSuccess: () => {
      toast({ title: "Commande créée", description: "La commande a été créée en brouillon" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible de créer la commande", variant: "destructive" });
    }
  });

  const addLine = () => {
    setLines([...lines, emptyLine()]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, updates: Partial<OrderLineState>) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], ...updates };
    setLines(newLines);
  };

  const toggleExpanded = (index: number) => {
    updateLine(index, { expanded: !lines[index].expanded });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasInvalidQty = lines.some(l => !l.productId || !l.quantite || parseInt(l.quantite) < 1);
    if (!pharmacieId || !grossisteId || hasInvalidQty) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires (produit et quantité >= 1)", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      pharmacieId,
      grossisteId,
      commentaire,
      lines: lines.map(l => ({
        productId: l.productId,
        quantiteCommandee: parseInt(l.quantite) || 1,
        remise: l.remise || null,
        gratuite: l.gratuite ? parseInt(l.gratuite) : null,
        bonAchat: l.bonAchat || null,
        pack: l.pack || null,
        miseEnPlace: l.miseEnPlace,
        autre: l.autreEnabled && l.autre.trim() ? l.autre.trim() : null,
      }))
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nouvelle commande</DialogTitle>
        <DialogDescription>
          Créez une nouvelle commande pour une pharmacie
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pharmacie</label>
            <SearchableCombobox
              value={pharmacieId}
              displayValue={pharmacieNom}
              onSelect={(id, label) => { setPharmacieId(id); setPharmacieNom(label); }}
              searchUrl="/api/entities/search?type=pharmacie&q="
              placeholder="Rechercher une pharmacie..."
              testId="search-pharmacie"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Grossiste</label>
            <SearchableCombobox
              value={grossisteId}
              displayValue={grossisteNom}
              onSelect={(id, label) => { setGrossisteId(id); setGrossisteNom(label); }}
              searchUrl="/api/entities/search?type=grossiste&q="
              placeholder="Rechercher un grossiste..."
              testId="search-grossiste"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-sm font-medium">Lignes de commande</label>
            <Button type="button" variant="outline" size="sm" onClick={addLine} data-testid="button-add-line">
              <Plus className="w-4 h-4 mr-1" /> Ajouter un produit
            </Button>
          </div>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SearchableCombobox
                      value={line.productId}
                      displayValue={line.productNom}
                      onSelect={(id, label) => updateLine(index, { productId: id, productNom: label })}
                      searchUrl="/api/products/search?q="
                      placeholder="Rechercher un produit..."
                      testId={`search-product-${index}`}
                      renderItem={(p: Product) => `${p.nom} - ${p.forme || ""} ${p.dosage || ""}`}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">Qte</label>
                    <Input
                      type="number"
                      min="1"
                      value={line.quantite}
                      onChange={(e) => updateLine(index, { quantite: e.target.value })}
                      className="w-20"
                      data-testid={`input-quantity-${index}`}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleExpanded(index)}
                    data-testid={`button-expand-line-${index}`}
                  >
                    {line.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  {lines.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(index)}
                      data-testid={`button-remove-line-${index}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>

                {line.expanded && (
                  <div className="mt-3 pt-3 border-t border-border space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium flex items-center gap-1">
                          <Percent className="w-3 h-3" /> Remise
                        </label>
                        <Input
                          type="text"
                          value={line.remise}
                          onChange={(e) => updateLine(index, { remise: e.target.value })}
                          placeholder="Ex: 10%"
                          data-testid={`input-remise-${index}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium flex items-center gap-1">
                          <Gift className="w-3 h-3" /> Gratuite
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={line.gratuite}
                          onChange={(e) => updateLine(index, { gratuite: e.target.value })}
                          placeholder="Qte gratuite"
                          data-testid={`input-gratuite-${index}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium flex items-center gap-1">
                          <Ticket className="w-3 h-3" /> Bon d'achat
                        </label>
                        <Input
                          type="text"
                          value={line.bonAchat}
                          onChange={(e) => updateLine(index, { bonAchat: e.target.value })}
                          placeholder="Valeur ou avantage"
                          data-testid={`input-bon-achat-${index}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium flex items-center gap-1">
                          <PackageOpen className="w-3 h-3" /> Pack
                        </label>
                        <Input
                          type="text"
                          value={line.pack}
                          onChange={(e) => updateLine(index, { pack: e.target.value })}
                          placeholder="Ex: 10+1 gratuit"
                          data-testid={`input-pack-${index}`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <Button
                        type="button"
                        variant={line.miseEnPlace ? "default" : "outline"}
                        size="sm"
                        className="toggle-elevate"
                        onClick={() => updateLine(index, { miseEnPlace: !line.miseEnPlace })}
                        data-testid={`button-mise-en-place-${index}`}
                      >
                        <Star className="w-4 h-4 mr-1" />
                        Mise en place
                      </Button>
                      <Button
                        type="button"
                        variant={line.autreEnabled ? "default" : "outline"}
                        size="sm"
                        className="toggle-elevate"
                        onClick={() => {
                          updateLine(index, { autreEnabled: !line.autreEnabled, autre: !line.autreEnabled ? line.autre : "" });
                        }}
                        data-testid={`button-autre-toggle-${index}`}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Autre
                      </Button>
                    </div>

                    {line.autreEnabled && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Précision (Autre)</label>
                        <Input
                          type="text"
                          value={line.autre}
                          onChange={(e) => updateLine(index, { autre: e.target.value })}
                          placeholder="Préciser le cas particulier..."
                          data-testid={`input-autre-${index}`}
                        />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Commentaire (optionnel)</label>
          <Textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Instructions spéciales..."
            data-testid="textarea-commentaire"
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-order">
            {createMutation.isPending ? "Création..." : "Créer la commande"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

interface OrderActionsProps {
  order: OrderWithRelations;
  userRole: string;
  allGrossistes: Entity[];
}

function OrderActions({ order, userRole, allGrossistes }: OrderActionsProps) {
  const { toast } = useToast();
  const [showRefuseDialog, setShowRefuseDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showPartialDialog, setShowPartialDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showLitigeDialog, setShowLitigeDialog] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{ status: string; title: string; message: string } | null>(null);
  const [litigeMotif, setLitigeMotif] = useState("");
  const [refuseComment, setRefuseComment] = useState("");
  const [blFile, setBlFile] = useState<File | null>(null);
  const [brFile, setBrFile] = useState<File | null>(null);
  const [newGrossisteId, setNewGrossisteId] = useState("");
  const [partialLines, setPartialLines] = useState<{ id: string; productName: string; quantiteCommandee: number; quantiteAcceptee: string }[]>([]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, commentaire, lines }: { status: string; commentaire?: string; lines?: any[] }) => {
      return apiRequest("PATCH", `/api/orders/${order.id}/status`, { status, commentaire, lines });
    },
    onSuccess: () => {
      toast({ title: "Statut mis à jour" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible de mettre à jour le statut", variant: "destructive" });
    }
  });

  const reassignMutation = useMutation({
    mutationFn: async (grossisteId: string) => {
      return apiRequest("PATCH", `/api/orders/${order.id}/reassign`, { grossisteId });
    },
    onSuccess: () => {
      toast({ title: "Commande réattribuée" });
      setShowReassignDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible de réattribuer", variant: "destructive" });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/orders/${order.id}/cancel`, {});
    },
    onSuccess: () => {
      toast({ title: "Commande annulée" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible d'annuler", variant: "destructive" });
    }
  });

  const uploadAndDeliver = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("type", "bon_livraison");
      const uploadRes = await fetch(`/api/orders/${order.id}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (!uploadRes.ok) throw new Error("Erreur lors du televersement du BL");
      const statusRes = await apiRequest("PATCH", `/api/orders/${order.id}/status`, { status: "livree" });
      return statusRes;
    },
    onSuccess: () => {
      toast({ title: "Commande livrée avec BL" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setShowDeliveryDialog(false);
      setBlFile(null);
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const uploadBRAndClose = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("type", "bon_reception");
      const uploadRes = await fetch(`/api/orders/${order.id}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (!uploadRes.ok) throw new Error("Erreur lors du televersement du BR");
      const statusRes = await apiRequest("PATCH", `/api/orders/${order.id}/status`, { status: "cloturee" });
      return statusRes;
    },
    onSuccess: () => {
      toast({ title: "Commande cloturee avec BR" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setShowCloseDialog(false);
      setBrFile(null);
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const handleStatusChange = (newStatus: string, commentaire?: string) => {
    updateStatusMutation.mutate({ status: newStatus, commentaire });
  };

  const handleRefuse = () => {
    if (!refuseComment.trim()) {
      toast({ title: "Erreur", description: "Le motif de refus est obligatoire", variant: "destructive" });
      return;
    }
    updateStatusMutation.mutate({ status: "refusee", commentaire: refuseComment });
    setShowRefuseDialog(false);
    setRefuseComment("");
  };

  const handlePharmacieRefuse = () => {
    updateStatusMutation.mutate({ status: "brouillon", commentaire: "Refusée par la pharmacie" });
  };

  const confirmDialog = (
    <Dialog open={!!showConfirmDialog} onOpenChange={(open) => !open && setShowConfirmDialog(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{showConfirmDialog?.title}</DialogTitle>
          <DialogDescription>{showConfirmDialog?.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowConfirmDialog(null)} data-testid="button-cancel-confirm">Non</Button>
          <Button onClick={() => {
            const s = showConfirmDialog!.status;
            if (s === "brouillon") {
              updateStatusMutation.mutate({ status: "brouillon", commentaire: "Refusée par la pharmacie" });
            } else {
              handleStatusChange(s);
            }
            setShowConfirmDialog(null);
          }} disabled={updateStatusMutation.isPending} data-testid="button-yes-confirm">
            Oui, confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Brouillon → Validee delegue (delegue only)
  if (order.status === "brouillon" && (userRole === "delegue" || userRole === "admin")) {
    return (
      <>
        <div className="flex gap-1">
          <Button
            size="sm"
            onClick={() => setShowConfirmDialog({ status: "validee_delegue", title: "Valider la commande", message: "Êtes-vous sûr de vouloir valider cette commande ? Elle sera envoyée à la pharmacie pour validation." })}
            disabled={updateStatusMutation.isPending}
            data-testid={`button-validate-delegue-${order.id}`}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Valider
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowCancelDialog(true)}
            disabled={cancelMutation.isPending}
            data-testid={`button-cancel-order-${order.id}`}
          >
            <Ban className="w-4 h-4" />
          </Button>
        </div>
        {confirmDialog}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Annuler la commande</DialogTitle>
              <DialogDescription>Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Non, garder</Button>
              <Button variant="destructive" onClick={() => { cancelMutation.mutate(); setShowCancelDialog(false); }} disabled={cancelMutation.isPending} data-testid="button-confirm-cancel">
                Oui, annuler
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Validee delegue → Validee pharmacie OR refuse back to brouillon (pharmacie only)
  if (order.status === "validee_delegue" && (userRole === "pharmacie" || userRole === "admin")) {
    return (
      <>
        <div className="flex gap-1">
          <Button
            size="sm"
            onClick={() => setShowConfirmDialog({ status: "validee_pharmacie", title: "Valider la commande", message: "Êtes-vous sûr de vouloir valider cette commande ? Elle sera automatiquement envoyée au grossiste." })}
            disabled={updateStatusMutation.isPending}
            data-testid={`button-validate-pharmacie-${order.id}`}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Valider
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowConfirmDialog({ status: "brouillon", title: "Refuser la commande", message: "Êtes-vous sûr de vouloir refuser cette commande ? Elle reviendra en brouillon." })}
            disabled={updateStatusMutation.isPending}
            data-testid={`button-refuse-pharmacie-${order.id}`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {confirmDialog}
      </>
    );
  }

  const openPartialDialog = () => {
    if (order.lines && order.lines.length > 0) {
      setPartialLines(order.lines.map(l => ({
        id: l.id,
        productName: l.product?.nom || "Produit",
        quantiteCommandee: l.quantiteCommandee,
        quantiteAcceptee: String(l.quantiteCommandee)
      })));
      setShowPartialDialog(true);
    }
  };

  const handlePartialAccept = () => {
    const parsed = partialLines.map(l => ({ ...l, qty: Math.max(0, Math.min(l.quantiteCommandee, parseInt(l.quantiteAcceptee) || 0)) }));
    const hasPartialChange = parsed.some(l => l.qty < l.quantiteCommandee);
    if (!hasPartialChange) {
      toast({ title: "Erreur", description: "Modifiez au moins une quantité pour une acceptation partielle", variant: "destructive" });
      return;
    }
    const allZero = parsed.every(l => l.qty === 0);
    if (allZero) {
      toast({ title: "Erreur", description: "Toutes les quantités sont à zéro. Utilisez le refus total.", variant: "destructive" });
      return;
    }
    updateStatusMutation.mutate({
      status: "partiellement_acceptee",
      lines: parsed.map(l => ({
        id: l.id,
        quantiteCommandee: l.quantiteCommandee,
        quantiteAcceptee: l.qty
      }))
    });
    setShowPartialDialog(false);
  };

  // Envoyee → acceptee/refusee/partiellement_acceptee (grossiste only)
  if (order.status === "envoyee" && (userRole === "grossiste" || userRole === "admin")) {
    return (
      <>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="default"
            onClick={() => setShowConfirmDialog({ status: "acceptee", title: "Accepter la commande", message: "Êtes-vous sûr de vouloir accepter cette commande en totalité ?" })}
            disabled={updateStatusMutation.isPending}
            data-testid={`button-accept-order-${order.id}`}
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={openPartialDialog}
            disabled={updateStatusMutation.isPending}
            data-testid={`button-partial-order-${order.id}`}
          >
            <SplitSquareHorizontal className="w-4 h-4 mr-1" />
            Partiel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowRefuseDialog(true)}
            disabled={updateStatusMutation.isPending}
            data-testid={`button-refuse-order-${order.id}`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <Dialog open={showPartialDialog} onOpenChange={setShowPartialDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Acceptation partielle</DialogTitle>
              <DialogDescription>
                Indiquez les quantites acceptees pour chaque produit. Les quantites refusees seront calculees automatiquement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {partialLines.map((line, index) => (
                <Card key={line.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{line.productName}</p>
                        <p className="text-xs text-muted-foreground">Commandee : {line.quantiteCommandee}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Acceptee :</label>
                        <Input
                          type="number"
                          min={0}
                          max={line.quantiteCommandee}
                          value={line.quantiteAcceptee}
                          onChange={(e) => {
                            setPartialLines(prev => prev.map((l, i) => i === index ? { ...l, quantiteAcceptee: e.target.value } : l));
                          }}
                          className="w-20"
                          data-testid={`input-partial-qty-${line.id}`}
                        />
                      </div>
                    </div>
                    {(parseInt(line.quantiteAcceptee) || 0) < line.quantiteCommandee && (
                      <p className="text-xs text-destructive mt-1">
                        Refusee : {line.quantiteCommandee - (parseInt(line.quantiteAcceptee) || 0)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPartialDialog(false)}>Annuler</Button>
              <Button onClick={handlePartialAccept} disabled={updateStatusMutation.isPending} data-testid="button-confirm-partial">
                Confirmer l'acceptation partielle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRefuseDialog} onOpenChange={setShowRefuseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Refuser la commande</DialogTitle>
              <DialogDescription>Le motif de refus est obligatoire</DialogDescription>
            </DialogHeader>
            <Textarea
              value={refuseComment}
              onChange={(e) => setRefuseComment(e.target.value)}
              placeholder="Motif de refus..."
              data-testid="textarea-refuse-motif"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRefuseDialog(false)}>Annuler</Button>
              <Button variant="destructive" onClick={handleRefuse} disabled={updateStatusMutation.isPending} data-testid="button-confirm-refuse">
                Confirmer le refus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {confirmDialog}
      </>
    );
  }

  // Refusee → reassign or cancel (delegue only)
  if (order.status === "refusee" && (userRole === "delegue" || userRole === "admin")) {
    const availableGrossistes = allGrossistes.filter(g => g.id !== order.grossisteId && !g.blocked);
    return (
      <>
        <div className="flex gap-1">
          <Button
            size="sm"
            onClick={() => setShowReassignDialog(true)}
            disabled={reassignMutation.isPending}
            data-testid={`button-reassign-order-${order.id}`}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Réattribuer
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowCancelDialog(true)}
            disabled={cancelMutation.isPending}
            data-testid={`button-cancel-refused-${order.id}`}
          >
            <Ban className="w-4 h-4" />
          </Button>
        </div>

        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Annuler la commande</DialogTitle>
              <DialogDescription>Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Non, garder</Button>
              <Button variant="destructive" onClick={() => { cancelMutation.mutate(); setShowCancelDialog(false); }} disabled={cancelMutation.isPending} data-testid="button-confirm-cancel">
                Oui, annuler
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Réattribuer la commande</DialogTitle>
              <DialogDescription>
                Sélectionnez un autre grossiste pour cette commande
              </DialogDescription>
            </DialogHeader>
            {order.motifRefus && (
              <div className="p-3 rounded-md bg-destructive/10 text-sm">
                <p className="font-medium text-destructive">Motif du refus :</p>
                <p className="text-foreground mt-1">{order.motifRefus}</p>
              </div>
            )}
            <Select value={newGrossisteId} onValueChange={setNewGrossisteId}>
              <SelectTrigger data-testid="select-new-grossiste">
                <SelectValue placeholder="Choisir un grossiste..." />
              </SelectTrigger>
              <SelectContent>
                {availableGrossistes.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReassignDialog(false)}>Annuler</Button>
              <Button 
                onClick={() => newGrossisteId && reassignMutation.mutate(newGrossisteId)} 
                disabled={!newGrossisteId || reassignMutation.isPending}
                data-testid="button-confirm-reassign"
              >
                Réattribuer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if ((order.status === "acceptee" || order.status === "partiellement_acceptee") && (userRole === "grossiste" || userRole === "admin")) {
    return (
      <>
        <Button
          size="sm"
          onClick={() => setShowConfirmDialog({ status: "en_preparation", title: "Préparer la commande", message: "Êtes-vous sûr de vouloir passer cette commande en préparation ?" })}
          disabled={updateStatusMutation.isPending}
          data-testid={`button-prepare-order-${order.id}`}
        >
          <Package className="w-4 h-4 mr-1" />
          Préparer
        </Button>
        {confirmDialog}
      </>
    );
  }

  if (order.status === "en_preparation" && (userRole === "grossiste" || userRole === "admin")) {
    return (
      <>
        <Button
          size="sm"
          onClick={() => {
            if (order.bonLivraisonUrl) {
              setShowConfirmDialog({ status: "livree", title: "Marquer comme livrée", message: "Êtes-vous sûr de vouloir marquer cette commande comme livrée ?" });
            } else {
              setShowDeliveryDialog(true);
            }
          }}
          disabled={updateStatusMutation.isPending || uploadAndDeliver.isPending}
          data-testid={`button-deliver-order-${order.id}`}
        >
          <Truck className="w-4 h-4 mr-1" />
          Livrer
        </Button>
        {confirmDialog}
        <Dialog open={showDeliveryDialog} onOpenChange={(open) => { if (!open) { setShowDeliveryDialog(false); setBlFile(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Televersez le bon de livraison</DialogTitle>
              <DialogDescription>Le bon de livraison (BL) est obligatoire avant de marquer la commande comme livree.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setBlFile(e.target.files?.[0] || null)}
                  data-testid="input-upload-bl-delivery"
                />
                <div className="border-2 border-dashed rounded-md p-6 text-center hover-elevate cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  {blFile ? (
                    <p className="text-sm font-medium">{blFile.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Cliquez pour selectionner le BL (PDF, JPG, PNG)</p>
                  )}
                </div>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDeliveryDialog(false); setBlFile(null); }}>Annuler</Button>
              <Button
                onClick={() => blFile && uploadAndDeliver.mutate(blFile)}
                disabled={!blFile || uploadAndDeliver.isPending}
                data-testid="button-confirm-delivery"
              >
                {uploadAndDeliver.isPending ? "Envoi..." : "Televerser et livrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Livree → cloturee OR litige (pharmacie only - litige ONLY after delivery)
  if (order.status === "livree" && (userRole === "pharmacie" || userRole === "admin")) {
    return (
      <>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              if (order.bonReceptionUrl) {
                setShowConfirmDialog({ status: "cloturee", title: "Clôturer la commande", message: "Êtes-vous sûr de vouloir confirmer la réception et clôturer cette commande ?" });
              } else {
                setShowCloseDialog(true);
              }
            }}
            disabled={updateStatusMutation.isPending || uploadBRAndClose.isPending}
            data-testid={`button-close-order-${order.id}`}
          >
            <Check className="w-4 h-4 mr-1" />
            Confirmer
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowLitigeDialog(true)}
            disabled={updateStatusMutation.isPending}
            data-testid={`button-dispute-order-${order.id}`}
          >
            <AlertTriangle className="w-4 h-4" />
          </Button>
        </div>
        <Dialog open={showCloseDialog} onOpenChange={(open) => { if (!open) { setShowCloseDialog(false); setBrFile(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Televersez le bon de reception</DialogTitle>
              <DialogDescription>Le bon de reception (BR) est obligatoire avant de cloturer la commande.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setBrFile(e.target.files?.[0] || null)}
                  data-testid="input-upload-br-close"
                />
                <div className="border-2 border-dashed rounded-md p-6 text-center hover-elevate cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  {brFile ? (
                    <p className="text-sm font-medium">{brFile.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Cliquez pour selectionner le BR (PDF, JPG, PNG)</p>
                  )}
                </div>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCloseDialog(false); setBrFile(null); }}>Annuler</Button>
              <Button
                onClick={() => brFile && uploadBRAndClose.mutate(brFile)}
                disabled={!brFile || uploadBRAndClose.isPending}
                data-testid="button-confirm-close"
              >
                {uploadBRAndClose.isPending ? "Envoi..." : "Televerser et cloturer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={showLitigeDialog} onOpenChange={setShowLitigeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Déclarer un litige</DialogTitle>
              <DialogDescription>Veuillez décrire le motif du litige. Cette information est obligatoire.</DialogDescription>
            </DialogHeader>
            <Textarea
              value={litigeMotif}
              onChange={(e) => setLitigeMotif(e.target.value)}
              placeholder="Motif du litige..."
              data-testid="textarea-litige-motif"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLitigeDialog(false)}>Annuler</Button>
              <Button variant="destructive" onClick={() => {
                if (!litigeMotif.trim()) {
                  toast({ title: "Erreur", description: "Le motif du litige est obligatoire", variant: "destructive" });
                  return;
                }
                updateStatusMutation.mutate({ status: "litige", commentaire: litigeMotif });
                setShowLitigeDialog(false);
                setLitigeMotif("");
              }} disabled={updateStatusMutation.isPending} data-testid="button-confirm-litige">
                Déclarer le litige
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {confirmDialog}
      </>
    );
  }

  return null;
}

interface OrderDetailsProps {
  order: OrderWithRelations;
  userRole: string;
  onClose: () => void;
}

function OrderDetails({ order, userRole, onClose }: OrderDetailsProps) {
  const { toast } = useToast();
  const [uploadingBL, setUploadingBL] = useState(false);
  const [uploadingBR, setUploadingBR] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("type", type);
      const res = await fetch(`/api/orders/${order.id}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (!res.ok) throw new Error("Upload échoué");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Document téléversé" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec du téléversement", variant: "destructive" });
    }
  });

  const { data: history } = useQuery<any[]>({
    queryKey: ["/api/orders", order.id, "history"]
  });

  const isPartial = order.status === "partiellement_acceptee" || 
    (order.lines?.some(l => l.status === "partiellement_acceptee" || l.status === "refusee") && 
     !["brouillon", "validee_delegue", "validee_pharmacie", "envoyee", "refusee", "annulee"].includes(order.status));
  
  const statusSteps = [
    { key: "brouillon", label: "Brouillon" },
    { key: "validee_delegue", label: "Valid\u00e9e d\u00e9l\u00e9gu\u00e9" },
    { key: "validee_pharmacie", label: "Valid\u00e9e pharmacie" },
    { key: "envoyee", label: "Envoy\u00e9e" },
    { key: isPartial ? "partiellement_acceptee" : "acceptee", label: isPartial ? "Partielle" : "Accept\u00e9e" },
    { key: "en_preparation", label: "En pr\u00e9paration" },
    { key: "livree", label: "Livr\u00e9e" },
    { key: "cloturee", label: "Cl\u00f4tur\u00e9e" }
  ];

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 flex-wrap">
          Commande {order.id.slice(0, 8)}
          <StatusBadge status={order.status} type="order" />
        </DialogTitle>
        <DialogDescription>
          Créée le {format(new Date(order.createdAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 mt-4">
        {!["refusee", "annulee", "litige"].includes(order.status) && (
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {statusSteps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <div key={step.key} className="flex items-center gap-1 min-w-0">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 ${
                    isCompleted ? "bg-chart-4 text-white" :
                    isCurrent ? "bg-primary text-primary-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {isCompleted ? <Check className="w-3 h-3" /> : index + 1}
                  </div>
                  <span className={`text-xs whitespace-nowrap ${
                    isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}>
                    {step.label}
                  </span>
                  {index < statusSteps.length - 1 && (
                    <div className={`w-4 h-0.5 shrink-0 ${isCompleted ? "bg-chart-4" : "bg-muted"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pharmacie</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{order.pharmacie?.nom}</p>
              <p className="text-sm text-muted-foreground">{order.pharmacie?.adresse}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Grossiste</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{order.grossiste?.nom}</p>
              <p className="text-sm text-muted-foreground">{order.grossiste?.adresse}</p>
            </CardContent>
          </Card>
        </div>

        {order.motifRefus && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive">Motif de refus</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{order.motifRefus}</p>
            </CardContent>
          </Card>
        )}

        {order.motifLitige && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive">Motif du litige</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{order.motifLitige}</p>
            </CardContent>
          </Card>
        )}

        {order.commentaire && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Commentaire</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{order.commentaire}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lignes de commande</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Commandee</TableHead>
                  <TableHead className="text-right">Acceptee</TableHead>
                  <TableHead className="text-right">Refusee</TableHead>
                  <TableHead>Avantages</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines?.map((line) => {
                  const advantages: string[] = [];
                  if (line.remise) advantages.push(`Remise: ${line.remise}`);
                  if (line.gratuite) advantages.push(`Gratuite: ${line.gratuite}`);
                  if (line.bonAchat) advantages.push(`Bon: ${line.bonAchat}`);
                  if (line.pack) advantages.push(`Pack: ${line.pack}`);
                  if (line.miseEnPlace) advantages.push("Mise en place");
                  if (line.autre) advantages.push(`Autre: ${line.autre}`);
                  const quantiteRefusee = line.quantiteAcceptee !== null && line.quantiteAcceptee !== undefined
                    ? line.quantiteCommandee - line.quantiteAcceptee
                    : null;
                  return (
                    <TableRow key={line.id} data-testid={`row-orderline-${line.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{line.product?.nom}</p>
                          <p className="text-xs text-muted-foreground">
                            {line.product?.forme} - {line.product?.dosage}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-qty-ordered-${line.id}`}>{line.quantiteCommandee}</TableCell>
                      <TableCell className="text-right" data-testid={`text-qty-accepted-${line.id}`}>
                        {line.quantiteAcceptee !== null && line.quantiteAcceptee !== undefined ? line.quantiteAcceptee : "-"}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-qty-refused-${line.id}`}>
                        {quantiteRefusee !== null && quantiteRefusee > 0 ? (
                          <span className="text-destructive font-medium">{quantiteRefusee}</span>
                        ) : quantiteRefusee === 0 ? (
                          <span>0</span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {advantages.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {advantages.map((a, i) => (
                              <span key={i} className="text-xs text-muted-foreground">{a}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={line.status} type="line" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dates clés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Création</p>
                <p className="font-medium">{format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
              </div>
              {order.validatedByDelegueAt && (
                <div>
                  <p className="text-muted-foreground">Validation délégué</p>
                  <p className="font-medium">{format(new Date(order.validatedByDelegueAt), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
                </div>
              )}
              {order.validatedByPharmacieAt && (
                <div>
                  <p className="text-muted-foreground">Validation pharmacie</p>
                  <p className="font-medium">{format(new Date(order.validatedByPharmacieAt), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
                </div>
              )}
              {order.sentAt && (
                <div>
                  <p className="text-muted-foreground">Envoi au grossiste</p>
                  <p className="font-medium">{format(new Date(order.sentAt), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
                </div>
              )}
              {order.livreeAt && (
                <div>
                  <p className="text-muted-foreground">Livraison</p>
                  <p className="font-medium">{format(new Date(order.livreeAt), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
                </div>
              )}
              {order.clotureeAt && (
                <div>
                  <p className="text-muted-foreground">Clôture</p>
                  <p className="font-medium">{format(new Date(order.clotureeAt), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-sm font-medium">Bon de livraison</p>
                  {order.bonLivraisonUrl ? (
                    <a href={order.bonLivraisonUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground underline flex items-center gap-1" data-testid="link-bon-livraison">
                      <FileText className="w-3 h-3" /> Voir le document
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">Non fourni</p>
                  )}
                </div>
                {(userRole === "grossiste" || userRole === "admin") && ["acceptee", "partiellement_acceptee", "en_preparation", "livree", "cloturee"].includes(order.status) && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadMutation.mutate({ file, type: "bon_livraison" });
                      }}
                      data-testid="input-upload-bl"
                    />
                    <Button size="sm" variant="outline" asChild>
                      <span><Upload className="w-3 h-3 mr-1" /> {uploadMutation.isPending ? "..." : "Téléverser BL"}</span>
                    </Button>
                  </label>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-sm font-medium">Bon de réception</p>
                  {order.bonReceptionUrl ? (
                    <a href={order.bonReceptionUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground underline flex items-center gap-1" data-testid="link-bon-reception">
                      <FileText className="w-3 h-3" /> Voir le document
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">Non fourni</p>
                  )}
                </div>
                {(userRole === "pharmacie" || userRole === "admin") && ["livree", "cloturee"].includes(order.status) && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadMutation.mutate({ file, type: "bon_reception" });
                      }}
                      data-testid="input-upload-br"
                    />
                    <Button size="sm" variant="outline" asChild>
                      <span><Upload className="w-3 h-3 mr-1" /> {uploadMutation.isPending ? "..." : "Téléverser BR"}</span>
                    </Button>
                  </label>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {history && history.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-foreground">
                        {entry.ancienStatus && (
                          <span className="text-muted-foreground">{entry.ancienStatus}</span>
                        )}
                        {entry.ancienStatus && " \u2192 "}
                        <span className="font-medium">{entry.nouveauStatus}</span>
                      </p>
                      {entry.commentaire && (
                        <p className="text-muted-foreground text-xs mt-0.5">{entry.commentaire}</p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}
                        {entry.role && ` - ${entry.role}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
