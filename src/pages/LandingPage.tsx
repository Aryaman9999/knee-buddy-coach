import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
    Activity, AlertCircle, CheckCircle2, ChevronRight,
    Heart, Mic, Calendar, Star, ArrowRight, Sparkles, Shield, ChevronDown
} from "lucide-react";

/* ───────── Scroll-reveal hook ───────── */
function useReveal() {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold: 0.12 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return { ref, visible };
}

/* ───────── Animated counter ───────── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
    const [count, setCount] = useState(0);
    const { ref, visible } = useReveal();
    useEffect(() => {
        if (!visible) return;
        let start = 0;
        const steps = 60;
        const step = to / steps;
        const id = setInterval(() => {
            start += step;
            if (start >= to) { setCount(to); clearInterval(id); }
            else setCount(Math.floor(start));
        }, 20);
        return () => clearInterval(id);
    }, [visible, to]);
    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ───────── Reveal wrapper ───────── */
function Reveal({ children, delay = 0, className = "", style = {} }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
    const { ref, visible } = useReveal();
    return (
        <div
            ref={ref}
            className={className}
            style={{
                ...style,
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(40px)",
                transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
            }}
        >
            {children}
        </div>
    );
}

/* ───────── FAQ Component ───────── */
function FAQItem({ question, answer }: { question: string, answer: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "1.2rem 0" }}>
            <button onClick={() => setOpen(!open)} style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "none", border: "none", cursor: "pointer",
                color: "#0f172a", fontWeight: 700, fontSize: "1.1rem", textAlign: "left", padding: 0
            }}>
                {question}
                <ChevronDown style={{ width: 22, height: 22, color: "#64748b", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease" }} />
            </button>
            <div style={{
                maxHeight: open ? "200px" : "0", overflow: "hidden", transition: "max-height 0.35s ease",
                color: "#475569", lineHeight: 1.6, marginTop: open ? "1rem" : "0", paddingRight: "2rem"
            }}>
                {answer}
            </div>
        </div>
    );
}

/* ───────── Voice Coach Demo Component ───────── */
function VoiceCoachDemo() {
    const { ref, visible } = useReveal();
    const [activeBars, setActiveBars] = useState<number[]>([15, 25, 40, 25, 15]);

    useEffect(() => {
        if (!visible) return;
        const interval = setInterval(() => {
            setActiveBars(Array.from({ length: 5 }, () => 15 + Math.random() * 35));
        }, 120);
        return () => clearInterval(interval);
    }, [visible]);

    return (
        <div ref={ref} className="glass-card" style={{
            width: "320px", height: "640px", borderRadius: "36px", padding: "1.2rem",
            boxShadow: "0 24px 64px rgba(0,0,0,0.12), inset 0 4px 12px rgba(255,255,255,0.9)",
            border: "8px solid #0f172a", background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
            position: "relative", overflow: "hidden", display: "flex", flexDirection: "column"
        }}>
            {/* Top notch */}
            <div style={{ width: "110px", height: "26px", background: "#0f172a", borderRadius: "0 0 14px 14px", margin: "-1.2rem auto 2rem", flexShrink: 0 }} />

            <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <div style={{
                    width: 86, height: 86, borderRadius: "50%", background: "linear-gradient(135deg, #1971c2, #38d9a9)",
                    margin: "0 auto 1.5rem", display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 12px 32px rgba(25,113,194,0.35)", position: "relative"
                }}>
                    <Mic style={{ width: 40, height: 40, color: "#fff" }} />
                    <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: "2px solid #38d9a9", animation: "pulse-ring 2s infinite" }} />
                </div>
                <h4 style={{ fontWeight: 800, fontSize: "1.3rem", color: "#0f172a", margin: "0 0 0.6rem" }}>AI Coach</h4>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(56,217,169,0.15)", color: "#0a3d2e", padding: "0.3rem 0.9rem", borderRadius: "50px", fontSize: "0.8rem", fontWeight: 700 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#38d9a9", animation: "pulse 1.5s infinite" }} /> LISTENING
                </div>
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "20px", boxShadow: "0 8px 24px rgba(0,0,0,0.04)" }}>
                    <p style={{ textAlign: "center", color: "#1e293b", fontWeight: 600, fontSize: "1.15rem", margin: 0, lineHeight: 1.5 }}>
                        "Great job! Now slowly bend your knee. Don't push past the pain, take it easy."
                    </p>
                </div>
            </div>

            {/* Voice Wave Animation */}
            <div style={{ height: "90px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "2rem" }}>
                {[...Array(5)].map((_, i) => (
                    <div key={i} style={{
                        width: "10px", borderRadius: "10px", background: "linear-gradient(to top, #1971c2, #38d9a9)",
                        height: `${activeBars[i] || 15}px`, transition: "height 0.12s ease"
                    }} />
                ))}
            </div>
            <style>{`@keyframes pulse { 0% {opacity: 0.3;} 50% {opacity: 1;} 100% {opacity: 0.3;} }`}</style>
        </div>
    );
}

