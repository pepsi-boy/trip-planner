import { z } from 'zod';

export const CreateTripBody = z.object({
  name: z.string().min(1),
});

export const PatchTripBody = z.object({
  name: z.string().min(1),
});

const iata = z.string().regex(/^[A-Z]{3}$/, 'must be 3 uppercase letters');

export const CreateMemberBody = z.object({
  name: z.string().min(1),
  home_airport: iata,
});

export const PatchMemberBody = z.object({
  name: z.string().min(1).optional(),
  home_airport: iata.optional(),
}).refine(d => d.name !== undefined || d.home_airport !== undefined, {
  message: 'at least one field required',
});

export const UpsertPreferencesBody = z.object({
  budget: z.number().positive(),
  weather_weight: z.number().min(0).max(1),
  nightlife_weight: z.number().min(0).max(1),
  preferred_temp_f: z.number().min(20).max(110),
});
