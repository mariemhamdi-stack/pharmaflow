import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Package,
  Truck
} from "lucide-react";

interface DashboardStats {
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  avgProcessingTime?: number;
  refusalRate?: number;
  pendingOrders?: number;
  lateOrders?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"]
  });

  const renderAdminDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tableau de bord administrateur</h1>
        <p className="text-muted-foreground mt-1">Vue globale du syst\u00e8me Sentinel Data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total commandes"
          value={stats?.totalOrders || 0}
          icon={ShoppingCart}
          description="Toutes commandes confondues"
          isLoading={isLoading}
        />
        <StatCard
          title="En cours"
          value={(stats?.ordersByStatus?.envoyee || 0) + (stats?.ordersByStatus?.en_preparation || 0)}
          icon={Clock}
          description="Commandes en traitement"
          isLoading={isLoading}
          trend="neutral"
        />
        <StatCard
          title="Acceptées"
          value={stats?.ordersByStatus?.acceptee || 0}
          icon={CheckCircle2}
          description="Commandes validées"
          isLoading={isLoading}
          trend="up"
        />
        <StatCard
          title="Litiges"
          value={stats?.ordersByStatus?.litige || 0}
          icon={AlertTriangle}
          description="À résoudre"
          isLoading={isLoading}
          trend={stats?.ordersByStatus?.litige ? "down" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition par statut</CardTitle>
            <CardDescription>Distribution des commandes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats?.ordersByStatus || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground capitalize">
                      {status.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${Math.min(100, ((count as number) / (stats?.totalOrders || 1)) * 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{count as number}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions rapides</CardTitle>
            <CardDescription>Accès aux fonctionnalités clés</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <QuickAction
              href="/orders"
              icon={ShoppingCart}
              label="Voir commandes"
              color="bg-primary/10 text-primary"
            />
            <QuickAction
              href="/users"
              icon={Package}
              label="Gérer utilisateurs"
              color="bg-chart-2/20 text-chart-2"
            />
            <QuickAction
              href="/products"
              icon={Package}
              label="Catalogue produits"
              color="bg-chart-3/20 text-chart-3"
            />
            <QuickAction
              href="/entities"
              icon={Truck}
              label="Entités"
              color="bg-chart-4/20 text-chart-4"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderLabDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tableau de bord Laboratoire</h1>
        <p className="text-muted-foreground mt-1">Suivi des commandes de votre laboratoire</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total commandes"
          value={stats?.totalOrders || 0}
          icon={ShoppingCart}
          description="Commandes du laboratoire"
          isLoading={isLoading}
        />
        <StatCard
          title="Délai moyen"
          value={`${stats?.avgProcessingTime || 0}h`}
          icon={Clock}
          description="Envoi → Acceptation"
          isLoading={isLoading}
        />
        <StatCard
          title="Taux de refus"
          value={`${stats?.refusalRate || 0}%`}
          icon={XCircle}
          description="Par les grossistes"
          isLoading={isLoading}
          trend={stats?.refusalRate && stats.refusalRate > 10 ? "down" : "up"}
        />
        <StatCard
          title="Litiges"
          value={stats?.ordersByStatus?.litige || 0}
          icon={AlertTriangle}
          description="À traiter"
          isLoading={isLoading}
        />
      </div>
    </div>
  );

  const renderDelegateDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tableau de bord Délégué</h1>
        <p className="text-muted-foreground mt-1">Suivi de vos commandes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Mes commandes"
          value={stats?.totalOrders || 0}
          icon={ShoppingCart}
          description="Total de vos commandes"
          isLoading={isLoading}
        />
        <StatCard
          title="Brouillons"
          value={stats?.ordersByStatus?.brouillon || 0}
          icon={Package}
          description="À valider"
          isLoading={isLoading}
        />
        <StatCard
          title="En attente pharmacie"
          value={stats?.ordersByStatus?.validee_delegue || 0}
          icon={Clock}
          description="En attente de validation"
          isLoading={isLoading}
        />
        <StatCard
          title="Acceptées"
          value={stats?.ordersByStatus?.acceptee || 0}
          icon={CheckCircle2}
          description="Par le grossiste"
          isLoading={isLoading}
        />
      </div>
    </div>
  );

  const renderWholesalerDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tableau de bord Grossiste</h1>
        <p className="text-muted-foreground mt-1">Commandes à traiter</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="À traiter"
          value={stats?.pendingOrders || 0}
          icon={Clock}
          description="Commandes en attente"
          isLoading={isLoading}
          trend="neutral"
        />
        <StatCard
          title="En préparation"
          value={stats?.ordersByStatus?.en_preparation || 0}
          icon={Package}
          description="En cours de préparation"
          isLoading={isLoading}
        />
        <StatCard
          title="En retard"
          value={stats?.lateOrders || 0}
          icon={AlertTriangle}
          description="Dépassement délai"
          isLoading={isLoading}
          trend={stats?.lateOrders ? "down" : "up"}
        />
      </div>
    </div>
  );

  const renderPharmacyDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tableau de bord Pharmacie</h1>
        <p className="text-muted-foreground mt-1">Suivi de vos commandes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Mes commandes"
          value={stats?.totalOrders || 0}
          icon={ShoppingCart}
          description="Total des commandes"
          isLoading={isLoading}
        />
        <StatCard
          title="À valider"
          value={stats?.ordersByStatus?.validee_delegue || 0}
          icon={Clock}
          description="En attente de votre validation"
          isLoading={isLoading}
          trend="neutral"
        />
        <StatCard
          title="En attente livraison"
          value={(stats?.ordersByStatus?.en_preparation || 0) + (stats?.ordersByStatus?.acceptee || 0)}
          icon={Truck}
          description="À réceptionner"
          isLoading={isLoading}
        />
        <StatCard
          title="Livrées"
          value={stats?.ordersByStatus?.livree || 0}
          icon={CheckCircle2}
          description="À confirmer"
          isLoading={isLoading}
        />
      </div>
    </div>
  );

  const renderDashboard = () => {
    switch (user?.role) {
      case "admin":
        return renderAdminDashboard();
      case "laboratoire":
        return renderLabDashboard();
      case "delegue":
        return renderDelegateDashboard();
      case "grossiste":
        return renderWholesalerDashboard();
      case "pharmacie":
        return renderPharmacyDashboard();
      default:
        return renderAdminDashboard();
    }
  };

  return <div className="p-6">{renderDashboard()}</div>;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  isLoading?: boolean;
  trend?: "up" | "down" | "neutral";
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
            <TrendingUp className={`w-3 h-3 ${
              trend === "up" ? "text-chart-4" : 
              trend === "down" ? "text-destructive rotate-180" : 
              "text-muted-foreground"
            }`} />
            <span className={`text-xs ${
              trend === "up" ? "text-chart-4" : 
              trend === "down" ? "text-destructive" : 
              "text-muted-foreground"
            }`}>
              {trend === "up" ? "Bon" : trend === "down" ? "Attention" : "Stable"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickActionProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}

function QuickAction({ href, icon: Icon, label, color }: QuickActionProps) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-md bg-card border border-card-border hover-elevate transition-colors"
      data-testid={`quick-action-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className={`p-2 rounded-md ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </a>
  );
}
