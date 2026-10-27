import { createFileRoute, Link } from "@tanstack/react-router";
import { adminPageSubtitle, adminPageTitle } from "@/lib/admin-ui";

export const Route = createFileRoute("/_authenticated/provider/help")({
  head: () => ({
    meta: [
      { title: "Help · Body Inc Practitioner" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProviderHelpPage,
});

const STEPS = [
  "Start on the Dashboard. Cards open a filtered list, and Join now opens the next consultation.",
  "The Consultation window lists every assigned patient who needs a call. Join opens that order, with intake, notes, and history.",
  "On the order, review the intake form first. Red flags, allergies, medications, and history are on the Intake form tab.",
  "Join the consultation when it is required, then add internal notes. Approve only after a required call is finished.",
  "Approve, then Prescribe, then Send to pharmacy. The patient is notified at each step.",
  "Reject and Change medicine both need a reason. Every medicine change waits for the patient to confirm or decline. No response within 48 hours restores the previous plan, and the order returns to your decision.",
  "Claim from the Unassigned Queue only when the intake form is filled. Claiming opens the order. A second practitioner cannot claim the same order.",
];

function ProviderHelpPage() {
  return (
    <div className="admin-page-shell space-y-5 font-['DM_Sans',sans-serif]">
      <div className="space-y-1">
        <h1 className={adminPageTitle}>Help and support</h1>
        <p className={adminPageSubtitle}>
          One order page is the workspace. My Patients is only a directory.
        </p>
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-[14px] text-[#3B4759]">
        {STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="text-[14px] text-[#3B4759]">
        If you are unavailable, update{" "}
        <Link to="/provider/availability" className="font-semibold text-[#6A9B9C]">
          Availability
        </Link>{" "}
        and ask the admin team to reassign anything you cannot release. Licensed states are on{" "}
        <Link to="/provider/profile" className="font-semibold text-[#6A9B9C]">
          My Profile
        </Link>
        .
      </p>
    </div>
  );
}
