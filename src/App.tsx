import { Suspense, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Photos from "./components/Photos";
import Reels from "./components/Reels";
import TornadoStream from "./components/TornadoStream";
import CoverFlow from "./components/CoverFlow";
import EditorialShowcase from "./components/EditorialShowcase";
import AboutContact from "./components/AboutContact";
import Footer from "./components/Footer";
import HireMeModal from "./components/HireMeModal";


export default function App() {
  const [hireMeOpen, setHireMeOpen] = useState(false);

  return (
    <>
      <Navbar onHireMeClick={() => setHireMeOpen(true)} />
      <EditorialShowcase />
      <Hero />
      <Photos />
      <Reels />
      <TornadoStream />
      <CoverFlow />
      <AboutContact onHireMeClick={() => setHireMeOpen(true)} />
      <Footer />
      {hireMeOpen && <HireMeModal onClose={() => setHireMeOpen(false)} />}
    </>
  );
}
