import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, MapPin, Plus, Trash2, X } from "lucide-react";
import { api, inr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const TABS = ["Overview", "Issues", "Blog", "Events", "Campaigns", "Volunteers", "Members"];
const inputCls =
  "w-full border border-line bg-sand px-3.5 py-3 text-sm outline-none transition-colors placeholder:text-ink/35 focus:border-forest";

const Panel = ({ title, action, children, testid }) => (
  <section className="border border-line bg-sand" data-testid={testid}>
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-4">
      <h2 className="serif text-xl tracking-tight">{title}</h2>
      {action}
    </div>
    <div className="p-6">{children}</div>
  </section>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/60 p-4 py-16 backdrop-blur-sm">
    <div className="w-full max-w-2xl bg-sand shadow-warmlg" data-testid="admin-modal">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h3 className="serif text-xl tracking-tight">{title}</h3>
        <button onClick={onClose} aria-label="Close" data-testid="admin-modal-close" className="text-ink/45 hover:text-clay">
          <X size={18} />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const emptyPost = { title: "", category: "Afforestation", excerpt: "", body: "", tags: "", cover: "", published: true };
const emptyEvent = { title: "", date: "", time: "", location: "", district: "", kind: "Seminar", description: "", capacity: 100, cover: "" };

export default function Admin() {
  const { user, loading, login } = useAuth();
  const [tab, setTab] = useState("Overview");
  const [summary, setSummary] = useState(null);
  const [issues, setIssues] = useState([]);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [members, setMembers] = useState([]);
  const [postForm, setPostForm] = useState(null);
  const [eventForm, setEventForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = user?.role === "admin";

  const loadAll = async () => {
    try {
      const [s, i, b, e, c, v, m] = await Promise.all([
        api.get("/admin/summary"),
        api.get("/admin/issues"),
        api.get("/admin/blog"),
        api.get("/events"),
        api.get("/campaigns"),
        api.get("/admin/volunteers"),
        api.get("/admin/members"),
      ]);
      setSummary(s.data);
      setIssues(i.data);
      setPosts(b.data);
      setEvents(e.data);
      setCampaigns(c.data);
      setVolunteers(v.data);
      setMembers(m.data);
    } catch {
      /* handled by gate */
    }
  };

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  const savePost = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      ...postForm,
      tags: typeof postForm.tags === "string" ? postForm.tags.split(",").map((t) => t.trim()).filter(Boolean) : postForm.tags,
    };
    try {
      if (postForm.id) await api.put(`/admin/blog/${postForm.id}`, payload);
      else await api.post("/admin/blog", payload);
      toast.success(postForm.id ? "Post updated" : "Post published");
      setPostForm(null);
      loadAll();
    } catch {
      toast.error("Could not save the post");
    } finally {
      setBusy(false);
    }
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...eventForm, capacity: Number(eventForm.capacity) };
      delete payload.id;
      delete payload.rsvp_count;
      delete payload.is_rsvped;
      delete payload.created_at;
      if (eventForm.id) await api.put(`/admin/events/${eventForm.id}`, payload);
      else await api.post("/admin/events", payload);
      toast.success(eventForm.id ? "Event updated" : "Event created");
      setEventForm(null);
      loadAll();
    } catch {
      toast.error("Could not save the event");
    } finally {
      setBusy(false);
    }
  };

  const setIssueStatus = async (id, status) => {
    try {
      await api.patch(`/admin/issues/${id}?status=${status}`);
      toast.success(`Marked ${status}`);
      loadAll();
    } catch {
      toast.error("Could not update status");
    }
  };

  const updateCampaign = async (c, field, value) => {
    try {
      await api.patch(`/admin/campaigns/${c.id}`, { [field]: Number(value) });
      toast.success("Campaign updated");
      loadAll();
    } catch {
      toast.error("Could not update campaign");
    }
  };

  if (loading) return <div className="min-h-screen bg-sand" />;

  if (!user)
    return (
      <div className="mx-auto max-w-[560px] px-6 pt-48 pb-32" data-testid="admin-signin">
        <p className="overline text-clay">Admin</p>
        <h1 className="mt-5 serif text-4xl tracking-tight">Sign in to continue.</h1>
        <button onClick={login} data-testid="admin-login-btn" className="mt-8 bg-forest px-8 py-4 text-sm text-sand">
          Continue with Google
        </button>
      </div>
    );

  if (!isAdmin)
    return (
      <div className="mx-auto max-w-[560px] px-6 pt-48 pb-32" data-testid="admin-denied">
        <p className="overline text-clay">Restricted</p>
        <h1 className="mt-5 serif text-4xl tracking-tight">You don't have admin access.</h1>
        <p className="mt-5 text-sm text-ink/65">
          This panel is limited to Parivartan staff accounts. Signed in as {user.email}.
        </p>
        <Link to="/dashboard" className="mt-8 inline-block text-sm text-forest underline underline-offset-4">
          Go to your dashboard
        </Link>
      </div>
    );

  return (
    <>
      <header className="relative overflow-hidden bg-ink text-sand grain">
        <div className="mx-auto max-w-[1500px] px-6 pt-36 pb-14 md:pt-44">
          <p className="overline text-sage/70">Content management</p>
          <h1 className="mt-5 text-4xl tracking-tighter md:text-5xl">Parivartan Admin</h1>
          <p className="mt-4 text-sm text-sand/55">{user.email}</p>
        </div>
      </header>

      <div className="sticky top-[76px] z-30 border-b border-line bg-sand/90 backdrop-blur-xl">
        <div className="no-scrollbar mx-auto flex max-w-[1500px] gap-2 overflow-x-auto px-6 py-4">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-testid={`admin-tab-${t.toLowerCase()}`}
              className={`whitespace-nowrap border px-5 py-2.5 text-xs transition-colors duration-300 ${
                tab === t ? "border-forest bg-forest text-sand" : "border-line text-ink/60 hover:border-forest/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="bg-sage/25">
        <div className="mx-auto max-w-[1500px] space-y-8 px-6 py-14">
          {tab === "Overview" && summary && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" data-testid="admin-overview">
              {[
                ["Reports", summary.issues, `${summary.issues_open} open`, "issues"],
                ["Volunteers", summary.volunteers, "applications", "volunteers"],
                ["Membership", summary.members, "applications", "members"],
                ["Articles", summary.posts, "published", "posts"],
                ["Events", summary.events, `${summary.rsvps} RSVPs`, "events"],
                ["Subscribers", summary.subscribers, "email alerts on", "subscribers"],
                ["Registered users", summary.users, "accounts", "users"],
              ].map(([label, value, note, key]) => (
                <div key={label} className="border border-line bg-sand p-6" data-testid={`kpi-${key}`}>
                  <p className="overline text-ink/45">{label}</p>
                  <p className="mt-4 serif text-5xl tracking-tight text-forest">{value}</p>
                  <p className="mt-2 text-xs text-ink/45">{note}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "Issues" && (
            <Panel title={`Community Helpmate reports (${issues.length})`} testid="admin-issues">
              {issues.length === 0 && <p className="text-sm text-ink/50">No reports yet.</p>}
              <div className="space-y-4">
                {issues.map((it) => (
                  <div key={it.id} className="border border-line p-5" data-testid={`admin-issue-${it.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="overline text-clay">
                          {it.ref} • {it.category}
                        </p>
                        <p className="mt-2 serif text-xl tracking-tight">{it.title}</p>
                        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/65">{it.description}</p>
                        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink/45">
                          <span>{it.reporter_name}</span>
                          {it.reporter_phone && <span>{it.reporter_phone}</span>}
                          {(it.village || it.district) && <span>{[it.village, it.district].filter(Boolean).join(", ")}</span>}
                          {it.latitude && (
                            <a
                              href={`https://www.google.com/maps?q=${it.latitude},${it.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-forest underline underline-offset-4"
                            >
                              <MapPin size={11} /> {it.latitude.toFixed(4)}, {it.longitude.toFixed(4)}
                            </a>
                          )}
                          <span>{new Date(it.created_at).toLocaleString("en-IN")}</span>
                        </p>
                        {it.photo_path && (
                          <a
                            href={`${api.defaults.baseURL}/files/${it.photo_path}`}
                            target="_blank"
                            rel="noreferrer"
                            data-testid={`admin-issue-photo-${it.id}`}
                            className="mt-3 inline-block text-xs text-clay underline underline-offset-4"
                          >
                            View attached photo
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {["received", "in review", "action taken", "resolved"].map((s) => (
                          <button
                            key={s}
                            onClick={() => setIssueStatus(it.id, s)}
                            data-testid={`issue-status-${s.replace(" ", "-")}-${it.id}`}
                            className={`border px-3 py-1.5 text-xs transition-colors ${
                              it.status === s ? "border-forest bg-forest text-sand" : "border-line text-ink/55 hover:border-forest/60"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "Blog" && (
            <Panel
              title={`Articles (${posts.length})`}
              testid="admin-blog"
              action={
                <button
                  onClick={() => setPostForm({ ...emptyPost })}
                  data-testid="admin-new-post"
                  className="inline-flex items-center gap-2 bg-forest px-5 py-2.5 text-xs text-sand"
                >
                  <Plus size={14} /> New article
                </button>
              }
            >
              <div className="space-y-3">
                {posts.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 border border-line p-5" data-testid={`admin-post-${p.slug}`}>
                    <div>
                      <p className="overline text-clay">
                        {p.category} • {p.published ? "published" : "draft"}
                      </p>
                      <p className="mt-2 serif text-xl tracking-tight">{p.title}</p>
                      <p className="mt-1 text-xs text-ink/45">/blog/{p.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPostForm({ ...p, tags: (p.tags || []).join(", ") })}
                        data-testid={`admin-edit-post-${p.slug}`}
                        className="border border-line px-4 py-2 text-xs hover:border-forest"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          await api.delete(`/admin/blog/${p.id}`);
                          toast.success("Post deleted");
                          loadAll();
                        }}
                        data-testid={`admin-delete-post-${p.slug}`}
                        aria-label="Delete post"
                        className="border border-line px-3 py-2 text-ink/45 hover:border-clay hover:text-clay"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "Events" && (
            <Panel
              title={`Events (${events.length})`}
              testid="admin-events"
              action={
                <button
                  onClick={() => setEventForm({ ...emptyEvent })}
                  data-testid="admin-new-event"
                  className="inline-flex items-center gap-2 bg-forest px-5 py-2.5 text-xs text-sand"
                >
                  <Plus size={14} /> New event
                </button>
              }
            >
              <div className="space-y-3">
                {events.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-4 border border-line p-5" data-testid={`admin-event-${e.id}`}>
                    <div>
                      <p className="overline text-clay">
                        {e.kind} • {e.date} {e.time}
                      </p>
                      <p className="mt-2 serif text-xl tracking-tight">{e.title}</p>
                      <p className="mt-1 text-xs text-ink/45">
                        {e.location} • {e.rsvp_count ?? 0}/{e.capacity} RSVPs
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEventForm({ ...e })} data-testid={`admin-edit-event-${e.id}`} className="border border-line px-4 py-2 text-xs hover:border-forest">
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          await api.delete(`/admin/events/${e.id}`);
                          toast.success("Event deleted");
                          loadAll();
                        }}
                        data-testid={`admin-delete-event-${e.id}`}
                        aria-label="Delete event"
                        className="border border-line px-3 py-2 text-ink/45 hover:border-clay hover:text-clay"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "Campaigns" && (
            <Panel title="Campaign progress" testid="admin-campaigns">
              <div className="space-y-4">
                {campaigns.map((c) => (
                  <div key={c.id} className="border border-line p-5" data-testid={`admin-campaign-${c.id}`}>
                    <p className="overline text-clay">{c.code}</p>
                    <p className="mt-2 serif text-xl tracking-tight">{c.title}</p>
                    <p className="mt-1 text-xs text-ink/45">
                      {inr(c.raised)} of {inr(c.goal)} • {c.trees_planted} trees planted
                    </p>
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      {[
                        ["Amount raised (₹)", "raised", c.raised],
                        ["Goal (₹)", "goal", c.goal],
                        ["Trees planted", "trees_planted", c.trees_planted],
                      ].map(([label, field, value]) => (
                        <label key={field} className="block">
                          <span className="overline text-ink/45">{label}</span>
                          <input
                            type="number"
                            defaultValue={value}
                            data-testid={`campaign-${field}-${c.id}`}
                            onBlur={(ev) => Number(ev.target.value) !== value && updateCampaign(c, field, ev.target.value)}
                            className={`${inputCls} mt-2`}
                          />
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-ink/40">Values save when you click outside the field.</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "Volunteers" && (
            <Panel title={`Volunteer applications (${volunteers.length})`} testid="admin-volunteers">
              {volunteers.length === 0 && <p className="text-sm text-ink/50">No applications yet.</p>}
              <div className="space-y-3">
                {volunteers.map((v) => (
                  <div key={v.id} className="border border-line p-5 text-sm" data-testid={`admin-volunteer-${v.id}`}>
                    <p className="serif text-xl tracking-tight">{v.name}</p>
                    <p className="mt-2 text-xs text-ink/50">
                      {v.email} • {v.phone} • {v.city}
                    </p>
                    <p className="mt-3 text-sm text-ink/70">
                      <span className="text-ink/45">Interest:</span> {v.interest_area} • <span className="text-ink/45">Availability:</span> {v.availability}
                    </p>
                    <p className="mt-2 text-sm text-ink/70">
                      <span className="text-ink/45">Skills:</span> {v.skills}
                    </p>
                    {v.message && <p className="mt-2 text-sm italic text-ink/60">"{v.message}"</p>}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "Members" && (
            <Panel title={`Membership applications (${members.length})`} testid="admin-members">
              {members.length === 0 && <p className="text-sm text-ink/50">No applications yet.</p>}
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-4 border border-line p-5" data-testid={`admin-member-${m.id}`}>
                    <div>
                      <p className="overline text-clay">
                        {m.membership_no} • {m.tier}
                      </p>
                      <p className="mt-2 serif text-xl tracking-tight">{m.name}</p>
                      <p className="mt-1 text-xs text-ink/50">
                        {m.email} • {m.phone} • {m.city}
                      </p>
                    </div>
                    <span className="overline border border-clay px-3 py-1.5 text-clay">{m.payment_status}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </main>

      {postForm && (
        <Modal title={postForm.id ? "Edit article" : "New article"} onClose={() => setPostForm(null)}>
          <form onSubmit={savePost} className="grid gap-5">
            <input required value={postForm.title} onChange={(e) => setPostForm({ ...postForm, title: e.target.value })} placeholder="Title" className={inputCls} data-testid="post-title" />
            <div className="grid gap-5 sm:grid-cols-2">
              <select value={postForm.category} onChange={(e) => setPostForm({ ...postForm, category: e.target.value })} className={inputCls} data-testid="post-category">
                {["Afforestation", "Women's Empowerment", "Child Education", "Health", "Transparency", "Community"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input value={postForm.tags} onChange={(e) => setPostForm({ ...postForm, tags: e.target.value })} placeholder="Tags, comma separated" className={inputCls} data-testid="post-tags" />
            </div>
            <input value={postForm.cover || ""} onChange={(e) => setPostForm({ ...postForm, cover: e.target.value })} placeholder="Cover image URL" className={inputCls} data-testid="post-cover" />
            <textarea required rows={2} value={postForm.excerpt} onChange={(e) => setPostForm({ ...postForm, excerpt: e.target.value })} placeholder="Short excerpt" className={inputCls} data-testid="post-excerpt" />
            <textarea required rows={9} value={postForm.body} onChange={(e) => setPostForm({ ...postForm, body: e.target.value })} placeholder="Body — separate paragraphs with a blank line" className={inputCls} data-testid="post-body" />
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={postForm.published} onChange={(e) => setPostForm({ ...postForm, published: e.target.checked })} data-testid="post-published" />
              Published
            </label>
            <button type="submit" disabled={busy} data-testid="post-save" className="inline-flex items-center justify-center gap-3 bg-forest px-7 py-3.5 text-sm text-sand disabled:opacity-60">
              {busy && <Loader2 size={15} className="animate-spin" />} Save article
            </button>
          </form>
        </Modal>
      )}

      {eventForm && (
        <Modal title={eventForm.id ? "Edit event" : "New event"} onClose={() => setEventForm(null)}>
          <form onSubmit={saveEvent} className="grid gap-5">
            <input required value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Event title" className={inputCls} data-testid="event-title" />
            <div className="grid gap-5 sm:grid-cols-3">
              <input required type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className={inputCls} data-testid="event-date" />
              <input value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} placeholder="10:30 AM" className={inputCls} data-testid="event-time" />
              <input type="number" value={eventForm.capacity} onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })} placeholder="Capacity" className={inputCls} data-testid="event-capacity" />
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <input required value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} placeholder="Venue" className={inputCls} data-testid="event-location" />
              <input value={eventForm.district} onChange={(e) => setEventForm({ ...eventForm, district: e.target.value })} placeholder="District" className={inputCls} data-testid="event-district" />
              <select value={eventForm.kind} onChange={(e) => setEventForm({ ...eventForm, kind: e.target.value })} className={inputCls} data-testid="event-kind">
                {["Seminar", "Plantation Drive", "Skill Camp", "Health Camp", "Workshop"].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
            <input value={eventForm.cover || ""} onChange={(e) => setEventForm({ ...eventForm, cover: e.target.value })} placeholder="Cover image URL" className={inputCls} data-testid="event-cover" />
            <textarea required rows={4} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Description" className={inputCls} data-testid="event-description" />
            <button type="submit" disabled={busy} data-testid="event-save" className="inline-flex items-center justify-center gap-3 bg-forest px-7 py-3.5 text-sm text-sand disabled:opacity-60">
              {busy && <Loader2 size={15} className="animate-spin" />} Save event
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
