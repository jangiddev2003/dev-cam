import type { StripFrame } from "../types";

interface FilmStripProps {
  frames: StripFrame[];
}

export default function FilmStrip({ frames }: FilmStripProps) {
  // Duplicate the list so the marquee loop is seamless.
  const doubled = [...frames, ...frames];

  return (
    <div className="marquee-wrap">
      <div className="marquee-track">
        {doubled.map((frame, i) => (
          <div className="film-frame" key={`${frame.id}-${i}`}>
            <div className="sprocket" />
            <div
              className="film-body mono"
              style={frame.src ? { backgroundImage: `url(${frame.src})`, color: "transparent" } : undefined}
            >
              {frame.label}
            </div>
            <div className="sprocket" />
          </div>
        ))}
      </div>
    </div>
  );
}
