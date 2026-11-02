import { z } from 'zod';

const optionalEmail = z.union([z.literal(''), z.string().trim().email('Enter a valid email')]);

export const settingsSchema = z.object({
  business_name: z.string().trim().min(1, 'Add your business name — it appears on invoices'),
  address: z.string().max(2000),
  email: optionalEmail,
  phone: z.string().max(40),
  tax_id: z.string().max(40),
  default_currency: z.string().min(1, 'Choose a currency'),
  default_tax_rate: z.string(),
  default_payment_term: z.string(),
  default_hourly_rate: z.number({ invalid_type_error: 'Enter an amount' }).int().min(0, 'Must be 0 or more'),
  invoice_prefix: z.string().max(12, 'At most 12 characters'),
  invoice_next_number: z.number({ invalid_type_error: 'Enter a number' }).int().min(1, 'Must be 1 or more'),
  invoice_yearly_reset: z.boolean(),
  invoice_title: z.string().trim().min(1, 'Required').max(40),
  payment_instructions: z.string().max(5000),
  time_rounding_minutes: z.union([z.literal(0), z.literal(6), z.literal(15), z.literal(30)], {
    errorMap: () => ({ message: 'Choose 0, 6, 15 or 30 minutes' }),
  }),
  accent_color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a hex color like #FF5A36'),
  timezone: z.string().min(1),
});

export type SettingsForm = z.infer<typeof settingsSchema>;
