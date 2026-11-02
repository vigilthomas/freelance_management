import { z } from 'zod';

const amount = (msg: string) => z.number({ invalid_type_error: msg, required_error: msg }).int().min(0, 'Must be 0 or more');
const isoDate = z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')]);

export const projectSchema = z
  .object({
    client: z.string().min(1, 'Choose a client'),
    name: z.string().trim().min(1, 'Project name is required').max(200),
    status: z.string().min(1, 'Choose a status'),
    billing_type: z.enum(['hourly', 'fixed']),
    /** 0 = not set: billing falls back to the client's rate, then the settings default. */
    hourly_rate: amount('Enter a rate or leave it empty'),
    fixed_price: amount('Enter the fixed price'),
    currency: z.string().min(1, 'Choose a currency'),
    start_date: isoDate,
    due_date: isoDate,
    budget_minutes: amount('Enter hours').max(1_000_000),
    tags: z.array(z.string()),
    color: z.string(),
    notes: z.string().max(10000),
  })
  .superRefine((p, ctx) => {
    if (p.billing_type === 'fixed' && p.fixed_price <= 0) {
      ctx.addIssue({ code: 'custom', path: ['fixed_price'], message: 'Enter the fixed price' });
    }
    if (p.start_date && p.due_date && p.due_date < p.start_date) {
      ctx.addIssue({ code: 'custom', path: ['due_date'], message: 'Due date can’t be before the start date' });
    }
  });

export type ProjectFormData = z.infer<typeof projectSchema>;
