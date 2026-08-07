"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "./actions";
import { slugify } from "@/lib/format";

interface Props {
  token: string;
  prefill: {
    nombre: string;
    inmobiliaria: string;
    email: string;
    whatsapp: string;
  };
}

export default function SetupForm({ token, prefill }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[] | null>(null);

  // Cuenta
  const [email, setEmail] = useState(prefill.email);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // Sitio — pre-llenado desde el cliente cargado
  const [agencyName, setAgencyName] = useState(prefill.inmobiliaria);
  const [brokerName, setBrokerName] = useState(prefill.nombre);
  const [slogan, setSlogan] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState(prefill.whatsapp);
  const [primaryColor, setPrimaryColor] = useState("#008cb4");
  const [secondaryColor, setSecondaryColor] = useState("#004d65");

  const proposedSubdomain = slugify(agencyName);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIssues(null);

    if (password.length < 8) {
      setError("El password debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Los passwords no coinciden.");
      return;
    }
    if (!proposedSubdomain || proposedSubdomain.length < 3) {
      setError("El nombre de agencia tiene que tener al menos 3 letras/números.");
      return;
    }

    startTransition(async () => {
      const r = await completeOnboarding({
        token,
        email,
        password,
        agencyName,
        brokerName,
        slogan,
        city,
        address,
        phone,
        whatsapp,
        primaryColor,
        secondaryColor,
      });
      if (r.ok) {
        router.push(`/setup/listo?agencia=${encodeURIComponent(agencyName)}`);
      } else {
        setError(r.error);
        if ("issues" in r && r.issues) setIssues(r.issues);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <Section
        title="Tu cuenta"
        subtitle="Vas a usar este email y password para entrar al panel."
      >
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            autoComplete="email"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Password (mín. 8 caracteres)">
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirmar password">
            <input
              type="password"
              required
              minLength={8}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className={inputCls}
              autoComplete="new-password"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Tu sitio"
        subtitle="Datos que van a aparecer en tu web. Podés editar todo después."
      >
        <Field
          label="Nombre de agencia (o el que quieras que aparezca)"
          hint={
            proposedSubdomain
              ? `Tu sitio va a estar en: ${proposedSubdomain}.netlify.app`
              : "Este nombre se usa como URL del sitio."
          }
        >
          <input
            type="text"
            required
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Tu nombre (broker principal)">
          <input
            type="text"
            required
            value={brokerName}
            onChange={(e) => setBrokerName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Slogan / frase corta" hint="Aparece en el header del sitio.">
          <input
            type="text"
            required
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            placeholder="ej. Tu casa ideal, hecha realidad"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ciudad">
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="ej. Ciudad de México"
              className={inputCls}
            />
          </Field>
          <Field label="Dirección">
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ej. Av. Insurgentes 100"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Teléfono" hint="Con formato, ej. +52 55 1234 5678">
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="WhatsApp" hint="Solo números, con lada. ej. 5215512345678">
            <input
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Colores de tu marca"
        subtitle="Vas a poder cambiarlos después. Si no tenés, dejá los que están."
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Color principal">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-14 rounded border border-slate-300 cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className={`${inputCls} font-mono text-xs`}
                pattern="^#[0-9a-fA-F]{6}$"
              />
            </div>
          </Field>
          <Field label="Color secundario">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-14 rounded border border-slate-300 cursor-pointer"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className={`${inputCls} font-mono text-xs`}
                pattern="^#[0-9a-fA-F]{6}$"
              />
            </div>
          </Field>
        </div>
      </Section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          {issues && (
            <ul className="mt-2 list-disc list-inside text-xs">
              {issues.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Crear mi cuenta y sitio"}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none";
