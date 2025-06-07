import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Palette, Settings, Wrench } from "lucide-react";
import Sidebar from "@/components/sidebar";
import StatsCards from "@/components/stats-cards";
import PaymentPagesTable from "@/components/payment-pages-table";
import CreatePageModal from "@/components/create-page-modal";

function TemplatesContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>Templates Disponíveis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-2 border-primary bg-primary/5">
              <CardContent className="p-4">
                <div className="aspect-video bg-gradient-to-br from-primary to-accent rounded mb-3"></div>
                <h4 className="font-medium text-neutral-800">Moderno</h4>
                <p className="text-sm text-neutral-600">Design clean e profissional</p>
                <Button className="w-full mt-3" variant="outline">Em Uso</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="aspect-video bg-gradient-to-br from-neutral-400 to-neutral-600 rounded mb-3"></div>
                <h4 className="font-medium text-neutral-800">Minimalista</h4>
                <p className="text-sm text-neutral-600">Foco no essencial</p>
                <Button className="w-full mt-3" variant="outline">Selecionar</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="aspect-video bg-gradient-to-br from-accent to-yellow-500 rounded mb-3"></div>
                <h4 className="font-medium text-neutral-800">Premium</h4>
                <p className="text-sm text-neutral-600">Visual sofisticado</p>
                <Button className="w-full mt-3" variant="outline">Selecionar</Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsContent() {
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
              defaultValue="CheckoutFy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              E-mail de Contato
            </label>
            <input 
              type="email" 
              className="w-full px-3 py-2 border border-neutral-300 rounded-md" 
              defaultValue="contato@checkoutfy.com"
            />
          </div>
          <Button className="bg-primary text-white hover:bg-primary/90">
            Salvar Configurações
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
            />
          </div>
          <Button className="bg-secondary text-white hover:bg-secondary/90">
            Testar Conexão
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [location] = useLocation();

  const getPageInfo = () => {
    switch (location) {
      case '/pages':
        return {
          title: 'Páginas de Pagamento',
          description: 'Gerencie suas páginas de pagamento PIX',
          showCreateButton: true
        };
      case '/templates':
        return {
          title: 'Templates',
          description: 'Escolha e personalize templates para suas páginas',
          showCreateButton: false
        };
      case '/settings':
        return {
          title: 'Configurações',
          description: 'Configure sua conta e integrações',
          showCreateButton: false
        };
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
      case '/templates':
        return <TemplatesContent />;
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
