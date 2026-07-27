import { SITE } from "../data";

interface AboutContactProps {
  onHireMeClick: () => void;
}

export default function AboutContact({ onHireMeClick }: AboutContactProps) {
  return (
    <>
      <div className="section-divider" />
      <section id="about" className="section">
        <div className="about-grid">
          {/* Bio side */}
          <div>
            <p className="mono eyebrow">
              <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--accent)", marginRight: 8, verticalAlign: "middle" }} />
              04 — ABOUT
            </p>
            <h2
              className="display"
              style={{ fontSize: "clamp(28px, 4vw, 42px)", margin: "10px 0 20px", color: "var(--text)" }}
            >
              {SITE.name.toUpperCase()}
            </h2>
            <p className="about-bio">{`Photographer and video editor based in ${SITE.location}. Comfortable behind the camera and in the timeline — from raw footage to a graded, cut final piece. Open to internships and freelance work across portraits, events, product and short-form content.`}</p>

            {/* Tags */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 24 }}>
              {["Portraits", "Events", "Product", "Street", "Short-form"].map((tag) => (
                <span
                  key={tag}
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    border: "1px solid var(--line)",
                    padding: "5px 12px",
                    color: "var(--muted)",
                    borderRadius: 2,
                  }}
                >
                  {tag.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          {/* Contact card */}
          <div id="contact" className="contact-block">
            <p
              className="mono"
              style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--accent)", margin: "0 0 4px" }}
            >
              GET IN TOUCH
            </p>
            <div>
              <p className="mono contact-label">Email</p>
              <a href={`mailto:${SITE.email}`} className="contact-value mono">
                {SITE.email}
              </a>
            </div>
            <div>
              <p className="mono contact-label">Phone</p>
              <a href={`tel:${SITE.phone}`} className="contact-value mono">
                {SITE.phone}
              </a>
            </div>
            <div>
              <p className="mono contact-label">Location</p>
              <span className="contact-value mono" style={{ fontSize: 14 }}>{SITE.location}</span>
            </div>
            <button
              className="btn btn-accent mono"
              style={{ marginTop: 4 }}
              onClick={onHireMeClick}
            >
              Hire Me
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
