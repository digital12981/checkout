import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Settings, Wrench } from "lucide-react";
import Sidebar from "@/components/sidebar";
import StatsCards from "@/components/stats-cards";
import PaymentPagesTable from "@/components/payment-pages-table";
import CreatePageModal from "@/components/create-page-modal";
import { useToast } from "@/hooks/use-toast";
import type { PaymentPage } from "@shared/schema";



function SettingsContent() {
  const [companyName, setCompanyName] = useState("CheckoutFy");
  const [companyEmail, setCompanyEmail] = useState("contato@checkoutfy.com");
  const [apiKey, setApiKey] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const settings = await response.json();
          if (settings.company_name) setCompanyName(settings.company_name);
          if (settings.company_email) setCompanyEmail(settings.company_email);
          if (settings.for4payments_api_key) setApiKey(settings.for4payments_api_key);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, []);

  const saveGeneralSettings = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "company_name", value: companyName })
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "company_email", value: companyEmail })
        })
      ]);

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive"
      });
    }
    setIsSaving(false);
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Erro",
        description: "Chave da API é obrigatória",
        variant: "destructive"
      });
      return;
    }

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "for4payments_api_key", value: apiKey })
      });

      toast({
        title: "Sucesso",
        description: "Chave da API salva com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao salvar chave da API",
        variant: "destructive"
      });
    }
  };

  const testConnection = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Erro",
        description: "Insira a chave da API antes de testar",
        variant: "destructive"
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await fetch("/api/settings/test-for4payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Sucesso",
          description: result.message
        });
        // Save the API key if test is successful
        await saveApiKey();
      } else {
        toast({
          title: "Erro",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao testar conexão",
        variant: "destructive"
      });
    }
    setIsTestingConnection(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Configurações Gerais</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Nome da Empresa
            </label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-neutral-300 rounded-md" 
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              E-mail de Contato
            </label>
            <input 
              type="email" 
              className="w-full px-3 py-2 border border-neutral-300 rounded-md" 
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
            />
          </div>
          <Button 
            onClick={saveGeneralSettings}
            disabled={isSaving}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {isSaving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wrench className="w-5 h-5" />
            <span>Integração For4Payments</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Chave da API
            </label>
            <input 
              type="password" 
              className="w-full px-3 py-2 border border-neutral-300 rounded-md" 
              placeholder="Insira sua chave da API For4Payments"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="flex space-x-3">
            <Button 
              onClick={testConnection}
              disabled={isTestingConnection}
              className="bg-secondary text-white hover:bg-secondary/90"
            >
              {isTestingConnection ? "Testando..." : "Testar Conexão"}
            </Button>
            <Button 
              onClick={saveApiKey}
              variant="outline"
            >
              Salvar Chave
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [location, setLocation] = useLocation();

  // Query for payment pages to find one with skipForm enabled
  const { data: paymentPages } = useQuery<PaymentPage[]>({
    queryKey: ["/api/payment-pages"],
  });

  // Check if URL contains customer parameters and redirect to appropriate checkout
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasCustomerParams = urlParams.get('nome') && urlParams.get('email') && urlParams.get('cpf');
    
    if (hasCustomerParams && paymentPages && paymentPages.length > 0) {
      // Find the first page with skipForm enabled, or use the first page
      const targetPage = paymentPages.find(page => page.skipForm) || paymentPages[0];
      
      if (targetPage) {
        // Redirect to checkout with the same parameters
        const searchParams = window.location.search;
        setLocation(`/checkout/${targetPage.id}${searchParams}`);
      }
    }
  }, [paymentPages, setLocation]);

  const getPageInfo = () => {
    switch (location) {
      case '/pages':
        return {
          title: 'Páginas de Pagamento',
          description: 'Gerencie suas páginas de pagamento PIX',
          showCreateButton: true
        };

      case '/settings':
        return {
          title: 'Configurações',
          description: 'Configure sua conta e integrações',
          showCreateButton: false
        };
      case '/dashboard':
      case '/':
      default:
        return {
          title: 'Dashboard',
          description: 'Gerencie suas páginas de pagamento PIX',
          showCreateButton: true
        };
    }
  };

  const renderContent = () => {
    switch (location) {
      case '/settings':
        return <SettingsContent />;
      case '/pages':
        return <PaymentPagesTable />;
      default:
        return (
          <>
            <StatsCards />
            <PaymentPagesTable />
          </>
        );
    }
  };

  const pageInfo = getPageInfo();

  return (
    <div className="min-h-screen flex bg-neutral-50">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-neutral-800">{pageInfo.title}</h2>
              <p className="text-neutral-600 mt-1">{pageInfo.description}</p>
            </div>
            {pageInfo.showCreateButton && (
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-primary text-white hover:bg-primary/90 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Página</span>
              </Button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </main>

      <CreatePageModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal} 
      />
    </div>
  );
}
