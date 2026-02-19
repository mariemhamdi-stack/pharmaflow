import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { OrderHistory } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { History as HistoryIcon, ArrowRight, Download, Filter } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type HistoryEntry = OrderHistory & {
  user?: any;
  order?: any;
  pharmacieNom?: string | null;
  grossisteNom?: string | null;
  delegueNom?: string | null;
};

const statusLabels: Record<string, string> = {
  brouillon: "Brouillon",
  validee_delegue: "Validée délégué",
  validee_pharmacie: "Validée pharmacie",
  envoyee: "Envoyée",
  acceptee: "Acceptée",
  refusee: "Refusée",
  partiellement_acceptee: "Partiellement acceptée",
  en_preparation: "En préparation",
  livree: "Livrée",
  cloturee: "Clôturée",
  litige: "Litige",
  annulee: "Annulée",
};

export default function HistoryPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: history, isLoading } = useQuery<HistoryEntry[]>({
    queryKey: ["/api/history"]
  });

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrateur",
      laboratoire: "Laboratoire",
      delegue: "Délégué",
      grossiste: "Grossiste",
      pharmacie: "Pharmacie"
    };
    return labels[role] || role;
  };

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    return history.filter((entry) => {
      if (dateFrom) {
        const entryDate = new Date(entry.createdAt);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (entryDate < fromDate) return false;
      }
      if (dateTo) {
        const entryDate = new Date(entry.createdAt);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (entryDate > toDate) return false;
      }
      return true;
    });
  }, [history, dateFrom, dateTo]);

  const downloadCSV = () => {
    const data = filteredHistory;
    if (!data || data.length === 0) return;

    const headers = [
      "Date",
      "Commande",
      "Ancien statut",
      "Nouveau statut",
      "Rôle",
      "Utilisateur",
      "Délégué",
      "Pharmacie",
      "Grossiste",
      "Commentaire"
    ];

    const rows = data.map((entry) => [
      format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: fr }),
      entry.orderId?.slice(0, 8) || "",
      entry.ancienStatus ? (statusLabels[entry.ancienStatus] || entry.ancienStatus) : "Création",
      statusLabels[entry.nouveauStatus] || entry.nouveauStatus,
      getRoleLabel(entry.role),
      entry.user ? `${entry.user.prenom} ${entry.user.nom}` : "",
      entry.delegueNom || "",
      entry.pharmacieNom || "",
      entry.grossisteNom || "",
      entry.commentaire || ""
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historique_pharmaflow_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-history-title">Historique des actions</h1>
          <p className="text-muted-foreground mt-1">Traçabilité complète de toutes les modifications</p>
        </div>
        <Button
          variant="outline"
          onClick={downloadCSV}
          disabled={!filteredHistory || filteredHistory.length === 0}
          data-testid="button-download-history"
        >
          <Download className="w-4 h-4 mr-2" />
          Télécharger
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Date début</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
                data-testid="input-history-date-from"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Date fin</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
                data-testid="input-history-date-to"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-primary" />
            Journal d'audit
            {filteredHistory && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredHistory.length} entrée{filteredHistory.length > 1 ? "s" : ""})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <HistoryIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Aucun historique</h3>
              <p className="text-muted-foreground mt-1">L'historique des actions apparaîtra ici</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((entry, index) => (
                <div 
                  key={entry.id}
                  className="relative pl-8 pb-4 border-b border-border last:border-0"
                  data-testid={`history-entry-${entry.id}`}
                >
                  <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-primary/10 border-2 border-primary" />
                  {index < filteredHistory.length - 1 && (
                    <div className="absolute left-[7px] top-4 w-0.5 h-full bg-border" />
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        Commande {entry.orderId?.slice(0, 8)}
                      </span>
                      <div className="flex items-center gap-1">
                        {entry.ancienStatus ? (
                          <>
                            <StatusBadge status={entry.ancienStatus} type="order" />
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Création</span>
                        )}
                        <StatusBadge status={entry.nouveauStatus} type="order" />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted">
                        {getRoleLabel(entry.role)}
                      </span>
                      <span>
                        {entry.user ? `${entry.user.prenom} ${entry.user.nom}` : "Utilisateur"}
                      </span>
                      <span className="text-xs">
                        {format(new Date(entry.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {entry.delegueNom && (
                        <span data-testid={`history-delegue-${entry.id}`}>
                          <span className="font-medium">Délégué :</span> {entry.delegueNom}
                        </span>
                      )}
                      {entry.pharmacieNom && (
                        <span data-testid={`history-pharmacie-${entry.id}`}>
                          <span className="font-medium">Pharmacie :</span> {entry.pharmacieNom}
                        </span>
                      )}
                      {entry.grossisteNom && (
                        <span data-testid={`history-grossiste-${entry.id}`}>
                          <span className="font-medium">Grossiste :</span> {entry.grossisteNom}
                        </span>
                      )}
                    </div>

                    {entry.commentaire && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        {entry.commentaire}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
