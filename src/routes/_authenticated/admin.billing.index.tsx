import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriptionsTable } from "@/components/admin/subscriptions-table";
import { RefundsTable } from "@/components/admin/refunds-table";

export const Route = createFileRoute("/_authenticated/admin/billing/")({
  component: BillingPage,
});

function BillingPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-sm text-muted-foreground">
          Recurring subscriptions and patient refund requests.
        </p>
      </div>

      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
        </TabsList>
        <TabsContent value="subscriptions" className="mt-4">
          <SubscriptionsTable />
        </TabsContent>
        <TabsContent value="refunds" className="mt-4">
          <RefundsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
