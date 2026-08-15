import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { MapPin, Target } from "lucide-react";
import { PageHeader, Reveal, Stagger, StaggerItem, ProgressBar } from "@/components/Motion";
import DonateModal from "@/components/DonateModal";
import { api, inr, fmt } from "@/lib/api";
import { GALLERY, UGEPI } from "@/data/content";

const StackCard = ({ c, i, total, onFund }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 96px", "end 300px"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.93]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.35]);
  const pct = c.goal > 0 ? Math.round((c.raised / c.goal) * 100) : 100;

  return (
    <div ref={ref} className="sticky top-24" style={{ zIndex: i + 1, marginBottom: i === total - 1 ? 0 : 32 }}>
      <motion.article
        style={{ scale, opacity }}
        className="grid overflow-hidden bg-sand shadow-warmlg lg:grid-cols-[0.9fr_1.1fr]"
        data-testid={`campaign-card-${c.code.toLowerCase()}`}
      >
        <div className="relative h-56 overflow-hidden lg:h-auto">
          <img src={c.cover} alt={c.title} className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute left-5 top-5 bg-sand/90 px-3 py-1.5 overline text-forest">{c.code}</span>
        </div>
        <div className="border border-line p-8 md:p-12">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span
              className={`px-3 py-1 overline ${
                c.status === "active" ? "bg-forest text-sand" : "border border-line text-ink/50"
              }`}
            >
              {c.status}
            </span>
            <span className="text-ink/50">{c.period}</span>
          </div>
          <h2 className="mt-6 serif text-3xl leading-tight tracking-tight md:text-4xl">{c.title}</h2>
          <p className="mt-5 text-sm leading-relaxed text-ink/70 md:text-base">{c.summary}</p>

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-xs text-ink/55">
            <span className="flex items-center gap-2">
              <MapPin size={13} /> {c.districts.join(", ")}
            </span>
            {c.trees_target > 0 && (
              <span className="flex items-center gap-2">
                <Target size={13} /> {fmt(c.trees_planted)} / {fmt(c.trees_target)} trees
              </span>
            )}
          </div>

          {c.goal > 0 && (
            <div className="mt-9">
              <div className="flex items-end justify-between">
                <p className="text-sm text-ink/60">
                  <span className="serif text-2xl text-forest">{inr(c.raised)}</span> raised of {inr(c.goal)}
                </p>
                <span className="serif text-2xl text-clay">{pct}%</span>
              </div>
              <ProgressBar pct={pct} className="mt-3" />
            </div>
          )}

          <div className="mt-9 flex flex-wrap gap-4">
            <button
              onClick={() => onFund(c)}
              data-testid={`fund-btn-${c.code.toLowerCase()}`}
              disabled={c.status !== "active"}
              className="group inline-flex items-center gap-3 bg-clay px-7 py-3.5 text-sm text-white transition-transform duration-300 hover:-translate-y-1 disabled:cursor-not-allowed disabled:bg-ink/20"
            >
              {c.status === "active" ? "Fund this cause" : "Completed"}
            </button>
          </div>
        </div>
      </motion.article>
    </div>
  );
};

const Budget = () => (
  <section className="relative overflow-hidden bg-forest text-sand grain">
    <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
      <Reveal>
        <p className="overline text-sage/70">UGEPI budget • {UGEPI.budget}</p>
        <h2 className="mt-6 max-w-2xl text-4xl tracking-tight md:text-5xl">
          Where every rupee is planned to go.
        </h2>
      </Reveal>
      <Stagger className="mt-16 grid gap-8 md:grid-cols-3">
        {UGEPI.budgetBreakdown.map((b) => (
          <StaggerItem key={b.year}>
            <div className="border-t border-sand/25 pt-6">
              <p className="overline text-sage/70">{b.year}</p>
              <p className="mt-5 serif text-5xl tracking-tight">{b.amount}</p>
              <div className="mt-6 h-[5px] w-full bg-sand/15">
                <motion.div
                  className="h-full bg-clay"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${b.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="mt-3 text-xs text-sand/50">{b.pct}% of total outlay</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  </section>
);

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [funding, setFunding] = useState(null);

  const load = () => api.get("/campaigns").then((r) => setCampaigns(r.data)).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const active = campaigns.filter((c) => c.status === "active");
  const past = campaigns.filter((c) => c.status !== "active");

  return (
    <>
      <PageHeader
        testid="campaigns-header"
        overline="Active drives"
        title="Campaigns you can fund today."
        sub="Live progress on every drive, updated from the field. Donations are eligible for 80G tax exemption."
      />

      <section className="bg-sage/30">
        <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
          <Reveal>
            <p className="overline text-clay">Now running • {active.length} campaigns</p>
          </Reveal>
          <div className="mt-12">
            {active.map((c, i) => (
              <StackCard key={c.id} c={c} i={i} total={active.length} onFund={setFunding} />
            ))}
          </div>
        </div>
      </section>

      <Budget />

      <section className="bg-sand">
        <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
          <Reveal>
            <p className="overline text-clay">Past projects</p>
            <h2 className="mt-6 text-4xl tracking-tight md:text-5xl">Completed work.</h2>
          </Reveal>
          <Stagger className="mt-14 grid gap-10 md:grid-cols-2">
            {past.map((c) => (
              <StaggerItem key={c.id}>
                <div data-testid={`past-project-${c.code.toLowerCase()}`}>
                  <div className="aspect-[16/10] overflow-hidden">
                    <img src={c.cover} alt={c.title} className="h-full w-full object-cover" />
                  </div>
                  <p className="overline mt-6 text-ink/45">{c.period}</p>
                  <h3 className="mt-3 serif text-2xl tracking-tight md:text-3xl">{c.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-ink/65">{c.summary}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <Stagger className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {GALLERY.map((g) => (
              <StaggerItem key={g.title}>
                <div className="group">
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={g.url}
                      alt={g.title}
                      className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-4 text-sm">{g.title}</p>
                  <p className="text-xs text-ink/45">{g.meta}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <DonateModal
        open={Boolean(funding)}
        campaign={funding}
        onClose={() => {
          setFunding(null);
          load();
        }}
      />
    </>
  );
}
