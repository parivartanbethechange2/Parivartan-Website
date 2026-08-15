import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/api";

export const Reveal = ({ children, delay = 0, y = 28, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

export const Stagger = ({ children, className = "", gap = 0.09 }) => (
  <motion.div
    className={className}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: "-60px" }}
    variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ children, className = "" }) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 24 },
      show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
    }}
  >
    {children}
  </motion.div>
);

export const Counter = ({ to, suffix = "", duration = 2 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) mv.set(to);
  }, [inView, mv, to]);

  useEffect(() => spring.on("change", (v) => setDisplay(Math.round(v))), [spring]);

  return (
    <span ref={ref} className="tabular-nums">
      {fmt(display)}
      {suffix}
    </span>
  );
};

export const ProgressBar = ({ pct, className = "" }) => (
  <div className={`h-[6px] w-full bg-ink/10 overflow-hidden ${className}`}>
    <motion.div
      className="h-full bg-forest"
      initial={{ width: 0 }}
      whileInView={{ width: `${Math.min(pct, 100)}%` }}
      viewport={{ once: true }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
    />
  </div>
);

export const PageHeader = ({ overline, title, sub, testid }) => (
  <header className="relative overflow-hidden bg-forest text-sand grain" data-testid={testid}>
    <div className="mx-auto max-w-[1400px] px-6 pt-40 pb-24 md:pt-52 md:pb-32">
      <Reveal>
        <p className="overline text-sage/80">{overline}</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h1 className="mt-6 max-w-4xl text-5xl md:text-7xl tracking-tighter leading-[0.95]">{title}</h1>
      </Reveal>
      {sub && (
        <Reveal delay={0.2}>
          <p className="mt-8 max-w-2xl text-base md:text-lg leading-relaxed text-sand/70">{sub}</p>
        </Reveal>
      )}
    </div>
  </header>
);
