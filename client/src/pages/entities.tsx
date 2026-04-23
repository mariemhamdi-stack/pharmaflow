import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Pharmacie } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterCombobox } from "@/components/ui/filter-combobox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Store, X, UserPlus, Upload, FileSpreadsheet } from "lucide-react";

export default function PharmaciesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterSecteur, setFilterSecteur] = useState("all");
  const [filterClasse, setFilterClasse] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPharmacie, setEditingPharmacie] = useState<Pharmacie | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const { data: pharmacies, isLoading } = useQuery<Pharmacie[]>({
    queryKey: ["/api/pharmacies"]
  });

  const regions = Array.from(new Set(pharmacies?.map(e => e.region).filter(Boolean) as string[])).sort();
  const secteurs = Array.from(new Set(pharmacies?.map(e => e.secteur).filter(Boolean) as string[])).sort();
  const classes = Array.from(new Set(pharmacies?.map(e => e.classification).filter(Boolean) as string[])).sort();

  const filteredPharmacies = pharmacies?.filter(p => {
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || (
      p.nom.toLowerCase().includes(searchLower) ||
      p.email1?.toLowerCase().includes(searchLower) ||
      p.adresse?.toLowerCase().includes(searchLower) ||
      p.proprietaire?.toLowerCase().includes(searchLower) ||
      p.pharmacienResponsable?.toLowerCase().includes(searchLower) ||
      p.classification?.toLowerCase().includes(searchLower) ||
      p.region?.toLowerCase().includes(searchLower) ||
      p.secteur?.toLowerCase().includes(searchLower) ||
      p.gouvernerat?.toLowerCase().includes(searchLower)
    );
    const matchesRegion = filterRegion === "all" || p.region === filterRegion;
    const matchesSecteur = filterSecteur === "all" || p.secteur === filterSecteur;
    const matchesClasse = filterClasse === "all" || p.classification === filterClasse;
    return matchesSearch && matchesRegion && matchesSecteur && matchesClasse;
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "pharmacie");
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
        description: `${data.imported} pharmacie(s) importée(s) avec succès`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacies"] });
      setIsUploadOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur d'importation", description: error.message, variant: "destructive" });
    }
  });

  const excelImportMutation = useMutation({
    mutationFn: async ({ file, replace }: { file: File; replace: boolean }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("replace", String(replace));
      const res = await fetch("/api/pharmacies-grossistes/import-excel", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'importation Excel");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Importation Excel réussie",
        description: `${data.importedPharmacies} pharmacie(s) et ${data.importedGrossistes} grossiste(s) importés sur ${data.totalRows} lignes`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacies"] });
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

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const replace = window.confirm("Remplacer toutes les pharmacies et grossistes existants ? (Annuler = ajouter)");
      excelImportMutation.mutate({ file, replace });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-pharmacies-title">Liste de pharmacies</h1>
          <p className="text-muted-foreground mt-1">Gérez les pharmacies et leurs informations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-upload-pharmacies">
                <Upload className="w-4 h-4 mr-2" />
                Importer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importer des pharmacies / grossistes</DialogTitle>
                <DialogDescription>
                  Deux formats acceptés : Excel (.xlsx) avec la colonne SPECIALITE (PHARMACIE/GROSSISTE) ou CSV simple pour pharmacies uniquement.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="border-2 border-dashed rounded-md p-6 text-center">
                  <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium mb-1">Fichier Excel (.xlsx)</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Importe pharmacies + grossistes selon la colonne SPECIALITE
                  </p>
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                    data-testid="input-upload-excel"
                  />
                  <Button
                    variant="outline"
                    onClick={() => excelInputRef.current?.click()}
                    disabled={excelImportMutation.isPending}
                    data-testid="button-select-excel"
                  >
                    {excelImportMutation.isPending ? "Importation Excel..." : "Sélectionner un fichier Excel"}
                  </Button>
                </div>
                <div className="border-2 border-dashed rounded-md p-6 text-center">
                  <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium mb-1">Fichier CSV (pharmacies)</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Colonnes : nom, email, telephone, adresse, region, secteur, classification, proprietaire, pharmacienResponsable
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-upload-file-pharmacies"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                    data-testid="button-select-file-pharmacies"
                  >
                    {uploadMutation.isPending ? "Importation CSV..." : "Sélectionner un fichier CSV"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-pharmacy">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle pharmacie
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <PharmacyForm
                onSuccess={() => {
                  setIsCreateOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/pharmacies"] });
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
                placeholder="Rechercher une pharmacie..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-pharmacies"
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
                testId="filter-region-pharmacies"
              />
              <FilterCombobox
                value={filterSecteur}
                onValueChange={setFilterSecteur}
                options={secteurs}
                placeholder="Rechercher un secteur..."
                allLabel="Tous les secteurs"
                className="w-[180px]"
                testId="filter-secteur-pharmacies"
              />
              <FilterCombobox
                value={filterClasse}
                onValueChange={setFilterClasse}
                options={classes}
                placeholder="Rechercher une classe..."
                allLabel="Toutes les classes"
                className="w-[180px]"
                testId="filter-classe-pharmacies"
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
          ) : filteredPharmacies?.length === 0 ? (
            <div className="text-center py-12">
              <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Aucune pharmacie</h3>
              <p className="text-muted-foreground mt-1">
                {search || filterRegion !== "all" || filterSecteur !== "all" || filterClasse !== "all"
                  ? "Aucune pharmacie ne correspond à vos critères"
                  : "Commencez par ajouter des pharmacies"}
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
                    <TableHead>Classe</TableHead>
                    <TableHead>Propriétaire</TableHead>
                    <TableHead>Pharmacien responsable</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPharmacies?.map((p) => {
                    const tel = p.tel1 || p.gsm1 || "-";
                    return (
                      <TableRow key={p.id} className="hover-elevate" data-testid={`row-pharmacy-${p.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded flex items-center justify-center bg-chart-4/20 text-chart-4">
                              <Store className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-medium">{p.nom}</span>
                              {p.email1 && (
                                <p className="text-xs text-muted-foreground">{p.email1}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-region-${p.id}`}>{p.region || "-"}</TableCell>
                        <TableCell>{p.gouvernerat || "-"}</TableCell>
                        <TableCell data-testid={`text-secteur-${p.id}`}>{p.secteur || "-"}</TableCell>
                        <TableCell data-testid={`text-classification-${p.id}`}>
                          {p.classification ? (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-transparent">
                              {p.classification}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell data-testid={`text-proprietaire-${p.id}`}>{p.proprietaire || "-"}</TableCell>
                        <TableCell data-testid={`text-pharmacien-${p.id}`}>{p.pharmacienResponsable || "-"}</TableCell>
                        <TableCell>{tel}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingPharmacie(p)}
                            data-testid={`button-edit-pharmacy-${p.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
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

      <Dialog open={!!editingPharmacie} onOpenChange={() => setEditingPharmacie(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {editingPharmacie && (
            <PharmacyForm
              pharmacie={editingPharmacie}
              onSuccess={() => {
                setEditingPharmacie(null);
                queryClient.invalidateQueries({ queryKey: ["/api/pharmacies"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function parsePreparateurs(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return val ? [val] : [];
}

interface PharmacyFormProps {
  pharmacie?: Pharmacie;
  onSuccess: () => void;
}

function PharmacyForm({ pharmacie, onSuccess }: PharmacyFormProps) {
  const { toast } = useToast();
  const [nom, setNom] = useState(pharmacie?.nom || "");
  const [email1, setEmail1] = useState(pharmacie?.email1 || "");
  const [tel1, setTel1] = useState(pharmacie?.tel1 || "");
  const [adresse, setAdresse] = useState(pharmacie?.adresse || "");
  const [region, setRegion] = useState(pharmacie?.region || "");
  const [gouvernerat, setGouvernerat] = useState(pharmacie?.gouvernerat || "");
  const [secteur, setSecteur] = useState(pharmacie?.secteur || "");
  const [classification, setClassification] = useState(pharmacie?.classification || "");
  const [proprietaire, setProprietaire] = useState(pharmacie?.proprietaire || "");
  const [pharmacienResponsable, setPharmacienResponsable] = useState(pharmacie?.pharmacienResponsable || "");
  const [preparateurs, setPreparateurs] = useState<string[]>(
    parsePreparateurs(pharmacie?.preparateurs)
  );
  const [newPreparateur, setNewPreparateur] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (pharmacie) {
        return apiRequest("PATCH", `/api/pharmacies/${pharmacie.id}`, data);
      }
      return apiRequest("POST", "/api/pharmacies", data);
    },
    onSuccess: () => {
      toast({
        title: pharmacie ? "Pharmacie modifiée" : "Pharmacie créée",
        description: pharmacie ? "La pharmacie a été mise à jour" : "La pharmacie a été créée"
      });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Une erreur s'est produite", variant: "destructive" });
    }
  });

  const addPreparateur = () => {
    const trimmed = newPreparateur.trim();
    if (trimmed && !preparateurs.includes(trimmed)) {
      setPreparateurs([...preparateurs, trimmed]);
      setNewPreparateur("");
    }
  };

  const removePreparateur = (index: number) => {
    setPreparateurs(preparateurs.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom) {
      toast({ title: "Erreur", description: "Veuillez remplir le nom de la pharmacie", variant: "destructive" });
      return;
    }
    mutation.mutate({
      nom,
      email1: email1 || null,
      tel1: tel1 || null,
      adresse: adresse || null,
      region: region || null,
      gouvernerat: gouvernerat || null,
      secteur: secteur || null,
      classification: classification || null,
      proprietaire: proprietaire || null,
      pharmacienResponsable: pharmacienResponsable || null,
      preparateurs: preparateurs.length > 0 ? JSON.stringify(preparateurs) : null,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{pharmacie ? "Modifier la pharmacie" : "Nouvelle pharmacie"}</DialogTitle>
        <DialogDescription>
          {pharmacie ? "Modifiez les informations de la pharmacie" : "Créez une nouvelle pharmacie"}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nom *</label>
          <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom de la pharmacie" data-testid="input-pharmacy-nom" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Région</label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} data-testid="input-pharmacy-region" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Gouvernerat</label>
            <Input value={gouvernerat} onChange={(e) => setGouvernerat(e.target.value)} data-testid="input-pharmacy-gouvernerat" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Secteur</label>
            <Input value={secteur} onChange={(e) => setSecteur(e.target.value)} data-testid="input-pharmacy-secteur" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Classe</label>
            <Input value={classification} onChange={(e) => setClassification(e.target.value)} data-testid="input-pharmacy-classification" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Propriétaire</label>
          <Input value={proprietaire} onChange={(e) => setProprietaire(e.target.value)} data-testid="input-pharmacy-proprietaire" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Pharmacien responsable</label>
          <Input value={pharmacienResponsable} onChange={(e) => setPharmacienResponsable(e.target.value)} data-testid="input-pharmacy-pharmacien" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Préparateurs</label>
          <div className="flex gap-2">
            <Input
              value={newPreparateur}
              onChange={(e) => setNewPreparateur(e.target.value)}
              placeholder="Ajouter un préparateur"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPreparateur();
                }
              }}
              data-testid="input-pharmacy-preparateur"
            />
            <Button type="button" variant="outline" size="icon" onClick={addPreparateur} data-testid="button-add-preparateur">
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
          {preparateurs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {preparateurs.map((p, i) => (
                <Badge key={i} variant="outline" className="bg-muted text-muted-foreground border-transparent gap-1">
                  {p}
                  <button type="button" onClick={() => removePreparateur(i)} className="ml-1 hover:text-destructive" data-testid={`button-remove-preparateur-${i}`}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" value={email1} onChange={(e) => setEmail1(e.target.value)} data-testid="input-pharmacy-email" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Téléphone</label>
          <Input value={tel1} onChange={(e) => setTel1(e.target.value)} data-testid="input-pharmacy-telephone" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Adresse</label>
          <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} data-testid="input-pharmacy-adresse" />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-pharmacy">
            {mutation.isPending ? "Enregistrement..." : (pharmacie ? "Modifier" : "Créer")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
