import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Pill, FlaskConical, UserCheck, Truck, Store } from "lucide-react";
import sentinelLogo from "@assets/logo_1771319487082.png";

const roles = [
  {
    key: "laboratoire",
    label: "Laboratoire",
    description: "Gérer les produits, offres, actions marketing et communications",
    icon: FlaskConical,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "hover:border-blue-300 dark:hover:border-blue-700",
  },
  {
    key: "delegue",
    label: "Délégué",
    description: "Créer et suivre les commandes, gérer les offres commerciales",
    icon: UserCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "hover:border-emerald-300 dark:hover:border-emerald-700",
  },
  {
    key: "grossiste",
    label: "Grossiste",
    description: "Traiter les commandes reçues, gérer les livraisons",
    icon: Truck,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "hover:border-amber-300 dark:hover:border-amber-700",
  },
  {
    key: "pharmacie",
    label: "Pharmacie",
    description: "Valider les commandes, confirmer les réceptions et signaler les litiges",
    icon: Store,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "hover:border-purple-300 dark:hover:border-purple-700",
  },
];

export default function HomePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="absolute top-4 left-4">
        <img src={sentinelLogo} alt="Sentinel Data" className="h-10 object-contain" data-testid="img-sentinel-logo-home" />
      </div>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Pill className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-app-title">PharmaFlow</h1>
          <p className="text-muted-foreground mt-2">Gestion des commandes pharmaceutiques</p>
          <p className="text-muted-foreground mt-4 text-sm">Sélectionnez votre profil pour continuer</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.key}
                role="button"
                tabIndex={0}
                className={`cursor-pointer transition-all duration-200 border-2 border-transparent ${role.border} hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                onClick={() => setLocation("/login")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLocation("/login"); } }}
                data-testid={`card-role-${role.key}`}
              >
                <CardContent className="flex items-start gap-4 p-5">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${role.bg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${role.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{role.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
