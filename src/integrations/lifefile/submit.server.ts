import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createLifeFileOrder,
  extractLifeFileOrderId,
} from "@/integrations/lifefile/orders.server";
import {
  getLegacyLifeFileConfig,
  type LifeFileConfig,
} from "@/integrations/lifefile/client.server";

export type LifeFileSubmitResult = {
  lifeFileOrderId: string;
  pharmacyId: string | null;
  pharmacyName: string | null;
};

type RequestRow = {
  id: string;
  status: string;
  provider_id: string | null;
  user_id: string | null;
  medicine_id: string | null;
  variant_id: string | null;
  life_file_order_id?: string | null;
  life_file_status?: string | null;
};

/**
 * Resolve pharmacy + product + provider credentials, call LifeFile, and persist
 * submission fields on the medication request. Does not change request status.
 */
export async function submitRequestToLifeFile(
  supabaseAdmin: SupabaseClient,
  req: RequestRow,
  options: { allowRetry?: boolean } = {},
): Promise<LifeFileSubmitResult> {
  if (req.life_file_order_id && req.life_file_status && req.life_file_status !== "failed") {
    throw new Error(
      "This order was already submitted to LifeFile. Duplicate submissions are blocked.",
    );
  }

  if (!options.allowRetry && req.life_file_status === "failed" && req.life_file_order_id) {
    // Failed without an order id is retryable via allowRetry; with an id still block.
  }

  if (!req.user_id) {
    throw new Error("This request has no patient account.");
  }
  if (!req.provider_id) {
    throw new Error("This request has no assigned provider.");
  }

  const [{ data: patient }, { data: provider }, { data: prescription }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select(
        "full_name, dob, sex, email, phone, street_address, apartment, city, state_code, postal_code, country",
      )
      .eq("id", req.user_id)
      .maybeSingle(),
    supabaseAdmin
      .from("providers")
      .select("id, license_number, license_states, npi, dea")
      .eq("id", req.provider_id)
      .maybeSingle(),
    supabaseAdmin
      .from("prescriptions")
      .select("id, medicine_name, directions, medicine_id, variant_id, created_at")
      .eq("request_id", req.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!patient) throw new Error("Patient profile not found.");
  if (!provider) throw new Error("Provider record not found.");
  if (!prescription) {
    throw new Error("Prescription not found. Generate the prescription first.");
  }

  const { data: providerProfile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", req.provider_id)
    .maybeSingle();
  if (!providerProfile) throw new Error("Provider profile not found.");

  const medicineId = prescription.medicine_id ?? req.medicine_id;
  const variantId = prescription.variant_id ?? req.variant_id;

  const routing = await resolveLifeFileRouting(supabaseAdmin, {
    medicineId,
    variantId,
    providerId: req.provider_id,
  });

  const [{ data: liveMedicine }, { data: liveVariant }] = await Promise.all([
    medicineId
      ? supabaseAdmin.from("medicines").select("name").eq("id", medicineId).maybeSingle()
      : Promise.resolve({ data: null }),
    variantId
      ? supabaseAdmin.from("medicine_variants").select("name").eq("id", variantId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const medicineName = liveMedicine?.name || prescription.medicine_name;
  const variantName = liveVariant?.name ?? null;
  const medicineLabel = variantName ? `${medicineName} (${variantName})` : medicineName;

  const npi = routing.credentialNpi || provider.npi;
  if (!npi) {
    throw new Error("Provider NPI is required for Life File.");
  }

  try {
    const lifeFileResponse = await createLifeFileOrder({
      requestId: req.id,
      config: routing.config,
      patient: {
        fullName: patient.full_name,
        dob: patient.dob,
        sex: patient.sex,
        email: patient.email,
        phone: patient.phone,
        streetAddress: patient.street_address,
        apartment: patient.apartment,
        city: patient.city,
        stateCode: patient.state_code,
        postalCode: patient.postal_code,
        country: patient.country,
      },
      provider: {
        fullName: providerProfile.full_name,
        npi,
        licenseNumber: provider.license_number,
        licenseState: provider.license_states?.[0] ?? null,
        dea: provider.dea,
        email: providerProfile.email,
        lifeFileProviderId: routing.providerLifeFileId,
      },
      prescription: {
        medicineName: medicineLabel,
        directions: prescription.directions,
        lfProductID: routing.lfProductId,
      },
    });

    const lifeFileOrderId = extractLifeFileOrderId(lifeFileResponse);
    if (!lifeFileOrderId) {
      throw new Error(
        "Life File accepted the request, but no Order ID was found in the response. Check the server console for the full response.",
      );
    }

    await supabaseAdmin
      .from("medication_requests")
      .update({
        life_file_status: "submitted",
        life_file_order_id: lifeFileOrderId,
        life_file_error: null,
        life_file_pharmacy_id: routing.pharmacyId,
        life_file_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.id);

    return {
      lifeFileOrderId,
      pharmacyId: routing.pharmacyId,
      pharmacyName: routing.pharmacyName,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Life File submission failed.";
    await supabaseAdmin
      .from("medication_requests")
      .update({
        life_file_status: "failed",
        life_file_error: message.slice(0, 1000),
        life_file_pharmacy_id: routing.pharmacyId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    throw error;
  }
}

async function resolveLifeFileRouting(
  supabaseAdmin: SupabaseClient,
  args: {
    medicineId: string | null;
    variantId: string | null;
    providerId: string;
  },
): Promise<{
  pharmacyId: string | null;
  pharmacyName: string | null;
  lfProductId: number;
  config: LifeFileConfig;
  providerLifeFileId: string | null;
  credentialNpi: string | null;
}> {
  if (!args.medicineId) {
    throw new Error("Pharmacy configuration is missing for this medicine.");
  }

  let productQuery = supabaseAdmin
    .from("medicine_life_file_products")
    .select(
      "id, pharmacy_id, lf_product_id, variant_id, is_active, life_file_pharmacies(id, name, api_base_url, vendor_id, location_id, api_network_id, is_active)",
    )
    .eq("medicine_id", args.medicineId)
    .eq("is_active", true);

  if (args.variantId) {
    productQuery = productQuery.eq("variant_id", args.variantId);
  } else {
    productQuery = productQuery.is("variant_id", null);
  }

  const { data: products, error: productsError } = await productQuery;
  if (productsError) {
    // Table may not exist yet in environments that have not migrated — fall back to legacy.
    if (/medicine_life_file_products|does not exist|schema cache/i.test(productsError.message)) {
      return resolveLegacyRouting(supabaseAdmin, args);
    }
    throw new Error(productsError.message);
  }

  const rows = (products ?? []) as any[];
  if (rows.length === 0) {
    // Fall back to medicines/variants.lf_product_id + env credentials.
    return resolveLegacyRouting(supabaseAdmin, args);
  }

  if (rows.length > 1) {
    throw new Error(
      "This medicine is linked to more than one LifeFile pharmacy. Keep a single active pharmacy mapping for this SKU, or split into separate medicines/variants.",
    );
  }

  const row = rows[0];
  const pharmacy = Array.isArray(row.life_file_pharmacies)
    ? row.life_file_pharmacies[0]
    : row.life_file_pharmacies;

  if (!pharmacy?.id) {
    throw new Error("Pharmacy configuration is missing for this medicine.");
  }
  if (pharmacy.is_active === false) {
    throw new Error(`Pharmacy "${pharmacy.name}" is inactive.`);
  }

  const lfProductId = Number(row.lf_product_id);
  if (!Number.isInteger(lfProductId) || lfProductId <= 0) {
    throw new Error(
      args.variantId
        ? "This variant has no Life File product ID. Add it on the medicine variant in Admin → Medicines before sending to pharmacy."
        : "This medicine has no Life File product ID. Add it on the medicine in Admin → Medicines before sending to pharmacy.",
    );
  }

  const { data: cred, error: credError } = await supabaseAdmin
    .from("provider_life_file_credentials")
    .select(
      "api_base_url, api_username, api_password, provider_life_file_id, practice_id, npi, is_active",
    )
    .eq("provider_id", args.providerId)
    .eq("pharmacy_id", pharmacy.id)
    .maybeSingle();

  if (credError && !/provider_life_file_credentials|does not exist|schema cache/i.test(credError.message)) {
    throw new Error(credError.message);
  }

  if (!cred || cred.is_active === false) {
    throw new Error(
      `LifeFile configuration is missing for this provider and pharmacy (${pharmacy.name}).`,
    );
  }

  const practiceId = Number(cred.practice_id);
  if (!Number.isFinite(practiceId) || practiceId <= 0) {
    throw new Error(
      `LifeFile practice ID is missing for this provider and pharmacy (${pharmacy.name}).`,
    );
  }

  const vendorId = String(pharmacy.vendor_id ?? "").trim();
  const locationId = String(pharmacy.location_id ?? "").trim();
  const apiNetworkId = String(pharmacy.api_network_id ?? "").trim();
  if (!vendorId || !locationId || !apiNetworkId) {
    throw new Error(
      `Pharmacy "${pharmacy.name}" is missing Vendor ID, Location ID, or API Network ID.`,
    );
  }

  const baseUrl = String(cred.api_base_url || pharmacy.api_base_url || "").trim();
  if (!baseUrl || baseUrl.includes("example.invalid")) {
    throw new Error(
      `Pharmacy "${pharmacy.name}" has no valid API URL. Update it under Admin → LifeFile Pharmacies.`,
    );
  }

  return {
    pharmacyId: pharmacy.id,
    pharmacyName: pharmacy.name,
    lfProductId,
    providerLifeFileId: cred.provider_life_file_id ?? null,
    credentialNpi: cred.npi ?? null,
    config: {
      baseUrl,
      apiUsername: cred.api_username,
      apiPassword: cred.api_password,
      vendorId,
      locationId,
      apiNetworkId,
      practiceId,
    },
  };
}

async function resolveLegacyRouting(
  supabaseAdmin: SupabaseClient,
  args: {
    medicineId: string | null;
    variantId: string | null;
    providerId: string;
  },
): Promise<{
  pharmacyId: string | null;
  pharmacyName: string | null;
  lfProductId: number;
  config: LifeFileConfig;
  providerLifeFileId: string | null;
  credentialNpi: string | null;
}> {
  const [{ data: liveMedicine }, { data: liveVariant }] = await Promise.all([
    args.medicineId
      ? supabaseAdmin
          .from("medicines")
          .select("lf_product_id")
          .eq("id", args.medicineId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    args.variantId
      ? supabaseAdmin
          .from("medicine_variants")
          .select("lf_product_id")
          .eq("id", args.variantId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const lfFromVariant = liveVariant?.lf_product_id;
  const lfFromMedicine = liveMedicine?.lf_product_id;
  const lfProductIdRaw =
    lfFromVariant != null && lfFromVariant !== "" ? lfFromVariant : lfFromMedicine;
  const lfProductId =
    typeof lfProductIdRaw === "number"
      ? lfProductIdRaw
      : lfProductIdRaw != null && lfProductIdRaw !== ""
        ? Number(lfProductIdRaw)
        : NaN;

  if (!Number.isInteger(lfProductId) || lfProductId <= 0) {
    throw new Error("Pharmacy configuration is missing for this medicine.");
  }

  // Prefer provider credentials against any active pharmacy if present; else env.
  const { data: anyCred } = await supabaseAdmin
    .from("provider_life_file_credentials")
    .select(
      "api_base_url, api_username, api_password, provider_life_file_id, practice_id, npi, is_active, pharmacy_id, life_file_pharmacies(id, name, api_base_url, vendor_id, location_id, api_network_id, is_active)",
    )
    .eq("provider_id", args.providerId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (anyCred) {
    const pharmacy = Array.isArray((anyCred as any).life_file_pharmacies)
      ? (anyCred as any).life_file_pharmacies[0]
      : (anyCred as any).life_file_pharmacies;
    const practiceId = Number(anyCred.practice_id);
    if (pharmacy?.is_active !== false && Number.isFinite(practiceId) && practiceId > 0) {
      return {
        pharmacyId: pharmacy?.id ?? anyCred.pharmacy_id ?? null,
        pharmacyName: pharmacy?.name ?? null,
        lfProductId,
        providerLifeFileId: anyCred.provider_life_file_id ?? null,
        credentialNpi: anyCred.npi ?? null,
        config: {
          baseUrl: String(anyCred.api_base_url || pharmacy?.api_base_url || "").trim(),
          apiUsername: anyCred.api_username,
          apiPassword: anyCred.api_password,
          vendorId: String(pharmacy?.vendor_id ?? process.env.LIFE_FILE_VENDOR_ID ?? "").trim(),
          locationId: String(pharmacy?.location_id ?? process.env.LIFE_FILE_LOCATION_ID ?? "").trim(),
          apiNetworkId: String(
            pharmacy?.api_network_id ?? process.env.LIFE_FILE_API_NETWORK_ID ?? "",
          ).trim(),
          practiceId,
        },
      };
    }
  }

  try {
    return {
      pharmacyId: null,
      pharmacyName: null,
      lfProductId,
      providerLifeFileId: null,
      credentialNpi: null,
      config: getLegacyLifeFileConfig(),
    };
  } catch {
    throw new Error(
      "LifeFile configuration is missing for this provider and pharmacy. Add pharmacy credentials on the provider, or set LIFE_FILE_* env vars.",
    );
  }
}
