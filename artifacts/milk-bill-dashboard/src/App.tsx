import { Layout } from "@/components/layout";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import BillsList from "@/pages/bills/index";
import NewBill from "@/pages/bills/new";
import BillDetail from "@/pages/bills/detail";
import BankAdvice from "@/pages/bank-advice";
import Reports from "@/pages/reports";
import Purchases from "@/pages/central-input/purchases";
import Performance from "@/pages/central-input/performance";
import Targets from "@/pages/central-input/targets";
import DcsMonitoring from "@/pages/central-input/dcs-monitoring";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/bills" component={BillsList} />
        <Route path="/bills/new" component={NewBill} />
        <Route path="/bills/:id" component={BillDetail} />
        <Route path="/bank-advice" component={BankAdvice} />
        <Route path="/reports" component={Reports} />
        <Route path="/central-input/purchases" component={Purchases} />
        <Route path="/central-input/performance" component={Performance} />
        <Route path="/central-input/targets" component={Targets} />
        <Route path="/central-input/dcs-monitoring" component={DcsMonitoring} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
