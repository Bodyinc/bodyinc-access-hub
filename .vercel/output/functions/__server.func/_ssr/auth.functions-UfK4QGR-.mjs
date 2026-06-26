import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
import { c as stringType, s as objectType } from "../_libs/zod.mjs";
import { l as createServerFn } from "./esm-9EjmF9OT.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-Dpn8S0gM.mjs";
import { t as createServerRpc } from "./createServerRpc-TAUNrjZd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth.functions-UfK4QGR-.js
var ALLOWED_ROLES = ["admin", "provider"];
var PORTAL_URLS = {
	admin: "https://admin.bodyinc.com",
	patient: "https://patient.bodyinc.com",
	provider: "https://provider.bodyinc.com"
};
var credentialsSchema = objectType({
	email: stringType().trim().email().max(255),
	password: stringType().min(8).max(128)
});
var emailSchema = objectType({ email: stringType().trim().email().max(255) });
var verifyOtpSchema = objectType({
	email: stringType().trim().email().max(255),
	token: stringType().trim().regex(/^\d{8}$/u, "Enter the 8-digit code")
});
function serverSupabase() {
	return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: {
		storage: void 0,
		persistSession: false,
		autoRefreshToken: false
	} });
}
function buildRoleResult(role, session) {
	if (role && ALLOWED_ROLES.includes(role)) return {
		ok: true,
		role,
		session
	};
	if (!role) return {
		ok: false,
		error: "no_access",
		message: "Your account does not have portal access. Please contact your administrator."
	};
	const redirectUrl = PORTAL_URLS[role];
	const label = role === "patient" ? "patient" : role;
	return {
		ok: false,
		error: "wrong_portal",
		actualRole: role,
		redirectUrl,
		message: redirectUrl ? `This email is registered as a ${label}. Please log in at ${redirectUrl}.` : `This email is registered as a ${label}. Please use the correct portal.`
	};
}
var signInWithPassword_createServerFn_handler = createServerRpc({
	id: "a85d6e8a98d921cd24e92784db8760ac4aa50f9b85f80d538fce3f1eb91cb724",
	name: "signInWithPassword",
	filename: "src/lib/auth.functions.ts"
}, (opts) => signInWithPassword.__executeServer(opts));
var signInWithPassword = createServerFn({ method: "POST" }).inputValidator((input) => credentialsSchema.parse(input)).handler(signInWithPassword_createServerFn_handler, async ({ data }) => {
	const supabase = serverSupabase();
	const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
		email: data.email,
		password: data.password
	});
	if (signInError || !signInData.session || !signInData.user) return {
		ok: false,
		error: "invalid_credentials",
		message: "Invalid email or password."
	};
	const { data: role, error: roleError } = await supabase.rpc("get_user_portal", { _user_id: signInData.user.id });
	if (roleError) {
		await supabase.auth.signOut();
		return {
			ok: false,
			error: "no_access",
			message: "Could not verify your account access. Please try again."
		};
	}
	const result = buildRoleResult(role, {
		access_token: signInData.session.access_token,
		refresh_token: signInData.session.refresh_token
	});
	if (!result.ok) await supabase.auth.signOut();
	return result;
});
var sendLoginOtp_createServerFn_handler = createServerRpc({
	id: "57505b8c97052c9077dab9f2fa824623b159232a718ef56e3567adfbe4564f93",
	name: "sendLoginOtp",
	filename: "src/lib/auth.functions.ts"
}, (opts) => sendLoginOtp.__executeServer(opts));
var sendLoginOtp = createServerFn({ method: "POST" }).inputValidator((input) => emailSchema.parse(input)).handler(sendLoginOtp_createServerFn_handler, async ({ data }) => {
	await serverSupabase().auth.signInWithOtp({
		email: data.email,
		options: { shouldCreateUser: false }
	});
	return { ok: true };
});
var verifyLoginOtp_createServerFn_handler = createServerRpc({
	id: "e3d516e987e1c730e53dec6111b5a437acce773e8990f82a103b2fee544f2cc9",
	name: "verifyLoginOtp",
	filename: "src/lib/auth.functions.ts"
}, (opts) => verifyLoginOtp.__executeServer(opts));
var verifyLoginOtp = createServerFn({ method: "POST" }).inputValidator((input) => verifyOtpSchema.parse(input)).handler(verifyLoginOtp_createServerFn_handler, async ({ data }) => {
	const supabase = serverSupabase();
	const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
		email: data.email,
		token: data.token,
		type: "email"
	});
	if (verifyError || !verifyData.session || !verifyData.user) return {
		ok: false,
		error: "invalid_code",
		message: "Invalid or expired code. Please request a new one."
	};
	const { data: role, error: roleError } = await supabase.rpc("get_user_portal", { _user_id: verifyData.user.id });
	if (roleError) {
		await supabase.auth.signOut();
		return {
			ok: false,
			error: "no_access",
			message: "Could not verify your account access. Please try again."
		};
	}
	const result = buildRoleResult(role, {
		access_token: verifyData.session.access_token,
		refresh_token: verifyData.session.refresh_token
	});
	if (!result.ok) await supabase.auth.signOut();
	return result;
});
var getCurrentPortalRole_createServerFn_handler = createServerRpc({
	id: "e4b04772036c1add2f7ab095b0c1ea65d3072d89c63246a9b8fdb44d2a2212d7",
	name: "getCurrentPortalRole",
	filename: "src/lib/auth.functions.ts"
}, (opts) => getCurrentPortalRole.__executeServer(opts));
var getCurrentPortalRole = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getCurrentPortalRole_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.rpc("get_user_portal", { _user_id: context.userId });
	if (error) return { role: null };
	return { role: data ?? null };
});
//#endregion
export { getCurrentPortalRole_createServerFn_handler, sendLoginOtp_createServerFn_handler, signInWithPassword_createServerFn_handler, verifyLoginOtp_createServerFn_handler };
