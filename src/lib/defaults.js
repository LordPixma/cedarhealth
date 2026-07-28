// Default site content (the seed) and the patient-intake form definition.
// Everything in DEFAULT_CONTENT is editable by the clinic through /admin.

export const DEFAULT_CONTENT = {
  brand: {
    name: "Cedar Health",
    // Empty -> the built-in cedar sprig mark is used. Set to a /media/... URL via the CMS.
    logoUrl: ""
  },

  seo: {
    title: "Cedar Health — Family medicine in Niagara Falls, Ontario",
    description:
      "Cedar Health is a family medical practice in Niagara Falls, Ontario, now accepting new patients. Family medicine, pediatric care, vaccinations, on-site lab and same-day visits."
  },

  hero: {
    pill: "Now accepting new patients",
    eyebrow: "A family practice on the Niagara escarpment",
    heading: "Care that grows with your family.",
    emphasis: "with", // this word is highlighted in the accent colour
    lede:
      "Cedar Health is a family practice in Niagara Falls. From newborn check-ups to same-day sick visits, our family physicians look after every generation — under one roof.",
    photoUrl: "/images/hero.jpg",
    ctaPrimary: "Register as a patient",
    ctaSecondary: "Call the clinic",
    trust: ["All ages welcome", "Same-day slots held daily", "On-site lab & vaccines"]
  },

  strip: [
    { k: "All ages", v: "Newborn to senior, one practice" },
    { k: "Same-day", v: "Acute slots held every day" },
    { k: "On-site", v: "Lab, vaccines & diagnostics" },
    { k: "New patients", v: "Welcome now in Niagara Falls" }
  ],

  services: {
    eyebrow: "What we do",
    title: "Everyday care, and the days you didn't plan for.",
    body: "One practice for routine visits, growing families and the sudden things — so you're not starting over with a stranger each time.",
    items: [
      { icon: "heart", title: "Family medicine", body: "Ongoing primary care for patients of every age, built around one relationship you can keep for years." },
      { icon: "child", title: "Pediatric care", body: "Well-baby visits, growth and development checks, and unhurried answers for new parents." },
      { icon: "syringe", title: "Vaccinations", body: "Routine childhood immunisations, boosters, and seasonal and travel shots kept up to date." },
      { icon: "flask", title: "On-site lab", body: "Common bloodwork and samples taken during your visit — one less trip across town to make." },
      { icon: "pulse", title: "Same-day & acute care", body: "Slots held each day for sudden illness and minor injuries that shouldn't wait for a booking." }
    ]
  },

  doctors: {
    eyebrow: "Meet your doctors",
    title: "Two family physicians, one practice.",
    body: "You'll get to know your doctor — and they'll get to know you, your history and your family.",
    items: [
      { name: "Dr Moyo Esenamunjor", role: "Family physician", photoUrl: "/images/dr-moyo-esenamunjor.jpg", bio: "Cares for patients from their first days through every stage that follows — a calm, listen-first approach built on the belief that good primary care comes from continuity." },
      { name: "Dr Osarugue Esenamunjor", role: "Family physician", photoUrl: "/images/dr-osarugue-esenamunjor.jpg", bio: "Looks after the whole family, with particular care for parents, children and anyone navigating a new diagnosis. Treats the person, not just the chart." }
    ]
  },

  benefits: {
    eyebrow: "Why families choose us",
    title: "A practice built around real life.",
    items: [
      { icon: "clock", title: "Holistic care plans", body: "We look at the whole picture — history, lifestyle and goals — not just today's symptom." },
      { icon: "video", title: "Same-day telehealth", body: "Video slots held daily for quick questions and follow-ups, from home or work." },
      { icon: "calendar", title: "Evening & Saturday hours", body: "Appointments outside the nine-to-five, so care fits around school and shifts." },
      { icon: "monitor", title: "Modern diagnostics", body: "Up-to-date in-clinic equipment for faster, clearer answers." },
      { icon: "globe", title: "Bilingual staff", body: "Support in more than one language, so nothing gets lost in translation." },
      { icon: "lock", title: "Secure patient portal", body: "Book, view results and message the clinic through one private, encrypted account." }
    ]
  },

  steps: {
    eyebrow: "Getting started",
    title: "What to expect when you join.",
    body: "We're a new practice, so here's exactly how becoming a patient works — no waiting rooms full of paperwork.",
    items: [
      { title: "Register", body: "Complete the online patient intake form with your details and health history. We'll confirm your spot and book your first appointment." },
      { title: "Your intake visit", body: "A longer first appointment to go through your history, medications and what matters to you." },
      { title: "Ongoing care", body: "You'll have a family physician who knows you — plus same-day options when something comes up." }
    ]
  },

  contact: {
    eyebrow: "Contact & register",
    title: "Join Cedar Health.",
    body: "New patients are welcome. Complete the patient intake form and we'll be in touch to confirm your first appointment.",
    address: "6453 Morrisons Rd\nNiagara Falls, Ontario",
    phone: "",
    email: "",
    hours: [
      { d: "Monday – Thursday", t: "8:00 – 20:00" },
      { d: "Friday", t: "8:00 – 17:00" },
      { d: "Saturday", t: "9:00 – 13:00" },
      { d: "Sunday", t: "Closed" }
    ]
  },

  footer: {
    tagline: "A family practice in Niagara Falls, Ontario — accepting new patients across every generation.",
    note: "Now accepting new patients"
  }
};

