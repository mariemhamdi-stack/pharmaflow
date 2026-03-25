import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Pill, FlaskConical, UserCheck, Truck, Store,
  ShieldCheck, BarChart3, Bell, ClipboardList,
  ArrowRight, CheckCircle2, Zap, TrendingUp, Users,
  FileText, Package, MessageSquare, ChevronRight,
} from "lucide-react";
import sentinelLogo from "@assets/logo_1771319487082.png";

const roles = [
  {
    key: "laboratoire",
    label: "Laboratoire",
    description: "Produits, offres, actions marketing et communications",
    icon: FlaskConical,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100/80 dark:bg-blue-950/50",
    gradient: "from-blue-500/10 to-blue-600/5",
  },
  {
    key: "delegue",
    label: "Délégué",
    description: "Création et suivi des commandes, offres commerciales",
    icon: UserCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100/80 dark:bg-emerald-950/50",
    gradient: "from-emerald-500/10 to-emerald-600/5",
  },
  {
    key: "grossiste",
    label: "Grossiste",
    description: "Traitement des commandes et gestion des livraisons",
    icon: Truck,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100/80 dark:bg-amber-950/50",
    gradient: "from-amber-500/10 to-amber-600/5",
  },
  {
    key: "pharmacie",
    label: "Pharmacie",
    description: "Validation, réception et gestion des litiges",
    icon: Store,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100/80 dark:bg-purple-950/50",
    gradient: "from-purple-500/10 to-purple-600/5",
  },
];

const solutions = [
  {
    icon: FileText,
    title: "Gestion des commandes",
    description: "Créez, suivez et validez vos commandes avec un workflow structuré et transparent pour tous les acteurs.",
  },
  {
    icon: Package,
    title: "Offres commerciales",
    description: "Gérez les remises, packs promotionnels et mises en place négociées entre délégués et pharmacies.",
  },
  {
    icon: MessageSquare,
    title: "Communications ciblées",
    description: "Diffusez bannières, pop-ups et actualités directement aux acteurs concernés de votre réseau.",
  },
];

const features = [
  {
    icon: ClipboardList,
    title: "Double validation",
    description: "Chaque commande passe par une validation délégué puis pharmacie avant envoi au grossiste.",
  },
  {
    icon: ShieldCheck,
    title: "Traçabilité complète",
    description: "Historique immuable de toutes les actions avec audit trail détaillé.",
  },
  {
    icon: BarChart3,
    title: "Tableaux de bord",
    description: "Statistiques et indicateurs de performance adaptés à chaque rôle utilisateur.",
  },
  {
    icon: Bell,
    title: "Notifications temps réel",
    description: "Alertes in-app et email à chaque changement de statut de commande.",
  },
  {
    icon: Zap,
    title: "Envoi automatique",
    description: "Après double validation, la commande est automatiquement transmise au grossiste.",
  },
  {
    icon: Users,
    title: "Multi-rôles",
    description: "Accès et fonctionnalités adaptés pour chaque acteur de la chaîne pharmaceutique.",
  },
];

const steps = [
  { number: "01", title: "Création", description: "Le délégué crée la commande avec les produits et quantités souhaités." },
  { number: "02", title: "Validation délégué", description: "Le délégué valide et soumet la commande pour approbation." },
  { number: "03", title: "Validation pharmacie", description: "La pharmacie examine et confirme la commande." },
  { number: "04", title: "Livraison", description: "Le grossiste traite, prépare et livre la commande." },
];

const impacts = [
  { value: "100%", label: "Traçabilité", description: "Suivi complet de chaque commande" },
  { value: "2x", label: "Validation", description: "Double contrôle systématique" },
  { value: "0", label: "Perte de données", description: "Historique immuable garanti" },
  { value: "24/7", label: "Accessibilité", description: "Plateforme disponible en continu" },
];

export default function HomePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <img src={sentinelLogo} alt="Sentinel Data" className="h-8 object-contain" data-testid="img-sentinel-logo-home" />
            <div className="h-5 w-px bg-border hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1.5">
              <Pill className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground text-sm">PharmaFlow</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              size="sm"
              onClick={() => setLocation("/login")}
              data-testid="button-header-login"
            >
              Se connecter
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 dark:from-primary/10 dark:to-primary/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
              <Pill className="w-3.5 h-3.5" />
              Plateforme de gestion pharmaceutique
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight" data-testid="text-app-title">
              Simplifiez la gestion de vos
              <span className="text-primary"> commandes pharmaceutiques</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Une plateforme centralisée pour coordonner laboratoires, délégués, grossistes et pharmacies avec un workflow de validation sécurisé.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={() => setLocation("/login")} data-testid="button-hero-login">
                Accéder à la plateforme
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Sélectionnez votre profil</h2>
            <p className="text-muted-foreground mt-2">Chaque rôle dispose d'un espace dédié et personnalisé</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <Card
                  key={role.key}
                  role="button"
                  tabIndex={0}
                  className={`group cursor-pointer transition-all duration-300 border border-border/60 hover:border-border hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-gradient-to-br ${role.gradient} hover:-translate-y-1`}
                  onClick={() => setLocation("/login")}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLocation("/login"); } }}
                  data-testid={`card-role-${role.key}`}
                >
                  <CardContent className="flex flex-col items-center text-center p-6">
                    <div className={`w-14 h-14 rounded-xl ${role.bg} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className={`w-7 h-7 ${role.color}`} />
                    </div>
                    <h3 className="font-semibold text-foreground text-lg">{role.label}</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{role.description}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Continuer <ChevronRight className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Solutions</h2>
            <p className="text-muted-foreground mt-2">Des outils pensés pour chaque besoin de votre activité</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {solutions.map((solution) => {
              const Icon = solution.icon;
              return (
                <div key={solution.title} className="relative group p-6 rounded-2xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{solution.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{solution.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Fonctionnalités</h2>
            <p className="text-muted-foreground mt-2">Tout ce dont vous avez besoin pour piloter votre chaîne de commandes</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border/40 hover:border-border transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Comment ça fonctionne</h2>
            <p className="text-muted-foreground mt-2">Un processus clair en 4 étapes pour chaque commande</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={step.number} className="relative text-center">
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-primary/20" />
                )}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary font-bold text-xl mb-4 relative z-10">
                  {step.number}
                </div>
                <h4 className="font-semibold text-foreground text-lg">{step.title}</h4>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Impact</h2>
            <p className="text-muted-foreground mt-2">Les bénéfices concrets de PharmaFlow pour votre activité</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {impacts.map((impact) => (
              <div key={impact.label} className="text-center p-6 rounded-2xl bg-card border border-border/40">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">{impact.value}</div>
                <div className="font-semibold text-foreground text-sm">{impact.label}</div>
                <p className="text-xs text-muted-foreground mt-1">{impact.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Prêt à commencer ?</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Connectez-vous à votre espace pour gérer vos commandes, offres et communications en toute simplicité.
            </p>
            <Button size="lg" className="mt-6" onClick={() => setLocation("/login")} data-testid="button-cta-login">
              Se connecter maintenant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={sentinelLogo} alt="Sentinel Data" className="h-6 object-contain opacity-60" />
            <span className="text-xs text-muted-foreground">&mdash; PharmaFlow</span>
          </div>
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Sentinel Data. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
