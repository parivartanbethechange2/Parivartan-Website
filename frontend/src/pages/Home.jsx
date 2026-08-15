import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Marquee from "react-fast-marquee";
import { ArrowRight, ArrowUpRight, MapPin, Sprout } from "lucide-react";
import { Counter, Reveal, Stagger, StaggerItem, ProgressBar } from "@/components/Motion";
import { api, inr } from "@/lib/api";
import {
  HERO_SLIDES,
  IMPACT,
  NEWS_TICKER,
  UGEPI,
  ORG,
  COMPLIANCE,
  MISSION,
} from "@/data/content";

const Hero = () => {
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.18]);
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const radius = useTransform(scrollYProgress, [0, 1], ["0px", "180px"]);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const slide = HERO_SLIDES[i];

  return (
    <section ref={ref} className="relative h-[115vh]" data-testid="hero-section">
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div style={{ scale, y, borderBottomLeftRadius: radius, borderBottomRightRadius: radius }} className="absolute inset-0 overflow-hidden">
          <AnimatePresence mode="sync">
            <motion.img
              key={slide.url}
              src={slide.url}
              alt={slide.overline}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4 }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/45 to-ink/40" />
        </motion.div>

        <motion.div style={{ opacity }} className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-end px-6 pb-16 md:pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.overline}
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="overline text-sage">{slide.overline}</p>
              <h1 className="mt-5 max-w-4xl whitespace-pre-line text-5xl leading-[0.93] tracking-tighter text-sand md:text-7xl">
                {slide.title}
              </h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-sand/75 md:text-lg">{slide.text}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/join"
              data-testid="hero-join-btn"
              className="group inline-flex items-center gap-3 bg-sand px-8 py-4 text-sm text-ink transition-transform duration-300 hover:-translate-y-1"
            >
              Join the Movement
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              to="/campaigns"
              data-testid="hero-donate-btn"
              className="inline-flex items-center gap-3 bg-clay px-8 py-4 text-sm text-white transition-transform duration-300 hover:-translate-y-1"
            >
              Donate Now
            </Link>
            <div className="ml-auto hidden items-center gap-3 sm:flex" role="tablist" aria-label="Hero slides">
              {HERO_SLIDES.map((s, idx) => (
                <button
                  key={s.url}
                  aria-label={`Slide ${idx + 1}: ${s.overline}`}
                  data-testid={`hero-dot-${idx}`}
                  onClick={() => setI(idx)}
                  className={`h-[3px] transition-all duration-500 ${idx === i ? "w-14 bg-sand" : "w-7 bg-sand/35"}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-sand/20 pt-6 text-xs text-sand/60">
            <span className="flex items-center gap-2">
              <MapPin size={13} /> Kashipur, Uttarakhand
            </span>
            <span>Est. {ORG.founded}</span>
            <span>Reg. No. {ORG.regNo}</span>
            <span>80G • CSR-1 registered</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const ImpactBand = ({ stats }) => (
  <section className="relative z-20 -mt-[15vh] bg-sand" data-testid="impact-section">
    <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <Reveal>
          <p className="overline text-clay">Our footprint so far</p>
          <h2 className="mt-6 text-4xl tracking-tight md:text-5xl">
            Numbers we can
            <br />
            stand behind.
          </h2>
          <p className="mt-7 max-w-md text-base leading-relaxed text-ink/70">
            Every figure below comes from our own field registers and camp records since {ORG.founded} — not projections.
          </p>
        </Reveal>

        <Stagger className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-3">
          {IMPACT.map((m) => (
            <StaggerItem key={m.key}>
              <div className="border-t border-line pt-5" data-testid={`stat-${m.key}`}>
                <p className="serif text-5xl leading-none tracking-tight text-forest md:text-6xl">
                  <Counter to={stats?.[m.key] ?? m.value} suffix={m.suffix} />
                </p>
                <p className="mt-4 text-sm text-ink/60">{m.label}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </div>
  </section>
);

const Ticker = () => (
  <section className="border-y border-line bg-sage py-5" data-testid="news-ticker">
    <Marquee gradient={false} speed={44} pauseOnHover>
      {NEWS_TICKER.map((n, i) => (
        <span key={i} className="mx-12 flex items-center gap-4 serif text-xl text-forest/80 md:text-2xl">
          <Sprout size={15} className="text-clay" />
          {n}
        </span>
      ))}
    </Marquee>
  </section>
);

const Pillars = () => (
  <section className="relative overflow-hidden bg-forest text-sand grain">
    <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
      <Reveal>
        <p className="overline text-sage/70">What we do</p>
        <h2 className="mt-6 max-w-3xl text-4xl tracking-tight md:text-5xl">{`Forests, women and children — treated as one problem, not three.`}</h2>
      </Reveal>
      <Stagger className="mt-16 grid gap-10 md:grid-cols-2">
        {MISSION.map((m, i) => (
          <StaggerItem key={i}>
            <div className="flex gap-6 border-t border-sand/20 pt-6">
              <span className="serif text-3xl text-clay">0{i + 1}</span>
              <p className="text-base leading-relaxed text-sand/75 md:text-lg">{m}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  </section>
);

const Spotlight = ({ campaign }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  const pct = campaign ? Math.round((campaign.raised / campaign.goal) * 100) : 20;

  return (
    <section ref={ref} className="bg-sand" data-testid="ugepi-spotlight">
      <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="overline text-clay">Active campaign spotlight</p>
              <h2 className="mt-5 max-w-2xl text-4xl tracking-tight md:text-5xl">{UGEPI.code} — {UGEPI.period}</h2>
            </div>
            <Link
              to="/campaigns"
              data-testid="spotlight-fund-btn"
              className="group inline-flex items-center gap-3 border border-forest px-7 py-3.5 text-sm text-forest transition-colors hover:bg-forest hover:text-sand"
            >
              Fund this cause
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-0 overflow-hidden shadow-warmlg lg:grid-cols-2">
          <div className="relative h-[340px] overflow-hidden lg:h-auto">
            <motion.img
              style={{ y: imgY }}
              src="https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=1600&q=80"
              alt="Native tree plantation"
              className="absolute inset-0 h-[124%] w-full object-cover"
            />
          </div>
          <div className="relative overflow-hidden bg-forest p-8 text-sand grain md:p-14">
            <h3 className="serif text-2xl leading-snug md:text-3xl">
              50,000 native trees. 200 women in 20 SHGs. 4,000 children in eco-clubs.
            </h3>
            <p className="mt-6 text-sm leading-relaxed text-sand/70 md:text-base">
              A three-year programme across {UGEPI.districts.join(", ")} with a total outlay of {UGEPI.budget}.
            </p>

            <div className="mt-10">
              <div className="flex items-end justify-between text-sm">
                <span className="text-sand/60">Committed</span>
                <span className="serif text-2xl">{pct}%</span>
              </div>
              <ProgressBar pct={pct} className="mt-3 bg-sand/15" />
              <p className="mt-3 text-xs text-sand/50">
                {campaign ? `${inr(campaign.raised)} of ${inr(campaign.goal)}` : UGEPI.budget}
              </p>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-6 border-t border-sand/20 pt-8">
              {UGEPI.targets.map((t) => (
                <div key={t.label}>
                  <p className="serif text-2xl text-sage">{t.value}</p>
                  <p className="mt-1 text-xs text-sand/55">{t.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 space-y-3">
              {UGEPI.budgetBreakdown.map((b) => (
                <div key={b.year} className="flex items-center gap-4 text-xs">
                  <span className="w-32 shrink-0 text-sand/60">{b.year}</span>
                  <div className="h-[4px] flex-1 bg-sand/15">
                    <motion.div
                      className="h-full bg-clay"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${b.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span className="w-20 text-right text-sand/80">{b.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Trust = () => (
  <section className="border-t border-line bg-sage/40">
    <div className="mx-auto max-w-[1400px] px-6 py-20">
      <Reveal>
        <p className="overline text-forest/60">Registered & compliant</p>
      </Reveal>
      <Stagger className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {COMPLIANCE.map((c) => (
          <StaggerItem key={c.label}>
            <div className="border border-forest/25 px-5 py-4" data-testid={`home-compliance-${c.label.replace(/\W+/g, "-").toLowerCase()}`}>
              <p className="overline text-forest">{c.label}</p>
              <p className="mt-2 text-sm font-semibold text-ink">{c.value}</p>
              <p className="mt-1 text-xs text-ink/50">{c.note}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  </section>
);

const CTA = () => (
  <section className="relative overflow-hidden bg-clay text-white grain">
    <div className="mx-auto max-w-[1400px] px-6 py-24 text-center md:py-32">
      <Reveal>
        <h2 className="mx-auto max-w-3xl text-4xl tracking-tight md:text-6xl">
          One sapling, one skill, one classroom at a time.
        </h2>
      </Reveal>
      <Reveal delay={0.12}>
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            to="/join"
            data-testid="cta-volunteer-btn"
            className="bg-white px-8 py-4 text-sm text-ink transition-transform duration-300 hover:-translate-y-1"
          >
            Become a volunteer
          </Link>
          <Link
            to="/report-issue"
            data-testid="cta-report-btn"
            className="border border-white/60 px-8 py-4 text-sm text-white transition-colors hover:bg-white/10"
          >
            Report a community issue
          </Link>
        </div>
      </Reveal>
    </div>
  </section>
);

export default function Home() {
  const [stats, setStats] = useState(null);
  const [flagship, setFlagship] = useState(null);

  useEffect(() => {
    api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
    api
      .get("/campaigns")
      .then((r) => setFlagship(r.data.find((c) => c.flagship) || null))
      .catch(() => {});
  }, []);

  return (
    <>
      <Hero />
      <ImpactBand stats={stats} />
      <Ticker />
      <Pillars />
      <Spotlight campaign={flagship} />
      <Trust />
      <CTA />
    </>
  );
}
