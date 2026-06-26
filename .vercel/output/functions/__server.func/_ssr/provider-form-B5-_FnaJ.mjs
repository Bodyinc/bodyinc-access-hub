import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as X } from "../_libs/lucide-react.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-CtX3ithx.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { a as providerFormSchema, i as US_STATES, n as CONSULTATION_TYPES, r as CREDENTIALS, t as COMMON_LANGUAGES } from "./providers.schema-Ck25tJ3e.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { r as useForm, t as u } from "../_libs/@hookform/resolvers+[...].mjs";
import { t as Switch } from "./switch-Cn1w-cIH.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/provider-form-B5-_FnaJ.js
var import_jsx_runtime = require_jsx_runtime();
var EMPTY = {
	email: "",
	full_name: "",
	phone: "",
	avatar_url: "",
	bio: "",
	credentials: void 0,
	specialty: "",
	npi: "",
	dea: "",
	license_number: "",
	license_states: [],
	years_experience: void 0,
	languages: [],
	consultation_types: [],
	practice_states: [],
	address_line1: "",
	address_line2: "",
	city: "",
	state: void 0,
	zip: "",
	country: "US",
	is_active: true
};
function ProviderForm({ defaultValues, mode, submitting, onSubmit, onCancel }) {
	const { register, handleSubmit, watch, setValue, formState } = useForm({
		resolver: u(providerFormSchema),
		defaultValues: {
			...EMPTY,
			...defaultValues
		}
	});
	const errors = formState.errors;
	const licenseStates = watch("license_states") ?? [];
	const practiceStates = watch("practice_states") ?? [];
	const languages = watch("languages") ?? [];
	const consultationTypes = watch("consultation_types") ?? [];
	const credentials = watch("credentials");
	const state = watch("state");
	const isActive = watch("is_active");
	function toggleIn(list, value) {
		return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit((v) => onSubmit(v)),
		className: "space-y-6",
		noValidate: true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				className: "text-base",
				children: "Identity"
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "grid gap-4 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Full name",
						error: errors.full_name?.message,
						required: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, { ...register("full_name") })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Email",
						error: errors.email?.message,
						required: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "email",
							disabled: mode === "edit",
							...register("email")
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Phone",
						error: errors.phone?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							...register("phone"),
							placeholder: "(555) 555-1234"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Avatar URL",
						error: errors.avatar_url?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							...register("avatar_url"),
							placeholder: "https://…"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "sm:col-span-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Bio",
							error: errors.bio?.message,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								rows: 3,
								...register("bio")
							})
						})
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				className: "text-base",
				children: "Licensing & Credentials"
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "grid gap-4 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Credentials",
						error: errors.credentials?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: credentials ?? "",
							onValueChange: (v) => setValue("credentials", v, { shouldDirty: true }),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: CREDENTIALS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: c,
								children: c
							}, c)) })]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Specialty",
						error: errors.specialty?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							...register("specialty"),
							placeholder: "e.g. Internal Medicine"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "NPI",
						error: errors.npi?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							...register("npi"),
							placeholder: "10 digits"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "DEA",
						error: errors.dea?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							...register("dea"),
							placeholder: "AB1234567"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "State license number",
						error: errors.license_number?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, { ...register("license_number") })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Licensed in (states)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StateMultiSelect, {
							selected: licenseStates,
							onToggle: (s) => setValue("license_states", toggleIn(licenseStates, s), { shouldDirty: true })
						})
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				className: "text-base",
				children: "Practice"
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "grid gap-4 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Years of experience",
						error: errors.years_experience?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							min: 0,
							max: 80,
							...register("years_experience", { setValueAs: (v) => v === "" || v == null ? void 0 : Number(v) })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Consultation types",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-2",
							children: CONSULTATION_TYPES.map((t) => {
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: consultationTypes.includes(t) ? "default" : "outline",
									className: "cursor-pointer capitalize",
									onClick: () => setValue("consultation_types", toggleIn(consultationTypes, t), { shouldDirty: true }),
									children: t.replace("_", " ")
								}, t);
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Languages",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipMultiSelect, {
							options: COMMON_LANGUAGES,
							selected: languages,
							onToggle: (l) => setValue("languages", toggleIn(languages, l), { shouldDirty: true }),
							allowCustom: true,
							onAddCustom: (l) => setValue("languages", [...languages, l], { shouldDirty: true })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Practice states",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StateMultiSelect, {
							selected: practiceStates,
							onToggle: (s) => setValue("practice_states", toggleIn(practiceStates, s), { shouldDirty: true })
						})
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				className: "text-base",
				children: "Address"
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "grid gap-4 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "sm:col-span-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Address line 1",
							error: errors.address_line1?.message,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, { ...register("address_line1") })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "sm:col-span-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Address line 2",
							error: errors.address_line2?.message,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, { ...register("address_line2") })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "City",
						error: errors.city?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, { ...register("city") })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "State",
						error: errors.state?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: state ?? "",
							onValueChange: (v) => setValue("state", v, { shouldDirty: true }),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select state" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, {
								className: "max-h-72",
								children: US_STATES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: s,
									children: s
								}, s))
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "ZIP",
						error: errors.zip?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							...register("zip"),
							placeholder: "12345 or 12345-6789"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Country",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							...register("country"),
							disabled: true
						})
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				className: "text-base",
				children: "Status"
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium",
					children: "Active"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: "Inactive providers cannot sign in to the portal."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
					checked: !!isActive,
					onCheckedChange: (v) => setValue("is_active", v, { shouldDirty: true })
				})]
			}) })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-end gap-2",
				children: [onCancel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					onClick: onCancel,
					disabled: submitting,
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: submitting,
					children: submitting ? "Saving…" : mode === "create" ? "Create provider" : "Save changes"
				})]
			})
		]
	});
}
function Field({ label, required, error, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
				className: "text-xs font-medium",
				children: [
					label,
					" ",
					required && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-destructive",
						children: "*"
					})
				]
			}),
			children,
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-destructive",
				children: error
			})
		]
	});
}
function StateMultiSelect({ selected, onToggle }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
			value: "",
			onValueChange: (v) => v && onToggle(v),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Add state" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, {
				className: "max-h-72",
				children: US_STATES.filter((s) => !selected.includes(s)).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
					value: s,
					children: s
				}, s))
			})]
		}), selected.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-wrap gap-1.5",
			children: selected.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
				variant: "secondary",
				className: "gap-1",
				children: [s, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => onToggle(s),
					className: "ml-0.5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3 w-3" })
				})]
			}, s))
		})]
	});
}
function ChipMultiSelect({ options, selected, onToggle, allowCustom, onAddCustom }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap gap-1.5",
			children: [options.map((o) => {
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					variant: selected.includes(o) ? "default" : "outline",
					className: "cursor-pointer",
					onClick: () => onToggle(o),
					children: o
				}, o);
			}), selected.filter((s) => !options.includes(s)).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
				variant: "secondary",
				className: "gap-1",
				children: [s, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => onToggle(s),
					className: "ml-0.5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3 w-3" })
				})]
			}, s))]
		}), allowCustom && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex gap-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				placeholder: "Add other language",
				onKeyDown: (e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						const v = e.target.value.trim();
						if (v && !selected.includes(v)) {
							onAddCustom?.(v);
							e.target.value = "";
						}
					}
				},
				className: "h-8"
			})
		})]
	});
}
//#endregion
export { ProviderForm };
