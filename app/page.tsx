"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

const marketFocus = [
  "Crude Oil",
  "Refined Products",
  "Jet A1",
  "EN590 Diesel",
  "LNG & Natural Gas",
];

const services = [
  {
    title: "Buyer access",
    description:
      "Qualified counterparties gain discreet access to premium supply channels and structured trading opportunities.",
  },
  {
    title: "Supplier partnerships",
    description:
      "Producers and intermediaries are matched with serious buyers through a high-trust, confidential process.",
  },
  {
    title: "Execution discipline",
    description:
      "Every mandate is handled with rigorous due diligence, market insight, and executive-level coordination.",
  },
  {
    title: "Strategic intelligence",
    description:
      "Clients receive market context, commercial guidance, and documentation support prepared for long-term growth.",
  },
];

const metrics = [
  { value: "24/7", label: "Global market coverage" },
  { value: "100%", label: "Confidential engagements" },
  { value: "$B+", label: "Commercial opportunities reviewed" },
  { value: "12", label: "Strategic regions served" },
];

const trustPoints = [
  "Institutional-grade confidentiality",
  "Executive-led deal oversight",
  "Cross-border logistics coordination",
  "Prepared for next-generation automation",
];

const tradingRegions = [
  {
    name: "North America",
    x: "18%",
    y: "28%",
    commodities: ["Crude Oil", "Refined Products", "LNG"],
  },
  {
    name: "South America",
    x: "31%",
    y: "50%",
    commodities: ["Crude Oil", "LPG"],
  },
  {
    name: "Europe",
    x: "55%",
    y: "24%",
    commodities: ["Jet A1", "EN590 Diesel", "LNG"],
  },
  {
    name: "Africa",
    x: "63%",
    y: "45%",
    commodities: ["Crude Oil", "LPG", "Refined Products"],
  },
  {
    name: "Middle East",
    x: "73%",
    y: "36%",
    commodities: ["Crude Oil", "LNG", "Jet A1"],
  },
  {
    name: "Asia",
    x: "86%",
    y: "34%",
    commodities: ["LNG", "Refined Products", "EN590 Diesel"],
  },
];

const commodities = [
  { name: "Crude Oil", detail: "Long-haul supply coordination for refined and direct feedstock markets." },
  { name: "LNG", detail: "Secure LNG flows across North America, Europe, and Asia-Pacific corridors." },
  { name: "Jet A1", detail: "Premium aviation fuel access with logistics precision and compliance support." },
  { name: "EN590 Diesel", detail: "Institutional-grade diesel sourcing for distribution and wholesale programs." },
  { name: "Refined Products", detail: "Gasoline, middle distillates, and blend optimization across key hubs." },
  { name: "LPG", detail: "Flexible LPG supply and delivery planning for industrial and commercial demand." },
];

const documentOptions = [
  "LOI",
  "ICPO",
  "SCO",
  "FCO",
  "POF",
  "BCL",
  "Company Registration",
  "Refinery/Supplier Authorization",
  "Passport/ID",
  "Other",
];

type InquiryFormData = {
  inquiry_type: string;
  company_name: string;
  contact_name: string;
  position: string;
  email: string;
  phone: string;
  whatsapp: string;
  company_website: string;
  country: string;
  company_registration_number: string;
  verification_status: string;
  role_type: string;
  product: string;
  quantity: string;
  unit: string;
  delivery_frequency: string;
  contract_length: string;
  target_price: string;
  currency: string;
  payment_method: string;
  incoterms: string;
  loading_port: string;
  destination_port: string;
  origin_country: string;
  destination_country: string;
  shipping_method: string;
  documents_available: string;
  special_instructions: string;
};

const initialFormData: InquiryFormData = {
  inquiry_type: "",
  company_name: "",
  contact_name: "",
  position: "",
  email: "",
  phone: "",
  whatsapp: "",
  company_website: "",
  country: "",
  company_registration_number: "",
  verification_status: "",
  role_type: "",
  product: "",
  quantity: "",
  unit: "",
  delivery_frequency: "",
  contract_length: "",
  target_price: "",
  currency: "",
  payment_method: "",
  incoterms: "",
  loading_port: "",
  destination_port: "",
  origin_country: "",
  destination_country: "",
  shipping_method: "",
  documents_available: "",
  special_instructions: "",
};

