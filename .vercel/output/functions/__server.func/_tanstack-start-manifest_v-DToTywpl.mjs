//#region node_modules/.nitro/vite/services/ssr/assets/_tanstack-start-manifest_v-DToTywpl.js
var tsrStartManifest = () => ({ routes: {
	__root__: {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/__root.tsx",
		children: [
			"/",
			"/_authenticated",
			"/auth",
			"/forgot-password",
			"/reset-password"
		],
		preloads: [
			"/assets/index-BLi2Qy0_.js",
			"/assets/rolldown-runtime-QTnfLwEv.js",
			"/assets/radix-BFqUeYDE.js",
			"/assets/tanstack-DLOuL0w3.js",
			"/assets/supabase-BYWc7qw9.js"
		],
		scripts: [{ attrs: {
			type: "module",
			async: !0,
			src: "/assets/index-BLi2Qy0_.js"
		} }]
	},
	"/": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/index.tsx",
		children: void 0,
		preloads: ["/assets/routes-DJ7LAi8J.js"]
	},
	"/_authenticated": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/route.tsx",
		children: ["/_authenticated/admin", "/_authenticated/dashboard"],
		preloads: ["/assets/route-qCoNYlEw.js"]
	},
	"/auth": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/auth.tsx",
		children: void 0,
		preloads: [
			"/assets/auth-CB7aBkaA.js",
			"/assets/auth-middleware-DQYQ8o0I.js",
			"/assets/utils-B6KiDbIe.js",
			"/assets/button-txWKK5yq.js",
			"/assets/input-CaOev5Cu.js",
			"/assets/label-CcznWKax.js",
			"/assets/card-DhXOgFjJ.js",
			"/assets/types-CR4tV-mU.js",
			"/assets/dist-CoSk3BNC.js"
		]
	},
	"/forgot-password": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/forgot-password.tsx",
		children: void 0,
		preloads: [
			"/assets/forgot-password-CemOXH5i.js",
			"/assets/button-txWKK5yq.js",
			"/assets/input-CaOev5Cu.js",
			"/assets/label-CcznWKax.js",
			"/assets/card-DhXOgFjJ.js",
			"/assets/types-CR4tV-mU.js",
			"/assets/dist-CoSk3BNC.js"
		]
	},
	"/reset-password": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/reset-password.tsx",
		children: void 0,
		preloads: [
			"/assets/reset-password-D5MRDfmx.js",
			"/assets/button-txWKK5yq.js",
			"/assets/input-CaOev5Cu.js",
			"/assets/label-CcznWKax.js",
			"/assets/card-DhXOgFjJ.js",
			"/assets/types-CR4tV-mU.js",
			"/assets/dist-CoSk3BNC.js"
		]
	},
	"/_authenticated/admin": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.tsx",
		children: [
			"/_authenticated/admin/intake-form",
			"/_authenticated/admin/medicines",
			"/_authenticated/admin/packages",
			"/_authenticated/admin/patients",
			"/_authenticated/admin/providers",
			"/_authenticated/admin/questions",
			"/_authenticated/admin/slots",
			"/_authenticated/admin/"
		],
		preloads: [
			"/assets/admin-D_hSDvbU.js",
			"/assets/x-Grz3f4g4.js",
			"/assets/utils-B6KiDbIe.js",
			"/assets/dist-C1RJhgYD.js",
			"/assets/button-txWKK5yq.js",
			"/assets/input-CaOev5Cu.js",
			"/assets/skeleton-BkeFFylf.js"
		]
	},
	"/_authenticated/dashboard": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/dashboard.tsx",
		children: void 0,
		preloads: ["/assets/dashboard-CjcHA2Ky.js", "/assets/button-txWKK5yq.js"]
	},
	"/_authenticated/admin/intake-form": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.intake-form.tsx",
		children: void 0,
		preloads: ["/assets/admin.intake-form-Cb5LXSEv.js", "/assets/card-DhXOgFjJ.js"]
	},
	"/_authenticated/admin/medicines": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.medicines.tsx",
		children: [
			"/_authenticated/admin/medicines/$medicineId",
			"/_authenticated/admin/medicines/new",
			"/_authenticated/admin/medicines/"
		],
		preloads: ["/assets/admin.medicines-qCoNYlEw.js"]
	},
	"/_authenticated/admin/packages": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.packages.tsx",
		children: [
			"/_authenticated/admin/packages/$packageId",
			"/_authenticated/admin/packages/new",
			"/_authenticated/admin/packages/"
		],
		preloads: ["/assets/admin.packages-qCoNYlEw.js"]
	},
	"/_authenticated/admin/patients": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.patients.tsx",
		children: void 0,
		preloads: ["/assets/admin.patients-BlD9qUI6.js", "/assets/card-DhXOgFjJ.js"]
	},
	"/_authenticated/admin/providers": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.providers.tsx",
		children: [
			"/_authenticated/admin/providers/$providerId",
			"/_authenticated/admin/providers/new",
			"/_authenticated/admin/providers/"
		],
		preloads: ["/assets/admin.providers-qCoNYlEw.js"]
	},
	"/_authenticated/admin/questions": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.questions.tsx",
		children: [
			"/_authenticated/admin/questions/$questionId",
			"/_authenticated/admin/questions/new",
			"/_authenticated/admin/questions/"
		],
		preloads: ["/assets/admin.questions-qCoNYlEw.js"]
	},
	"/_authenticated/admin/slots": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.slots.tsx",
		children: void 0,
		preloads: ["/assets/admin.slots-BmpNqspQ.js", "/assets/card-DhXOgFjJ.js"]
	},
	"/_authenticated/admin/": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.index.tsx",
		children: void 0,
		preloads: ["/assets/admin.index-DwYq80Fm.js", "/assets/card-DhXOgFjJ.js"]
	},
	"/_authenticated/admin/medicines/$medicineId": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.medicines.$medicineId.tsx",
		children: void 0,
		preloads: [
			"/assets/admin.medicines._medicineId-CjxJ9k6Y.js",
			"/assets/medicines-Bv0kbwbT.js",
			"/assets/dist-CoSk3BNC.js",
			"/assets/form-skeleton-BKhzDF5C.js"
		]
	},
	"/_authenticated/admin/medicines/new": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.medicines.new.tsx",
		children: void 0,
		preloads: [
			"/assets/admin.medicines.new-WfFLBDBN.js",
			"/assets/medicines-Bv0kbwbT.js",
			"/assets/dist-CoSk3BNC.js",
			"/assets/form-skeleton-BKhzDF5C.js"
		]
	},
	"/_authenticated/admin/packages/$packageId": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.packages.$packageId.tsx",
		children: void 0,
		preloads: [
			"/assets/admin.packages._packageId-HncixPxo.js",
			"/assets/medicines-Bv0kbwbT.js",
			"/assets/dist-CoSk3BNC.js",
			"/assets/form-skeleton-BKhzDF5C.js",
			"/assets/packages-_no1mIN9.js"
		]
	},
	"/_authenticated/admin/packages/new": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.packages.new.tsx",
		children: void 0,
		preloads: [
			"/assets/admin.packages.new-D283Pjnz.js",
			"/assets/medicines-Bv0kbwbT.js",
			"/assets/dist-CoSk3BNC.js",
			"/assets/form-skeleton-BKhzDF5C.js",
			"/assets/packages-_no1mIN9.js"
		]
	},
	"/_authenticated/admin/providers/$providerId": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.providers.$providerId.tsx",
		children: void 0,
		preloads: [
			"/assets/admin.providers._providerId-CwXu_z5k.js",
			"/assets/auth-middleware-DQYQ8o0I.js",
			"/assets/dist-CoSk3BNC.js",
			"/assets/form-skeleton-BKhzDF5C.js",
			"/assets/providers.functions-DEdf4vcV.js"
		]
	},
	"/_authenticated/admin/providers/new": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.providers.new.tsx",
		children: void 0,
		preloads: [
			"/assets/admin.providers.new-Ctn-Yips.js",
			"/assets/auth-middleware-DQYQ8o0I.js",
			"/assets/dist-CoSk3BNC.js",
			"/assets/form-skeleton-BKhzDF5C.js",
			"/assets/providers.functions-DEdf4vcV.js"
		]
	},
	"/_authenticated/admin/questions/$questionId": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.questions.$questionId.tsx",
		children: void 0,
		preloads: [
			"/assets/admin.questions._questionId-CISSpFIk.js",
			"/assets/auth-middleware-DQYQ8o0I.js",
			"/assets/dist-CoSk3BNC.js",
			"/assets/form-skeleton-BKhzDF5C.js",
			"/assets/questions.functions-DJ2CLKOO.js"
		]
	},
	"/_authenticated/admin/questions/new": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.questions.new.tsx",
		children: void 0,
		preloads: [
			"/assets/admin.questions.new-CXaskyM2.js",
			"/assets/auth-middleware-DQYQ8o0I.js",
			"/assets/dist-CoSk3BNC.js",
			"/assets/form-skeleton-BKhzDF5C.js",
			"/assets/questions.functions-DJ2CLKOO.js"
		]
	},
	"/_authenticated/admin/medicines/": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.medicines.index.tsx",
		children: void 0,
		preloads: [
			"/assets/admin.medicines.index-BglG2InP.js",
			"/assets/alert-dialog-DaIibFqi.js",
			"/assets/select-Bci9zkVY.js",
			"/assets/local-storage-banner-x0_p_Ivh.js",
			"/assets/plus-DJjPKIsb.js",
			"/assets/card-DhXOgFjJ.js",
			"/assets/medicines-Bv0kbwbT.js",
			"/assets/badge-_To8LBiR.js",
			"/assets/dist-CoSk3BNC.js",
			"/assets/packages-_no1mIN9.js"
		]
	},
	"/_authenticated/admin/packages/": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.packages.index.tsx",
		children: void 0,
		preloads: [
			"/assets/admin.packages.index-CGNoiLSz.js",
			"/assets/alert-dialog-DaIibFqi.js",
			"/assets/select-Bci9zkVY.js",
			"/assets/local-storage-banner-x0_p_Ivh.js",
			"/assets/plus-DJjPKIsb.js",
			"/assets/card-DhXOgFjJ.js",
			"/assets/medicines-Bv0kbwbT.js",
			"/assets/badge-_To8LBiR.js",
			"/assets/packages.schema-C63Wj_gc.js",
			"/assets/dist-CoSk3BNC.js",
			"/assets/packages-_no1mIN9.js"
		]
	},
	"/_authenticated/admin/providers/": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.providers.index.tsx",
		children: void 0,
		preloads: [
			"/assets/admin.providers.index-D7yb53Gt.js",
			"/assets/auth-middleware-DQYQ8o0I.js",
			"/assets/alert-dialog-DaIibFqi.js",
			"/assets/select-Bci9zkVY.js",
			"/assets/plus-DJjPKIsb.js",
			"/assets/card-DhXOgFjJ.js",
			"/assets/badge-_To8LBiR.js",
			"/assets/dist-CoSk3BNC.js",
			"/assets/providers.functions-DEdf4vcV.js",
			"/assets/use-debounced-value-Bh4KYmNy.js"
		]
	},
	"/_authenticated/admin/questions/": {
		filePath: "/Users/abhisheksoni/Appsrow/bodyinc/Admin:Provider/bodyinc-access-hub/src/routes/_authenticated/admin.questions.index.tsx",
		children: void 0,
		preloads: [
			"/assets/admin.questions.index-nOaLG7_Y.js",
			"/assets/auth-middleware-DQYQ8o0I.js",
			"/assets/alert-dialog-DaIibFqi.js",
			"/assets/select-Bci9zkVY.js",
			"/assets/plus-DJjPKIsb.js",
			"/assets/card-DhXOgFjJ.js",
			"/assets/badge-_To8LBiR.js",
			"/assets/questions.schema-CZVEdsA2.js",
			"/assets/dist-CoSk3BNC.js",
			"/assets/use-debounced-value-Bh4KYmNy.js",
			"/assets/questions.functions-DJ2CLKOO.js"
		]
	}
} });
//#endregion
export { tsrStartManifest };
