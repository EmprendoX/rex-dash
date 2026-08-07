import type { SiteConfig } from "@/lib/validators/siteConfig";

/**
 * Default sitios.config used when a new sitio is first created.
 *
 * IMPORTANT: every field the template renders must be present with a
 * non-null placeholder value — otherwise the template's `renderTemplate()`
 * and `.replace()` calls crash during static generation with
 * `Cannot read properties of undefined`. Fields left as empty strings are
 * fine (empty.replace works), but fields left as `undefined` are not.
 */
export const EMPTY_CONFIG: SiteConfig = {
  branding: {
    siteName: "Nuevo sitio",
    siteUrl: "https://placeholder.example.com",
    logoText: "Nuevo sitio",
    primaryColor: "#008cb4",
    secondaryColor: "#004d65",
    businessType: "broker",
    brokerName: "Nuevo broker",
    phone: "+52 55 0000 0000",
    whatsapp: "5215500000000",
    email: "placeholder@example.com",
    city: "Ciudad de México",
    address: "Dirección pendiente",
    slogan: "Slogan pendiente",
  },
  properties: [],
  about: {
    es: {
      brokerPhoto: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1600&q=80",
      role: "Broker Inmobiliario",
      homeIntro: {
        heading: "Bienvenidos a {{brokerName}}",
        paragraphs: ["Editá este texto desde el dashboard RealEX para personalizarlo."],
      },
      bio: {
        heading: "Sobre {{brokerName}}",
        paragraphs: ["Editá este texto desde el dashboard RealEX."],
      },
      howIWork: {
        heading: "Cómo trabajamos",
        intro: "Pilares que definen nuestra operación:",
        pillars: [
          { title: "Pilar 1", description: "Editá desde el dashboard." },
        ],
        outro: "Contactanos para más información.",
      },
      whyMe: {
        heading: "Por qué elegirnos",
        items: [{ title: "Razón 1", description: "Editá desde el dashboard." }],
      },
    },
    en: {
      brokerPhoto: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1600&q=80",
      role: "Real Estate Broker",
      homeIntro: {
        heading: "Welcome to {{brokerName}}",
        paragraphs: ["Edit this text from the RealEX dashboard."],
      },
      bio: {
        heading: "About {{brokerName}}",
        paragraphs: ["Edit this text from the RealEX dashboard."],
      },
      howIWork: {
        heading: "How we work",
        intro: "Principles that define our operation:",
        pillars: [{ title: "Pillar 1", description: "Edit from dashboard." }],
        outro: "Contact us for more information.",
      },
      whyMe: {
        heading: "Why choose us",
        items: [{ title: "Reason 1", description: "Edit from dashboard." }],
      },
    },
  },
};
