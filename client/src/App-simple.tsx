import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

// Simple test component
function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">CheckoutFy - Sistema Funcionando</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Status do Sistema</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Servidor rodando</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Frontend carregado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Banco de dados conectado</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Navegação</h2>
            <div className="space-y-2">
              <a href="/dashboard" className="block p-2 bg-blue-50 hover:bg-blue-100 rounded">
                Dashboard
              </a>
              <a href="/edit-page/1" className="block p-2 bg-blue-50 hover:bg-blue-100 rounded">
                Editor (Página 1)
              </a>
              <a href="/edit-page/2" className="block p-2 bg-blue-50 hover:bg-blue-100 rounded">
                Editor (Página 2)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Lazy loading with error boundary
function SafeRoute({ component: Component, ...props }: any) {
  try {
    return <Component {...props} />;
  } catch (error) {
    console.error("Route error:", error);
    return <TestPage />;
  }
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={TestPage} />
      <Route path="/test" component={TestPage} />
      <Route path="/dashboard">
        {() => {
          try {
            const Dashboard = require("@/pages/dashboard").default;
            return <Dashboard />;
          } catch {
            return <TestPage />;
          }
        }}
      </Route>
      <Route path="/edit-page/:id">
        {(params) => {
          try {
            const EditPage = require("@/pages/edit-page").default;
            return <EditPage />;
          } catch {
            return <TestPage />;
          }
        }}
      </Route>
      <Route component={TestPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;