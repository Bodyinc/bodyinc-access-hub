import { lifeFileRequest, type LifeFileConfig } from "./client.server";

type LifeFileResponse = {
  type?: "success" | "error";
  message?: string;
  data?: any;
};

export type LifeFileOrderInput = {
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
    lifeFileProviderId?: string | null;
  };
  prescription: {
    medicineName: string;
    directions: string | null;
    lfProductID: number;
  };
  config: LifeFileConfig;
};

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

export function extractLifeFileOrderId(response: LifeFileResponse | null | undefined) {
  const responseData = response?.data;
  if (typeof responseData === "string" || typeof responseData === "number") {
    return String(responseData);
  }
  const nested =
    responseData?.orderId ??
    responseData?.orderID ??
    responseData?.id ??
    responseData?.order?.id ??
    null;
  return nested != null ? String(nested) : null;
}

export async function createLifeFileOrder(input: LifeFileOrderInput) {
  if (!input.patient.dob) {
    throw new Error("Patient date of birth is required for Life File.");
  }

  if (!input.provider.npi) {
    throw new Error("Provider NPI is required for Life File.");
  }

  const patientName = splitName(input.patient.fullName);
  const providerName = splitName(input.provider.fullName);
  const product = input.prescription;

  const payload = {
    message: {
      id: Date.now(),
      sentTime: new Date().toISOString(),
    },

    order: {
      general: {
        referenceId: input.requestId,
        memo: `BodyInc order ${input.requestId}`,
      },

      prescriber: {
        npi: input.provider.npi,
        licenseNumber: input.provider.licenseNumber ?? undefined,
        licenseState: input.provider.licenseState ?? undefined,
        dea: input.provider.dea ?? undefined,
        lastName: providerName.lastName,
        firstName: providerName.firstName,
        email: input.provider.email ?? undefined,
        ...(input.provider.lifeFileProviderId
          ? { id: input.provider.lifeFileProviderId }
          : {}),
      },

      practice: {
        id: input.config.practiceId,
      },

      patient: {
        firstName: patientName.firstName,
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
        recipientFirstName: patientName.firstName,
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
          drugName: product.medicineName,
          lfProductID: product.lfProductID,
          directions: product.directions?.trim() || undefined,
          uuid: crypto.randomUUID(),
        },
      ],
    },
  };

  console.log("[Life File] Sending order:", {
    requestId: input.requestId,
    medicine: product.medicineName,
    lfProductID: product.lfProductID,
    practiceId: input.config.practiceId,
  });

  const response = await lifeFileRequest<LifeFileResponse>("/order", {
    method: "POST",
    body: payload,
    config: input.config,
  });

  console.log("[Life File] Response:", JSON.stringify(response, null, 2));

  return response;
}
