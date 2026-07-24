import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriptionsTable } from "@/components/admin/subscriptions-table";
import { RefundsTable } from "@/components/admin/refunds-table";
import { adminPageTitle, adminPageSubtitle } from "@/lib/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/billing/")({
  component: BillingPage,
});

function BillingPage() {
  return (
    <div className="admin-page-shell space-y-4 sm:space-y-5 font-['DM_Sans',sans-serif]">
      <div className="min-w-0 space-y-2 sm:space-y-4">
        <h2 className={adminPageTitle}>Billing</h2>
        <p className={adminPageSubtitle}>
          Recurring subscriptions and patient refund requests.
        </p>
      </div>

      <Tabs defaultValue="subscriptions" className="w-full min-w-0">
        <TabsList className="inline-flex h-auto w-full flex-wrap gap-1 rounded-xl border border-[#EAE6FA] bg-[#FAF9FF] p-1 sm:w-auto">
          <TabsTrigger
            value="subscriptions"
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-[#2E00AB]/70 data-[state=active]:bg-white data-[state=active]:text-[#2E00AB] data-[state=active]:shadow-sm transition-all"
          >
            Subscriptions
          </TabsTrigger>
          <TabsTrigger
            value="refunds"
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-[#2E00AB]/70 data-[state=active]:bg-white data-[state=active]:text-[#2E00AB] data-[state=active]:shadow-sm transition-all"
          >
            Refunds
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="subscriptions" className="mt-6 outline-none">
          <SubscriptionsTable />
        </TabsContent>
        
        <TabsContent value="refunds" className="mt-6 outline-none">
          <RefundsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}