/* ═══════════════ MAIN COMPONENT ═══════════════ */
export default function LandingPage() {
    const navigate = useNavigate();
    const goLogin = () => navigate("/auth", { state: { mode: "login" } });
    const goSignup = () => navigate("/auth", { state: { mode: "signup" } });

    /* floating particle positions (memoised) */
    const particles = useRef(
        Array.from({ length: 18 }, (_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            size: `${6 + Math.random() * 14}px`,
            dur: `${6 + Math.random() * 8}s`,
            delay: `${Math.random() * 6}s`,
        }))
    ).current;

    return (
        <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: "16px", lineHeight: "1.6" }}>

            {/* ─── GLOBAL KEYFRAMES ─── */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.8);opacity:0} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes drift {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: .4; }
          33%  { transform: translateY(-30px) translateX(15px) scale(1.1); opacity: .7; }
          66%  { transform: translateY(-10px) translateX(-15px) scale(.9); opacity: .5; }
          100% { transform: translateY(0) translateX(0) scale(1); opacity: .4; }
        }
        @keyframes gradShift {
          0%  { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100%{ background-position: 0% 50%; }
        }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes bounce-x { 0%,100%{transform:translateX(0)} 50%{transform:translateX(5px)} }

        .shimmer-text {
          background: linear-gradient(90deg,#38d9a9,#4dabf7,#a9e34b,#38d9a9);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .glass {
          background: rgba(255,255,255,0.07);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.15);
        }
        .glass-card {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow: 0 4px 30px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.6) inset;
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .glass-card:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 16px 48px rgba(0,0,0,0.14), 0 1px 0 rgba(255,255,255,0.7) inset;
        }
        .problem-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(8px);
          transition: background .25s, border .25s, transform .25s;
        }
        .problem-card:hover {
          background: rgba(255,255,255,0.10);
          border-color: rgba(255,100,100,0.4);
          transform: translateX(6px);
        }
        .cta-btn-primary {
          background: linear-gradient(135deg,#38d9a9,#1971c2);
          background-size: 200% 200%;
          animation: gradShift 4s ease infinite;
          color: #fff;
          font-weight: 700;
          font-size: 1.05rem;
          padding: .9rem 2.2rem;
          border-radius: 50px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: .5rem;
          box-shadow: 0 8px 32px rgba(25,113,194,.4);
          transition: transform .2s, box-shadow .2s;
          min-height: 0; min-width: 0;
        }
        .cta-btn-primary:hover { transform: translateY(-3px) scale(1.03); box-shadow: 0 16px 40px rgba(25,113,194,.5); }
        .cta-btn-ghost {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,.88);
          border: 1.5px solid rgba(255,255,255,.28);
          font-size: 1.05rem;
          padding: .9rem 2.2rem;
          border-radius: 50px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: .5rem;
          backdrop-filter: blur(8px);
          transition: background .2s, transform .2s;
          min-height: 0; min-width: 0;
        }
        .cta-btn-ghost:hover { background: rgba(255,255,255,.16); transform: translateY(-2px); }
        .nav-btn-login {
          background: transparent;
          border: 1.5px solid rgba(25,113,194,.35);
          color: hsl(210,85%,42%);
          font-weight: 600;
          padding: .45rem 1.3rem;
          border-radius: 50px;
          cursor: pointer;
          transition: background .18s, transform .18s;
          min-height: 0; min-width: 0;
          font-size: .95rem;
        }
        .nav-btn-login:hover { background: hsl(210,85%,96%); transform: translateY(-1px); }
        .nav-btn-signup {
          background: linear-gradient(135deg,#1971c2,#38d9a9);
          color: #fff;
          font-weight: 700;
          padding: .5rem 1.4rem;
          border-radius: 50px;
          border: none;
          cursor: pointer;
          transition: opacity .18s, transform .18s;
          min-height: 0; min-width: 0;
          font-size: .95rem;
          box-shadow: 0 4px 16px rgba(25,113,194,.35);
        }
        .nav-btn-signup:hover { opacity: .9; transform: translateY(-1px); }
        .step-line { width: 2px; flex-shrink: 0; background: linear-gradient(to bottom, #1971c2, transparent); height: 64px; margin-left: 23px; }
        .tag-badge {
          display: inline-flex; align-items: center; gap: .4rem;
          background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.22);
          border-radius: 50px; padding: .4rem 1rem;
          font-size: .85rem; color: rgba(255,255,255,.85);
          backdrop-filter: blur(6px);
        }
        .stat-card {
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 20px;
          padding: 1.5rem 2rem;
          text-align: center;
          backdrop-filter: blur(10px);
        }
        .footer-link { background: none; border: none; cursor: pointer; color: rgba(255,255,255,.5); font-size: .9rem; text-decoration: underline; text-underline-offset: 4px; transition: color .18s; min-height:0;min-width:0; }
        .footer-link:hover { color: #fff; }
        .spin-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px dashed rgba(255,255,255,.12);
          animation: spin-slow 20s linear infinite;
        }
      `}</style>

            {/* ─────────── NAVBAR ─────────── */}
            <nav style={{
                position: "sticky", top: 0, zIndex: 100,
                background: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                borderBottom: "1px solid rgba(0,0,0,0.07)",
                padding: "0 5%",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                height: "64px",
                boxShadow: "0 2px 20px rgba(0,0,0,0.06)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                    <div style={{ position: "relative" }}>
                        <Activity style={{ width: 28, height: 28, color: "hsl(210,85%,42%)" }} />
                        <div style={{
                            position: "absolute", inset: -4, borderRadius: "50%",
                            border: "2px solid hsl(210,85%,42%)", opacity: 0,
                            animation: "pulse-ring 2s cubic-bezier(.4,0,.6,1) infinite",
                        }} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "hsl(210,85%,30%)", letterSpacing: "-0.02em" }}>
                        Knee Health Coach
                    </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                    <button className="nav-btn-login" onClick={goLogin}>Log In</button>
                    <button className="nav-btn-signup" onClick={goSignup}>Sign Up Free</button>
                </div>
            </nav>

            {/* ─────────── HERO ─────────── */}
            <section style={{
                position: "relative", overflow: "hidden",
                background: "linear-gradient(135deg, #0a1628 0%, #0d2b4e 40%, #0a3d2e 100%)",
                backgroundSize: "400% 400%",
                animation: "gradShift 12s ease infinite",
                minHeight: "92vh",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "6rem 5% 5rem",
                textAlign: "center",
            }}>
                {/* floating particles */}
                {particles.map(p => (
                    <div key={p.id} style={{
                        position: "absolute", borderRadius: "50%",
                        left: p.left, top: p.top,
                        width: p.size, height: p.size,
                        background: "radial-gradient(circle, rgba(56,217,169,.6), rgba(25,113,194,.3))",
                        animation: `drift ${p.dur} ease-in-out ${p.delay} infinite`,
                        pointerEvents: "none",
                    }} />
                ))}

                {/* spinning decorative rings */}
                <div className="spin-ring" style={{ width: 600, height: 600, left: "50%", top: "50%", marginLeft: -300, marginTop: -300 }} />
                <div className="spin-ring" style={{ width: 900, height: 900, left: "50%", top: "50%", marginLeft: -450, marginTop: -450, animationDirection: "reverse", animationDuration: "30s" }} />

                {/* content */}
                <div style={{ position: "relative", zIndex: 2, maxWidth: 760 }}>
                    <div style={{ opacity: 0, transform: "translateY(30px)", animation: "float 1s .1s forwards ease-out, float 6s 1s ease-in-out infinite" }}
                        className="tag-badge" >
                        <Sparkles style={{ width: 14, height: 14, color: "#38d9a9" }} />
                        AI-Powered Knee Physiotherapy Coach
                    </div>

                    <h1 style={{
                        marginTop: "1.5rem",
                        fontSize: "clamp(2.6rem, 5.5vw, 4.2rem)",
                        fontWeight: 900,
                        lineHeight: 1.12,
                        letterSpacing: "-0.03em",
                        color: "#fff",
                        marginBottom: "1rem",
                    }}>
                        Move Better.{" "}<br />
                        Hurt Less.{" "}<br />
                        <span className="shimmer-text">Live Fully.</span>
                    </h1>

                    <p style={{ color: "rgba(255,255,255,.72)", fontSize: "1.2rem", maxWidth: 560, margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
                        Your personal AI physiotherapy coach — guiding elderly osteoarthritis patients through knee rehabilitation at home, in <strong style={{ color: "#fff" }}>Hindi or English</strong>.
                    </p>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "center", marginBottom: "3.5rem" }}>
                        <button className="cta-btn-primary" onClick={goSignup}>
                            Get Started Free <ChevronRight style={{ width: 18, height: 18, animation: "bounce-x 1.2s ease-in-out infinite" }} />
                        </button>
                        <button className="cta-btn-ghost" onClick={goLogin}>
                            Already have an account? Log In
                        </button>
                    </div>

                    {/* stat row */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", justifyContent: "center" }}>
                        {[
                            { val: 500, suffix: "M+", label: "People with OA globally" },
                            { val: 100, suffix: "%", label: "Free to start" },
                            { val: 2, suffix: " languages", label: "Hindi & English support" },
                        ].map(({ val, suffix, label }) => (
                            <div key={label} className="stat-card">
                                <div style={{ color: "#38d9a9", fontWeight: 800, fontSize: "1.8rem", lineHeight: 1 }}>
                                    <Counter to={val} suffix={suffix} />
                                </div>
                                <div style={{ color: "rgba(255,255,255,.6)", fontSize: ".85rem", marginTop: ".3rem" }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* bottom wave */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, lineHeight: 0 }}>
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%" }}>
                        <path d="M0 60 C360 0 1080 0 1440 60 L1440 60 L0 60 Z" fill="#f8fafc" />
                    </svg>
                </div>
            </section>

            {/* ─────────── PROBLEM ─────────── */}
            <section style={{
                background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
                padding: "6rem 5%",
            }}>
                <Reveal className="text-center" style={{ textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", background: "#fee2e2", color: "#b91c1c", borderRadius: 50, padding: ".35rem 1rem", fontSize: ".82rem", fontWeight: 600, marginBottom: "1rem" }}>
                        <AlertCircle style={{ width: 14, height: 14 }} /> The Problem
                    </div>
                    <h2 style={{ color: "#0a1628", fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, marginBottom: ".75rem", letterSpacing: "-0.02em" }}>
                        Knee pain is common —<br />good guidance isn't
                    </h2>
                    <p style={{ color: "#64748b", maxWidth: 540, margin: "0 auto", fontSize: "1.05rem" }}>
                        Over 500 million people live with osteoarthritis worldwide. Yet most are left struggling at home with zero support.
                    </p>
                </Reveal>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem", marginTop: "3rem", maxWidth: 900, margin: "3rem auto 0" }}>
                    {[
                        "Patients don't know if they're doing physiotherapy correctly",
                        "Clinic visits are expensive and infrequent",
                        "No real-time feedback or encouragement at home",
                        "Language barriers make guidance hard to follow",
                    ].map((text, i) => (
                        <Reveal key={text} delay={i * 100}>
                            <div className="problem-card" style={{ borderRadius: 16, padding: "1.4rem 1.6rem", display: "flex", alignItems: "flex-start", gap: ".9rem" }}>
                                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(239,68,68,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                                    <AlertCircle style={{ width: 18, height: 18, color: "#ef4444" }} />
                                </div>
                                <p style={{ color: "#1e293b", fontWeight: 500, margin: 0, lineHeight: 1.55 }}>{text}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ─────────── SOLUTION ─────────── */}
            <section style={{
                background: "linear-gradient(135deg, #0a1628 0%, #0f3460 60%, #0a3d2e 100%)",
                padding: "7rem 5%",
                position: "relative", overflow: "hidden",
            }}>
                <div style={{ position: "absolute", top: -120, right: -120, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,217,169,.15), transparent 70%)" }} />
                <div style={{ position: "absolute", bottom: -120, left: -120, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(25,113,194,.2), transparent 70%)" }} />

                <Reveal style={{ textAlign: "center", marginBottom: "3.5rem" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", background: "rgba(56,217,169,.15)", color: "#38d9a9", borderRadius: 50, padding: ".35rem 1rem", fontSize: ".82rem", fontWeight: 600, marginBottom: "1rem", border: "1px solid rgba(56,217,169,.25)" }}>
                        <CheckCircle2 style={{ width: 14, height: 14 }} /> Our Solution
                    </div>
                    <h2 style={{ color: "#fff", fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: ".75rem" }}>
                        Everything you need to recover —<br />right on your phone
                    </h2>
                </Reveal>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem", maxWidth: 960, margin: "0 auto" }}>
                    {[
                        {
                            icon: CheckCircle2,
                            color: "#38d9a9",
                            title: "Guided Physiotherapy",
                            desc: "Step-by-step physiotherapy routines tailored for knee osteoarthritis. Safe, easy, and effective from your living room.",
                        },
                        {
                            icon: Mic,
                            color: "#4dabf7",
                            title: "AI Voice Coach",
                            desc: "A bilingual AI coach speaks in Hindi or English — guiding every rep, counting your sets, and keeping you motivated.",
                        },
                        {
                            icon: Calendar,
                            color: "#a9e34b",
                            title: "Daily Health Check-ins",
                            desc: "Track pain and stiffness every morning in 30 seconds. Spot trends and share meaningful data with your doctor.",
                        },
                    ].map(({ icon: Icon, color, title, desc }, i) => (
                        <Reveal key={title} delay={i * 120}>
                            <div className="glass-card" style={{ borderRadius: 24, padding: "2rem 1.8rem" }}>
                                <div style={{
                                    width: 56, height: 56, borderRadius: 16,
                                    background: `${color}20`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    marginBottom: "1.2rem",
                                    border: `1.5px solid ${color}40`,
                                }}>
                                    <Icon style={{ width: 26, height: 26, color }} />
                                </div>
                                <h3 style={{ fontWeight: 700, fontSize: "1.2rem", marginBottom: ".5rem", color: "#0f172a" }}>{title}</h3>
                                <p style={{ color: "#475569", lineHeight: 1.65, margin: 0 }}>{desc}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ─────────── MEET THE AI COACH DEMO ─────────── */}
            <section style={{ padding: "6rem 5%", background: "#fff" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4rem" }}>

                    <div style={{ flex: "1 1 400px", display: "flex", justifyContent: "center" }}>
                        <VoiceCoachDemo />
                    </div>

                    <div style={{ flex: "1 1 400px" }}>
                        <Reveal>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", background: "rgba(25,113,194,0.1)", color: "#1971c2", borderRadius: 50, padding: ".35rem 1rem", fontSize: ".82rem", fontWeight: 700, marginBottom: "1rem" }}>
                                <Mic style={{ width: 14, height: 14 }} /> Real-time Feedback
                            </div>
                            <h2 style={{ color: "#0a1628", fontSize: "clamp(1.8rem,3.5vw,2.4rem)", fontWeight: 800, marginBottom: "1rem", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                                Like having a physiotherapist in your living room.
                            </h2>
                            <p style={{ color: "#64748b", fontSize: "1.1rem", lineHeight: 1.7, marginBottom: "2rem" }}>
                                Watch as the AI Voice Coach actively listens and guides you through each exercise. It counts your reps, gives corrections gently, and adjusts to your pace.
                            </p>

                            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
                                {[
                                    "Understands Hindi and English seamlessly.",
                                    "Counts your repetitions out loud.",
                                    "Provides encouraging, safe feedback."
                                ].map(item => (
                                    <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", color: "#1e293b", fontWeight: 600, fontSize: "1.05rem" }}>
                                        <CheckCircle2 style={{ width: 22, height: 22, color: "#38d9a9", flexShrink: 0 }} />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </Reveal>
                    </div>

                </div>
            </section>

            {/* ─────────── HOW IT WORKS ─────────── */}
            <section style={{ background: "#f8fafc", padding: "7rem 5%" }}>
                <Reveal style={{ textAlign: "center", marginBottom: "3.5rem" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", background: "#dbeafe", color: "#1d4ed8", borderRadius: 50, padding: ".35rem 1rem", fontSize: ".82rem", fontWeight: 600, marginBottom: "1rem" }}>
                        <ArrowRight style={{ width: 14, height: 14 }} /> Simple to Start
                    </div>
                    <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, color: "#0a1628", letterSpacing: "-0.02em" }}>
                        How it works
                    </h2>
                </Reveal>

                <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column" }}>
                    {[
                        { step: "01", title: "Create your account", desc: "Sign up free in under a minute — no technical skills needed.", icon: Star },
                        { step: "02", title: "Log your daily check-in", desc: "Rate your pain and stiffness each morning. Takes just 30 seconds.", icon: Calendar },
                        { step: "03", title: "Follow your physiotherapy session", desc: "Your AI coach guides you through targeted knee physiotherapy, speaking in your language.", icon: Mic },
                    ].map(({ step, title, desc, icon: Icon }, i) => (
                        <Reveal key={step} delay={i * 130}>
                            <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 16,
                                        background: "linear-gradient(135deg,#1971c2,#38d9a9)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: "#fff", fontWeight: 800, fontSize: "1rem",
                                        boxShadow: "0 8px 24px rgba(25,113,194,.3)",
                                    }}>{step}</div>
                                    {i < 2 && <div className="step-line" />}
                                </div>
                                <div style={{ paddingBottom: i < 2 ? "2.5rem" : 0, paddingTop: ".6rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".4rem" }}>
                                        <Icon style={{ width: 18, height: 18, color: "#1971c2" }} />
                                        <h3 style={{ fontWeight: 700, fontSize: "1.15rem", color: "#0f172a", margin: 0 }}>{title}</h3>
                                    </div>
                                    <p style={{ color: "#64748b", margin: 0, lineHeight: 1.65 }}>{desc}</p>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ─────────── TRUST STRIP ─────────── */}
            <section style={{
                background: "#fff",
                borderTop: "1px solid #e2e8f0",
                borderBottom: "1px solid #e2e8f0",
                padding: "3rem 5%",
                textAlign: "center",
            }}>
                <Reveal>
                    <p style={{ color: "#94a3b8", fontWeight: 600, fontSize: ".8rem", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: "2rem" }}>Built with care for elderly patients</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "2.5rem", justifyContent: "center", alignItems: "center" }}>
                        {[
                            { icon: Shield, label: "Medical-Grade Safety" },
                            { icon: Mic, label: "Hindi & English Voice" },
                            { icon: Heart, label: "Elderly-First Design" },
                            { icon: CheckCircle2, label: "Doctor-Recommended Routines" },
                        ].map(({ icon: Icon, label }) => (
                            <div key={label} style={{ display: "flex", alignItems: "center", gap: ".5rem", color: "#475569", fontWeight: 500, fontSize: ".95rem" }}>
                                <Icon style={{ width: 20, height: 20, color: "hsl(210,85%,42%)" }} />
                                {label}
                            </div>
                        ))}
                    </div>
                </Reveal>
            </section>

            {/* ─────────── FAQ SECTION ─────────── */}
            <section style={{ background: "#f8fafc", padding: "6rem 5%" }}>
                <Reveal style={{ textAlign: "center", marginBottom: "3rem" }}>
                    <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.4rem)", fontWeight: 800, color: "#0a1628", letterSpacing: "-0.02em" }}>
                        Frequently Asked Questions
                    </h2>
                    <p style={{ color: "#64748b", fontSize: "1.05rem", marginTop: ".5rem" }}>Everything you need to know about Knee Health Coach.</p>
                </Reveal>
                <div style={{ maxWidth: 760, margin: "0 auto" }}>
                    <Reveal delay={100}>
                        <div style={{ background: "#fff", borderRadius: 24, padding: "2rem 2.5rem", boxShadow: "0 12px 32px rgba(0,0,0,0.03)" }}>
                            <FAQItem
                                question="Do I need a doctor's referral to use the app?"
                                answer="No. Knee Health Coach is accessible to anyone looking to improve their knee mobility and reduce pain from osteoarthritis. However, we strongly recommend consulting with your doctor before beginning any new exercise routine."
                            />
                            <FAQItem
                                question="Is it really 100% free?"
                                answer="Yes! Our core physiotherapy routines, AI voice coach, and daily pain tracking features are completely free to use without any hidden charges or credit card requirements."
                            />
                            <FAQItem
                                question="How do I switch the AI Coach to Hindi?"
                                answer="It’s easy! You can switch the language at any time in your profile settings. The AI coach will instantly adapt to guide your routines entirely in Hindi or English."
                            />
                            <FAQItem
                                question="Is my health data safe?"
                                answer="Absolutely. We take your privacy seriously. Your check-ins and recovery progress data are encrypted and securely stored. We never sell your data to third parties."
                            />
                            <FAQItem
                                question="Do I need any special equipment?"
                                answer="Most of our routines are designed using just your body weight, a chair, or a wall. No heavy weights or expensive equipment are required for your recovery."
                            />
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ─────────── CTA BANNER ─────────── */}
            <section style={{
                background: "linear-gradient(135deg,#0a1628 0%,#1971c2 50%,#0a3d2e 100%)",
                backgroundSize: "200% 200%",
                animation: "gradShift 8s ease infinite",
                padding: "7rem 5%",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
            }}>
                <div style={{ position: "absolute", inset: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
                <Reveal style={{ position: "relative", zIndex: 2 }}>
                    <h2 style={{ color: "#fff", fontSize: "clamp(1.9rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "1rem" }}>
                        Ready to take the first step?
                    </h2>
                    <p style={{ color: "rgba(255,255,255,.72)", fontSize: "1.1rem", marginBottom: "2.5rem" }}>
                        Join patients already recovering with Knee Health Coach. Free, easy, and built for you.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "center" }}>
                        <button className="cta-btn-primary" onClick={goSignup} style={{ fontSize: "1.1rem", padding: "1rem 2.5rem" }}>
                            Start for Free <ChevronRight style={{ width: 20, height: 20 }} />
                        </button>
                        <button className="cta-btn-ghost" onClick={goLogin} style={{ fontSize: "1.1rem", padding: "1rem 2.5rem" }}>
                            Log In
                        </button>
                    </div>
                </Reveal>
            </section>

            {/* ─────────── FOOTER ─────────── */}
            <footer style={{
                background: "#060d1a",
                padding: "3rem 5% 2rem",
                textAlign: "center",
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem", marginBottom: ".75rem" }}>
                    <Activity style={{ width: 20, height: 20, color: "#38d9a9" }} />
                    <span style={{ fontWeight: 700, color: "rgba(255,255,255,.8)", fontSize: "1rem" }}>Knee Health Coach</span>
                </div>
                <p style={{ color: "rgba(255,255,255,.38)", fontSize: ".85rem", margin: 0 }}>
                    This app is a wellness tool — not a substitute for professional medical advice.
                </p>
                <p style={{ color: "rgba(255,255,255,.38)", fontSize: ".85rem", marginTop: ".25rem" }}>
                    Always consult your doctor or physiotherapist before starting a new programme.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginTop: "1.5rem" }}>
                    <button className="footer-link" onClick={goLogin}>Log In</button>
                    <button className="footer-link" onClick={goSignup}>Sign Up</button>
                </div>
                <p style={{ color: "rgba(255,255,255,.2)", fontSize: ".78rem", marginTop: "1.5rem" }}>© 2025 Knee Health Coach. All rights reserved.</p>
            </footer>
        </div>
    );
}
