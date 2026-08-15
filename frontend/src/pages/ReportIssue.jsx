import { useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Crosshair, ImageUp, Loader2, ShieldCheck, X } from "lucide-react";
import { PageHeader, Reveal } from "@/components/Motion";
import { api } from "@/lib/api";
import { ISSUE_CATEGORIES } from "@/data/content";

const inputCls =
  "w-full border-b border-line bg-transparent px-0 py-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-forest";

export default function ReportIssue() {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState(null);
  const [geo, setGeo] = useState(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    category: ISSUE_CATEGORIES[0],
    title: "",
    description: "",
    village: "",
    district: "",
    reporter_name: "",
    reporter_phone: "",
  });

  const locate = () => {
    if (!navigator.geolocation) return toast.error("Geolocation is not supported on this device.");
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) });
        setGeoBusy(false);
        toast.success("Location attached to this report.");
      },
      () => {
        setGeoBusy(false);
        toast.error("Could not get your location. You can still describe the place below.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (geo) {
        fd.append("latitude", geo.lat);
        fd.append("longitude", geo.lng);
      }
      if (file) fd.append("photo", file);
      const { data } = await api.post("/issues", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setRef(data.ref);
      toast.success(`Report filed — ${data.ref}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not file the report. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const pick = (f) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return toast.error("File too large. Maximum 10 MB.");
    setFile(f);
  };

  return (
    <>
      <PageHeader
        testid="report-header"
        overline="Community Helpmate"
        title="See something wrong? Put it on our map."
        sub="Report a women's safety or hygiene concern, a child kept out of school, or an environmental hazard. Attach a photo and your location so our field team can find it."
      />

      <section className="bg-sage/40">
        <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
          <div className="grid gap-14 lg:grid-cols-[0.75fr_1.25fr]">
            <Reveal>
              <p className="overline text-clay">How it works</p>
              <ol className="mt-8 space-y-8">
                {[
                  ["Submit", "Pick a category, describe what you saw, attach a photo and tag the location."],
                  ["Reference", "You get a reference number instantly — quote it when you follow up."],
                  ["Field visit", "Our coordinator verifies geotagged reports and schedules a site visit."],
                  ["Resolution", "Status moves from received → in review → action taken → resolved."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-5 border-t border-forest/15 pt-5">
                    <span className="serif text-2xl text-forest/40">0{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{t}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink/65">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-10 flex items-start gap-3 text-xs leading-relaxed text-ink/55">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-forest" />
                You may report anonymously. Contact details are optional and are only used to follow up with you.
              </p>
            </Reveal>

            {ref ? (
              <Reveal>
                <div className="bg-sand p-12 text-center" data-testid="issue-success">
                  <Check size={30} className="mx-auto text-forest" />
                  <h2 className="mt-6 serif text-3xl tracking-tight">Report filed.</h2>
                  <p className="mt-4 text-sm text-ink/65">Your reference number is</p>
                  <p className="mt-3 serif text-4xl tracking-tight text-clay" data-testid="issue-ref">{ref}</p>
                  <button
                    onClick={() => {
                      setRef(null);
                      setFile(null);
                      setGeo(null);
                      setForm({ ...form, title: "", description: "" });
                    }}
                    data-testid="issue-another"
                    className="mt-10 text-sm text-forest underline underline-offset-4"
                  >
                    File another report
                  </button>
                </div>
              </Reveal>
            ) : (
              <Reveal>
                <form onSubmit={submit} className="bg-sand p-8 md:p-12" data-testid="issue-form">
                  <p className="overline text-ink/50">Category *</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {ISSUE_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, category: c })}
                        data-testid={`issue-cat-${c.split(" ")[0].toLowerCase()}`}
                        className={`border px-5 py-2.5 text-sm transition-colors duration-300 ${
                          form.category === c ? "border-forest bg-forest text-sand" : "border-line text-ink/70 hover:border-forest/50"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <div className="mt-10 grid gap-8 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <p className="overline text-ink/50">Short title *</p>
                      <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="e.g. Industrial waste dumped near the canal" data-testid="issue-title" />
                    </div>
                    <div className="md:col-span-2">
                      <p className="overline text-ink/50">What did you see? *</p>
                      <textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="Describe the issue, when you noticed it, and who is affected" data-testid="issue-description" />
                    </div>
                    <div>
                      <p className="overline text-ink/50">Village / Locality</p>
                      <input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} className={inputCls} placeholder="Missarwala" data-testid="issue-village" />
                    </div>
                    <div>
                      <p className="overline text-ink/50">District</p>
                      <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className={inputCls} placeholder="Udham Singh Nagar" data-testid="issue-district" />
                    </div>
                    <div>
                      <p className="overline text-ink/50">Your name (optional)</p>
                      <input value={form.reporter_name} onChange={(e) => setForm({ ...form, reporter_name: e.target.value })} className={inputCls} placeholder="Leave blank to stay anonymous" data-testid="issue-reporter-name" />
                    </div>
                    <div>
                      <p className="overline text-ink/50">Your phone (optional)</p>
                      <input value={form.reporter_phone} onChange={(e) => setForm({ ...form, reporter_phone: e.target.value })} className={inputCls} placeholder="For follow-up only" data-testid="issue-reporter-phone" />
                    </div>
                  </div>

                  <div className="mt-12 grid gap-6 md:grid-cols-2">
                    <div className="border border-dashed border-line p-6">
                      <p className="overline text-ink/50">Photo / document</p>
                      <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={(e) => pick(e.target.files?.[0])} className="hidden" data-testid="issue-file-input" />
                      {file ? (
                        <div className="mt-4 flex items-center justify-between gap-4">
                          <span className="truncate text-sm text-ink/75">{file.name}</span>
                          <button type="button" onClick={() => setFile(null)} aria-label="Remove file" data-testid="issue-file-remove" className="text-ink/40 hover:text-clay">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          data-testid="issue-file-btn"
                          className="mt-4 inline-flex items-center gap-3 border border-forest px-5 py-2.5 text-sm text-forest transition-colors hover:bg-forest hover:text-sand"
                        >
                          <ImageUp size={15} /> Attach a photo
                        </button>
                      )}
                      <p className="mt-3 text-xs text-ink/45">JPG, PNG, WEBP or PDF up to 10 MB.</p>
                    </div>

                    <div className="border border-dashed border-line p-6">
                      <p className="overline text-ink/50">Geotag</p>
                      {geo ? (
                        <div className="mt-4">
                          <p className="serif text-xl text-forest" data-testid="issue-geo-value">
                            {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
                          </p>
                          <p className="mt-1 text-xs text-ink/45">Accuracy ±{geo.acc} m</p>
                          <button type="button" onClick={() => setGeo(null)} data-testid="issue-geo-clear" className="mt-3 text-xs text-clay underline underline-offset-4">
                            Remove location
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={locate}
                          disabled={geoBusy}
                          data-testid="issue-geo-btn"
                          className="mt-4 inline-flex items-center gap-3 border border-forest px-5 py-2.5 text-sm text-forest transition-colors hover:bg-forest hover:text-sand disabled:opacity-60"
                        >
                          {geoBusy ? <Loader2 size={15} className="animate-spin" /> : <Crosshair size={15} />}
                          Use my current location
                        </button>
                      )}
                      <p className="mt-3 text-xs text-ink/45">Coordinates make field verification far faster.</p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    data-testid="issue-submit"
                    className="mt-12 inline-flex items-center gap-3 bg-forest px-8 py-4 text-sm text-sand transition-transform duration-300 hover:-translate-y-1 disabled:opacity-60"
                  >
                    {busy && <Loader2 size={15} className="animate-spin" />}
                    Submit report
                  </button>
                </form>
              </Reveal>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
