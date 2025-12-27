// Dependencies
import { z } from "zod";
// Validator
import { validate } from "../helpers/Validator";
// Other schemas
import { documentDebtorSchema } from "./DebtorSchema";

// Interfaces
export interface cellphoneInterface {
  from: number;
  to: number;
  document: number;
  cellphone?: number;
  country_code?: string;
  phone_type?: string;
  notes?: string;
  debtor_id?: number;
}

// Schema
export const cellphoneSchema = z
  .object({
    from: z.number().min(2).optional(),
    to: z.number().min(2).optional(),
    cellphone: z.number().min(2).optional(),
    country_code: z.string().optional(),
    phone_type: z.string().optional(),
    notes: z.string().optional(),
    debtor_id: z.number().optional(),
  })
  .merge(documentDebtorSchema)
  .strict();

// Validator
export const cellphoneValidator = validate(cellphoneSchema, "body");
