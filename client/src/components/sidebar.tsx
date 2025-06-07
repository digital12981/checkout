import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Home, 
  FileText, 
  Palette, 
  BarChart3, 
  Settings, 
  CreditCard, 
  User 
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Páginas de Pagamento", href: "/pages", icon: FileText },
  { name: "Templates", href: "/templates", icon: Palette },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-neutral-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-neutral-800">CheckoutFy</h1>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-neutral-600 hover:bg-neutral-100"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* User Profile */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-neutral-300 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-neutral-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-800">Admin</p>
            <p className="text-xs text-neutral-500">admin@checkoutfy.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
