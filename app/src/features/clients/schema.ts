import { z } from 'zod';

export const clientSchema = z.object({
  name: z.string().trim().min(1, 'Client name is required').max(200),
  contact_name: z.string().trim().max(200),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]),
  phone: z.string().trim().max(40),
  address: z.string().max(2000),
  state_region: z.string().trim().max(100),
  tax_id: z.string().trim().max(40),
  currency: z.string().min(1, 'Choose a currency'),
  default_hourly_rate: z.number({ invalid_type_error: 'Enter a rate (0 is fine)', required_error: 'Enter a rate (0 is fine)' }).int().min(0, 'Must be 0 or more'),
  payment_term: z.string(),
  notes: z.string().max(10000),
});

export type ClientForm = z.infer<typeof clientSchema>;
