"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { animate, createScope, onScroll, cubicBezier } from "animejs";
import {
  ArrowDown,
  ArrowUpRight,
  Search,
  Check,
  Plus,
  ArrowRight,
} from "lucide-react";
const steps = [
  [
    "A conversation.",
    "Capture what your customer needs. Keep the original source close.",
    "01 / CUSTOMER NEED",
  ],
  [
    "A shared plan.",
    "Agree on deliverables, responsibilities, dates, and what success means.",
    "02 / BOTH SIDES REVIEW",
  ],
  [
    "A clearer picture.",
    "Give the work an owner. Record comparable measurements as the trial unfolds.",
    "03 / WORK + EVIDENCE",
  ],
  [
    "A next step.",
    "Review the results together. Decide to buy, extend, pause, or move on.",
    "04 / AN EXPLICIT DECISION",
  ],
];
function Mark() {
  return (
    <span className="cosmos-mark" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <i key={i} />
      ))}
    </span>
  );
}
function Photo({
  tile,
  className = "",
  children,
}: {
  tile: number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`cosmos-photo tile-${tile} ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}
export function AlchemyLanding() {
  const root = useRef<HTMLElement>(null),
    [stage, setStage] = useState(0);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let scope: ReturnType<typeof createScope> | undefined;
    const setup = () => {
      scope?.revert();
      if (reduced.matches) return;
      scope = createScope({ root }).add(() => {
        root.current?.querySelectorAll(".cosmos-orbit").forEach((el, i) =>
          animate(el, {
            translateY: [0, i % 2 ? 12 : -12],
            duration: 4200 + i * 180,
            ease: "inOutSine",
            alternate: true,
            loop: true,
          }),
        );
        root.current?.querySelectorAll(".cosmos-reveal").forEach((el) =>
          animate(el, {
            translateY: [24, 0],
            duration: 650,
            ease: cubicBezier(0.23, 1, 0.32, 1),
            autoplay: onScroll({
              target: el,
              enter: "bottom-=60 top",
              repeat: false,
            }),
          }),
        );
      });
    };
    setup();
    reduced.addEventListener("change", setup);
    return () => {
      scope?.revert();
      reduced.removeEventListener("change", setup);
    };
  }, []);
  return (
    <main ref={root} className="cosmos-alchemy">
      <header className="cosmos-header">
        <Link href="/" className="cosmos-brand" aria-label="Alchemy home">
          <Mark />
          <span>Alchemy</span>
        </Link>
        <nav aria-label="Website navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#community">Community</a>
        </nav>
        <form action="/demo" className="cosmos-search">
          <Search size={17} />
          <input
            name="q"
            aria-label="Search demo customers"
            placeholder="Find a demo customer"
          />
          <button aria-label="Search customers">
            <ArrowRight size={17} />
          </button>
        </form>
        <Link href="/login" className="cosmos-login">
          Log in
        </Link>
        <Link href="/demo" className="cosmos-pill">
          Explore
        </Link>
      </header>
      <section className="cosmos-hero">
        <div className="cosmos-orbits" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} className={`cosmos-orbit orbit-${i}`}>
              <Photo tile={i % 6} />
            </div>
          ))}
        </div>
        <div className="cosmos-hero-copy">
          <span className="cosmos-hero-wordmark">ALCHEMY</span>
          <h1>
            Where trials <br />
            turn into trust.
          </h1>
          <p>
            A shared space for your customer trials.
            <br />
            From the first conversation to a clear decision.
          </p>
          <div className="cosmos-hero-actions">
            <Link className="cosmos-pill" href="/demo">
              Start a trial <ArrowUpRight size={16} />
            </Link>
            <a className="cosmos-pill outline" href="#how-it-works">
              See how it works
            </a>
          </div>
          <small>
            Explore with fictional records. Your real trials stay private.
          </small>
        </div>
        <a
          href="#how-it-works"
          className="cosmos-next"
          aria-label="Follow the trial"
        >
          <ArrowDown size={21} />
        </a>
      </section>
      <section id="how-it-works" className="cosmos-workflow">
        <div className="cosmos-section-heading cosmos-reveal">
          <span className="cosmos-kicker">INTEREST IS ONLY THE BEGINNING</span>
          <h2>
            Give a good idea
            <br />a fair trial.
          </h2>
          <p>
            The plan, the people, the proof.
            <br />
            Connected in one place.
          </p>
        </div>
        <div className="cosmos-trial-canvas cosmos-reveal">
          <Photo tile={0} className="canvas-photo first" />
          <Photo tile={2} className="canvas-photo second" />
          <Photo tile={3} className="canvas-photo third" />
          <article className="cosmos-plan-preview">
            <div className="preview-top">
              <span className="mini-mark">✳</span>
              <span>Neighborhood café</span>
              <span className="cosmos-example">EXAMPLE</span>
            </div>
            <h3>
              A little less waste.
              <br />A little more possibility.
            </h3>
            <p>30-day waste tracking trial</p>
            <div className="preview-tasks">
              <span>
                <Check size={14} /> Agree on the starting point
              </span>
              <span>
                <Check size={14} /> Define the success measure
              </span>
              <span>
                <span className="mini-check" /> Review the results together
              </span>
            </div>
            <Link href="/demo/plan" className="preview-link">
              Open the trial workspace
              <ArrowUpRight size={15} />
            </Link>
          </article>
          <span className="canvas-caption">
            Original illustrative imagery · fictional trial example
          </span>
        </div>
        <div
          className="cosmos-stage-switch"
          role="tablist"
          aria-label="Trial journey"
        >
          {steps.map(([title], i) => (
            <button
              key={title}
              role="tab"
              aria-selected={stage === i}
              id={`trial-stage-${i}`}
              aria-controls="trial-stage-panel"
              onClick={() => setStage(i)}
              onKeyDown={(e) => {
                if (
                  ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                ) {
                  e.preventDefault();
                  const n =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? steps.length - 1
                        : (stage +
                            (e.key === "ArrowRight" ? 1 : -1) +
                            steps.length) %
                          steps.length;
                  setStage(n);
                  document.getElementById(`trial-stage-${n}`)?.focus();
                }
              }}
              tabIndex={stage === i ? 0 : -1}
            >
              {title}
            </button>
          ))}
        </div>
        <div
          id="trial-stage-panel"
          role="tabpanel"
          aria-labelledby={`trial-stage-${stage}`}
          className="cosmos-stage-content"
        >
          <span>{steps[stage][2]}</span>
          <h3>{steps[stage][0]}</h3>
          <p>{steps[stage][1]}</p>
          <Link
            href={
              ["/demo/plan", "/demo/plan", "/demo/metrics", "/demo/results"][
                stage
              ]
            }
          >
            Explore this step <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
      <section className="cosmos-proof">
        <div className="cosmos-section-heading cosmos-reveal">
          <span className="cosmos-kicker">EVERY NUMBER HAS A STORY</span>
          <h2>
            See what changed.
            <br />
            Know what it means.
          </h2>
          <p>
            Keep the baseline, the measurement, and the source together.
            <br />
            Missing evidence stays visible.
          </p>
        </div>
        <div className="cosmos-proof-grid cosmos-reveal">
          <article className="cosmos-result-card">
            <div className="preview-top">
              <span>Waste per cover</span>
              <span className="cosmos-example">ILLUSTRATIVE</span>
            </div>
            <div className="cosmos-results">
              <div>
                <span>Before</span>
                <strong>
                  100<span>g</span>
                </strong>
              </div>
              <ArrowRight size={25} />
              <div>
                <span>After</span>
                <strong>
                  76<span>g</span>
                </strong>
              </div>
            </div>
            <div className="cosmos-bar baseline">
              <span />
            </div>
            <div className="cosmos-bar result">
              <span />
            </div>
            <div className="cosmos-result-footer">
              <span>20% reduction target</span>
              <strong>24% reported reduction</strong>
            </div>
            <p>
              Example only. Comparable 30-day periods and covers served assumed.
              This is not a real customer result or sale.
            </p>
            <Link href="/demo/results">
              Explore results <ArrowUpRight size={15} />
            </Link>
          </article>
          <Photo tile={4} className="proof-photo" />
          <article className="cosmos-source-card">
            <span className="cosmos-source-symbol">“</span>
            <span className="cosmos-kicker">THE SOURCE STAYS CLOSE</span>
            <h3>
              More than
              <br />a green check.
            </h3>
            <p>
              Original notes. Clear assumptions. Both sides’ review. Evidence
              you can return to.
            </p>
            <Link href="/demo/evidence">
              Open the evidence library
              <ArrowUpRight size={15} />
            </Link>
          </article>
        </div>
      </section>
      <section id="community" className="cosmos-community">
        <div className="cosmos-section-heading cosmos-reveal">
          <span className="cosmos-kicker">START CLOSE TO HOME</span>
          <h2>
            Real possibility.
            <br />
            Right around you.
          </h2>
          <p>
            A shop, a studio, a nonprofit.
            <br />
            Build with someone who can put your idea to work.
          </p>
        </div>
        <div className="cosmos-community-gallery cosmos-reveal">
          {[0, 5, 2, 3, 4].map((tile, i) => (
            <Photo
              key={i}
              tile={tile}
              className={`community-photo community-${i}`}
            />
          ))}
        </div>
        <p className="community-note">
          Community value comes from completed trials and partner-confirmed
          evidence.
          <br />
          The scenes above are original illustrative imagery.
        </p>
        <Link href="/demo" className="cosmos-pill outline">
          Find your first trial <Plus size={16} />
        </Link>
      </section>
      <section className="cosmos-finale">
        <Mark />
        <h2>
          Build something
          <br />
          worth continuing.
        </h2>
        <p>Good work starts with a shared plan.</p>
        <Link href="/demo" className="cosmos-pill">
          Explore Alchemy
          <ArrowUpRight size={16} />
        </Link>
      </section>
      <footer className="cosmos-footer">
        <Link href="/" className="cosmos-brand">
          <Mark />
          Alchemy
        </Link>
        <span>Customer trials. Shared work. Clear evidence.</span>
        <div>
          <Link href="/demo">Workspace</Link>
          <Link href="/login">Log in</Link>
        </div>
      </footer>
    </main>
  );
}
