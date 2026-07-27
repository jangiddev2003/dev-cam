import { useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Photos from "./components/Photos";
import Reels from "./components/Reels";
import AboutContact from "./components/AboutContact";
import Footer from "./components/Footer";
import HireMeModal from "./components/HireMeModal";

// 3D cylindrical carousel temporarily disabled
// const HeightfieldCards = lazy(() => import("./components/HeightfieldCards"));

export default function App() {
  const [hireMeOpen, setHireMeOpen] = useState(false);

  return (
    <>
      <Navbar onHireMeClick={() => setHireMeOpen(true)} />
      <Hero />
      <Photos />
      <Reels />
      {/*
      <Suspense
        fallback={
          <section id="heightfield" className="section section-alt">
            <div className="heightfield-skeleton mono">Loading heightfield cards...</div>
          </section>
        }
      >
        <HeightfieldCards />
      </Suspense>
      */}
      <AboutContact onHireMeClick={() => setHireMeOpen(true)} />
      <Footer />
      {hireMeOpen && <HireMeModal onClose={() => setHireMeOpen(false)} />}
    </>
  );
}