export default function Home() {
  const [visibleSections, setVisibleSections] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<InquiryFormData>(initialFormData);
  const [formStatus, setFormStatus] = useState<"idle" | "success" | "error">("idle");
  const [formFeedback, setFormFeedback] = useState("");
  const formStartTimeRef = useRef<number>(Date.now());
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-reveal");
            if (id) {
              setVisibleSections((current) =>
                current.includes(id) ? current : [...current, id],
              );
            }
          }
        });
      },
      { threshold: 0.16 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const inputClassName =
    "w-full rounded-xl border border-white/15 bg-[#071A2D] px-4 py-3 text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/35 placeholder:text-slate-500";

  const updateField = (field: keyof InquiryFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (formStatus !== "idle") {
      setFormStatus("idle");
      setFormFeedback("");
    }
  };

  const toggleDocumentSelection = (value: string) => {
    const currentSelections = formData.documents_available
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const exists = currentSelections.includes(value);
    const nextSelections = exists
      ? currentSelections.filter((item) => item !== value)
      : [...currentSelections, value];

    updateField("documents_available", nextSelections.join(", "));
  };

  const validateCurrentStep = () => {
    if (currentStep === 1) {
      return Boolean(
        formData.inquiry_type.trim() &&
          formData.company_name.trim() &&
          formData.contact_name.trim() &&
          formData.email.trim() &&
          formData.phone.trim() &&
          formData.country.trim(),
      );
    }

    if (currentStep === 2) {
      return Boolean(
        formData.role_type.trim() &&
          formData.product.trim() &&
          formData.quantity.trim() &&
          formData.unit.trim() &&
          formData.currency.trim(),
      );
    }

    if (currentStep === 3) {
      return Boolean(
        formData.incoterms.trim() &&
          formData.loading_port.trim() &&
          formData.destination_port.trim() &&
          formData.origin_country.trim() &&
          formData.destination_country.trim(),
      );
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      setFormStatus("error");
      setFormFeedback("Please complete the required fields before continuing.");
      return;
    }

    setFormStatus("idle");
    setFormFeedback("");
    setCurrentStep((step) => Math.min(step + 1, 4));
  };

  const handleBack = () => {
    setFormStatus("idle");
    setFormFeedback("");
    setCurrentStep((step) => Math.max(step - 1, 1));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateCurrentStep()) {
      setFormStatus("error");
      setFormFeedback("Please complete all required fields before submitting your inquiry.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _hp: honeypot,
          _elapsed: Date.now() - formStartTimeRef.current,
          name: formData.contact_name.trim() || formData.company_name.trim(),
          email: formData.email.trim(),
          message: formData.special_instructions.trim() || `Trade inquiry for ${formData.company_name.trim() || "new mandate"}`,
          inquiry_type: formData.inquiry_type.trim(),
          company_name: formData.company_name.trim(),
          contact_name: formData.contact_name.trim(),
          position: formData.position.trim(),
          phone: formData.phone.trim(),
          whatsapp: formData.whatsapp.trim(),
          company_website: formData.company_website.trim(),
          country: formData.country.trim(),
          company_registration_number: formData.company_registration_number.trim(),
          verification_status: formData.verification_status.trim(),
          role_type: formData.role_type.trim(),
          product: formData.product.trim(),
          quantity: formData.quantity.trim(),
          unit: formData.unit.trim(),
          delivery_frequency: formData.delivery_frequency.trim(),
          contract_length: formData.contract_length.trim(),
          target_price: formData.target_price.trim(),
          currency: formData.currency.trim(),
          payment_method: formData.payment_method.trim(),
          incoterms: formData.incoterms.trim(),
          loading_port: formData.loading_port.trim(),
          destination_port: formData.destination_port.trim(),
          origin_country: formData.origin_country.trim(),
          destination_country: formData.destination_country.trim(),
          shipping_method: formData.shipping_method.trim(),
          documents_available: formData.documents_available.trim(),
          special_instructions: formData.special_instructions.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          (data as { error?: string }).error ?? "We were unable to submit your inquiry. Please try again shortly.",
        );
      }

      setFormStatus("success");
      setFormFeedback("Thank you. Your trade inquiry has been received and our team will follow up shortly.");
      setFormData(initialFormData);
      setCurrentStep(1);
    } catch (error) {
      setFormStatus("error");
      setFormFeedback(
        error instanceof Error
          ? error.message
          : "We were unable to submit your inquiry. Please try again shortly.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardClasses = "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(0,0,0,0.28)]";
  const revealClass = (id: string) =>
    `transition-all duration-700 ease-out ${visibleSections.includes(id) ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`;

  return (
    <main className="relative isolate overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
        <header className="rounded-full border border-white/15 bg-white/8 px-5 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#C8A24D]/70 bg-[#C8A24D]/10 text-sm font-semibold text-[#C8A24D]">
                AGE
              </div>
              <div>
                <p className="font-heading text-lg text-white">Amber Global Energy</p>
                <p className="text-sm text-slate-300">Premium International Brokerage</p>
              </div>
            </div>
            <nav aria-label="Primary" className="flex flex-wrap items-center gap-3 text-sm text-slate-300 sm:gap-4">
              <a href="#" className="transition hover:text-white">
                Home
              </a>
              <a href="#network" className="transition hover:text-white">
                About
              </a>
              <a href="#insight" className="transition hover:text-white">
                Markets
              </a>
              <a href="#network" className="transition hover:text-white">
                Services
              </a>
              <a href="#insight" className="transition hover:text-white">
                Industries
              </a>
              <a href="#inquiry" className="transition hover:text-white">
                Request Quote
              </a>
              <a href="#inquiry" className="transition hover:text-white">
                Contact
              </a>
            </nav>
          </div>
        </header>

        <section
          id="hero"
          data-reveal="hero"
          className={`relative mt-12 grid items-center gap-12 overflow-hidden py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24 ${revealClass("hero")}`}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-[2rem]"
            aria-hidden="true"
            style={{
              backgroundImage: [
                "radial-gradient(circle at 20% 20%, rgba(200, 162, 77, 0.16), transparent 28%)",
                "radial-gradient(circle at 80% 20%, rgba(7, 26, 45, 0.8), transparent 36%)",
                "linear-gradient(135deg, rgba(3, 9, 18, 0.96) 0%, rgba(7, 26, 45, 0.86) 48%, rgba(0, 0, 0, 0.96) 100%)",
                "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1400 900%22%3E%3Crect width=%221400%22 height=%22900%22 fill=%22none%22/%3E%3Cpath d=%22M180 220c70-65 150-95 245-80 65 10 120 45 185 60 70 16 142 8 215-15 45-14 90-32 145-34 42-2 74 8 102 24%22 stroke=%22%23ffffff%22 stroke-opacity=%220.08%22 stroke-width=%221.1%22 fill=%22none%22/%3E%3Cpath d=%22M170 370c70-45 140-60 230-45 70 12 145 45 220 45 85 0 155-29 215-60 60-31 125-40 185-25%22 stroke=%22%23ffffff%22 stroke-opacity=%220.08%22 stroke-width=%221.1%22 fill=%22none%22/%3E%3Cpath d=%22M240 180l120 80%22 stroke=%22%23ffffff%22 stroke-opacity=%220.06%22 stroke-width=%221%22/%3E%3Cpath d=%22M420 260l180-120%22 stroke=%22%23ffffff%22 stroke-opacity=%220.06%22 stroke-width=%221%22/%3E%3Cpath d=%22M620 210l160 80%22 stroke=%22%23ffffff%22 stroke-opacity=%220.06%22 stroke-width=%221%22/%3E%3Cpath d=%22M780 280l140 110%22 stroke=%22%23ffffff%22 stroke-opacity=%220.06%22 stroke-width=%221%22/%3E%3Ccircle cx=%22180%22 cy=%22220%22 r=%223.4%22 fill=%22%23C8A24D%22 fill-opacity=%220.45%22/%3E%3Ccircle cx=%22380%22 cy=%22260%22 r=%223%22 fill=%22%23C8A24D%22 fill-opacity=%220.36%22/%3E%3Ccircle cx=%22580%22 cy=%22210%22 r=%223%22 fill=%22%23C8A24D%22 fill-opacity=%220.32%22/%3E%3Ccircle cx=%22810%22 cy=%22290%22 r=%223%22 fill=%22%23ffffff%22 fill-opacity=%220.24%22/%3E%3Ccircle cx=%221020%22 cy=%22310%22 r=%223%22 fill=%22%23ffffff%22 fill-opacity=%220.2%22/%3E%3C/svg%3E')",
              ].join(", ") ,
            }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-60"
            aria-hidden="true"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 25%, rgba(200, 162, 77, 0.08), transparent 34%), radial-gradient(circle at 75% 30%, rgba(255,255,255,0.04), transparent 24%)",
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-24 w-3/4 rounded-full blur-3xl"
            aria-hidden="true"
            style={{ background: "radial-gradient(circle, rgba(200, 162, 77, 0.12), transparent 70%)" }}
          />
          <div className="pointer-events-none absolute left-[8%] top-[22%] h-2.5 w-2.5 rounded-full bg-[#C8A24D] opacity-70" aria-hidden="true" />
          <div className="pointer-events-none absolute right-[16%] top-[34%] h-2.5 w-2.5 rounded-full bg-white/70 opacity-60" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-[20%] left-[18%] h-2.5 w-2.5 rounded-full bg-[#C8A24D] opacity-60" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-[16%] right-[22%] h-2.5 w-2.5 rounded-full bg-white/60 opacity-50" aria-hidden="true" />
          <div
            className="pointer-events-none absolute left-[12%] top-[28%] h-1.5 w-1.5 rounded-full bg-[#C8A24D] opacity-70"
            aria-hidden="true"
            style={{ animation: "floatParticle 10s ease-in-out infinite" }}
          />
          <div
            className="pointer-events-none absolute right-[12%] top-[24%] h-1.5 w-1.5 rounded-full bg-white/70 opacity-60"
            aria-hidden="true"
            style={{ animation: "floatParticle 12s ease-in-out infinite reverse", animationDelay: "1.5s" }}
          />
          <div
            className="pointer-events-none absolute bottom-[24%] right-[30%] h-1.5 w-1.5 rounded-full bg-[#C8A24D] opacity-60"
            aria-hidden="true"
            style={{ animation: "floatParticle 9s ease-in-out infinite", animationDelay: "2.5s" }}
          />
          <div className="relative z-10">
            <p className="mb-4 inline-flex rounded-full border border-[#C8A24D]/40 bg-[#C8A24D]/10 px-3 py-1 text-sm font-medium uppercase tracking-[0.24em] text-[#C8A24D]">
              Global energy, executed with precision
            </p>
            <h1 className="font-heading text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
              Connecting Global Energy Markets with Confidence
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Amber Global Energy connects qualified buyers and suppliers across energy
              markets with professionalism, integrity, confidentiality, and long-term
              partnership at the core of every engagement.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#inquiry"
                className="inline-flex items-center justify-center rounded-full bg-[#C8A24D] px-6 py-3 text-sm font-semibold text-[#071A2D] transition hover:bg-[#d8b56a]"
              >
                Request a Quote
              </a>
              <a
                href="#network"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-[#C8A24D]/60 hover:text-[#C8A24D]"
              >
                Explore partnerships
              </a>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                "Confidential deal flow",
                "Executive oversight",
                "International reach",
              ].map((item) => (
                <div key={item} className={`rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 ${cardClasses}`}>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className={`relative z-10 rounded-[2rem] border border-white/15 bg-slate-950/60 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl ${cardClasses}`}>
            <div className="rounded-[1.5rem] border border-[#C8A24D]/30 bg-[#071A2D]/90 p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-[#C8A24D]">
                Global Market Overview
              </p>
              <ul className="mt-5 space-y-3 text-sm text-slate-300">
                {marketFocus.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#C8A24D]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${cardClasses}`}>
                <p className="text-2xl font-semibold text-white">Global</p>
                <p className="mt-1 text-sm text-slate-300">Cross-border flow across strategic energy corridors.</p>
              </div>
              <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${cardClasses}`}>
                <p className="text-2xl font-semibold text-white">Institutional</p>
                <p className="mt-1 text-sm text-slate-300">Confidential access for premium commercial execution.</p>
              </div>
            </div>
          </div>
        </section>

        <section data-reveal="network" className={`mt-16 rounded-[2rem] border border-white/10 bg-white/6 p-8 backdrop-blur-xl sm:p-10 ${revealClass("network")}`}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm uppercase tracking-[0.24em] text-[#C8A24D]">Global Trading Network</p>
            <h2 className="mt-3 font-heading text-3xl text-white sm:text-4xl">
              A disciplined network spanning the world’s principal energy corridors.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Our reach extends across major production, refining, and consumption centers with confidential execution and institutional oversight.
            </p>
          </div>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/60 p-6 sm:p-8">
            <div
              className="relative mx-auto aspect-[16/9] max-w-5xl overflow-hidden rounded-[1.5rem] border border-white/10 p-6"
              style={{
                background:
                  "radial-gradient(circle at top, rgba(200, 162, 77, 0.12), transparent 28%), linear-gradient(135deg, rgba(3, 9, 18, 0.96), rgba(6, 18, 32, 0.95))",
              }}
            >
              <svg
                viewBox="0 0 1000 620"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <path
                  d="M140 220c80-60 170-84 250-64 60 14 90 53 140 72 44 16 91 16 135 10 47-6 98-24 145-14 38 8 66 27 88 53"
                  stroke="rgba(255,255,255,0.16)"
                  strokeWidth="1.2"
                  fill="none"
                />
                <path
                  d="M180 355c67-33 120-38 178-25 69 15 111 52 176 58 70 6 122-15 203-38 55-16 95-23 143-14"
                  stroke="rgba(255,255,255,0.16)"
                  strokeWidth="1.2"
                  fill="none"
                />
                <path
                  d="M320 200L430 120"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1"
                  fill="none"
                />
                <path
                  d="M430 120L570 180"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1"
                  fill="none"
                />
                <path
                  d="M570 180L720 280"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1"
                  fill="none"
                />
                <path
                  d="M720 280L840 330"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1"
                  fill="none"
                />
                <path
                  d="M250 200c80 16 154 28 236 42"
                  stroke="rgba(200,162,77,0.35)"
                  strokeWidth="1.8"
                  fill="none"
                  style={{ animation: "routeGlow 9s ease-in-out infinite" }}
                />
                <path
                  d="M430 120c84 10 145 22 228 56"
                  stroke="rgba(200,162,77,0.3)"
                  strokeWidth="1.8"
                  fill="none"
                  style={{ animation: "routeGlow 11s ease-in-out infinite reverse" }}
                />
                <path
                  d="M570 180c70 20 158 70 236 120"
                  stroke="rgba(200,162,77,0.28)"
                  strokeWidth="1.8"
                  fill="none"
                  style={{ animation: "routeGlow 13s ease-in-out infinite" }}
                />
                <path
                  d="M720 280c72 30 120 62 165 112"
                  stroke="rgba(200,162,77,0.26)"
                  strokeWidth="1.8"
                  fill="none"
                  style={{ animation: "routeGlow 10s ease-in-out infinite reverse" }}
                />
              </svg>

              {tradingRegions.map((region) => (
                <div key={region.name} className="group absolute" style={{ left: region.x, top: region.y }}>
                  <div className="relative flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                    <span className="h-3.5 w-3.5 rounded-full border border-[#C8A24D]/60 bg-[#C8A24D] shadow-[0_0_18px_rgba(200,162,77,0.35)]" />
                    <span className="mt-2 rounded-full border border-white/10 bg-[#071A2D]/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-slate-300">
                      {region.name}
                    </span>
                    <div className="pointer-events-none absolute left-1/2 top-full mt-3 w-44 -translate-x-1/2 rounded-xl border border-[#C8A24D]/25 bg-[#071A2D]/95 p-3 opacity-0 shadow-[0_14px_40px_rgba(0,0,0,0.35)] transition duration-300 group-hover:translate-y-1 group-hover:opacity-100">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[#C8A24D]">Handled commodities</p>
                      <p className="mt-2 text-xs leading-6 text-slate-300">{region.commodities.join(" · ")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section data-reveal="commodities" className={`mt-16 rounded-[2rem] border border-white/10 bg-white/6 p-8 backdrop-blur-xl sm:p-10 ${revealClass("commodities")}`}>
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.24em] text-[#C8A24D]">Global Commodities</p>
            <h2 className="mt-3 font-heading text-3xl text-white sm:text-4xl">
              A carefully curated portfolio across major energy and fuel categories.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {commodities.map((item) => (
              <div key={item.name} className={`rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-6 ${cardClasses}`}>
                <p className="font-heading text-2xl text-white">{item.name}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="network" data-reveal="services" className={`mt-16 rounded-[2rem] border border-white/10 bg-white/6 p-8 backdrop-blur-xl sm:p-10 ${revealClass("services")}`}>
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.24em] text-[#C8A24D]">What we deliver</p>
            <h2 className="mt-3 font-heading text-3xl text-white sm:text-4xl">
              A refined platform for serious commercial relationships.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {services.map((service) => (
              <div key={service.title} className={`rounded-2xl border border-white/10 bg-slate-950/50 p-6 ${cardClasses}`}>
                <h3 className="font-heading text-2xl text-white">{service.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{service.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="insight" data-reveal="insight" className={`mt-16 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] ${revealClass("insight")}`}>
          <div className={`rounded-[2rem] border border-white/10 bg-[#0f2c46]/70 p-8 ${cardClasses}`}>
            <p className="text-sm uppercase tracking-[0.24em] text-[#C8A24D]">Why institutions choose AGE</p>
            <h2 className="mt-3 font-heading text-3xl text-white sm:text-4xl">
              Built for trust, speed, and long-range value creation.
            </h2>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
              {trustPoints.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-[#C8A24D]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`grid gap-4 rounded-[2rem] border border-white/10 bg-white/6 p-8 backdrop-blur-xl sm:grid-cols-2 ${cardClasses}`}>
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                <p className="font-heading text-3xl text-white">{metric.value}</p>
                <p className="mt-2 text-sm text-slate-300">{metric.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="inquiry" data-reveal="inquiry" className={`mt-16 grid gap-6 rounded-[2rem] border border-white/10 bg-slate-950/60 p-8 shadow-[0_25px_80px_rgba(0,0,0,0.28)] lg:grid-cols-[0.95fr_1.05fr] lg:p-10 ${revealClass("inquiry")}`}>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#C8A24D]">Begin a conversation</p>
            <h2 className="mt-3 font-heading text-3xl text-white sm:text-4xl">
              Let us prepare a confidential introduction for your next mandate.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
              Share your requirements and we will respond with a tailored outreach plan for buyers, suppliers, or strategic partners.
            </p>
          </div>

          <form className="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-6" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-wrap items-center gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                      currentStep >= step
                        ? "border-[#C8A24D] bg-[#C8A24D]/15 text-[#C8A24D]"
                        : "border-white/15 bg-transparent text-slate-400"
                    }`}
                  >
                    {step}
                  </div>
                  {step < 4 ? <div className="h-px w-4 bg-white/10" /> : null}
                </div>
              ))}
            </div>

            {formFeedback ? (
              <p
                aria-live="polite"
                className={`text-sm ${formStatus === "success" ? "text-[#C8A24D]" : "text-rose-300"}`}
              >
                {formFeedback}
              </p>
            ) : null}

            {currentStep === 1 ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Inquiry Type</span>
                    <select
                      value={formData.inquiry_type}
                      onChange={(event) => updateField("inquiry_type", event.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select an inquiry type</option>
                      <option value="Buy Fuel">Buy Fuel</option>
                      <option value="Sell Fuel">Sell Fuel</option>
                      <option value="Need Broker">Need Broker</option>
                      <option value="Looking for Supplier">Looking for Supplier</option>
                      <option value="Looking for Buyer">Looking for Buyer</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Company Name</span>
                    <input
                      value={formData.company_name}
                      onChange={(event) => updateField("company_name", event.target.value)}
                      className={inputClassName}
                      placeholder="Company name"
                    />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Contact Name</span>
                    <input
                      value={formData.contact_name}
                      onChange={(event) => updateField("contact_name", event.target.value)}
                      className={inputClassName}
                      placeholder="Contact name"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Position</span>
                    <input
                      value={formData.position}
                      onChange={(event) => updateField("position", event.target.value)}
                      className={inputClassName}
                      placeholder="Your title"
                    />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Email</span>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      className={inputClassName}
                      placeholder="you@company.com"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Phone</span>
                    <input
                      value={formData.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      className={inputClassName}
                      placeholder="Phone number"
                    />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">WhatsApp</span>
                    <input
                      value={formData.whatsapp}
                      onChange={(event) => updateField("whatsapp", event.target.value)}
                      className={inputClassName}
                      placeholder="WhatsApp number"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Company Website</span>
                    <input
                      value={formData.company_website}
                      onChange={(event) => updateField("company_website", event.target.value)}
                      className={inputClassName}
                      placeholder="https://company.com"
                    />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Country</span>
                    <input
                      value={formData.country}
                      onChange={(event) => updateField("country", event.target.value)}
                      className={inputClassName}
                      placeholder="Country"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Company Registration Number</span>
                    <input
                      value={formData.company_registration_number}
                      onChange={(event) => updateField("company_registration_number", event.target.value)}
                      className={inputClassName}
                      placeholder="Registration number"
                    />
                  </label>
                </div>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Verification Status</span>
                  <select
                    value={formData.verification_status}
                    onChange={(event) => updateField("verification_status", event.target.value)}
                    className={inputClassName}
                  >
                    <option value="">Select a status</option>
                    <option value="Verified">Verified</option>
                    <option value="Not Verified">Not Verified</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </label>
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Role Type</span>
                    <select
                      value={formData.role_type}
                      onChange={(event) => updateField("role_type", event.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select role type</option>
                      <option value="Buyer">Buyer</option>
                      <option value="Seller">Seller</option>
                      <option value="Buyer Mandate">Buyer Mandate</option>
                      <option value="Seller Mandate">Seller Mandate</option>
                      <option value="Refinery">Refinery</option>
                      <option value="Distributor">Distributor</option>
                      <option value="End Buyer">End Buyer</option>
                      <option value="Government Agency">Government Agency</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Product</span>
                    <select
                      value={formData.product}
                      onChange={(event) => updateField("product", event.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select product</option>
                      <option value="Jet A1">Jet A1</option>
                      <option value="EN590 Diesel">EN590 Diesel</option>
                      <option value="D6">D6</option>
                      <option value="Crude Oil">Crude Oil</option>
                      <option value="LNG">LNG</option>
                      <option value="LPG">LPG</option>
                      <option value="Bitumen">Bitumen</option>
                      <option value="Gasoline">Gasoline</option>
                      <option value="Aviation Fuel">Aviation Fuel</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Quantity</span>
                    <input
                      value={formData.quantity}
                      onChange={(event) => updateField("quantity", event.target.value)}
                      className={inputClassName}
                      placeholder="e.g. 50,000"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Unit</span>
                    <select
                      value={formData.unit}
                      onChange={(event) => updateField("unit", event.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select unit</option>
                      <option value="MT">MT</option>
                      <option value="BBL">BBL</option>
                      <option value="Gallons">Gallons</option>
                      <option value="Liters">Liters</option>
                      <option value="Barrels">Barrels</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Delivery Frequency</span>
                    <select
                      value={formData.delivery_frequency}
                      onChange={(event) => updateField("delivery_frequency", event.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select frequency</option>
                      <option value="One Time">One Time</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Annual Contract">Annual Contract</option>
                      <option value="Spot">Spot</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Contract Length</span>
                    <select
                      value={formData.contract_length}
                      onChange={(event) => updateField("contract_length", event.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select length</option>
                      <option value="Spot">Spot</option>
                      <option value="3 Months">3 Months</option>
                      <option value="6 Months">6 Months</option>
                      <option value="12 Months">12 Months</option>
                      <option value="24 Months">24 Months</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Target Price</span>
                    <input
                      value={formData.target_price}
                      onChange={(event) => updateField("target_price", event.target.value)}
                      className={inputClassName}
                      placeholder="Target price"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Currency</span>
                    <select
                      value={formData.currency}
                      onChange={(event) => updateField("currency", event.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select currency</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="AED">AED</option>
                    </select>
                  </label>
                </div>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Payment Method</span>
                  <select
                    value={formData.payment_method}
                    onChange={(event) => updateField("payment_method", event.target.value)}
                    className={inputClassName}
                  >
                    <option value="">Select payment method</option>
                    <option value="SBLC">SBLC</option>
                    <option value="LC">LC</option>
                    <option value="DLC">DLC</option>
                    <option value="MT103">MT103</option>
                    <option value="Wire">Wire</option>
                    <option value="Escrow">Escrow</option>
                    <option value="Open">Open</option>
                  </select>
                </label>
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Incoterms</span>
                    <select
                      value={formData.incoterms}
                      onChange={(event) => updateField("incoterms", event.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select incoterms</option>
                      <option value="FOB">FOB</option>
                      <option value="CIF">CIF</option>
                      <option value="TTO">TTO</option>
                      <option value="TTV">TTV</option>
                      <option value="CIP">CIP</option>
                      <option value="DAP">DAP</option>
                      <option value="DDP">DDP</option>
                      <option value="FCA">FCA</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Loading Port</span>
                    <input
                      value={formData.loading_port}
                      onChange={(event) => updateField("loading_port", event.target.value)}
                      className={inputClassName}
                      placeholder="Loading port"
                    />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Destination Port</span>
                    <input
                      value={formData.destination_port}
                      onChange={(event) => updateField("destination_port", event.target.value)}
                      className={inputClassName}
                      placeholder="Destination port"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Origin Country</span>
                    <input
                      value={formData.origin_country}
                      onChange={(event) => updateField("origin_country", event.target.value)}
                      className={inputClassName}
                      placeholder="Origin country"
                    />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Destination Country</span>
                    <input
                      value={formData.destination_country}
                      onChange={(event) => updateField("destination_country", event.target.value)}
                      className={inputClassName}
                      placeholder="Destination country"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Shipping Method</span>
                    <select
                      value={formData.shipping_method}
                      onChange={(event) => updateField("shipping_method", event.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select shipping method</option>
                      <option value="Pipeline">Pipeline</option>
                      <option value="Tanker">Tanker</option>
                      <option value="Rail">Rail</option>
                      <option value="Truck">Truck</option>
                      <option value="Container">Container</option>
                    </select>
                  </label>
                </div>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Do you have supporting trade documents available?</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {documentOptions.map((option) => {
                      const isChecked = formData.documents_available
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                        .includes(option);

                      return (
                        <label key={option} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#071A2D] px-4 py-3 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleDocumentSelection(option)}
                            className="h-4 w-4 accent-[#C8A24D]"
                          />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs leading-6 text-slate-400">
                    Qualified parties will receive secure upload instructions after initial review.
                  </p>
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Special Instructions</span>
                  <textarea
                    value={formData.special_instructions}
                    onChange={(event) => updateField("special_instructions", event.target.value)}
                    className="min-h-24 w-full rounded-xl border border-white/15 bg-[#071A2D] px-4 py-3 text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/35 placeholder:text-slate-500"
                    placeholder="Add any additional documentation or logistics notes"
                  />
                </label>
              </div>
            ) : null}

            {currentStep === 4 ? (
              <div className="space-y-4">
                <div className="rounded-[1.25rem] border border-white/10 bg-[#071A2D]/90 p-5">
                  <p className="text-sm uppercase tracking-[0.24em] text-[#C8A24D]">Review & Submit</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <div><span className="text-white">Company:</span> {formData.company_name || "Not provided"}</div>
                    <div><span className="text-white">Contact:</span> {formData.contact_name || "Not provided"}</div>
                    <div><span className="text-white">Email:</span> {formData.email || "Not provided"}</div>
                    <div><span className="text-white">Inquiry Type:</span> {formData.inquiry_type || "Not provided"}</div>
                    <div><span className="text-white">Product:</span> {formData.product || "Not provided"}</div>
                    <div><span className="text-white">Quantity:</span> {formData.quantity || "Not provided"}</div>
                    <div><span className="text-white">Target Price:</span> {formData.target_price || "Not provided"}</div>
                    <div><span className="text-white">Ports:</span> {formData.loading_port || "Not provided"} → {formData.destination_port || "Not provided"}</div>
                    <div><span className="text-white">Documents:</span> {formData.documents_available || "None selected"}</div>
                    <div><span className="text-white">Special Instructions:</span> {formData.special_instructions || "None provided"}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Hidden honeypot — must stay empty. Bots that fill it are rejected server-side. */}
            <input
              type="text"
              name="_hp"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              aria-hidden="true"
              tabIndex={-1}
              autoComplete="off"
              style={{ position: "absolute", left: "-9999px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#C8A24D]/60 hover:text-[#C8A24D]"
                >
                  Back
                </button>
              ) : null}
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-full bg-[#C8A24D] px-5 py-3 text-sm font-semibold text-[#071A2D] transition hover:bg-[#d8b56a]"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-[#C8A24D] px-5 py-3 text-sm font-semibold text-[#071A2D] transition hover:bg-[#d8b56a] disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {isSubmitting ? "Submitting..." : "Submit Inquiry"}
                </button>
              )}
            </div>
          </form>
        </section>

        <footer className="mt-16 border-t border-white/10 bg-[#071A2D]/80 px-4 py-10 sm:px-8 lg:px-0">
          <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
            <div className="max-w-sm">
              <p className="font-heading text-2xl text-white">Amber Global Energy</p>
              <p className="mt-2 text-sm text-slate-300">Premium International Brokerage</p>
              <a href="mailto:support@amberglobalenergy.in" className="mt-4 block text-sm text-slate-300 transition hover:text-[#C8A24D]">
                support@amberglobalenergy.in
              </a>
              <a href="https://amberglobalenergy.in" className="mt-2 block text-sm text-slate-300 transition hover:text-[#C8A24D]">
                amberglobalenergy.in
              </a>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[#C8A24D]">Quick Links</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  <li><a href="#insight" className="transition hover:text-white">Markets</a></li>
                  <li><a href="#network" className="transition hover:text-white">Services</a></li>
                  <li><a href="#inquiry" className="transition hover:text-white">Request a Quote</a></li>
                  <li><a href="#inquiry" className="transition hover:text-white">Contact</a></li>
                </ul>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[#C8A24D]">Markets</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  <li>Crude Oil</li>
                  <li>LNG</li>
                  <li>Jet A1</li>
                  <li>EN590 Diesel</li>
                </ul>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[#C8A24D]">Services</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  <li>Supplier Partnerships</li>
                  <li>Buyer Access</li>
                  <li>Execution Oversight</li>
                  <li>Strategic Intelligence</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6 text-sm text-slate-400">
            Copyright 2026 Amber Global Energy. All rights reserved.
          </div>
        </footer>
      </div>
    </main>
  );
}
