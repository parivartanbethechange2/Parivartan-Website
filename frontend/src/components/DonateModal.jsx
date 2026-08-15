import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Download, Loader2, ShieldCheck, X } from "lucide-react";
import { api, inr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const inputCls =
  "w-full border border-line bg-sand px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink/35 focus:border-forest";

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

/** Donation + membership checkout. Works in simulated mode until Razorpay keys are added. */
export const DonateModal = ({ open, onClose, campaign, membershipTier }) => {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [amount, setAmount] = useState(100000);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [form, setForm] = useState({ donor_name: "", donor_email: "", donor_phone: "", donor_pan: "", city: "" });

  const isMembership = Boolean(membershipTier);

  useEffect(() => {
    if (!open) return;
    api.get("/payments/config").then((r) => setConfig(r.data)).catch(() => {});
    setReceipt(null);
    setForm((f) => ({
      ...f,
      donor_name: user?.name || f.donor_name,
      donor_email: user?.email?.includes("@phone.") ? "" : user?.email || f.donor_email,
      donor_phone: user?.phone || f.donor_phone,
    }));
  }, [open, user]);

  useEffect(() => {
    if (config && isMembership) setAmount(config.membership_fees[membershipTier.id]);
  }, [config, isMembership, membershipTier]);

  const finalAmount = isMembership ? amount : custom ? Math.round(Number(custom) * 100) : amount;

  const submit = async (e) => {
    e.preventDefault();
    if (!isMembership && (finalAmount < config.min_amount || finalAmount > config.max_amount)) {
      return toast.error(`Enter an amount between ₹${config.min_amount / 100} and ₹${config.max_amount / 100}`);
    }
    setBusy(true);
    try {
      const { data } = isMembership
        ? await api.post("/membership/checkout", { tier: membershipTier.id, ...form })
        : await api.post("/donations/create", { amount: finalAmount, campaign_id: campaign?.id, ...form });

      if (data.provider === "razorpay") {
        const ok = await loadRazorpay();
        if (!ok) throw new Error("checkout script");
        const rz = new window.Razorpay({
          key: data.key_id,
          amount: data.amount,
          currency: "INR",
          order_id: data.order_id,
          name: "Parivartan 'Be The Change'",
          description: isMembership ? `${membershipTier.name} fee` : campaign?.title || "Donation",
          image: "/logo-512.png",
          prefill: { name: form.donor_name, email: form.donor_email, contact: form.donor_phone },
          theme: { color: "#2C5234" },
          handler: async (res) => {
            const { data: done } = await api.post("/payments/confirm", {
              payment_id: data.payment_id,
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
            });
            setReceipt(done.receipt);
          },
        });
        rz.open();
      } else {
        const { data: done } = await api.post("/payments/confirm", { payment_id: data.payment_id });
        setReceipt(done.receipt);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not start the payment. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const downloadReceipt = async () => {
    if (!user) return toast.info("Sign in to download your 80G receipt from the dashboard.");
    try {
      const res = await api.get(`/receipts/${receipt.id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `80G-${receipt.receipt_no.replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the receipt.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-ink/70 p-4 py-14 backdrop-blur-sm"
          data-testid="donate-modal"
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-lg bg-sand shadow-warmlg"
          >
            <div className="flex items-start justify-between gap-6 border-b border-line px-7 py-5">
              <div>
                <p className="overline text-clay">{isMembership ? "Membership payment" : "Make a donation"}</p>
                <h3 className="mt-2 serif text-2xl tracking-tight">
                  {isMembership ? membershipTier.name : campaign?.title || "General Fund"}
                </h3>
              </div>
              <button onClick={onClose} aria-label="Close" data-testid="donate-close" className="text-ink/40 hover:text-clay">
                <X size={18} />
              </button>
            </div>

            {receipt ? (
              <div className="p-8 text-center" data-testid="donate-success">
                <Check size={30} className="mx-auto text-forest" />
                <h4 className="mt-5 serif text-3xl tracking-tight">Thank you.</h4>
                <p className="mt-3 text-sm text-ink/65">
                  {inr(receipt.amount / 100)} received. Receipt no.{" "}
                  <span className="text-clay" data-testid="receipt-no">{receipt.receipt_no}</span>
                </p>
                {receipt.simulated && (
                  <p className="mt-5 border border-clay/50 bg-clay/10 p-4 text-xs leading-relaxed text-ink/70">
                    This was a <strong>simulated payment</strong> — the Razorpay gateway is not connected yet, so no money
                    moved and this receipt is not a valid tax document.
                  </p>
                )}
                <button
                  onClick={downloadReceipt}
                  data-testid="donate-download-receipt"
                  className="mt-7 inline-flex items-center gap-3 border border-forest px-6 py-3.5 text-sm text-forest transition-colors hover:bg-forest hover:text-sand"
                >
                  <Download size={15} /> Download 80G receipt
                </button>
                <p className="mt-5 text-xs text-ink/45">
                  {user ? "Also saved to your dashboard receipt archive." : "Sign in to keep receipts in your dashboard."}
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="p-7">
                {!isMembership && config && (
                  <>
                    <p className="overline text-ink/50">Choose an amount</p>
                    <div className="mt-4 grid grid-cols-4 gap-3">
                      {config.presets.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setAmount(p);
                            setCustom("");
                          }}
                          data-testid={`donate-preset-${p / 100}`}
                          className={`border py-3 text-sm transition-colors duration-300 ${
                            !custom && amount === p ? "border-forest bg-forest text-sand" : "border-line hover:border-forest/50"
                          }`}
                        >
                          ₹{(p / 100).toLocaleString("en-IN")}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4">
                      <input
                        type="number"
                        min={config.min_amount / 100}
                        max={config.max_amount / 100}
                        value={custom}
                        onChange={(e) => setCustom(e.target.value)}
                        placeholder={`Custom amount (₹${config.min_amount / 100} – ₹${config.max_amount / 100})`}
                        className={inputCls}
                        data-testid="donate-custom-amount"
                      />
                    </div>
                  </>
                )}

                {isMembership && (
                  <p className="border border-line bg-sage/40 p-5 text-sm text-ink/75">
                    {membershipTier.name} — <span className="serif text-2xl text-forest">{membershipTier.fee}</span>{" "}
                    <span className="text-xs text-ink/50">{membershipTier.period}</span>
                  </p>
                )}

                <div className="mt-6 grid gap-4">
                  <input required value={form.donor_name} onChange={(e) => setForm({ ...form, donor_name: e.target.value })} placeholder="Full name *" className={inputCls} data-testid="donate-name" />
                  <input required type="email" value={form.donor_email} onChange={(e) => setForm({ ...form, donor_email: e.target.value })} placeholder="Email *" className={inputCls} data-testid="donate-email" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input required={isMembership} value={form.donor_phone} onChange={(e) => setForm({ ...form, donor_phone: e.target.value })} placeholder={`Phone${isMembership ? " *" : ""}`} className={inputCls} data-testid="donate-phone" />
                    <input value={form.donor_pan} onChange={(e) => setForm({ ...form, donor_pan: e.target.value.toUpperCase() })} placeholder="PAN (for 80G)" className={inputCls} data-testid="donate-pan" />
                  </div>
                  {isMembership && (
                    <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City / District" className={inputCls} data-testid="donate-city" />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={busy || !config}
                  data-testid="donate-submit"
                  className="mt-7 flex w-full items-center justify-center gap-3 bg-clay px-8 py-4 text-sm text-white transition-transform duration-300 hover:-translate-y-1 disabled:opacity-60"
                >
                  {busy && <Loader2 size={15} className="animate-spin" />}
                  {isMembership ? `Pay ${membershipTier.fee}` : `Donate ${inr(finalAmount / 100)}`}
                </button>

                <p className="mt-5 flex items-start gap-3 text-xs leading-relaxed text-ink/50">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-forest" />
                  {config?.live
                    ? "Secure payment via Razorpay. An 80G receipt is generated instantly under 12A/80G No. AAFTP3547EE20231."
                    : "Payment gateway not connected yet — this will run a simulated payment and issue a sample 80G receipt so you can test the full flow."}
                </p>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DonateModal;
