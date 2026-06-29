import { c as stringType, i as enumType, n as booleanType, s as objectType } from "../_libs/zod.mjs";
import { l as createServerFn } from "./esm-9EjmF9OT.mjs";
import { t as createSsrRpc } from "./createSsrRpc-NTk29FAB.mjs";
import { a as providerFormSchema } from "./providers.schema-Ck25tJ3e.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-Dpn8S0gM.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/providers.functions-s8Doq1Xz.js
var listInput = objectType({
	search: stringType().trim().max(120).optional(),
	status: enumType([
		"all",
		"active",
		"inactive"
	]).default("all")
}).default({ status: "all" });
var listProviders = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => listInput.parse(input ?? {})).handler(createSsrRpc("a39224ec22c225880bc77af5de15e3fec6f7573262c6e54fd9399ff188cf37e0"));
var getProvider = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => objectType({ id: stringType().uuid() }).parse(input)).handler(createSsrRpc("7b3e11d0cc6a98905df5c46d00868e7baef913128c33a0856e183d2d184255a3"));
var createInput = providerFormSchema.extend({ redirect_to: stringType().url() });
var createProvider = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => createInput.parse(input)).handler(createSsrRpc("45c25e32b1e3446e7d46757c244f18c9394f355b3a83a51957fff3adceebdc9d"));
var updateInput = providerFormSchema.partial().extend({ id: stringType().uuid() });
var updateProvider = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => updateInput.parse(input)).handler(createSsrRpc("d10bd4fdaab4eab65570963d30abdaa466cc05aea103e9ce6656029825e22963"));
var resendInvite = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => objectType({
	id: stringType().uuid(),
	redirect_to: stringType().url()
}).parse(input)).handler(createSsrRpc("bea3ec9943b2ab802c9a73ef477ef095b1d5873c0f883a0384791eedbccd51fe"));
var setProviderActive = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => objectType({
	id: stringType().uuid(),
	is_active: booleanType()
}).parse(input)).handler(createSsrRpc("d7ffc0e9d319ca96f3b29f796bb3aad059cf564591efef138b3dbbaf869e5029"));
var deleteProvider = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => objectType({ id: stringType().uuid() }).parse(input)).handler(createSsrRpc("e101fe5a7cc0516df402356fdad24e4f2885726ec687ae6ff53f43370855a553"));
//#endregion
export { resendInvite as a, listProviders as i, deleteProvider as n, setProviderActive as o, getProvider as r, updateProvider as s, createProvider as t };
