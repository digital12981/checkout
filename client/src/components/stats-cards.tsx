import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CreditCard, TrendingUp, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Stats {
  totalPages: number;
  paymentsToday: number;
  totalRevenue: number;
  conversionRate: number;
}

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-neutral-200 rounded w-20"></div>
                  <div className="h-8 bg-neutral-200 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-neutral-200 rounded-lg"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statItems = [
    {
      label: "Total de Páginas",
      value: stats.totalPages.toString(),
      icon: FileText,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Pagamentos Hoje",
      value: stats.paymentsToday.toString(),
      icon: CreditCard,
      bgColor: "bg-secondary/10",
      iconColor: "text-secondary",
    },
    {
      label: "Faturamento",
      value: formatCurrency(stats.totalRevenue),
      icon: TrendingUp,
      bgColor: "bg-accent/10",
      iconColor: "text-accent",
    },
    {
      label: "Taxa Conversão",
      value: `${stats.conversionRate}%`,
      icon: Percent,
      bgColor: "bg-yellow-100",
      iconColor: "text-yellow-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statItems.map((item, index) => (
        <Card key={index} className="shadow-sm border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm">{item.label}</p>
                <p className="text-2xl font-bold text-neutral-800 mt-1">
                  {item.value}
                </p>
              </div>
              <div className={`w-12 h-12 ${item.bgColor} rounded-lg flex items-center justify-center`}>
                <item.icon className={`w-6 h-6 ${item.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
