import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { loginSchema, type LoginInput } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Pill, Lock, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import sentinelLogo from "@assets/logo_1771319487082.png";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    const success = await login(data.email, data.password);
    setIsLoading(false);

    if (success) {
      toast({ title: "Connexion réussie", description: "Bienvenue sur PharmaFlow" });
      setLocation("/");
    } else {
      toast({ 
        title: "Erreur de connexion", 
        description: "Email ou mot de passe incorrect",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="absolute top-4 left-4">
        <img src={sentinelLogo} alt="Sentinel Data" className="h-10 object-contain" data-testid="img-sentinel-logo" />
      </div>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Pill className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">PharmaFlow</h1>
          <p className="text-muted-foreground mt-2">Gestion des commandes pharmaceutiques</p>
        </div>

        <Card className="border-card-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Connexion</CardTitle>
            <CardDescription className="text-center">
              Entrez vos identifiants pour accéder à votre espace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            {...field} 
                            type="email" 
                            placeholder="votre@email.com" 
                            className="pl-10"
                            data-testid="input-email"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            {...field} 
                            type={showPassword ? "text" : "password"} 
                            placeholder="" 
                            className="pl-10 pr-10"
                            data-testid="input-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            data-testid="button-toggle-password"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    "Se connecter"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                Comptes de test disponibles :
              </p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p><span className="font-medium">Admin:</span> admin@pharmaflow.com / admin123</p>
                <p><span className="font-medium">Laboratoire:</span> labo@pharmaflow.com / labo123</p>
                <p><span className="font-medium">Délégué:</span> delegue@pharmaflow.com / delegue123</p>
                <p><span className="font-medium">Grossiste:</span> grossiste@pharmaflow.com / grossiste123</p>
                <p><span className="font-medium">Pharmacie:</span> pharmacie@pharmaflow.com / pharmacie123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
