"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { LiveTerminal } from "./LiveTerminal";
export function OptifluxLanding() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("is-revealed");
        }),
      { threshold: 0.15 },
    );
    root.current
      ?.querySelectorAll(".editorial-reveal")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return (
    <main className="editorial-landing" ref={root}>
      <div className="landing-console">
        <LiveTerminal />
        <div className="signal-band">
          <span className="signal-light" />
          ONE FOUNDER. FIVE SPECIALISTS. ONE SHARED PRODUCT.
        </div>
      </div>
      <section className="cinematic-hero">
        <img
          className="cinema-photo"
          src="/art/office-noir.png"
          alt="A quiet monochrome office with a glowing computer at the center."
          fetchPriority="high"
        />
        <div className="cinema-shade" />
        <header className="editorial-masthead">
          <Link href="/" className="editorial-wordmark">
            Alchemy
          </Link>
          <Link href="/login" className="editorial-signin">
            SIGN IN <ArrowUpRight size={13} />
          </Link>
        </header>
        <div className="cinematic-hero-copy">
          <h1>
            Build Your Company.
            <br />
            <em>Keep Your Focus.</em>
          </h1>
          <Link href="/demo" className="metal-button">
            GET STARTED
          </Link>
        </div>
        <a href="#first-five" className="scroll-cue">
          Scroll to discover
          <ArrowDown size={14} />
        </a>
      </section>
      <section id="first-five" className="founder-manifesto editorial-reveal">
        <span className="editorial-index">01 / THE BEGINNING</span>
        <h2>
          Your first five.
          <br />
          <em>Your next chapter.</em>
        </h2>
        <div className="manifesto-copy">
          <p>
            You have a product to build.
            <br />
            Partners to listen to.
            <br />
            Decisions that cannot wait.
          </p>
          <p>
            Alchemy is your second set of eyes.
            <br />
            Five specialists. A shared direction.
          </p>
          <Link className="metal-button" href="/demo">
            MEET YOUR TEAM
          </Link>
        </div>
        <div className="manifesto-rule">
          <span>LESS GUESSWORK</span>
          <span>MORE FORWARD MOTION</span>
        </div>
      </section>
      <section className="team-editorial">
        <div className="team-editorial-head editorial-reveal">
          <span className="editorial-index">02 / A TEAM IN YOUR CORNER</span>
          <h2>
            One name.
            <br />
            <em>Every perspective.</em>
          </h2>
          <p>
            From the first conversation
            <br />
            to the next product decision.
          </p>
        </div>
        <img
          className="editorial-team-photo"
          src="/art/team-noir.png"
          alt="Five chrome robot specialists collaborate around a conference table."
          loading="lazy"
        />
        <div className="editorial-role-list">
          {[
            ["01", "Scout", "Find the right partners."],
            ["02", "Diplomat", "Shape the pilot."],
            ["03", "Quartermaster", "Unblock the next step."],
            ["04", "Smith", "Find the shared product."],
            ["05", "Treasurer", "Check the path to revenue."],
          ].map(([n, role, job]) => (
            <Link
              key={role}
              href="/demo/agents"
              className="editorial-role-row editorial-reveal"
            >
              <span>{n}</span>
              <h3>{role}</h3>
              <p>{job}</p>
              <ArrowUpRight size={24} />
            </Link>
          ))}
        </div>
        <div className="team-cta">
          <Link href="/demo/agents" className="metal-button">
            SEE THEM WORK
          </Link>
          <span>REAL MODEL TASKS. SOURCES INCLUDED.</span>
        </div>
      </section>
      <section className="editorial-final editorial-reveal">
        <span className="editorial-index">03 / YOUR NEXT MOVE</span>
        <h2>
          A little structure.
          <br />
          <em>A bigger beginning.</em>
        </h2>
        <Link className="metal-button" href="/demo">
          ENTER ALCHEMY
        </Link>
        <p>
          Explore the workspace with three fictional partners.
          <br />
          Run the specialists against their source records.
        </p>
      </section>
      <footer className="editorial-footer">
        <Link className="editorial-wordmark" href="/">
          Alchemy
        </Link>
        <div>
          <Link href="/demo">WORKSPACE</Link>
          <Link href="/demo/agents">AGENTS</Link>
          <Link href="/demo/settings">CONNECTIONS</Link>
          <Link href="/login">SIGN IN</Link>
        </div>
        <span>BUILD ONE PRODUCT. GROW TOGETHER.</span>
      </footer>
    </main>
  );
}
