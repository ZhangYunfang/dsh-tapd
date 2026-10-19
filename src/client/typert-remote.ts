import type { TypertRemoteContribution } from "@deepseek-ai/dsh-typert-protocol";
import { z } from "zod";
import { saveInputSchema, statusSchema } from "../schemas.js";

const PKG = "dsh-tapd-mcp";
const direct = { kind: "direct" as const };
const codec = (name: string, schema: z.ZodType) => ({ mode: "strict" as const, typeSymbol: `${PKG}/types#${name}`, schema });

export const TYPERT_REMOTE: TypertRemoteContribution = {
	package: PKG,
	descriptors: [
		{ id: `${PKG}#tapdMcp/status`, service: "tapdMcp", namespace: "tapdMcp", method: "status", invocation: direct, parameters: [], result: codec("TapdStatus", statusSchema) },
		{ id: `${PKG}#tapdMcp/save`, service: "tapdMcp", namespace: "tapdMcp", method: "save", invocation: direct, parameters: [{ name: "input", wire: "input", source: "json", codec: codec("SaveInput", saveInputSchema) }], result: codec("TapdStatus", statusSchema) },
	],
};
