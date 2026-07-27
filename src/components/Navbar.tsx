import { scrollToId } from "../utils";

interface NavbarProps {
  onHireMeClick: () => void;
}

export default function Navbar({ onHireMeClick }: NavbarProps) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <span className="display logo">
          DEV<span>.</span>
        </span>
        <nav className="nav-links">
          <button className="nav-link" onClick={() => scrollToId("photos")}>
            Photos
          </button>
          <button className="nav-link" onClick={() => scrollToId("reels") }>
            Reels
          </button>
          {/* <button className="nav-link" onClick={() => scrollToId("heightfield") }>
            Heightfield
          </button> */}
          <button className="nav-link" onClick={() => scrollToId("about")}>
            About
          </button>
          <button className="nav-link" onClick={() => scrollToId("contact")}>
            Contact
          </button>
        </nav>
        <button className="btn btn-accent mono" onClick={onHireMeClick}>
          Hire Me
        </button>
      </div>
    </header>
  );
}
