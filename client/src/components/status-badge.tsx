import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  type?: "order" | "line" | "user" | "product";
}

export function StatusBadge({ status, type = "order" }: StatusBadgeProps) {
  const getStatusConfig = () => {
    if (type === "order") {
      const configs: Record<string, { label: string; className: string }> = {
        brouillon: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
        envoyee: { label: "Envoyée", className: "bg-primary/10 text-primary" },
        acceptee: { label: "Acceptée", className: "bg-chart-4/20 text-chart-4" },
        refusee: { label: "Refusée", className: "bg-destructive/10 text-destructive" },
        partiellement_acceptee: { label: "Partiellement acceptée", className: "bg-chart-2/20 text-chart-2" },
        en_preparation: { label: "En préparation", className: "bg-chart-3/20 text-chart-3" },
        livree: { label: "Livrée", className: "bg-chart-5/20 text-chart-5" },
        cloturee: { label: "Clôturée", className: "bg-muted text-muted-foreground" },
        litige: { label: "Litige", className: "bg-destructive/10 text-destructive" }
      };
      return configs[status] || { label: status, className: "bg-muted text-muted-foreground" };
    }

    if (type === "line") {
      const configs: Record<string, { label: string; className: string }> = {
        en_attente: { label: "En attente", className: "bg-muted text-muted-foreground" },
        acceptee: { label: "Acceptée", className: "bg-chart-4/20 text-chart-4" },
        refusee: { label: "Refusée", className: "bg-destructive/10 text-destructive" },
        partiellement_acceptee: { label: "Partielle", className: "bg-chart-2/20 text-chart-2" }
      };
      return configs[status] || { label: status, className: "bg-muted text-muted-foreground" };
    }

    if (type === "user") {
      const configs: Record<string, { label: string; className: string }> = {
        actif: { label: "Actif", className: "bg-chart-4/20 text-chart-4" },
        suspendu: { label: "Suspendu", className: "bg-destructive/10 text-destructive" }
      };
      return configs[status] || { label: status, className: "bg-muted text-muted-foreground" };
    }

    if (type === "product") {
      const configs: Record<string, { label: string; className: string }> = {
        actif: { label: "Actif", className: "bg-chart-4/20 text-chart-4" },
        inactif: { label: "Inactif", className: "bg-muted text-muted-foreground" }
      };
      return configs[status] || { label: status, className: "bg-muted text-muted-foreground" };
    }

    return { label: status, className: "bg-muted text-muted-foreground" };
  };

  const config = getStatusConfig();

  return (
    <Badge variant="outline" className={`${config.className} border-transparent`}>
      {config.label}
    </Badge>
  );
}
