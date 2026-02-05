import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Product, Entity } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pill, Edit, Package } from "lucide-react";

export default function ProductsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"]
  });

  const { data: entities } = useQuery<Entity[]>({
    queryKey: ["/api/entities"]
  });

  const laboratoires = entities?.filter(e => e.type === "laboratoire") || [];

  const filteredProducts = products?.filter(product => 
    product.nom.toLowerCase().includes(search.toLowerCase()) ||
    product.code.toLowerCase().includes(search.toLowerCase()) ||
    product.forme?.toLowerCase().includes(search.toLowerCase())
  );

  const canManageProducts = user?.role === "admin" || user?.role === "laboratoire";

  const getLaboratoireName = (id: string) => {
    return laboratoires.find(l => l.id === id)?.nom || "-";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Catalogue produits</h1>
          <p className="text-muted-foreground mt-1">
            {canManageProducts ? "Gérez le catalogue de produits" : "Consultez les produits disponibles"}
          </p>
        </div>
        {canManageProducts && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-product">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau produit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <ProductForm 
                laboratoires={laboratoires}
                onSuccess={() => {
                  setIsCreateOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/products"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-products"
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
          ) : filteredProducts?.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Aucun produit</h3>
              <p className="text-muted-foreground mt-1">
                {search ? "Aucun produit ne correspond à votre recherche" : "Commencez par ajouter des produits"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Forme</TableHead>
                    <TableHead>Dosage</TableHead>
                    <TableHead>Laboratoire</TableHead>
                    <TableHead>Statut</TableHead>
                    {canManageProducts && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts?.map((product) => (
                    <TableRow key={product.id} className="hover-elevate">
                      <TableCell className="font-mono text-sm">{product.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                            <Pill className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium">{product.nom}</span>
                        </div>
                      </TableCell>
                      <TableCell>{product.forme || "-"}</TableCell>
                      <TableCell>{product.dosage || "-"}</TableCell>
                      <TableCell>{getLaboratoireName(product.laboratoireId)}</TableCell>
                      <TableCell>
                        <StatusBadge status={product.status} type="product" />
                      </TableCell>
                      {canManageProducts && (
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingProduct(product)}
                            data-testid={`button-edit-product-${product.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          {editingProduct && (
            <ProductForm 
              product={editingProduct}
              laboratoires={laboratoires}
              onSuccess={() => {
                setEditingProduct(null);
                queryClient.invalidateQueries({ queryKey: ["/api/products"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ProductFormProps {
  product?: Product;
  laboratoires: Entity[];
  onSuccess: () => void;
}

function ProductForm({ product, laboratoires, onSuccess }: ProductFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState(product?.code || "");
  const [nom, setNom] = useState(product?.nom || "");
  const [forme, setForme] = useState(product?.forme || "");
  const [dosage, setDosage] = useState(product?.dosage || "");
  const [laboratoireId, setLaboratoireId] = useState(product?.laboratoireId || user?.entityId || "");
  const [status, setStatus] = useState(product?.status || "actif");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (product) {
        return apiRequest("PATCH", `/api/products/${product.id}`, data);
      }
      return apiRequest("POST", "/api/products", data);
    },
    onSuccess: () => {
      toast({ 
        title: product ? "Produit modifié" : "Produit créé",
        description: product ? "Le produit a été mis à jour" : "Le produit a été ajouté au catalogue"
      });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Une erreur s'est produite", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !nom || !laboratoireId) {
      toast({ title: "Erreur", description: "Veuillez remplir les champs obligatoires", variant: "destructive" });
      return;
    }
    mutation.mutate({ code, nom, forme, dosage, laboratoireId, status });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{product ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
        <DialogDescription>
          {product ? "Modifiez les informations du produit" : "Ajoutez un nouveau produit au catalogue"}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Code *</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="PRD-001"
              data-testid="input-product-code"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nom *</label>
            <Input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom du produit"
              data-testid="input-product-name"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Forme</label>
            <Input
              value={forme}
              onChange={(e) => setForme(e.target.value)}
              placeholder="Comprimé, Sirop..."
              data-testid="input-product-forme"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dosage</label>
            <Input
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="500mg, 10ml..."
              data-testid="input-product-dosage"
            />
          </div>
        </div>

        {user?.role === "admin" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Laboratoire *</label>
            <Select value={laboratoireId} onValueChange={setLaboratoireId}>
              <SelectTrigger data-testid="select-product-laboratoire">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {laboratoires.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Statut</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid="select-product-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="actif">Actif</SelectItem>
              <SelectItem value="inactif">Inactif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-product">
            {mutation.isPending ? "Enregistrement..." : (product ? "Modifier" : "Créer")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
