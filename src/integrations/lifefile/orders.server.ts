import { getPracticeId, lifeFileRequest } from "./client.server";

type LifeFileResponse = {
  type?: "success" | "error";
  message?: string;
  data?: any;
};

type SandboxProduct = {
  lfProductID: number;
  drugName: string;
  drugStrength: string;
  drugForm: string;
  scheduleCode: "2" | "3" | "4" | "5" | "L" | "O";
  quantityUnits: string;
};

type LifeFileTestOrderInput = {
  requestId: string;
  patient: {
    fullName: string;
    dob: string | null;
    sex: string | null;
    email: string | null;
    phone: string | null;
    streetAddress: string | null;
    apartment: string | null;
    city: string | null;
    stateCode: string | null;
    postalCode: string | null;
    country: string | null;
  };
  provider: {
    fullName: string;
    npi: string | null;
    licenseNumber: string | null;
    licenseState: string | null;
    dea: string | null;
    email: string | null;
  };
  prescription: {
    medicineName: string;
    alternateNames?: Array<string | null | undefined>;
    directions: string | null;
    medicineId: string | null;
  };
};

const SANDBOX_PRODUCTS: SandboxProduct[] = [
  {
    lfProductID: 305157968,
    drugName: "Benzocaine, Lidocaine, Tetracaine Susp Dental",
    drugStrength: "10%, 10%, 4%.",
    drugForm: "Paste",
    scheduleCode: "L",
    quantityUnits: "grams",
  },
  {
    lfProductID: 305492218,
    drugName: "Baclofen, Dexamethasone, Flurbiprofen Emulsion",
    drugStrength: "2.5%,0.5%,5%",
    drugForm: "Cream",
    scheduleCode: "L",
    quantityUnits: "grams",
  },
  {
    lfProductID: 305492220,
    drugName: "Acarbose1",
    drugStrength: "50mg",
    drugForm: "Tablet",
    scheduleCode: "L",
    quantityUnits: "each",
  },
  {
    lfProductID: 305492221,
    drugName: "Acetaminophen",
    drugStrength: "500mg",
    drugForm: "Tablet",
    scheduleCode: "O",
    quantityUnits: "each",
  },
  {
    lfProductID: 305492222,
    drugName: "Acyclovir",
    drugStrength: "5%",
    drugForm: "Ointment",
    scheduleCode: "L",
    quantityUnits: "Grams",
  },
];

/** Strip copy/paste punctuation and invisible characters from admin medicine names. */
function catalogKey(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveSandboxProduct(
  ...candidates: Array<string | null | undefined>
): SandboxProduct | null {
  const needles = candidates
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map(catalogKey)
    .filter(Boolean);

  const ranked = [...SANDBOX_PRODUCTS].sort(
    (a, b) => catalogKey(b.drugName).length - catalogKey(a.drugName).length,
  );

  for (const needle of needles) {
    const exact = ranked.find((product) => catalogKey(product.drugName) === needle);
    if (exact) return exact;
  }

  for (const needle of needles) {
    const prefixed = ranked.find((product) => {
      const key = catalogKey(product.drugName);
      return needle.startsWith(`${key} `);
    });
    if (prefixed) return prefixed;
  }

  return null;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: parts[0],
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function mapGender(sex: string | null): "m" | "f" | "u" {
  if (sex === "male") return "m";
  if (sex === "female") return "f";
  return "u";
}

const TEST_DIRECTIONS_MARKER = "Test Order Do Not Fill";

function withTestDirections(existing: string | null): string {
  const current = existing?.trim() ?? "";
  if (!current) return TEST_DIRECTIONS_MARKER;
  if (current.toLowerCase().includes(TEST_DIRECTIONS_MARKER.toLowerCase())) {
    return current;
  }
  return `${current} ${TEST_DIRECTIONS_MARKER}`;
}

export async function createLifeFileSandboxOrder(
  input: LifeFileTestOrderInput,
) {
  if (!input.patient.dob) {
    throw new Error("Patient date of birth is required for Life File.");
  }

  if (!input.provider.npi) {
    throw new Error("Provider NPI is required for Life File.");
  }

  const patientName = splitName(input.patient.fullName);
  const providerName = splitName(input.provider.fullName);

  const product = resolveSandboxProduct(
    input.prescription.medicineName,
    ...(input.prescription.alternateNames ?? []),
  );

  if (!product) {
    throw new Error(
      `No Life File sandbox product mapping exists for "${input.prescription.medicineName}". Use one of the sandbox product names from Life File.`,
    );
  }

  const payload = {
    message: {
      id: Date.now(),
      sentTime: new Date().toISOString(),
    },

    order: {
      general: {
        referenceId: input.requestId,
        memo: "OM Sandbox Test Order",
      },

      prescriber: {
        npi: input.provider.npi,
        licenseNumber: input.provider.licenseNumber ?? undefined,
        licenseState: input.provider.licenseState ?? undefined,
        dea: input.provider.dea ?? undefined,
        lastName: providerName.lastName,
        firstName: providerName.firstName,
        email: input.provider.email ?? undefined,
      },

      practice: {
        id: getPracticeId(),
      },

      patient: {
        firstName: "Test",
        lastName: patientName.lastName,
        gender: mapGender(input.patient.sex),
        dateOfBirth: input.patient.dob,
        address1: input.patient.streetAddress ?? undefined,
        address2: input.patient.apartment ?? undefined,
        city: input.patient.city ?? undefined,
        state: input.patient.stateCode ?? undefined,
        zip: input.patient.postalCode ?? undefined,
        country: input.patient.country ?? undefined,
        phoneHome: input.patient.phone ?? undefined,
        email: input.patient.email ?? undefined,
      },

      shipping: {
        recipientType: "patient",
        recipientLastName: patientName.lastName,
        recipientFirstName: "Test",
        recipientPhone: input.patient.phone ?? undefined,
        recipientEmail: input.patient.email ?? undefined,
        addressLine1: input.patient.streetAddress ?? undefined,
        addressLine2: input.patient.apartment ?? undefined,
        city: input.patient.city ?? undefined,
        state: input.patient.stateCode ?? undefined,
        zipCode: input.patient.postalCode ?? undefined,
        country: input.patient.country ?? undefined,
        service: 9,
      },

      rxs: [
        {
          rxType: "new",
          drugName: product.drugName,
          drugStrength: product.drugStrength,
          drugForm: product.drugForm,
          lfProductID: product.lfProductID,
          directions: withTestDirections(input.prescription.directions),
          quantityUnits: product.quantityUnits,
          scheduleCode: product.scheduleCode,
          uuid: crypto.randomUUID(),
        },
      ],
    },
  };

  console.log("[Life File] Sending order:", {
    requestId: input.requestId,
    medicine: product.drugName,
    lfProductID: product.lfProductID,
  });

  const response = await lifeFileRequest<LifeFileResponse>("/order", {
    method: "POST",
    body: payload,
  });

  console.log("[Life File] Response:", JSON.stringify(response, null, 2));

  return response;
}