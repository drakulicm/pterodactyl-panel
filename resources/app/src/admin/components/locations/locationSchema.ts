import { z } from 'zod';

const locationSchema = z.object({
    short: z
        .string()
        .min(1, 'A location identifier is required.')
        .max(60, 'The location identifier must be between 1 and 60 characters.'),
    long: z.string().max(191, 'The location description may not exceed 191 characters.'),
});

type LocationFormValues = z.infer<typeof locationSchema>;

export { locationSchema };
export type { LocationFormValues };
