import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Phone, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";

const inputCls =
  "w-full border border-sand/30 bg-transparent px-4 py-3.5 text-sm text-sand outline-none transition-colors placeholder:text-sand/35 focus:border-clay";

export const AuthModal = ({ open, onClose }) => {
  const { login, setUser } = useAuth();
  const [step, setStep] = useState("choose");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep("choose");
    setPhone("");
    setCode("");
    setDevCode(null);
  };

  const sendOtp = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/phone/request-otp", { phone });
      setDevCode(data.dev_code);
      setStep("otp");
      toast.success(data.sms_live ? `OTP sent to ${data.phone}` : "Development OTP ready");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not send the OTP");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/phone/verify", { phone, code, name });
      setUser(data);
      toast.success(`Welcome, ${data.name}`);
      onClose();
      reset();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not verify the OTP");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/75 p-4 backdrop-blur-sm"
          data-testid="auth-modal"
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md overflow-hidden bg-forest p-8 text-sand grain"
          >
            <button onClick={onClose} aria-label="Close" data-testid="auth-close" className="absolute right-6 top-6 text-sand/50 hover:text-clay">
              <X size={18} />
            </button>

            <Logo dark size={46} />

            {step === "choose" && (
              <>
                <h3 className="mt-8 serif text-3xl tracking-tight">Sign in to Parivartan.</h3>
                <p className="mt-3 text-sm leading-relaxed text-sand/65">
                  Needed to RSVP to drives, keep your membership ID and download 80G receipts.
                </p>
                <button
                  onClick={login}
                  data-testid="auth-google-btn"
                  className="mt-8 flex w-full items-center justify-center gap-3 bg-sand px-6 py-4 text-sm text-ink transition-transform duration-300 hover:-translate-y-1"
                >
                  Continue with Google
                </button>
                <button
                  onClick={() => setStep("phone")}
                  data-testid="auth-phone-btn"
                  className="mt-4 flex w-full items-center justify-center gap-3 border border-sand/35 px-6 py-4 text-sm text-sand transition-colors hover:bg-sand/10"
                >
                  <Phone size={15} /> Continue with phone number
                </button>
              </>
            )}

            {step === "phone" && (
              <form onSubmit={sendOtp}>
                <button type="button" onClick={() => setStep("choose")} data-testid="auth-back" className="mt-8 flex items-center gap-2 text-xs text-sand/55 hover:text-sand">
                  <ArrowLeft size={13} /> Back
                </button>
                <h3 className="mt-5 serif text-3xl tracking-tight">Your mobile number.</h3>
                <p className="mt-3 text-sm text-sand/65">We'll send a 6-digit code to verify it.</p>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                  className={`${inputCls} mt-7`}
                  data-testid="auth-phone-input"
                />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  className={`${inputCls} mt-4`}
                  data-testid="auth-name-input"
                />
                <button
                  type="submit"
                  disabled={busy}
                  data-testid="auth-send-otp"
                  className="mt-7 flex w-full items-center justify-center gap-3 bg-clay px-6 py-4 text-sm text-white transition-transform duration-300 hover:-translate-y-1 disabled:opacity-60"
                >
                  {busy && <Loader2 size={15} className="animate-spin" />} Send OTP
                </button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={verify}>
                <button type="button" onClick={() => setStep("phone")} data-testid="auth-back-phone" className="mt-8 flex items-center gap-2 text-xs text-sand/55 hover:text-sand">
                  <ArrowLeft size={13} /> Change number
                </button>
                <h3 className="mt-5 serif text-3xl tracking-tight">Enter the code.</h3>
                <p className="mt-3 text-sm text-sand/65">Sent to {phone}. Valid for 5 minutes.</p>
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  maxLength={6}
                  className={`${inputCls} mt-7 tracking-[0.5em] text-center serif text-2xl`}
                  data-testid="auth-otp-input"
                />
                {devCode && (
                  <p className="mt-4 border border-clay/50 bg-clay/15 p-4 text-xs leading-relaxed text-sand/80" data-testid="auth-dev-code">
                    SMS is not connected yet — use the development code <strong className="tracking-widest">{devCode}</strong>. Real
                    OTP delivery switches on when an SMS provider is added.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  data-testid="auth-verify-otp"
                  className="mt-6 flex w-full items-center justify-center gap-3 bg-clay px-6 py-4 text-sm text-white transition-transform duration-300 hover:-translate-y-1 disabled:opacity-60"
                >
                  {busy && <Loader2 size={15} className="animate-spin" />} Verify & sign in
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
