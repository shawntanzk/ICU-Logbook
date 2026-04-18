import { z } from 'zod';

export const ProcedureLogSchema = z.object({
  caseId: z.string().optional(),
  procedureType: z.string().min(1, 'Procedure type is required'),
  attempts: z.number().int().min(1, 'At least 1 attempt').max(20),
  success: z.boolean(),
  complications: z.string().max(1000).optional().or(z.literal('')),
});

export type ProcedureLogInput = z.infer<typeof ProcedureLogSchema>;

export interface ProcedureLog extends ProcedureLogInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}
