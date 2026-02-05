import { useQuery } from "@tanstack/react-query";
import type { OrderHistory } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { History as HistoryIcon, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function HistoryPage() {
  const { data: history, isLoading } = useQuery<(OrderHistory & { user?: any; order?: any })[]>({
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Historique des actions</h1>
        <p className="text-muted-foreground mt-1">Traçabilité complète de toutes les modifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-primary" />
            Journal d'audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : history?.length === 0 ? (
            <div className="text-center py-12">
              <HistoryIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Aucun historique</h3>
              <p className="text-muted-foreground mt-1">L'historique des actions apparaîtra ici</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history?.map((entry, index) => (
                <div 
                  key={entry.id}
                  className="relative pl-8 pb-4 border-b border-border last:border-0"
                >
                  <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-primary/10 border-2 border-primary" />
                  {index < (history?.length || 0) - 1 && (
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
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted">
                        {getRoleLabel(entry.role)}
                      </span>
                      <span>
                        {entry.user ? `${entry.user.prenom} ${entry.user.nom}` : "Utilisateur"}
                      </span>
                      <span>\u2022</span>
                      <span>
                        {format(new Date(entry.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                      </span>
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
