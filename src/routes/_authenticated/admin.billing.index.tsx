import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriptionsTable } from "@/components/admin/subscriptions-table";
import { RefundsTable } from "@/components/admin/refunds-table";

export const Route = createFileRoute("/_authenticated/admin/billing/")({
  component: BillingPage,
});

function BillingPage() {
  return (
    <div className="w-full space-y-4 text-left">
      {/* Header Section */}
      <div className="space-y-1">
        <h2 className="text-[24px] font-black tracking-tight text-[#2A00A2]">
          Billing
        </h2>
        <p className="text-[13px] font-medium text-[#6B5AE0]/80">
          Recurring subscriptions and patient refund requests.
        </p>
      </div>

      {/* Styled Tabs Matrix */}
      <Tabs defaultValue="subscriptions" className="w-full">
        <TabsList className="bg-[#FAF9FF] border border-[#EDEAFB] p-1 rounded-xl gap-1 h-auto inline-flex">
          <TabsTrigger 
            value="subscriptions" 
            className="rounded-lg px-4 py-2 text-[13px] font-bold text-[#6B5AE0]/70 data-[state=active]:bg-white data-[state=active]:text-[#2A00A2] data-[state=active]:shadow-sm transition-all"
          >
            Subscriptions
          </TabsTrigger>
          <TabsTrigger 
            value="refunds" 
            className="rounded-lg px-4 py-2 text-[13px] font-bold text-[#6B5AE0]/70 data-[state=active]:bg-white data-[state=active]:text-[#2A00A2] data-[state=active]:shadow-sm transition-all"
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