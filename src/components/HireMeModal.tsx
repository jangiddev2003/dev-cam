import { useState, type FormEvent } from "react";
import { SITE } from "../data";
import type { HireMeForm } from "../types";

interface HireMeModalProps {
  onClose: () => void;
}

const EMPTY: HireMeForm = { name: "", email: "", phone: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function HireMeModal({ onClose }: HireMeModalProps) {
  const [form, setForm] = useState<HireMeForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<HireMeForm>>({});
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function validate(): boolean {
    const next: Partial<HireMeForm> = {};
    if (!form.name.trim()) next.name = "Enter your name";
    if (!EMAIL_RE.test(form.email)) next.email = "Enter a valid email";
    if (form.phone.replace(/\D/g, "").length < 10) next.phone = "Enter a valid phone number";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    // No backend wired up yet, so this opens the visitor's email app pre-filled.
    // To collect submissions without opening their email app, swap this for
    // an EmailJS / Formspree call — see README "Wiring up the contact form".
    const subject = encodeURIComponent(`Work inquiry from ${form.name}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\n\nHi ${SITE.name}, I'd like to talk about a project.`
    );
    window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="display" style={{ fontSize: 22, margin: 0 }}>
            HIRE ME
          </h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} noValidate>
            <label className="mono field-label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              className="field-input"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
            />
            {errors.name && <p className="mono field-error">{errors.name}</p>}

            <label className="mono field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="field-input"
              placeholder="you@gmail.com"
              value={form.email}
              onChange={handleChange}
            />
            {errors.email && <p className="mono field-error">{errors.email}</p>}

            <label className="mono field-label" htmlFor="phone">
              Mobile Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="field-input"
              placeholder="+91 00000 00000"
              value={form.phone}
              onChange={handleChange}
            />
            {errors.phone && <p className="mono field-error">{errors.phone}</p>}

            <button type="submit" className="btn btn-accent mono submit-btn">
              Send
            </button>
          </form>
        ) : (
          <p className="modal-note">
            Your email app should open with the details filled in. If it doesn't, reach out
            directly at <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          </p>
        )}
      </div>
    </div>
  );
}
