import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Grossiste } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterCombobox } from "@/components/ui/filter-combobox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Truck, Upload, FileSpreadsheet } from "lucide-react";

export default function GrossistesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterSecteur, setFilterSecteur] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGrossiste, setEditingGrossiste] = useState<Grossiste | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: grossistes, isLoading } = useQuery<Grossiste[]>({
    queryKey: ["/api/grossistes"]
  });

  const regions = Array.from(new Set(grossistes?.map(e => e.region).filter(Boolean) as string[])).sort();
  const secteurs = Array.from(new Set(grossistes?.map(e => e.secteur).filter(Boolean) as string[])).sort();

  const filteredGrossistes = grossistes?.filter(g => {
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || (
      g.nom.toLowerCase().includes(searchLower) ||
      g.email1?.toLowerCase().includes(searchLower) ||
      g.adresse?.toLowerCase().includes(searchLower) ||
      g.region?.toLowerCase().includes(searchLower) ||
      g.secteur?.toLowerCase().includes(searchLower) ||
      g.gouvernerat?.toLowerCase().includes(searchLower)
    );
    const matchesRegion = filterRegion === "all" || g.region === filterRegion;
    const matchesSecteur = filterSecteur === "all" || g.secteur === filterSecteur;
    return matchesSearch && matchesRegion && matchesSecteur;
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "grossiste");
      const res = await fetch("/api/entities/import", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'importation");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Importation réussie",
        description: `${data.imported} grossiste(s) importé(s) avec succès`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/grossistes"] });
      setIsUploadOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur d'importation", description: error.message, variant: "destructive" });
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-grossistes-title">Liste de grossistes</h1>
          <p className="text-muted-foreground mt-1">Gérez les grossistes et leurs informations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-upload-grossistes">
                <Upload className="w-4 h-4 mr-2" />
                Importer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importer des grossistes</DialogTitle>
                <DialogDescription>
                  Uploadez un fichier CSV. Pour importer pharmacies + grossistes en une fois (Excel), utilisez le bouton Importer de la page Pharmacies.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="border-2 border-dashed rounded-md p-8 text-center">
                  <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Format accepté : .csv (colonnes : nom, email, telephone, adresse, region, secteur)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-upload-file-grossistes"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                    data-testid="button-select-file-grossistes"
                  >
                    {uploadMutation.isPending ? "Importation en cours..." : "Sélectionner un fichier"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                  queryClient.invalidateQueries({ queryKey: ["/api/grossistes"] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
            <div className="flex flex-wrap gap-2">
              <FilterCombobox
                value={filterRegion}
                onValueChange={setFilterRegion}
                options={regions}
                placeholder="Rechercher une région..."
                allLabel="Toutes les régions"
                className="w-[180px]"
                testId="filter-region-grossistes"
              />
              <FilterCombobox
                value={filterSecteur}
                onValueChange={setFilterSecteur}
                options={secteurs}
                placeholder="Rechercher un secteur..."
                allLabel="Tous les secteurs"
                className="w-[180px]"
                testId="filter-secteur-grossistes"
              />
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
          ) : filteredGrossistes?.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Aucun grossiste</h3>
              <p className="text-muted-foreground mt-1">
                {search || filterRegion !== "all" || filterSecteur !== "all"
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
                    <TableHead>Région</TableHead>
                    <TableHead>Gouvernerat</TableHead>
                    <TableHead>Secteur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrossistes?.map((g) => (
                    <TableRow key={g.id} className="hover-elevate" data-testid={`row-grossiste-${g.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded flex items-center justify-center bg-chart-3/20 text-chart-3">
                            <Truck className="w-4 h-4" />
                          </div>
                          <span className="font-medium">{g.nom}</span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-region-grossiste-${g.id}`}>{g.region || "-"}</TableCell>
                      <TableCell>{g.gouvernerat || "-"}</TableCell>
                      <TableCell data-testid={`text-secteur-grossiste-${g.id}`}>{g.secteur || "-"}</TableCell>
                      <TableCell>{g.email1 || "-"}</TableCell>
                      <TableCell>{g.tel1 || g.gsm1 || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{g.adresse || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingGrossiste(g)}
                          data-testid={`button-edit-grossiste-${g.id}`}
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

      <Dialog open={!!editingGrossiste} onOpenChange={() => setEditingGrossiste(null)}>
        <DialogContent>
          {editingGrossiste && (
            <GrossisteForm
              grossiste={editingGrossiste}
              onSuccess={() => {
                setEditingGrossiste(null);
                queryClient.invalidateQueries({ queryKey: ["/api/grossistes"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface GrossisteFormProps {
  grossiste?: Grossiste;
  onSuccess: () => void;
}

function GrossisteForm({ grossiste, onSuccess }: GrossisteFormProps) {
  const { toast } = useToast();
  const [nom, setNom] = useState(grossiste?.nom || "");
  const [email1, setEmail1] = useState(grossiste?.email1 || "");
  const [tel1, setTel1] = useState(grossiste?.tel1 || "");
  const [adresse, setAdresse] = useState(grossiste?.adresse || "");
  const [region, setRegion] = useState(grossiste?.region || "");
  const [gouvernerat, setGouvernerat] = useState(grossiste?.gouvernerat || "");
  const [secteur, setSecteur] = useState(grossiste?.secteur || "");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (grossiste) {
        return apiRequest("PATCH", `/api/grossistes/${grossiste.id}`, data);
      }
      return apiRequest("POST", "/api/grossistes", data);
    },
    onSuccess: () => {
      toast({
        title: grossiste ? "Grossiste modifié" : "Grossiste créé",
        description: grossiste ? "Le grossiste a été mis à jour" : "Le grossiste a été créé"
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
    mutation.mutate({
      nom,
      email1: email1 || null,
      tel1: tel1 || null,
      adresse: adresse || null,
      region: region || null,
      gouvernerat: gouvernerat || null,
      secteur: secteur || null
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{grossiste ? "Modifier le grossiste" : "Nouveau grossiste"}</DialogTitle>
        <DialogDescription>
          {grossiste ? "Modifiez les informations du grossiste" : "Créez un nouveau grossiste"}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nom *</label>
          <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom du grossiste" data-testid="input-grossiste-nom" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Région</label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} data-testid="input-grossiste-region" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Gouvernerat</label>
            <Input value={gouvernerat} onChange={(e) => setGouvernerat(e.target.value)} data-testid="input-grossiste-gouvernerat" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Secteur</label>
          <Input value={secteur} onChange={(e) => setSecteur(e.target.value)} data-testid="input-grossiste-secteur" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" value={email1} onChange={(e) => setEmail1(e.target.value)} data-testid="input-grossiste-email" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Téléphone</label>
          <Input value={tel1} onChange={(e) => setTel1(e.target.value)} data-testid="input-grossiste-telephone" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Adresse</label>
          <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} data-testid="input-grossiste-adresse" />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-grossiste">
            {mutation.isPending ? "Enregistrement..." : (grossiste ? "Modifier" : "Créer")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
