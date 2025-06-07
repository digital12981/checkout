import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Sidebar from "@/components/sidebar";
import StatsCards from "@/components/stats-cards";
import PaymentPagesTable from "@/components/payment-pages-table";
import CreatePageModal from "@/components/create-page-modal";

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="min-h-screen flex bg-neutral-50">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-neutral-800">Dashboard</h2>
              <p className="text-neutral-600 mt-1">Gerencie suas páginas de pagamento PIX</p>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary text-white hover:bg-primary/90 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Página</span>
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6">
          <StatsCards />
          <PaymentPagesTable />
        </div>
      </main>

      <CreatePageModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal} 
      />
    </div>
  );
}
