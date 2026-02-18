import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Building2,
  Bell,
  LogOut,
  Pill,
  History,
  BarChart3,
  Tag,
  Megaphone,
  MessageSquare
} from "lucide-react";

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const getMenuItems = () => {
    const baseItems = [
      { title: "Tableau de bord", url: "/", icon: LayoutDashboard }
    ];

    if (user?.role === "admin") {
      return [
        ...baseItems,
        { title: "Utilisateurs", url: "/users", icon: Users },
        { title: "Liste de pharmacies", url: "/entities", icon: Building2 },
        { title: "Produits", url: "/products", icon: Package },
        { title: "Commandes", url: "/orders", icon: ShoppingCart },
        { title: "Offres commerciales", url: "/offers", icon: Tag },
        { title: "Communications", url: "/communications", icon: MessageSquare },
        { title: "Historique", url: "/history", icon: History },
        { title: "Statistiques", url: "/stats", icon: BarChart3 }
      ];
    }

    if (user?.role === "laboratoire") {
      return [
        ...baseItems,
        { title: "Utilisateurs", url: "/users", icon: Users },
        { title: "Liste de pharmacies", url: "/entities", icon: Building2 },
        { title: "Produits", url: "/products", icon: Package },
        { title: "Commandes", url: "/orders", icon: ShoppingCart },
        { title: "Offres commerciales", url: "/offers", icon: Tag },
        { title: "Communications", url: "/communications", icon: MessageSquare },
        { title: "Historique", url: "/history", icon: History },
        { title: "Statistiques", url: "/stats", icon: BarChart3 }
      ];
    }

    if (user?.role === "delegue") {
      return [
        ...baseItems,
        { title: "Mes commandes", url: "/orders", icon: ShoppingCart },
        { title: "Produits", url: "/products", icon: Package },
        { title: "Offres commerciales", url: "/offers", icon: Tag },
        { title: "Communications", url: "/communications", icon: MessageSquare }
      ];
    }

    if (user?.role === "grossiste") {
      return [
        ...baseItems,
        { title: "Commandes à traiter", url: "/orders", icon: ShoppingCart },
        { title: "Offres commerciales", url: "/offers", icon: Tag },
        { title: "Communications", url: "/communications", icon: MessageSquare }
      ];
    }

    if (user?.role === "pharmacie") {
      return [
        ...baseItems,
        { title: "Mes commandes", url: "/orders", icon: ShoppingCart },
        { title: "Offres commerciales", url: "/offers", icon: Tag },
        { title: "Communications", url: "/communications", icon: MessageSquare }
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

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

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-destructive/10 text-destructive",
      laboratoire: "bg-primary/10 text-primary",
      delegue: "bg-chart-2/20 text-chart-2",
      grossiste: "bg-chart-3/20 text-chart-3",
      pharmacie: "bg-chart-4/20 text-chart-4"
    };
    return colors[role] || "bg-muted text-muted-foreground";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            <Pill className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-sidebar-foreground">PharmaFlow</h2>
            <p className="text-xs text-muted-foreground">Gestion commandes</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-${item.url.replace("/", "") || "dashboard"}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Notifications</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/notifications"}>
                  <Link href="/notifications" data-testid="link-notifications">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.prenom} {user?.nom}
            </p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(user?.role || "")}`}>
              {getRoleLabel(user?.role || "")}
            </span>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
