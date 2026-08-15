import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Marquee from "react-fast-marquee";
import { BadgeCheck, MapPin } from "lucide-react";
import { PageHeader, Reveal, Stagger, StaggerItem } from "@/components/Motion";
import { ORG, COMPLIANCE, TEAM, PARTNERS, VISION, MISSION, GALLERY } from "@/data/content";

const Vision = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <section ref={ref} className="bg-sand" data-testid="vision-section">
      <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
        <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Reveal>
              <p className="overline text-clay">Vision</p>
              <p className="mt-7 serif text-3xl leading-snug tracking-tight md:text-4xl">{VISION}</p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="overline mt-16 text-clay">Mission</p>
            </Reveal>
            <Stagger className="mt-8 space-y-8">
              {MISSION.map((m, i) => (
                <StaggerItem key={i}>
                  <div className="flex gap-6 border-t border-line pt-5">
                    <span className="serif text-2xl text-forest/40">0{i + 1}</span>
                    <p className="text-base leading-relaxed text-ink/75">{m}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
          <div className="relative h-[420px] overflow-hidden lg:h-[620px]">
            <motion.img
              style={{ y }}
              src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1400&q=80"
              alt="Planting a sapling"
              className="absolute inset-0 h-[122%] w-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-ink/70 p-6 backdrop-blur-sm">
              <p className="flex items-center gap-2 text-sm text-sand">
                <MapPin size={14} /> {ORG.address}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Legal = () => (
  <section className="relative overflow-hidden bg-forest text-sand grain" data-testid="legal-hub">
    <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
      <Reveal>
        <p className="overline text-sage/70">Legal & Transparency Hub</p>
        <h2 className="mt-6 max-w-2xl text-4xl tracking-tight md:text-5xl">
          Verify us before you fund us.
        </h2>
      </Reveal>

      <Stagger className="mt-16 grid gap-6 md:grid-cols-3">
        {COMPLIANCE.map((c, i) => (
          <StaggerItem key={c.label} className={i === 3 ? "md:col-span-2" : ""}>
            <div
              className="flex h-full flex-col justify-between border border-sand/25 p-7 transition-colors duration-300 hover:bg-sand/[0.06]"
              data-testid={`compliance-${c.label.replace(/\W+/g, "-").toLowerCase()}`}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="overline text-sage">{c.label}</p>
                <BadgeCheck size={18} className="text-clay" />
              </div>
              <p className="mt-8 serif text-2xl tracking-tight md:text-3xl">{c.value}</p>
              <p className="mt-3 text-xs text-sand/55">{c.note}</p>
            </div>
          </StaggerItem>
        ))}
        <StaggerItem>
          <div className="flex h-full flex-col justify-between bg-clay p-7 text-white">
            <p className="overline">Tax benefit</p>
            <p className="mt-8 serif text-2xl leading-snug md:text-3xl">
              50% deduction under Section 80G on every donation.
            </p>
            <p className="mt-3 text-xs text-white/75">Receipts issued from your dashboard.</p>
          </div>
        </StaggerItem>
      </Stagger>
    </div>
  </section>
);

const Team = () => (
  <section className="bg-sand" data-testid="team-section">
    <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
      <Reveal>
        <p className="overline text-clay">Leadership</p>
        <h2 className="mt-6 text-4xl tracking-tight md:text-5xl">The people accountable.</h2>
      </Reveal>
      <Stagger className="mt-16 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {TEAM.map((t) => (
          <StaggerItem key={t.name}>
            <div className="group" data-testid={`team-${t.name.split(" ")[0].toLowerCase()}`}>
              <div className="relative aspect-[4/5] overflow-hidden bg-sage">
                <div className="absolute inset-0 grid place-items-center">
                  <span className="serif text-7xl text-forest/25">
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                </div>
                <div className="absolute inset-0 bg-forest/0 transition-colors duration-500 group-hover:bg-forest/10" />
              </div>
              <p className="mt-6 serif text-2xl tracking-tight">{t.name}</p>
              <p className="overline mt-2 text-clay">{t.role}</p>
              <p className="mt-4 text-sm leading-relaxed text-ink/65">{t.bio}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  </section>
);

const Partners = () => (
  <section className="border-y border-line bg-sage/40 py-16" data-testid="partners-grid">
    <Reveal className="mx-auto max-w-[1400px] px-6">
      <p className="overline text-forest/60">Partners & supporters</p>
    </Reveal>
    <div className="mt-10">
      <Marquee gradient={false} speed={36} pauseOnHover>
        {[...PARTNERS, ...PARTNERS].map((p, i) => (
          <span key={i} className="mx-16 flex items-baseline gap-4">
            <span className="serif text-3xl tracking-tight text-forest md:text-4xl">{p.name}</span>
            <span className="text-xs text-ink/45">{p.note}</span>
          </span>
        ))}
      </Marquee>
    </div>
  </section>
);

const Gallery = () => (
  <section className="bg-sand">
    <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
      <Reveal>
        <p className="overline text-clay">On the ground</p>
        <h2 className="mt-6 text-4xl tracking-tight md:text-5xl">Since 2016.</h2>
      </Reveal>
      <Stagger className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {GALLERY.map((g) => (
          <StaggerItem key={g.title}>
            <div className="group">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={g.url}
                  alt={g.title}
                  className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-105"
                />
              </div>
              <p className="mt-5 serif text-xl tracking-tight">{g.title}</p>
              <p className="mt-1 text-xs text-ink/50">{g.meta}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  </section>
);

export default function About() {
  return (
    <>
      <PageHeader
        testid="about-header"
        overline={`Est. ${ORG.founded} • ${ORG.state}`}
        title="A society built in a village, for villages."
        sub={`${ORG.name} was registered in ${ORG.founded} under Reg. No. ${ORG.regNo}, growing out of a free community school that ran from 2016 to 2021.`}
      />
      <Vision />
      <Legal />
      <Team />
      <Partners />
      <Gallery />
    </>
  );
}
