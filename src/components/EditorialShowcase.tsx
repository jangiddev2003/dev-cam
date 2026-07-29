import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { Variants } from "framer-motion";
import { useRef } from "react";
import { EDITORIAL_PROJECTS } from "../data";
import type { EditorialProject } from "../types";
import CylinderCarousel from "./CylinderCarousel";

const projects = EDITORIAL_PROJECTS;

function ProjectStory({ project, index }: { project: EditorialProject; index: number }) {
  const projectRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: projectRef,
    offset: ["start end", "end start"],
  });
  const frameOpacity = useTransform(scrollYProgress, [0, 0.18, 0.76, 1], [0.18, 1, 1, 0.15]);
  const frameScale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.97, 1, 1, 0.98]);
  // const imageScale = useTransform(scrollYProgress, [0.12, 0.48], [1.08, 1]);
  // const imageY = useTransform(scrollYProgress, [0, 1], ["-4%", "4%"]);

  return (
    <article className="editorial-project" ref={projectRef}>
      <motion.div
        className="editorial-project-frame"
        style={reduceMotion ? undefined : { opacity: frameOpacity, scale: frameScale }}
      >
        <motion.div
          className="editorial-copy"
          initial="hidden"
          whileInView="visible"
          viewport={{ amount: 0.42, once: true }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.11, delayChildren: 0.06 } },
          }}
        >
          {/* Section counter */}
          <motion.p className="editorial-kicker mono" variants={copyReveal}>
            04 / SELECTED STORIES / {String(index + 1).padStart(2, "0")}
          </motion.p>

          {/* Bold intro heading */}
          <motion.h2 className="editorial-title editorial-title--bold" variants={copyReveal}>
            {project.title.split("\n").map((line) => <span key={line}>{line}</span>)}
          </motion.h2>

          {/* Role strip */}
          <motion.p className="editorial-roles mono" variants={copyReveal}>
            {project.quote}
          </motion.p>

          {/* Body paragraphs — split on \n\n */}
          {project.description.split("\n\n").map((para, i) => (
            <motion.p
              key={i}
              className={i === 0 ? "editorial-lead" : "editorial-description"}
              variants={copyReveal}
            >
              {para}
            </motion.p>
          ))}

          {/* SPECIALIZED IN + list */}
          <motion.div className="editorial-meta mono" variants={copyReveal}>
            {project.metadata}
          </motion.div>
          {project.specializations && (
            <motion.ul className="editorial-spec-list mono" variants={copyReveal}>
              {project.specializations.map((s) => <li key={s}>{s}</li>)}
            </motion.ul>
          )}

          <motion.a className="editorial-cta mono" href="#contact" variants={copyReveal}>
            START A CONVERSATION <span aria-hidden="true">↗</span>
          </motion.a>
        </motion.div>

        <motion.div
          className="editorial-image-wrap"
          initial={{ opacity: 0, scale: 1.03 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ amount: 0.4, once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <CylinderCarousel />
        </motion.div>
      </motion.div>
    </article>
  );
}

const copyReveal: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.68, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function EditorialShowcase() {
  return (
    <section id="stories" className="editorial-showcase" aria-label="Selected stories">
      {projects.map((project, index) => <ProjectStory key={project.title} project={project} index={index} />)}
    </section>
  );
}
