//#region node_modules/.nitro/vite/services/ssr/assets/__23tanstack-start-server-fn-resolver-DGurlOMC.js
var manifest = {
	"1263778073df9f11c409ddd2d611439180aab4e9e4871b9203f55a859b2d24f7": {
		functionName: "updateQuestion_createServerFn_handler",
		importer: () => import("./_ssr/questions.functions-D8TTSarI.mjs")
	},
	"17070efb1dbe6d99f03c21eef38aa9a2a124dd83432f17cacf21b55090d88eb1": {
		functionName: "getQuestion_createServerFn_handler",
		importer: () => import("./_ssr/questions.functions-D8TTSarI.mjs")
	},
	"45c25e32b1e3446e7d46757c244f18c9394f355b3a83a51957fff3adceebdc9d": {
		functionName: "createProvider_createServerFn_handler",
		importer: () => import("./_ssr/providers.functions-B2XhteU8.mjs")
	},
	"4d8353a865360805ea896da0da5cb7e1218ec05cec778f5eb0f05da41ee68012": {
		functionName: "setQuestionActive_createServerFn_handler",
		importer: () => import("./_ssr/questions.functions-D8TTSarI.mjs")
	},
	"57505b8c97052c9077dab9f2fa824623b159232a718ef56e3567adfbe4564f93": {
		functionName: "sendLoginOtp_createServerFn_handler",
		importer: () => import("./_ssr/auth.functions-UfK4QGR-.mjs")
	},
	"71dc08145b7f8500549f50cab214999f75180efae505e0d7422f059d789ab7d8": {
		functionName: "getQuestionPosition_createServerFn_handler",
		importer: () => import("./_ssr/questions.functions-D8TTSarI.mjs")
	},
	"7b3e11d0cc6a98905df5c46d00868e7baef913128c33a0856e183d2d184255a3": {
		functionName: "getProvider_createServerFn_handler",
		importer: () => import("./_ssr/providers.functions-B2XhteU8.mjs")
	},
	"82a3e9e47803f4cc69baa1422367d39e8cd67efad9a99d5f0b106a335a5f12fd": {
		functionName: "deleteQuestion_createServerFn_handler",
		importer: () => import("./_ssr/questions.functions-D8TTSarI.mjs")
	},
	"96c1d93a3e13ccab2d94ca39d6440464b98fb4d9f558e9e99720c51ffa5b3a38": {
		functionName: "moveQuestion_createServerFn_handler",
		importer: () => import("./_ssr/questions.functions-D8TTSarI.mjs")
	},
	"a39224ec22c225880bc77af5de15e3fec6f7573262c6e54fd9399ff188cf37e0": {
		functionName: "listProviders_createServerFn_handler",
		importer: () => import("./_ssr/providers.functions-B2XhteU8.mjs")
	},
	"a85d6e8a98d921cd24e92784db8760ac4aa50f9b85f80d538fce3f1eb91cb724": {
		functionName: "signInWithPassword_createServerFn_handler",
		importer: () => import("./_ssr/auth.functions-UfK4QGR-.mjs")
	},
	"b5aa563ed5e0ad2d26f0d609d3a318498753dfe3b59129090ff5b3e69b7b936f": {
		functionName: "createQuestion_createServerFn_handler",
		importer: () => import("./_ssr/questions.functions-D8TTSarI.mjs")
	},
	"bea3ec9943b2ab802c9a73ef477ef095b1d5873c0f883a0384791eedbccd51fe": {
		functionName: "resendInvite_createServerFn_handler",
		importer: () => import("./_ssr/providers.functions-B2XhteU8.mjs")
	},
	"c845e6b12d87d58ae77b55d9ce7974a06e3663d00a9caf6a1cb736fd713e52db": {
		functionName: "listQuestions_createServerFn_handler",
		importer: () => import("./_ssr/questions.functions-D8TTSarI.mjs")
	},
	"d10bd4fdaab4eab65570963d30abdaa466cc05aea103e9ce6656029825e22963": {
		functionName: "updateProvider_createServerFn_handler",
		importer: () => import("./_ssr/providers.functions-B2XhteU8.mjs")
	},
	"d7ffc0e9d319ca96f3b29f796bb3aad059cf564591efef138b3dbbaf869e5029": {
		functionName: "setProviderActive_createServerFn_handler",
		importer: () => import("./_ssr/providers.functions-B2XhteU8.mjs")
	},
	"e101fe5a7cc0516df402356fdad24e4f2885726ec687ae6ff53f43370855a553": {
		functionName: "deleteProvider_createServerFn_handler",
		importer: () => import("./_ssr/providers.functions-B2XhteU8.mjs")
	},
	"e3d516e987e1c730e53dec6111b5a437acce773e8990f82a103b2fee544f2cc9": {
		functionName: "verifyLoginOtp_createServerFn_handler",
		importer: () => import("./_ssr/auth.functions-UfK4QGR-.mjs")
	},
	"e4b04772036c1add2f7ab095b0c1ea65d3072d89c63246a9b8fdb44d2a2212d7": {
		functionName: "getCurrentPortalRole_createServerFn_handler",
		importer: () => import("./_ssr/auth.functions-UfK4QGR-.mjs")
	}
};
async function getServerFnById(id, access) {
	const serverFnInfo = manifest[id];
	if (!serverFnInfo) throw new Error("Server function info not found for " + id);
	const fnModule = serverFnInfo.module ?? await serverFnInfo.importer();
	if (!fnModule) throw new Error("Server function module not resolved for " + id);
	const action = fnModule[serverFnInfo.functionName];
	if (!action) throw new Error("Server function module export not resolved for serverFn ID: " + id);
	return action;
}
//#endregion
export { getServerFnById as t };
