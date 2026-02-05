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
  Trash2
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

  const { data: entities } = useQuery<Entity[]>({
    queryKey: ["/api/entities"]
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"]
  });

  const pharmacies = entities?.filter(e => e.type === "pharmacie") || [];
  const grossistes = entities?.filter(e => e.type === "grossiste") || [];

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.pharmacie?.nom?.toLowerCase().includes(search.toLowerCase()) ||
      order.grossiste?.nom?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const canCreateOrder = user?.role === "delegue" || user?.role === "admin";
  const canProcessOrder = user?.role === "grossiste" || user?.role === "admin";
  const canConfirmDelivery = user?.role === "pharmacie" || user?.role === "admin";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Commandes</h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === "delegue" ? "Gérez vos commandes" : 
             user?.role === "grossiste" ? "Traitez les commandes" :
             user?.role === "pharmacie" ? "Suivez vos commandes" :
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
                pharmacies={pharmacies}
                grossistes={grossistes}
                products={products || []}
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
                <SelectTrigger className="w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="brouillon">Brouillon</SelectItem>
                  <SelectItem value="envoyee">Envoyée</SelectItem>
                  <SelectItem value="acceptee">Acceptée</SelectItem>
                  <SelectItem value="refusee">Refusée</SelectItem>
                  <SelectItem value="partiellement_acceptee">Partiellement acceptée</SelectItem>
                  <SelectItem value="en_preparation">En préparation</SelectItem>
                  <SelectItem value="livree">Livrée</SelectItem>
                  <SelectItem value="cloturee">Clôturée</SelectItem>
                  <SelectItem value="litige">Litige</SelectItem>
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
                      <TableCell className="font-mono text-sm">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{order.pharmacie?.nom || "-"}</TableCell>
                      <TableCell>{order.grossiste?.nom || "-"}</TableCell>
                      <TableCell>
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
  pharmacies: Entity[];
  grossistes: Entity[];
  products: Product[];
  onSuccess: () => void;
}

function CreateOrderForm({ pharmacies, grossistes, products, onSuccess }: CreateOrderFormProps) {
  const { toast } = useToast();
  const [pharmacieId, setPharmacieId] = useState("");
  const [grossisteId, setGrossisteId] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [lines, setLines] = useState<{ productId: string; quantite: number }[]>([
    { productId: "", quantite: 1 }
  ]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return res;
    },
    onSuccess: () => {
      toast({ title: "Commande créée", description: "La commande a été créée avec succès" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer la commande", variant: "destructive" });
    }
  });

  const addLine = () => {
    setLines([...lines, { productId: "", quantite: 1 }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacieId || !grossisteId || lines.some(l => !l.productId)) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      pharmacieId,
      grossisteId,
      commentaire,
      lines: lines.map(l => ({
        productId: l.productId,
        quantiteCommandee: l.quantite
      }))
    });
  };

  const activeProducts = products.filter(p => p.status === "actif");

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nouvelle commande</DialogTitle>
        <DialogDescription>
          Créez une nouvelle commande pour une pharmacie
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pharmacie</label>
            <Select value={pharmacieId} onValueChange={setPharmacieId}>
              <SelectTrigger data-testid="select-pharmacie">
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
            <label className="text-sm font-medium">Grossiste</label>
            <Select value={grossisteId} onValueChange={setGrossisteId}>
              <SelectTrigger data-testid="select-grossiste">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {grossistes.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Produits</label>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </div>
          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select 
                  value={line.productId} 
                  onValueChange={(v) => updateLine(index, "productId", v)}
                >
                  <SelectTrigger className="flex-1" data-testid={`select-product-${index}`}>
                    <SelectValue placeholder="Produit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nom} - {p.forme} {p.dosage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={line.quantite}
                  onChange={(e) => updateLine(index, "quantite", parseInt(e.target.value) || 1)}
                  className="w-24"
                  data-testid={`input-quantity-${index}`}
                />
                {lines.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeLine(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
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
}

function OrderActions({ order, userRole }: OrderActionsProps) {
  const { toast } = useToast();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, commentaire }: { status: string; commentaire?: string }) => {
      return apiRequest("PATCH", `/api/orders/${order.id}/status`, { status, commentaire });
    },
    onSuccess: () => {
      toast({ title: "Statut mis à jour" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut", variant: "destructive" });
    }
  });

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate({ status: newStatus });
  };

  if (order.status === "brouillon" && (userRole === "delegue" || userRole === "admin")) {
    return (
      <Button
        size="sm"
        onClick={() => handleStatusChange("envoyee")}
        disabled={updateStatusMutation.isPending}
        data-testid={`button-send-order-${order.id}`}
      >
        <Send className="w-4 h-4 mr-1" />
        Envoyer
      </Button>
    );
  }

  if (order.status === "envoyee" && (userRole === "grossiste" || userRole === "admin")) {
    return (
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
          onClick={() => handleStatusChange("refusee")}
          disabled={updateStatusMutation.isPending}
          data-testid={`button-refuse-order-${order.id}`}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
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

  if (userRole === "pharmacie" && !["cloturee", "litige"].includes(order.status)) {
    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={() => handleStatusChange("litige")}
        disabled={updateStatusMutation.isPending}
        data-testid={`button-dispute-order-${order.id}`}
      >
        <AlertTriangle className="w-4 h-4 mr-1" />
        Litige
      </Button>
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

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          Commande {order.id.slice(0, 8)}
          <StatusBadge status={order.status} type="order" />
        </DialogTitle>
        <DialogDescription>
          Créée le {format(new Date(order.createdAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 mt-4">
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
                  <TableHead className="text-right">Qté commandée</TableHead>
                  <TableHead className="text-right">Qté acceptée</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines?.map((line) => (
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
                      <StatusBadge status={line.status} type="line" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {history && history.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((h: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <p>
                        <span className="font-medium">{h.ancienStatus || "Création"}</span>
                        {" → "}
                        <span className="font-medium">{h.nouveauStatus}</span>
                      </p>
                      <p className="text-muted-foreground">
                        {format(new Date(h.createdAt), "dd/MM/yyyy HH:mm")}
                        {h.commentaire && ` - ${h.commentaire}`}
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