// Sections the /admin editor exposes as simple forms (order matters).
export const CONTENT_SECTIONS = Object.keys(DEFAULT_CONTENT);

/* =========================================================================
   Patient intake form definition.
   Rendered on /intake and used to label submissions in /admin.
   Comprehensive family-practice intake; the clinic should have the final
   set of fields + privacy notice reviewed for PHIPA/PIPEDA before go-live.
   ========================================================================= */
export const INTAKE_SCHEMA = [
  {
    id: "patient",
    title: "Patient information",
    fields: [
      { name: "legal_first_name", label: "Legal first name", type: "text", required: true, cols: 6, autocomplete: "given-name" },
      { name: "legal_last_name", label: "Legal last name", type: "text", required: true, cols: 6, autocomplete: "family-name" },
      { name: "preferred_name", label: "Preferred name", type: "text", cols: 6 },
      { name: "date_of_birth", label: "Date of birth", type: "date", required: true, cols: 6, autocomplete: "bday" },
      { name: "sex_at_birth", label: "Sex assigned at birth", type: "select", cols: 6, options: ["Female", "Male", "Intersex", "Prefer not to say"] },
      { name: "gender_identity", label: "Gender identity (optional)", type: "text", cols: 6 },
      { name: "pronouns", label: "Pronouns (optional)", type: "text", cols: 6 },
      { name: "marital_status", label: "Marital status", type: "select", cols: 6, options: ["Single", "Married", "Common-law", "Divorced", "Widowed", "Prefer not to say"] },
      { name: "preferred_language", label: "Preferred language", type: "text", cols: 6 },
      { name: "interpreter_needed", label: "Do you need an interpreter?", type: "select", cols: 6, options: ["No", "Yes"] }
    ]
  },
  {
    id: "health_card",
    title: "Health card",
    intro: "If you have an Ontario health card, adding it now speeds up your first visit. You can leave this blank and bring it with you instead.",
    fields: [
      { name: "health_card_number", label: "Health card number", type: "text", cols: 6, inputmode: "numeric" },
      { name: "health_card_version", label: "Version code", type: "text", cols: 3 },
      { name: "health_card_province", label: "Issuing province", type: "text", cols: 3, value: "Ontario" },
      { name: "no_health_card", label: "I don't currently have a health card", type: "consent", plain: true }
    ]
  },
  {
    id: "contact",
    title: "Contact information",
    fields: [
      { name: "street_address", label: "Street address", type: "text", required: true, cols: 12, autocomplete: "street-address" },
      { name: "city", label: "City / town", type: "text", required: true, cols: 5, value: "Niagara Falls" },
      { name: "province", label: "Province", type: "text", cols: 4, value: "Ontario" },
      { name: "postal_code", label: "Postal code", type: "text", cols: 3, autocomplete: "postal-code" },
      { name: "phone_mobile", label: "Mobile phone", type: "tel", required: true, cols: 6, autocomplete: "tel" },
      { name: "phone_home", label: "Home phone (optional)", type: "tel", cols: 6 },
      { name: "email", label: "Email", type: "email", required: true, cols: 6, autocomplete: "email" },
      { name: "preferred_contact", label: "Preferred way to reach you", type: "select", cols: 6, options: ["Phone call", "Email", "Text message"] },
      { name: "voicemail_ok", label: "May we leave a detailed voicemail?", type: "select", cols: 6, options: ["Yes", "No — please leave a call-back only"] }
    ]
  },
  {
    id: "emergency",
    title: "Emergency contact",
    fields: [
      { name: "emergency_name", label: "Full name", type: "text", cols: 6 },
      { name: "emergency_relationship", label: "Relationship to you", type: "text", cols: 6 },
      { name: "emergency_phone", label: "Phone", type: "tel", cols: 6 }
    ]
  },
  {
    id: "current",
    title: "Your care today",
    fields: [
      { name: "reason_for_joining", label: "What brings you to Cedar Health?", type: "textarea", cols: 12 },
      { name: "main_concerns", label: "Any current health concerns you'd like us to know about?", type: "textarea", cols: 12 },
      { name: "previous_doctor", label: "Current or most recent family doctor", type: "text", cols: 6 },
      { name: "previous_doctor_reason", label: "Reason you're changing (optional)", type: "text", cols: 6 },
      { name: "pharmacy_name", label: "Preferred pharmacy", type: "text", cols: 6 },
      { name: "pharmacy_phone", label: "Pharmacy phone", type: "tel", cols: 6 }
    ]
  },
  {
    id: "history",
    title: "Medical history",
    fields: [
      { name: "conditions", label: "Do you have, or have you had, any of these? (tick all that apply)", type: "checkboxes", cols: 12,
        options: ["High blood pressure", "Diabetes", "Asthma / COPD", "Heart disease", "Stroke", "Thyroid disease", "Cancer", "Kidney disease", "Liver disease", "Mental health condition", "Seizures / epilepsy", "Arthritis"] },
      { name: "conditions_other", label: "Other conditions (please list)", type: "textarea", cols: 12 },
      { name: "surgeries", label: "Past surgeries or procedures (with approximate years)", type: "textarea", cols: 12 },
      { name: "hospitalizations", label: "Past hospitalisations", type: "textarea", cols: 12 }
    ]
  },
  {
    id: "medications",
    title: "Medications & allergies",
    fields: [
      { name: "medications", label: "Current medications and doses (include over-the-counter and supplements)", type: "textarea", cols: 12 },
      { name: "allergies", label: "Allergies (medications, food, environmental)", type: "textarea", cols: 6 },
      { name: "allergy_reactions", label: "What reaction do you get?", type: "textarea", cols: 6 }
    ]
  },
  {
    id: "family",
    title: "Family history",
    fields: [
      { name: "family_conditions", label: "Conditions that run in your family (tick all that apply)", type: "checkboxes", cols: 12,
        options: ["Heart disease", "High blood pressure", "Diabetes", "Cancer", "Stroke", "Mental health condition", "Thyroid disease", "Genetic / inherited condition"] },
      { name: "family_notes", label: "Details (who, and which condition)", type: "textarea", cols: 12 }
    ]
  },
  {
    id: "lifestyle",
    title: "Lifestyle",
    fields: [
      { name: "smoking", label: "Smoking / vaping", type: "select", cols: 6, options: ["Never", "Former", "Current"] },
      { name: "alcohol", label: "Alcohol", type: "select", cols: 6, options: ["None", "Occasional", "Weekly", "Daily"] },
      { name: "substances", label: "Recreational substances", type: "select", cols: 6, options: ["No", "Prefer not to say", "Yes"] },
      { name: "occupation", label: "Occupation", type: "text", cols: 6 },
      { name: "immunizations", label: "Are your immunisations up to date?", type: "select", cols: 6, options: ["Yes", "No", "Unsure"] }
    ]
  },
  {
    id: "consent",
    title: "Privacy & consent",
    isConsent: true,
    fields: [
      { name: "consent_collection", type: "consent", required: true,
        label: "I consent to Cedar Health collecting and using the personal health information on this form to provide and coordinate my care, as described in the Privacy Notice above." },
      { name: "consent_contact", type: "consent", required: true,
        label: "I confirm the contact details above are correct and may be used to reach me about my care." },
      { name: "consent_accuracy", type: "consent", required: true,
        label: "The information I have provided is accurate and complete to the best of my knowledge." },
      { name: "signature_name", label: "Type your full name as your signature", type: "text", required: true, cols: 8 },
      { name: "signature_date", label: "Date", type: "date", required: true, cols: 4 }
    ]
  }
];

// Fields whose values must never be logged/echoed casually.
export const INTAKE_FIELD_INDEX = (() => {
  const map = {};
  for (const section of INTAKE_SCHEMA) for (const f of section.fields) map[f.name] = { ...f, section: section.title };
  return map;
})();
