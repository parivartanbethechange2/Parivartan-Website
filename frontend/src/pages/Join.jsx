import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { PageHeader, Reveal, Stagger, StaggerItem } from "@/components/Motion";
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
  const { user, login } = useAuth();
  const [tier, setTier] = useState("annual");
  const [memBusy, setMemBusy] = useState(false);
  const [volBusy, setVolBusy] = useState(false);
  const [volDone, setVolDone] = useState(false);
  const [mem, setMem] = useState({ name: "", email: "", phone: "", city: "" });
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

  const submitMembership = async (e) => {
    e.preventDefault();
    setMemBusy(true);
    try {
      const { data } = await api.post("/membership/apply", { tier, ...mem });
      toast.success(`Application received — ${data.membership_no}`, {
        description: "Payment gateway is coming shortly; we'll email you a payment link to activate the membership.",
      });
      setMem({ name: "", email: "", phone: "", city: "" });
    } catch {
      toast.error("Could not submit. Please check the fields and try again.");
    } finally {
      setMemBusy(false);
    }
  };

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
            <form onSubmit={submitMembership} className="grid gap-6 border border-line p-8 md:grid-cols-2 md:p-12" data-testid="membership-form">
              <div className="md:col-span-2">
                <h3 className="serif text-2xl tracking-tight">Register as a member</h3>
                <p className="mt-2 text-sm text-ink/60">
                  Selected: {MEMBERSHIP_TIERS.find((t) => t.id === tier)?.name}. You'll receive a payment link and an 80G receipt.
                </p>
              </div>
              <Field label="Full name" required>
                <input required value={mem.name} onChange={(e) => setMem({ ...mem, name: e.target.value })} className={inputCls} placeholder="Your name" data-testid="mem-name" />
              </Field>
              <Field label="Email" required>
                <input required type="email" value={mem.email} onChange={(e) => setMem({ ...mem, email: e.target.value })} className={inputCls} placeholder="you@email.com" data-testid="mem-email" />
              </Field>
              <Field label="Phone" required>
                <input required value={mem.phone} onChange={(e) => setMem({ ...mem, phone: e.target.value })} className={inputCls} placeholder="10-digit mobile" data-testid="mem-phone" />
              </Field>
              <Field label="City" required>
                <input required value={mem.city} onChange={(e) => setMem({ ...mem, city: e.target.value })} className={inputCls} placeholder="City / District" data-testid="mem-city" />
              </Field>
              <div className="md:col-span-2 flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={memBusy}
                  data-testid="mem-submit"
                  className="inline-flex items-center gap-3 bg-forest px-8 py-4 text-sm text-sand transition-transform duration-300 hover:-translate-y-1 disabled:opacity-60"
                >
                  {memBusy && <Loader2 size={15} className="animate-spin" />}
                  Register membership
                </button>
                {!user && (
                  <button type="button" onClick={login} data-testid="join-signin-btn" className="text-sm text-forest underline underline-offset-4">
                    Sign in first to link this to your dashboard
                  </button>
                )}
              </div>
            </form>
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
    </>
  );
}
