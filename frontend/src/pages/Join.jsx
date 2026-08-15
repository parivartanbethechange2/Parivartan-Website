import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { PageHeader, Reveal, Stagger, StaggerItem } from "@/components/Motion";
import DonateModal from "@/components/DonateModal";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MEMBERSHIP_TIERS, INTEREST_AREAS } from "@/data/content";

const Field = ({ label, children, required }) => (
  <label className="block">
    <span className="overline text-ink/50">
      {label}
      {required && <span className="text-clay"> *</span>}
    </span>
    <div className="mt-3">{children}</div>
  </label>
);

const inputCls =
  "w-full border border-line bg-sand px-4 py-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-forest";

export default function Join() {
  const { user, openAuth } = useAuth();
  const [tier, setTier] = useState("annual");
  const [checkout, setCheckout] = useState(null);
  const [volBusy, setVolBusy] = useState(false);
  const [volDone, setVolDone] = useState(false);
  const [vol, setVol] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    skills: "",
    availability: "Weekends",
    interest_area: INTEREST_AREAS[0],
    message: "",
  });

  const submitVolunteer = async (e) => {
    e.preventDefault();
    setVolBusy(true);
    try {
      await api.post("/volunteers", vol);
      setVolDone(true);
      toast.success("Thank you for signing up", { description: "Our coordinator will reach out within 5 working days." });
    } catch {
      toast.error("Could not submit. Please check the fields and try again.");
    } finally {
      setVolBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        testid="join-header"
        overline="Membership & Volunteering"
        title="Two ways in. Both change something."
        sub="Become a member to fund the work year-round, or volunteer your hands and skills on the ground in Uttarakhand."
      />

      <section className="bg-sand" data-testid="membership-section">
        <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
          <Reveal>
            <p className="overline text-clay">Paid membership</p>
            <h2 className="mt-6 text-4xl tracking-tight md:text-5xl">Choose your tier.</h2>
          </Reveal>

          <Stagger className="mt-14 grid gap-6 lg:grid-cols-3">
            {MEMBERSHIP_TIERS.map((t) => {
              const on = tier === t.id;
              return (
                <StaggerItem key={t.id}>
                  <button
                    type="button"
                    onClick={() => setTier(t.id)}
                    data-testid={`tier-${t.id}`}
                    className={`flex h-full w-full flex-col border p-8 text-left transition-colors duration-300 ${
                      on ? "border-forest bg-forest text-sand" : "border-line bg-sand hover:border-forest/50"
                    }`}
                  >
                    <p className={`overline ${on ? "text-sage" : "text-clay"}`}>{t.name}</p>
                    <p className="mt-6 serif text-5xl tracking-tight">{t.fee}</p>
                    <p className={`mt-2 text-xs ${on ? "text-sand/60" : "text-ink/50"}`}>{t.period}</p>
                    <ul className="mt-8 space-y-3">
                      {t.perks.map((p) => (
                        <li key={p} className="flex gap-3 text-sm">
                          <Check size={15} className={on ? "mt-0.5 text-clay" : "mt-0.5 text-forest"} />
                          <span className={on ? "text-sand/80" : "text-ink/70"}>{p}</span>
                        </li>
                      ))}
                    </ul>
                    <span className={`mt-8 overline ${on ? "text-clay" : "text-ink/35"}`}>
                      {on ? "Selected" : "Select"}
                    </span>
                  </button>
                </StaggerItem>
              );
            })}
          </Stagger>

          <Reveal className="mt-16">
            <div className="grid gap-8 border border-line p-8 md:grid-cols-[1.2fr_1fr] md:p-12" data-testid="membership-form">
              <div>
                <h3 className="serif text-2xl tracking-tight">Pay and activate your membership</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/65">
                  Selected: <strong>{MEMBERSHIP_TIERS.find((t) => t.id === tier)?.name}</strong> —{" "}
                  {MEMBERSHIP_TIERS.find((t) => t.id === tier)?.fee}. Your digital membership ID is issued the moment
                  payment clears, along with an 80G receipt for the fee.
                </p>
                {!user && (
                  <button type="button" onClick={openAuth} data-testid="join-signin-btn" className="mt-5 text-sm text-forest underline underline-offset-4">
                    Sign in first so the membership links to your dashboard
                  </button>
                )}
              </div>
              <div className="flex flex-col justify-center gap-4">
                <button
                  onClick={() => setCheckout(MEMBERSHIP_TIERS.find((t) => t.id === tier))}
                  data-testid="mem-submit"
                  className="inline-flex items-center justify-center gap-3 bg-forest px-8 py-4 text-sm text-sand transition-transform duration-300 hover:-translate-y-1"
                >
                  Pay {MEMBERSHIP_TIERS.find((t) => t.id === tier)?.fee} & join
                </button>
                <p className="text-center text-xs text-ink/45">Secure checkout • 80G receipt included</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-sage/40" data-testid="volunteer-section">
        <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
          <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <p className="overline text-clay">Volunteer signup</p>
              <h2 className="mt-6 text-4xl tracking-tight md:text-5xl">Give us a weekend.</h2>
              <p className="mt-7 max-w-sm text-base leading-relaxed text-ink/70">
                Plantation drives, SHG camps, eco-clubs, health camps and remote work in design, content and fundraising.
              </p>
            </Reveal>

            {volDone ? (
              <Reveal>
                <div className="border border-forest bg-sand p-12 text-center" data-testid="volunteer-success">
                  <Check size={30} className="mx-auto text-forest" />
                  <h3 className="mt-6 serif text-3xl tracking-tight">You're on the list.</h3>
                  <p className="mt-4 text-sm text-ink/65">
                    Our volunteer coordinator will contact you within 5 working days with the next drive schedule.
                  </p>
                  <button onClick={() => setVolDone(false)} data-testid="volunteer-another" className="mt-8 text-sm text-forest underline underline-offset-4">
                    Register another volunteer
                  </button>
                </div>
              </Reveal>
            ) : (
              <Reveal>
                <form onSubmit={submitVolunteer} className="grid gap-6 bg-sand p-8 md:grid-cols-2 md:p-12" data-testid="volunteer-form">
                  <Field label="Full name" required>
                    <input required value={vol.name} onChange={(e) => setVol({ ...vol, name: e.target.value })} className={inputCls} placeholder="Your name" data-testid="vol-name" />
                  </Field>
                  <Field label="Email" required>
                    <input required type="email" value={vol.email} onChange={(e) => setVol({ ...vol, email: e.target.value })} className={inputCls} placeholder="you@email.com" data-testid="vol-email" />
                  </Field>
                  <Field label="Phone" required>
                    <input required value={vol.phone} onChange={(e) => setVol({ ...vol, phone: e.target.value })} className={inputCls} placeholder="10-digit mobile" data-testid="vol-phone" />
                  </Field>
                  <Field label="Location / City" required>
                    <input required value={vol.city} onChange={(e) => setVol({ ...vol, city: e.target.value })} className={inputCls} placeholder="Kashipur, Nainital…" data-testid="vol-city" />
                  </Field>
                  <Field label="Interest area" required>
                    <select value={vol.interest_area} onChange={(e) => setVol({ ...vol, interest_area: e.target.value })} className={inputCls} data-testid="vol-interest">
                      {INTEREST_AREAS.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Availability" required>
                    <select value={vol.availability} onChange={(e) => setVol({ ...vol, availability: e.target.value })} className={inputCls} data-testid="vol-availability">
                      {["Weekends", "Weekdays", "Evenings only", "Full time", "Remote / online"].map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Skills you can contribute" required>
                      <input required value={vol.skills} onChange={(e) => setVol({ ...vol, skills: e.target.value })} className={inputCls} placeholder="e.g. teaching, nursery management, photography, accounting" data-testid="vol-skills" />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Anything else">
                      <textarea rows={4} value={vol.message} onChange={(e) => setVol({ ...vol, message: e.target.value })} className={inputCls} placeholder="Tell us why you want to volunteer" data-testid="vol-message" />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={volBusy}
                      data-testid="vol-submit"
                      className="inline-flex items-center gap-3 bg-clay px-8 py-4 text-sm text-white transition-transform duration-300 hover:-translate-y-1 disabled:opacity-60"
                    >
                      {volBusy && <Loader2 size={15} className="animate-spin" />}
                      Submit volunteer application
                    </button>
                  </div>
                </form>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      <DonateModal open={Boolean(checkout)} membershipTier={checkout} onClose={() => setCheckout(null)} />
    </>
  );
}
