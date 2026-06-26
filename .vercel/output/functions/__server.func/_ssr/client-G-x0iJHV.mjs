import { n as __exportAll$1 } from "../_runtime.mjs";
import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/client-G-x0iJHV.js
var client_G_x0iJHV_exports = /* @__PURE__ */ __exportAll$1({
	n: () => supabase,
	t: () => client_exports
});
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var client_exports = /* @__PURE__ */ __exportAll({ supabase: () => supabase });
function createSupabaseClient() {
	return createClient("https://gedtaeganzrbtxviltpo.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZHRhZWdhbnpyYnR4dmlsdHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjEwODQsImV4cCI6MjA5NzQzNzA4NH0.NSj4e2eoKVeHFvFGb0Fyr-yojsZ4JH6efEQSywvWc3M", { auth: {
		storage: typeof window !== "undefined" ? localStorage : void 0,
		persistSession: true,
		autoRefreshToken: true
	} });
}
var _supabase;
var supabase = new Proxy({}, { get(_, prop, receiver) {
	if (!_supabase) _supabase = createSupabaseClient();
	return Reflect.get(_supabase, prop, receiver);
} });
//#endregion
export { supabase as n, client_G_x0iJHV_exports as t };
