import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, TrendingDown, Clock, XCircle, CheckCircle2, Package } from "lucide-react";

interface Stats {
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  avgProcessingTime: number;
  refusalRate: number;
  ordersByGrossiste: { grossiste: string; count: number; refusalRate: number }[];
  ordersByMonth: { month: string; count: number }[];
}

export default function StatsPage() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"]
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Statistiques</h1>
        <p className="text-muted-foreground mt-1">Analyse des performances et indicateurs clés</p>
      </div>

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
              <BarChart3 className="w-5 h-5 text-primary" />
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
                {Object.entries(stats?.ordersByStatus || {}).map(([status, count]) => {
                  const percentage = Math.round(((count as number) / (stats?.totalOrders || 1)) * 100);
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground capitalize">
                          {status.replace(/_/g, " ")}
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
            ) : stats?.ordersByGrossiste?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune donnée disponible
              </div>
            ) : (
              <div className="space-y-4">
                {stats?.ordersByGrossiste?.map((g, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
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
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-primary rounded-t transition-all duration-500 hover:bg-primary/80"
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
        <div className="flex items-start justify-between">
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
            "bg-primary/10"
          }`}>
            <Icon className={`w-5 h-5 ${
              trend === "up" ? "text-chart-4" : 
              trend === "down" ? "text-destructive" : 
              "text-primary"
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
