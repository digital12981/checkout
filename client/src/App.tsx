import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import CheckoutWorking from "@/pages/checkout-working";
import EditPage from "@/pages/edit-page";
import HtmlEditor from "@/pages/html-editor";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/pages" component={Dashboard} />
      <Route path="/settings" component={Dashboard} />
      <Route path="/pages/edit/:id" component={EditPage} />
      <Route path="/pages/html-edit/:id" component={HtmlEditor} />
      <Route path="/checkout/:id" component={CheckoutWorking} />
      <Route path="/pagamento/:id" component={CheckoutWorking} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
