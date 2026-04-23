import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FileText, 
  Landmark, 
  BarChart3, 
  ShoppingCart, 
  TrendingUp, 
  Target, 
  Activity,
  Menu,
  User,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

const milkBillLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bills", label: "Bills", icon: FileText },
  { href: "/bank-advice", label: "Bank Advice", icon: Landmark },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const centralInputLinks = [
  { href: "/central-input/purchases", label: "Purchases", icon: ShoppingCart },
  { href: "/central-input/performance", label: "Performance", icon: TrendingUp },
  { href: "/central-input/targets", label: "Targets", icon: Target },
  { href: "/central-input/dcs-monitoring", label: "DCS Monitoring", icon: Activity },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { phone, logout } = useAuth();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
          <span className="font-bold text-xl tracking-tight">Milk Bill System</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2">
            <h2 className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-2">
              Milk Bill
            </h2>
            <div className="space-y-1">
              {milkBillLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location === link.href || (link.href !== '/' && location.startsWith(link.href));
                return (
                  <Link key={link.href} href={link.href}>
                    <span className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                      isActive 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-white" 
                        : "text-sidebar-foreground/90 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}>
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="px-4 mt-8">
            <h2 className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-2">
              Central Input
            </h2>
            <div className="space-y-1">
              {centralInputLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location === link.href || location.startsWith(link.href);
                return (
                  <Link key={link.href} href={link.href}>
                    <span className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                      isActive 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-white" 
                        : "text-sidebar-foreground/90 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}>
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-sidebar-border/50">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-medium text-white truncate">{phone ? `+91 ${phone}` : "Admin User"}</p>
            </div>
            <button
              onClick={logout}
              className="text-sidebar-foreground/70 hover:text-white transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 flex-shrink-0 bg-card border-b flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold hidden md:block">
              {milkBillLinks.concat(centralInputLinks).find(l => location === l.href || (l.href !== '/' && location.startsWith(l.href)))?.label || "Dashboard"}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Admin</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {phone ? `+91 ${phone}` : ""}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
