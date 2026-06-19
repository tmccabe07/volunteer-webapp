import { PromptCategory } from '@prisma/client';
import { z } from 'zod';

const CampingCategoryDataSchema = z.object({
  nights: z.number().min(0).max(30).optional(),
  location: z.string().trim().min(1).max(120).optional(),
});

const HikingCategoryDataSchema = z.object({
  miles: z.number().min(0).max(100).optional(),
  trailName: z.string().trim().min(1).max(120).optional(),
});

const ServiceCategoryDataSchema = z.object({
  hours: z.number().min(0).max(100).optional(),
  projectName: z.string().trim().min(1).max(120).optional(),
});

const CategoryPromptBaseSchema = z.object({
  childScoutIds: z.array(z.string().min(1)).min(1),
});

const CampingPromptSchema = CategoryPromptBaseSchema.extend({
  category: z.literal(PromptCategory.CAMPING),
  categoryData: CampingCategoryDataSchema.optional(),
});

const HikingPromptSchema = CategoryPromptBaseSchema.extend({
  category: z.literal(PromptCategory.HIKING),
  categoryData: HikingCategoryDataSchema.optional(),
});

const ServicePromptSchema = CategoryPromptBaseSchema.extend({
  category: z.literal(PromptCategory.SERVICE),
  categoryData: ServiceCategoryDataSchema.optional(),
});

export const CategoryPromptSchema = z.discriminatedUnion('category', [
  CampingPromptSchema,
  HikingPromptSchema,
  ServicePromptSchema,
]);

export const GeneratePromptsSchema = z.object({
  categoryPrompts: z.array(CategoryPromptSchema).min(1),
  syncMode: z.enum(['ADD_ONLY', 'SYNC_REMOVE']).optional().default('ADD_ONLY'),
});

export type GeneratePromptsDto = z.infer<typeof GeneratePromptsSchema>;
