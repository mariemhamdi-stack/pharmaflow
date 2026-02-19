import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FilterCombobox } from "@/components/ui/filter-combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, TrendingDown, Clock, XCircle, CheckCircle2, Package, Filter, Store, Users, Truck } from "lucide-react";
import type { Entity } from "@shared/schema";

interface Stats {
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  avgProcessingTime: number;
  refusalRate: number;
  ordersByGrossiste: { grossiste: string; grossisteId?: string; count: number; refusalRate: number }[];
  ordersByMonth: { month: string; count: number }[];
  pharmacieScoring?: { pharmacie: string; pharmacieId: string; totalOrders: number; litiges: number; cloturees: number; score: number }[];
  deleguePerformance?: { delegue: string; delegueId: string; totalOrders: number; acceptees: number; refusees: number; performanceRate: number }[];
  grossistePerformance?: { grossiste: string; grossisteId: string; totalOrders: number; livrees: number; refusees: number; delaiMoyen: number; performanceRate: number }[];
}

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

export default function StatsPage() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [grossisteFilter, setGrossisteFilter] = useState("all");

  const statsUrl = (() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const qs = params.toString();
    return qs ? `/api/stats?${qs}` : "/api/stats";
  })();

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: [statsUrl],
  });

  const { data: entities } = useQuery<Entity[]>({
    queryKey: ["/api/entities"],
  });

  const grossistes = entities?.filter(e => e.type === "grossiste") || [];

  const filteredByStatus = statusFilter === "all"
    ? stats?.ordersByStatus
    : stats?.ordersByStatus
      ? Object.fromEntries(Object.entries(stats.ordersByStatus).filter(([s]) => s === statusFilter))
      : {};

  const filteredGrossistes = grossisteFilter === "all"
    ? stats?.ordersByGrossiste
    : stats?.ordersByGrossiste?.filter(g => {
        const matchEntity = grossistes.find(e => e.id === grossisteFilter);
        return matchEntity ? g.grossiste === matchEntity.nom : false;
      });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-stats-title">Statistiques</h1>
        <p className="text-muted-foreground mt-1">Analyse des performances et indicateurs clés</p>
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
                data-testid="input-stats-date-from"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Date fin</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
                data-testid="input-stats-date-to"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Statut</label>
              <FilterCombobox
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={[
                  { value: "brouillon", label: "Brouillon" },
                  { value: "validee_delegue", label: "Validée délégué" },
                  { value: "validee_pharmacie", label: "Validée pharmacie" },
                  { value: "envoyee", label: "Envoyée" },
                  { value: "acceptee", label: "Acceptée" },
                  { value: "refusee", label: "Refusée" },
                  { value: "partiellement_acceptee", label: "Partiellement acceptée" },
                  { value: "en_preparation", label: "En préparation" },
                  { value: "livree", label: "Livrée" },
                  { value: "cloturee", label: "Clôturée" },
                  { value: "litige", label: "Litige" },
                  { value: "annulee", label: "Annulée" },
                ]}
                allLabel="Tous les statuts"
                placeholder="Rechercher un statut..."
                className="w-48"
                testId="select-stats-status"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Grossiste</label>
              <FilterCombobox
                value={grossisteFilter}
                onValueChange={setGrossisteFilter}
                options={grossistes.map(g => ({ value: g.id, label: g.nom }))}
                allLabel="Tous les grossistes"
                placeholder="Rechercher un grossiste..."
                className="w-48"
                testId="select-stats-grossiste"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total commandes"
          value={stats?.totalOrders || 0}
          icon={Package}
          description="Nombre total de commandes"
          isLoading={isLoading}
        />
        <StatCard
          title="Délai moyen"
          value={`${stats?.avgProcessingTime || 0}h`}
          icon={Clock}
          description="De l'envoi à l'acceptation"
          isLoading={isLoading}
        />
        <StatCard
          title="Taux d'acceptation"
          value={`${100 - (stats?.refusalRate || 0)}%`}
          icon={CheckCircle2}
          description="Commandes acceptées"
          isLoading={isLoading}
          trend="up"
        />
        <StatCard
          title="Taux de refus"
          value={`${stats?.refusalRate || 0}%`}
          icon={XCircle}
          description="Commandes refusées"
          isLoading={isLoading}
          trend={stats?.refusalRate && stats.refusalRate > 10 ? "down" : "up"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Répartition par statut
            </CardTitle>
            <CardDescription>Distribution des commandes par état</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(filteredByStatus || {}).map(([status, count]) => {
                  const percentage = Math.round(((count as number) / (stats?.totalOrders || 1)) * 100);
                  return (
                    <div key={status} className="space-y-2" data-testid={`stat-status-${status}`}>
                      <div className="flex items-center justify-between gap-2 text-sm flex-wrap">
                        <span className="text-muted-foreground">
                          {statusLabels[status] || status.replace(/_/g, " ")}
                        </span>
                        <span className="font-medium">{count as number} ({percentage}%)</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance par grossiste</CardTitle>
            <CardDescription>Taux de refus par grossiste</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (filteredGrossistes || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune donnée disponible
              </div>
            ) : (
              <div className="space-y-4">
                {(filteredGrossistes || []).map((g, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50 flex-wrap" data-testid={`stat-grossiste-${i}`}>
                    <div>
                      <p className="font-medium">{g.grossiste}</p>
                      <p className="text-sm text-muted-foreground">{g.count} commandes</p>
                    </div>
                    <div className={`text-right ${
                      g.refusalRate > 20 ? "text-destructive" : 
                      g.refusalRate > 10 ? "text-chart-2" : 
                      "text-chart-4"
                    }`}>
                      <p className="text-lg font-bold">{g.refusalRate}%</p>
                      <p className="text-xs">refus</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Évolution mensuelle</CardTitle>
          <CardDescription>Nombre de commandes par mois</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : stats?.ordersByMonth?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune donnée disponible
            </div>
          ) : (
            <div className="flex items-end gap-2 h-48">
              {stats?.ordersByMonth?.map((m, i) => {
                const maxCount = Math.max(...(stats?.ordersByMonth?.map(x => x.count) || [1]));
                const height = Math.max(10, (m.count / maxCount) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2" data-testid={`stat-month-${i}`}>
                    <div 
                      className="w-full bg-primary rounded-t transition-all duration-500"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-muted-foreground">{m.month}</span>
                    <span className="text-xs font-medium">{m.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {(user?.role === "admin" || user?.role === "laboratoire") && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Scoring pharmacie
                </CardTitle>
                <CardDescription>Taux de clôture et litiges par pharmacie</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : !stats?.pharmacieScoring || stats.pharmacieScoring.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune donnée disponible
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.pharmacieScoring.map((p, i) => (
                      <div key={i} className="space-y-2" data-testid={`stat-pharmacie-score-${i}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <p className="text-sm font-medium">{p.pharmacie}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.totalOrders} cmd, {p.cloturees} clôturées, {p.litiges} litige{p.litiges > 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className={`text-right ${
                            p.score >= 70 ? "text-chart-4" : 
                            p.score >= 40 ? "text-chart-2" : 
                            "text-destructive"
                          }`}>
                            <p className="text-lg font-bold">{p.score}%</p>
                            <p className="text-xs">score</p>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              p.score >= 70 ? "bg-chart-4" : 
                              p.score >= 40 ? "bg-chart-2" : 
                              "bg-destructive"
                            }`}
                            style={{ width: `${p.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Performance délégué
                </CardTitle>
                <CardDescription>Taux d'acceptation des commandes par délégué</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : !stats?.deleguePerformance || stats.deleguePerformance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune donnée disponible
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.deleguePerformance.map((d, i) => (
                      <div key={i} className="space-y-2" data-testid={`stat-delegue-perf-${i}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <p className="text-sm font-medium">{d.delegue}</p>
                            <p className="text-xs text-muted-foreground">
                              {d.totalOrders} cmd, {d.acceptees} acceptées, {d.refusees} refusées
                            </p>
                          </div>
                          <div className={`text-right ${
                            d.performanceRate >= 70 ? "text-chart-4" : 
                            d.performanceRate >= 40 ? "text-chart-2" : 
                            "text-destructive"
                          }`}>
                            <p className="text-lg font-bold">{d.performanceRate}%</p>
                            <p className="text-xs">performance</p>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              d.performanceRate >= 70 ? "bg-chart-4" : 
                              d.performanceRate >= 40 ? "bg-chart-2" : 
                              "bg-destructive"
                            }`}
                            style={{ width: `${d.performanceRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Performance grossiste
              </CardTitle>
              <CardDescription>Taux de livraison et performance par grossiste</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !stats?.grossistePerformance || stats.grossistePerformance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune donnée disponible
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.grossistePerformance.map((g, i) => (
                    <div key={i} className="space-y-2" data-testid={`stat-grossiste-perf-${i}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className="text-sm font-medium">{g.grossiste}</p>
                          <p className="text-xs text-muted-foreground">
                            {g.totalOrders} cmd, {g.livrees} livrées, {g.refusees} refusées
                          </p>
                        </div>
                        <div className={`text-right ${
                          g.performanceRate >= 70 ? "text-chart-4" : 
                          g.performanceRate >= 40 ? "text-chart-2" : 
                          "text-destructive"
                        }`}>
                          <p className="text-lg font-bold">{g.performanceRate}%</p>
                          <p className="text-xs">performance</p>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            g.performanceRate >= 70 ? "bg-chart-4" : 
                            g.performanceRate >= 40 ? "bg-chart-2" : 
                            "bg-destructive"
                          }`}
                          style={{ width: `${g.performanceRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  isLoading?: boolean;
  trend?: "up" | "down";
}

function StatCard({ title, value, icon: Icon, description, isLoading, trend }: StatCardProps) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{value}</p>
            )}
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={`p-2 rounded-md ${
            trend === "up" ? "bg-chart-4/10" : 
            trend === "down" ? "bg-destructive/10" : 
            "bg-muted"
          }`}>
            <Icon className={`w-5 h-5 ${
              trend === "up" ? "text-chart-4" : 
              trend === "down" ? "text-destructive" : 
              "text-foreground"
            }`} />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1">
            {trend === "up" ? (
              <TrendingUp className="w-3 h-3 text-chart-4" />
            ) : (
              <TrendingDown className="w-3 h-3 text-destructive" />
            )}
            <span className={`text-xs ${
              trend === "up" ? "text-chart-4" : "text-destructive"
            }`}>
              {trend === "up" ? "Bon" : "Attention"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
