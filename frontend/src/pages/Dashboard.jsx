import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Bell, Calendar, Download, FileText, LogOut, MapPin, ShieldCheck } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/Motion";
import { Logo } from "@/components/Logo";
import { api, inr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ORG, COMPLIANCE } from "@/data/content";

const Toggle = ({ on, onChange, label, note, testid }) => (
  <div className="flex items-start justify-between gap-6 border-t border-line py-5">
    <div>
      <p className="text-sm text-ink">{label}</p>
      <p className="mt-1 text-xs text-ink/50">{note}</p>
    </div>
    <button
      onClick={() => onChange(!on)}
      data-testid={testid}
      aria-pressed={on}
      className={`relative h-6 w-11 shrink-0 transition-colors duration-300 ${on ? "bg-forest" : "bg-ink/20"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 bg-sand transition-transform duration-300 ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  </div>
);

const MemberCard = ({ user }) => (
  <div
    id="membership-id-card"
    className="relative overflow-hidden bg-forest p-8 text-sand grain print:break-inside-avoid"
    data-testid="membership-id-card"
  >
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center bg-sand p-1">
          <img src="/parivartan-logo.png" alt="Parivartan" className="h-full w-full object-contain" />
        </span>
        <div>
          <p className="serif text-lg leading-none">Parivartan</p>
          <p className="overline text-[9px] text-sage/70">Be The Change</p>
        </div>
      </div>
      <p className="overline text-sage/70">Digital ID</p>
    </div>

    <p className="mt-10 serif text-3xl tracking-tight">{user.name}</p>
    <p className="mt-1 text-xs text-sand/60">{user.email}</p>

    <div className="mt-8 grid grid-cols-2 gap-6 border-t border-sand/20 pt-6 text-xs">
      <div>
        <p className="text-sand/50">Membership No.</p>
        <p className="mt-1 font-semibold tracking-wide">{user.membership_no || "— not issued —"}</p>
      </div>
      <div>
        <p className="text-sand/50">Tier</p>
        <p className="mt-1 font-semibold capitalize">{user.membership_tier || "Not a member yet"}</p>
      </div>
      <div>
        <p className="text-sand/50">Status</p>
        <p className="mt-1 font-semibold capitalize">{user.membership_status}</p>
      </div>
      <div>
        <p className="text-sand/50">Member since</p>
        <p className="mt-1 font-semibold">
          {new Date(user.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
        </p>
      </div>
    </div>

    <p className="mt-8 text-[10px] leading-relaxed text-sand/45">
      Reg. No. {ORG.regNo} • NGO Darpan UA/2023/0342800 • {ORG.address}
    </p>
  </div>
);

export default function Dashboard() {
  const { user, loading, openAuth, logout, setUser } = useAuth();
  const [rsvps, setRsvps] = useState([]);
  const [issues, setIssues] = useState([]);
  const [receipts, setReceipts] = useState([]);

  useEffect(() => {
    if (!user) return;
    api.get("/my/rsvps").then((r) => setRsvps(r.data)).catch(() => {});
    api.get("/my/issues").then((r) => setIssues(r.data)).catch(() => {});
    api.get("/my/receipts").then((r) => setReceipts(r.data)).catch(() => {});
  }, [user]);

  const downloadReceipt = async (rec) => {
    try {
      const res = await api.get(`/receipts/${rec.id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `80G-${rec.receipt_no.replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the receipt.");
    }
  };

  const savePrefs = async (patch) => {
    try {
      const { data } = await api.put("/auth/preferences", {
        notify_email: user.notify_email,
        notify_events: user.notify_events,
        notify_newsletter: user.notify_newsletter,
        ...patch,
      });
      setUser(data);
      toast.success("Preferences saved");
    } catch {
      toast.error("Could not save preferences");
    }
  };

  if (loading) return <div className="min-h-screen bg-sand" />;

  if (!user)
    return (
      <section className="relative min-h-screen overflow-hidden bg-forest text-sand grain" data-testid="dashboard-signin">
        <div className="mx-auto flex min-h-screen max-w-[560px] flex-col justify-center px-6 py-32">
          <Logo dark size={64} showText={false} />
          <p className="overline mt-8 text-sage/70">Member area</p>
          <h1 className="mt-6 serif text-5xl tracking-tighter">Sign in to your dashboard.</h1>
          <p className="mt-6 text-sm leading-relaxed text-sand/70">
            Access your digital membership ID, 80G receipt archive, RSVPs and notification preferences.
          </p>
          <button
            onClick={openAuth}
            data-testid="dashboard-google-btn"
            className="mt-10 inline-flex items-center justify-center gap-3 bg-sand px-8 py-4 text-sm text-ink transition-transform duration-300 hover:-translate-y-1"
          >
            Sign in with Google or phone
          </button>
          <p className="mt-6 text-xs text-sand/45">Phone sign-in uses a one-time code sent to your mobile.</p>
        </div>
      </section>
    );

  return (
    <>
      <header className="relative overflow-hidden bg-forest text-sand grain" data-testid="dashboard-header">
        <div className="mx-auto max-w-[1400px] px-6 pt-40 pb-20 md:pt-52">
          <Reveal>
            <p className="overline text-sage/80">Dashboard</p>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-8">
              <h1 className="text-5xl tracking-tighter md:text-6xl">Namaste, {user.name.split(" ")[0]}.</h1>
              <div className="flex flex-wrap gap-3">
                {user.role === "admin" && (
                  <Link to="/admin" data-testid="dashboard-admin-link" className="border border-sand/40 px-6 py-3 text-sm transition-colors hover:bg-sand/10">
                    Admin panel
                  </Link>
                )}
                <button onClick={logout} data-testid="logout-btn" className="inline-flex items-center gap-2 border border-sand/40 px-6 py-3 text-sm transition-colors hover:bg-sand/10">
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </header>

      <section className="bg-sand">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.35fr]">
            <div className="space-y-10">
              <Reveal>
                <p className="overline text-clay">Digital membership ID</p>
                <div className="mt-6">
                  <MemberCard user={user} />
                </div>
                <button
                  onClick={() => window.print()}
                  data-testid="download-id-btn"
                  className="mt-5 inline-flex w-full items-center justify-center gap-3 border border-forest px-6 py-3.5 text-sm text-forest transition-colors hover:bg-forest hover:text-sand"
                >
                  <Download size={15} /> Download / print ID card
                </button>
                {user.membership_status === "none" && (
                  <Link to="/join" data-testid="dashboard-become-member" className="mt-3 block text-center text-xs text-clay underline underline-offset-4">
                    Not a member yet — register here
                  </Link>
                )}
              </Reveal>

              <Reveal>
                <p className="overline text-clay">Profile & auth</p>
                <div className="mt-6 border border-line p-7" data-testid="profile-card">
                  <div className="flex items-center gap-4">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="h-14 w-14 object-cover" />
                    ) : (
                      <span className="grid h-14 w-14 place-items-center bg-sage serif text-2xl text-forest">
                        {user.name[0]}
                      </span>
                    )}
                    <div>
                      <p className="serif text-xl tracking-tight">{user.name}</p>
                      <p className="text-xs text-ink/50">{user.email}</p>
                    </div>
                  </div>
                  <div className="mt-7 space-y-3 border-t border-line pt-5 text-sm">
                    <p className="flex items-center justify-between">
                      <span className="text-ink/50">Signed in via</span>
                      <span className="flex items-center gap-2 font-semibold capitalize" data-testid="auth-method">
                        <ShieldCheck size={14} className="text-forest" /> {user.auth_method}
                      </span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-ink/50">Phone</span>
                      <span>{user.phone || "Not linked"}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-ink/50">Role</span>
                      <span className="capitalize">{user.role}</span>
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>

            <div className="space-y-14">
              <Reveal>
                <p className="overline text-clay">Notification preferences</p>
                <div className="mt-6" data-testid="prefs-card">
                  <Toggle
                    on={user.notify_email}
                    onChange={(v) => savePrefs({ notify_email: v })}
                    label="Programme updates by email"
                    note="Quarterly impact briefings and campaign milestones."
                    testid="pref-email"
                  />
                  <Toggle
                    on={user.notify_events}
                    onChange={(v) => savePrefs({ notify_events: v })}
                    label="Event & drive reminders"
                    note="Reminders for events you have RSVP'd to."
                    testid="pref-events"
                  />
                  <Toggle
                    on={user.notify_newsletter}
                    onChange={(v) => savePrefs({ notify_newsletter: v })}
                    label="Journal alerts"
                    note="An email whenever we publish a new field note."
                    testid="pref-newsletter"
                  />
                </div>
              </Reveal>

              <Reveal>
                <p className="overline text-clay">80G tax receipt archive</p>
                {receipts.length === 0 ? (
                  <div className="mt-6 border border-line p-8" data-testid="receipts-card">
                    <FileText size={22} className="text-forest" />
                    <p className="mt-5 serif text-2xl tracking-tight">No receipts yet.</p>
                    <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink/60">
                      Every donation and membership fee generates an 80G receipt here under {COMPLIANCE[3].value},
                      downloadable as a PDF any time.
                    </p>
                    <Link to="/campaigns" data-testid="receipts-donate-link" className="mt-6 inline-block text-sm text-clay underline underline-offset-4">
                      View active campaigns
                    </Link>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4" data-testid="receipts-card">
                    {receipts.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 border border-line p-6" data-testid={`receipt-row-${r.id}`}>
                        <div>
                          <p className="overline text-clay">{r.receipt_no}</p>
                          <p className="mt-2 serif text-2xl tracking-tight">{inr(r.amount / 100)}</p>
                          <p className="mt-1 text-xs text-ink/50">
                            {r.purpose_label} •{" "}
                            {new Date(r.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                            {r.simulated && " • simulated payment"}
                          </p>
                        </div>
                        <button
                          onClick={() => downloadReceipt(r)}
                          data-testid={`receipt-download-${r.id}`}
                          className="inline-flex items-center gap-2 border border-forest px-5 py-3 text-sm text-forest transition-colors hover:bg-forest hover:text-sand"
                        >
                          <Download size={14} /> PDF
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Reveal>

              <Reveal>
                <p className="overline text-clay">Your RSVPs</p>
                {rsvps.length === 0 ? (
                  <p className="mt-6 border border-line p-8 text-sm text-ink/55" data-testid="rsvps-list">
                    You haven't RSVP'd to anything yet.{" "}
                    <Link to="/events" className="text-forest underline underline-offset-4">
                      Browse events
                    </Link>
                  </p>
                ) : (
                  <Stagger className="mt-6 space-y-4" data-testid="rsvps-list">
                    {rsvps.map((e) => (
                      <StaggerItem key={e.id}>
                        <div className="flex flex-wrap items-center justify-between gap-4 border border-line p-6">
                          <div>
                            <p className="serif text-xl tracking-tight">{e.title}</p>
                            <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink/50">
                              <span className="flex items-center gap-2">
                                <Calendar size={12} />
                                {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} • {e.time}
                              </span>
                              <span className="flex items-center gap-2">
                                <MapPin size={12} /> {e.location}
                              </span>
                            </p>
                          </div>
                          <span className="overline bg-forest px-3 py-1.5 text-sand">Confirmed</span>
                        </div>
                      </StaggerItem>
                    ))}
                  </Stagger>
                )}
              </Reveal>

              <Reveal>
                <p className="overline text-clay">Your Helpmate reports</p>
                {issues.length === 0 ? (
                  <p className="mt-6 border border-line p-8 text-sm text-ink/55" data-testid="my-issues-list">
                    No reports filed from this account.{" "}
                    <Link to="/report-issue" className="text-forest underline underline-offset-4">
                      Report an issue
                    </Link>
                  </p>
                ) : (
                  <div className="mt-6 space-y-4" data-testid="my-issues-list">
                    {issues.map((it) => (
                      <div key={it.id} className="flex flex-wrap items-center justify-between gap-4 border border-line p-6">
                        <div>
                          <p className="overline text-ink/45">
                            {it.ref} • {it.category}
                          </p>
                          <p className="mt-2 serif text-xl tracking-tight">{it.title}</p>
                        </div>
                        <span className="overline border border-forest px-3 py-1.5 text-forest">{it.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Reveal>

              <Reveal>
                <div className="flex items-start gap-4 bg-sage/50 p-7">
                  <Bell size={18} className="mt-0.5 shrink-0 text-forest" />
                  <p className="text-sm leading-relaxed text-ink/70">
                    Automated email delivery of these alerts switches on once an email provider is connected. Your
                    preferences above are saved and will be applied then.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
