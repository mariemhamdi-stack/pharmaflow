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
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function OrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.pharmacie?.nom?.toLowerCase().includes(search.toLowerCase()) ||
      order.grossiste?.nom?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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
                    <TableHead>Pharmacie</TableHead>
                    <TableHead>Grossiste</TableHead>
                    <TableHead>Statut</TableHead>
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
                      <TableCell data-testid={`text-order-pharmacie-${order.id}`}>{order.pharmacie?.nom || "-"}</TableCell>
                      <TableCell data-testid={`text-order-grossiste-${order.id}`}>{order.grossiste?.nom || "-"}</TableCell>
                      <TableCell data-testid={`text-order-status-${order.id}`}>
                        <StatusBadge status={order.status} type="order" />
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

interface SearchableSelectProps {
  value: string;
  onSelect: (id: string, label: string) => void;
  searchUrl: string;
  placeholder: string;
  displayValue: string;
  testId: string;
  renderItem?: (item: any) => string;
}

function SearchableSelect({ value, onSelect, searchUrl, placeholder, displayValue, testId, renderItem }: SearchableSelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useState<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${searchUrl}${encodeURIComponent(q)}`, { credentials: "include" });
      const data = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const handleChange = (val: string) => {
    setSearch(val);
    if (timerRef[0]) clearTimeout(timerRef[0]);
    timerRef[0] = setTimeout(() => doSearch(val), 300);
  };

  return (
    <div className="relative">
      {value && displayValue ? (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-sm truncate px-3 py-2 border border-border rounded-md bg-muted" data-testid={`${testId}-display`}>
            {displayValue}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => { onSelect("", ""); setSearch(""); setResults([]); }}
            data-testid={`${testId}-clear`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <>
          <Input
            value={search}
            onChange={(e) => { handleChange(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            data-testid={testId}
          />
          {isOpen && search.length >= 2 && (
            <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto border border-border rounded-md bg-popover shadow-md">
              {loading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">Recherche...</div>
              ) : results.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">Aucun résultat</div>
              ) : (
                results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover-elevate"
                    onClick={() => {
                      const label = renderItem ? renderItem(item) : item.nom;
                      onSelect(item.id, label);
                      setSearch("");
                      setIsOpen(false);
                    }}
                    data-testid={`${testId}-option-${item.id}`}
                  >
                    {renderItem ? renderItem(item) : item.nom}
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface CreateOrderFormProps {
  onSuccess: () => void;
}

interface OrderLineState {
  productId: string;
  productNom: string;
  quantite: number;
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
  quantite: 1,
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
      toast({ title: "Commande cr\u00e9\u00e9e", description: "La commande a \u00e9t\u00e9 cr\u00e9\u00e9e en brouillon" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible de cr\u00e9er la commande", variant: "destructive" });
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
    if (!pharmacieId || !grossisteId || lines.some(l => !l.productId)) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      pharmacieId,
      grossisteId,
      commentaire,
      lines: lines.map(l => ({
        productId: l.productId,
        quantiteCommandee: l.quantite,
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
          Cr\u00e9ez une nouvelle commande pour une pharmacie
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pharmacie</label>
            <SearchableSelect
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
            <SearchableSelect
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
                    <SearchableSelect
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
                      onChange={(e) => updateLine(index, { quantite: parseInt(e.target.value) || 1 })}
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
                        <label className="text-xs font-medium">Pr\u00e9cision (Autre)</label>
                        <Input
                          type="text"
                          value={line.autre}
                          onChange={(e) => updateLine(index, { autre: e.target.value })}
                          placeholder="Pr\u00e9ciser le cas particulier..."
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
            placeholder="Instructions sp\u00e9ciales..."
            data-testid="textarea-commentaire"
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-order">
            {createMutation.isPending ? "Cr\u00e9ation..." : "Cr\u00e9er la commande"}
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
  const [refuseComment, setRefuseComment] = useState("");
  const [newGrossisteId, setNewGrossisteId] = useState("");

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, commentaire }: { status: string; commentaire?: string }) => {
      return apiRequest("PATCH", `/api/orders/${order.id}/status`, { status, commentaire });
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

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate({ status: newStatus });
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

  // Brouillon → Validee delegue (delegue only)
  if (order.status === "brouillon" && (userRole === "delegue" || userRole === "admin")) {
    return (
      <div className="flex gap-1">
        <Button
          size="sm"
          onClick={() => handleStatusChange("validee_delegue")}
          disabled={updateStatusMutation.isPending}
          data-testid={`button-validate-delegue-${order.id}`}
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Valider
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          data-testid={`button-cancel-order-${order.id}`}
        >
          <Ban className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Validee delegue → Validee pharmacie OR refuse back to brouillon (pharmacie only)
  if (order.status === "validee_delegue" && (userRole === "pharmacie" || userRole === "admin")) {
    return (
      <div className="flex gap-1">
        <Button
          size="sm"
          onClick={() => handleStatusChange("validee_pharmacie")}
          disabled={updateStatusMutation.isPending}
          data-testid={`button-validate-pharmacie-${order.id}`}
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Valider
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handlePharmacieRefuse}
          disabled={updateStatusMutation.isPending}
          data-testid={`button-refuse-pharmacie-${order.id}`}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Envoyee → acceptee/refusee (grossiste only)
  if (order.status === "envoyee" && (userRole === "grossiste" || userRole === "admin")) {
    return (
      <>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="default"
            onClick={() => handleStatusChange("acceptee")}
            disabled={updateStatusMutation.isPending}
            data-testid={`button-accept-order-${order.id}`}
          >
            <Check className="w-4 h-4" />
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
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            data-testid={`button-cancel-refused-${order.id}`}
          >
            <Ban className="w-4 h-4" />
          </Button>
        </div>

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

  if (order.status === "acceptee" && (userRole === "grossiste" || userRole === "admin")) {
    return (
      <Button
        size="sm"
        onClick={() => handleStatusChange("en_preparation")}
        disabled={updateStatusMutation.isPending}
        data-testid={`button-prepare-order-${order.id}`}
      >
        <Package className="w-4 h-4 mr-1" />
        Préparer
      </Button>
    );
  }

  if (order.status === "en_preparation" && (userRole === "grossiste" || userRole === "admin")) {
    return (
      <Button
        size="sm"
        onClick={() => handleStatusChange("livree")}
        disabled={updateStatusMutation.isPending}
        data-testid={`button-deliver-order-${order.id}`}
      >
        <Truck className="w-4 h-4 mr-1" />
        Livrer
      </Button>
    );
  }

  // Livree → cloturee OR litige (pharmacie only - litige ONLY after delivery)
  if (order.status === "livree" && (userRole === "pharmacie" || userRole === "admin")) {
    return (
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="default"
          onClick={() => handleStatusChange("cloturee")}
          disabled={updateStatusMutation.isPending}
          data-testid={`button-close-order-${order.id}`}
        >
          <Check className="w-4 h-4 mr-1" />
          Confirmer
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleStatusChange("litige")}
          disabled={updateStatusMutation.isPending}
          data-testid={`button-dispute-order-${order.id}`}
        >
          <AlertTriangle className="w-4 h-4" />
        </Button>
      </div>
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
  const { data: history } = useQuery<any[]>({
    queryKey: ["/api/orders", order.id, "history"]
  });

  const statusSteps = [
    { key: "brouillon", label: "Brouillon" },
    { key: "validee_delegue", label: "Validée délégué" },
    { key: "validee_pharmacie", label: "Validée pharmacie" },
    { key: "envoyee", label: "Envoyée" },
    { key: "acceptee", label: "Acceptée" },
    { key: "en_preparation", label: "En préparation" },
    { key: "livree", label: "Livrée" },
    { key: "cloturee", label: "Clôturée" }
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
                  <TableHead className="text-right">Qt\u00e9</TableHead>
                  <TableHead className="text-right">Accept\u00e9e</TableHead>
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
                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{line.product?.nom}</p>
                          <p className="text-xs text-muted-foreground">
                            {line.product?.forme} - {line.product?.dosage}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{line.quantiteCommandee}</TableCell>
                      <TableCell className="text-right">{line.quantiteAcceptee || "-"}</TableCell>
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
