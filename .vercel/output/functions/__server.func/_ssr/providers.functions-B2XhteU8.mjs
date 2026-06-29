import { c as stringType, i as enumType, n as booleanType, s as objectType } from "../_libs/zod.mjs";
import { l as createServerFn } from "./esm-9EjmF9OT.mjs";
import { a as providerFormSchema } from "./providers.schema-Ck25tJ3e.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-Dpn8S0gM.mjs";
import { t as createServerRpc } from "./createServerRpc-TAUNrjZd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/providers.functions-B2XhteU8.js
async function assertAdmin(context) {
	const { data, error } = await context.supabase.rpc("has_role", {
		_user_id: context.userId,
		_role: "admin"
	});
	if (error || !data) throw new Error("Forbidden");
}
var PROFILE_KEYS = [
	"full_name",
	"phone",
	"avatar_url"
];
function splitProviderPayload(input) {
	const profile = {};
	const provider = {};
	for (const [k, v] of Object.entries(input)) {
		if (v === void 0) continue;
		if (PROFILE_KEYS.includes(k)) profile[k] = v;
		else provider[k] = v;
	}
	return {
		profile,
		provider
	};
}
var listInput = objectType({
	search: stringType().trim().max(120).optional(),
	status: enumType([
		"all",
		"active",
		"inactive"
	]).default("all")
}).default({ status: "all" });
var listProviders_createServerFn_handler = createServerRpc({
	id: "a39224ec22c225880bc77af5de15e3fec6f7573262c6e54fd9399ff188cf37e0",
	name: "listProviders",
	filename: "src/lib/providers.functions.ts"
}, (opts) => listProviders.__executeServer(opts));
var listProviders = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => listInput.parse(input ?? {})).handler(listProviders_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	let query = context.supabase.from("provider_directory").select("id, full_name, email, phone, avatar_url, specialty, credentials, is_active, created_at").order("created_at", { ascending: false });
	if (data.status === "active") query = query.eq("is_active", true);
	if (data.status === "inactive") query = query.eq("is_active", false);
	if (data.search) {
		const s = `%${data.search}%`;
		query = query.or(`full_name.ilike.${s},email.ilike.${s},specialty.ilike.${s}`);
	}
	const { data: rows, error } = await query;
	if (error) throw new Error(error.message);
	return rows ?? [];
});
var getProvider_createServerFn_handler = createServerRpc({
	id: "7b3e11d0cc6a98905df5c46d00868e7baef913128c33a0856e183d2d184255a3",
	name: "getProvider",
	filename: "src/lib/providers.functions.ts"
}, (opts) => getProvider.__executeServer(opts));
var getProvider = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => objectType({ id: stringType().uuid() }).parse(input)).handler(getProvider_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	const { data: provider, error } = await context.supabase.from("providers").select("*").eq("id", data.id).maybeSingle();
	if (error) throw new Error(error.message);
	if (!provider) throw new Error("Provider not found");
	const { data: profile, error: profileErr } = await context.supabase.from("profiles").select("full_name, email, phone, avatar_url").eq("id", data.id).maybeSingle();
	if (profileErr) throw new Error(profileErr.message);
	return {
		...provider,
		...profile ?? {}
	};
});
var createInput = providerFormSchema.extend({ redirect_to: stringType().url() });
var createProvider_createServerFn_handler = createServerRpc({
	id: "45c25e32b1e3446e7d46757c244f18c9394f355b3a83a51957fff3adceebdc9d",
	name: "createProvider",
	filename: "src/lib/providers.functions.ts"
}, (opts) => createProvider.__executeServer(opts));
var createProvider = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => createInput.parse(input)).handler(createProvider_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	const { supabaseAdmin } = await import("./client.server-D1oHePJa.mjs");
	const { redirect_to, email, ...rest } = data;
	const { profile: profileFields, provider: providerFields } = splitProviderPayload(rest);
	const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
		email,
		email_confirm: true,
		user_metadata: { full_name: profileFields.full_name }
	});
	if (createErr || !created.user) throw new Error(createErr?.message ?? "Could not create user");
	const userId = created.user.id;
	const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
		id: userId,
		email,
		full_name: profileFields.full_name ?? "",
		...profileFields
	}, { onConflict: "id" });
	if (profileErr) {
		await supabaseAdmin.auth.admin.deleteUser(userId);
		throw new Error(profileErr.message);
	}
	const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
		user_id: userId,
		role: "provider"
	});
	if (roleErr) {
		await supabaseAdmin.auth.admin.deleteUser(userId);
		throw new Error(roleErr.message);
	}
	const { error: insertErr } = await supabaseAdmin.from("providers").insert({
		id: userId,
		...providerFields
	});
	if (insertErr) {
		await supabaseAdmin.auth.admin.deleteUser(userId);
		throw new Error(insertErr.message);
	}
	const { error: linkErr } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo: redirect_to });
	if (linkErr) return {
		id: userId,
		invite_sent: false,
		warning: linkErr.message
	};
	return {
		id: userId,
		invite_sent: true
	};
});
var updateInput = providerFormSchema.partial().extend({ id: stringType().uuid() });
var updateProvider_createServerFn_handler = createServerRpc({
	id: "d10bd4fdaab4eab65570963d30abdaa466cc05aea103e9ce6656029825e22963",
	name: "updateProvider",
	filename: "src/lib/providers.functions.ts"
}, (opts) => updateProvider.__executeServer(opts));
var updateProvider = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => updateInput.parse(input)).handler(updateProvider_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	const { id, email, ...rest } = data;
	const { profile: profileFields, provider: providerFields } = splitProviderPayload(rest);
	if (Object.keys(profileFields).length > 0) {
		const { error } = await context.supabase.from("profiles").update(profileFields).eq("id", id);
		if (error) throw new Error(error.message);
	}
	if (email) {
		const { supabaseAdmin } = await import("./client.server-D1oHePJa.mjs");
		const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, { email });
		if (authErr) throw new Error(authErr.message);
	}
	if (Object.keys(providerFields).length > 0) {
		const { error } = await context.supabase.from("providers").update(providerFields).eq("id", id);
		if (error) throw new Error(error.message);
	}
	return { ok: true };
});
var resendInvite_createServerFn_handler = createServerRpc({
	id: "bea3ec9943b2ab802c9a73ef477ef095b1d5873c0f883a0384791eedbccd51fe",
	name: "resendInvite",
	filename: "src/lib/providers.functions.ts"
}, (opts) => resendInvite.__executeServer(opts));
var resendInvite = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => objectType({
	id: stringType().uuid(),
	redirect_to: stringType().url()
}).parse(input)).handler(resendInvite_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	const { data: row, error } = await context.supabase.from("profiles").select("email").eq("id", data.id).maybeSingle();
	if (error || !row?.email) throw new Error("Provider not found");
	const { supabaseAdmin } = await import("./client.server-D1oHePJa.mjs");
	const { error: linkErr } = await supabaseAdmin.auth.resetPasswordForEmail(row.email, { redirectTo: data.redirect_to });
	if (linkErr) throw new Error(linkErr.message);
	return { ok: true };
});
var setProviderActive_createServerFn_handler = createServerRpc({
	id: "d7ffc0e9d319ca96f3b29f796bb3aad059cf564591efef138b3dbbaf869e5029",
	name: "setProviderActive",
	filename: "src/lib/providers.functions.ts"
}, (opts) => setProviderActive.__executeServer(opts));
var setProviderActive = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => objectType({
	id: stringType().uuid(),
	is_active: booleanType()
}).parse(input)).handler(setProviderActive_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	const { supabaseAdmin } = await import("./client.server-D1oHePJa.mjs");
	const { error: updErr } = await supabaseAdmin.from("providers").update({ is_active: data.is_active }).eq("id", data.id);
	if (updErr) throw new Error(updErr.message);
	await supabaseAdmin.auth.admin.updateUserById(data.id, { ban_duration: data.is_active ? "none" : "876000h" });
	return { ok: true };
});
var deleteProvider_createServerFn_handler = createServerRpc({
	id: "e101fe5a7cc0516df402356fdad24e4f2885726ec687ae6ff53f43370855a553",
	name: "deleteProvider",
	filename: "src/lib/providers.functions.ts"
}, (opts) => deleteProvider.__executeServer(opts));
var deleteProvider = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => objectType({ id: stringType().uuid() }).parse(input)).handler(deleteProvider_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	const { supabaseAdmin } = await import("./client.server-D1oHePJa.mjs");
	const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
	if (error) throw new Error(error.message);
	return { ok: true };
});
//#endregion
export { createProvider_createServerFn_handler, deleteProvider_createServerFn_handler, getProvider_createServerFn_handler, listProviders_createServerFn_handler, resendInvite_createServerFn_handler, setProviderActive_createServerFn_handler, updateProvider_createServerFn_handler };
