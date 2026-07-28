import { z } from "zod";

// Zod schema for `sitios.config` JSONB (PRD §4).
// Superset that covers everything the RealEstateX-ENGL template renders today:
//   - SiteConfig  (brand + contact + colors)
//   - Property[]  (up to MAX_PROPERTIES = 50)
//   - AboutContent per locale  (bio, howIWork, whyMe, team)
//   - Testimonial[]
// The edge function `site-config` validates the row's `config` against this
// before returning it to the template.

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "must be #RRGGBB");

// ── SiteConfig (broker identity) ─────────────────────────────────────────
export const siteBrandingSchema = z.object({
  siteName: z.string().min(1),
  siteUrl: z.string().url(),
  logoText: z.string().min(1),
  logoUrl: z.string().url().optional(),
  heroImage: z.string().url().optional(),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  businessType: z.string().optional(),
  brokerName: z.string().min(1),
  agentsCount: z.number().int().nonnegative().optional(),
  developmentName: z.string().optional(),
  phone: z.string().min(1),
  whatsapp: z.string().min(1),
  email: z.string().email(),
  city: z.string().min(1),
  address: z.string().min(1),
  slogan: z.string().min(1),
  facebook: z.string().url().optional(),
  instagram: z.string().url().optional(),
  tiktok: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  website: z.string().url().optional(),
  leadWebhookUrl: z.string().url().optional(),
  chatScript: z.string().optional(),
});

// ── Property ─────────────────────────────────────────────────────────────
export const propertySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  titleEn: z.string().optional(),
  descriptionEn: z.string().optional(),
  type: z.enum(["venta", "renta"]),
  price: z.number().positive(),
  currency: z.enum(["MXN", "USD"]),
  location: z.string().min(1),
  city: z.string().min(1),
  bedrooms: z.number().int().nonnegative(),
  bathrooms: z.number().nonnegative(),
  parking: z.number().int().nonnegative(),
  area: z.number().positive(),
  featured: z.boolean().optional(),
  images: z.array(z.string().url()).min(1),
  tourUrl: z.string().url().optional(),
});

export const propertiesSchema = z.array(propertySchema).max(50);

// ── AboutContent (per locale) ────────────────────────────────────────────
const aboutParagraphs = z.object({
  heading: z.string().min(1),
  paragraphs: z.array(z.string().min(1)),
});

const titleDescriptionItem = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

const teamMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  photoUrl: z.string(),
  bio: z.string().optional(),
});

export const aboutContentSchema = z.object({
  brokerPhoto: z.string(),
  role: z.string().min(1),
  homeIntro: aboutParagraphs,
  bio: aboutParagraphs,
  howIWork: z.object({
    heading: z.string().min(1),
    intro: z.string().optional(),
    pillars: z.array(titleDescriptionItem),
    outro: z.string().optional(),
  }),
  whyMe: z.object({
    heading: z.string().min(1),
    items: z.array(titleDescriptionItem),
  }),
  team: z
    .object({
      heading: z.string().min(1),
      intro: z.string().optional(),
      members: z.array(teamMemberSchema),
    })
    .optional(),
});

export const aboutByLocaleSchema = z.object({
  es: aboutContentSchema,
  en: aboutContentSchema.optional(),
});

// ── Testimonials ─────────────────────────────────────────────────────────
export const testimonialSchema = z.object({
  id: z.string().min(1),
  author: z.string().min(1),
  text: z.string().min(1),
  textEn: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  role: z.string().optional(),
  roleEn: z.string().optional(),
});

export const testimonialsSchema = z.array(testimonialSchema);

// ── Root ─────────────────────────────────────────────────────────────────
// testimonials optional at root: template Fase 1 reads them from bundled file
// defaults, not from sitios.config. Included in the schema so it stays valid
// once we plumb testimonials through the storage layer.
export const siteConfigSchema = z.object({
  branding: siteBrandingSchema,
  properties: propertiesSchema,
  about: aboutByLocaleSchema,
  testimonials: testimonialsSchema.optional(),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type SiteBranding = z.infer<typeof siteBrandingSchema>;
export type Property = z.infer<typeof propertySchema>;
export type AboutContent = z.infer<typeof aboutContentSchema>;
export type Testimonial = z.infer<typeof testimonialSchema>;
