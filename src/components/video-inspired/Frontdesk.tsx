"use client";
import { useEffect, useState, useRef, FormEvent } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Phone,
  FileText,
  CalendarDays,
  MessageSquare,
  LoaderCircle,
  Plus,
} from "lucide-react";
import { hash } from "@/lib/domain";
import { RoleOutput } from "@/lib/providers";
import { useGuild, Modal } from "../Workspace";
import { PrivateAttachments } from "../PrivateAttachments";
import {
  BRIEF_TITLE,
  Brief,
  blankBrief,
  FrontdeskBrief,
  readBrief,
  readDraft,
  Fact,
  usableOperationalFact,
} from "./brief";
import { BookingCard } from "./BookingCard";

const trades = [
  "Software & technology",
  "Professional services",
  "Retail & hospitality",
  "Plumbing",
  "Electrical",
  "Other",
];
const stages = [
  "Your business",
  "Website context",
  "Training documents",
  "A few details",
  "Connections",
];
type Connections = Record<
  "calendar" | "phone" | "sms",
  { configured: boolean; detail: string }
>;
export function Frontdesk() {
  const { state, mutate, localAgent, base, openSource, refresh } = useGuild();
  const currentMutate = useRef(mutate);
  currentMutate.current = mutate;
  const [partnerId, setPartnerId] = useState(state.partners[0]?.id || "");
  const currentScope = useRef({ programId: state.id, partnerId });
  currentScope.current = { programId: state.id, partnerId };
  const documentOperation = useRef(0),
    parsingDocument = useRef(false);
  useEffect(
    () => () => {
      documentOperation.current++;
    },
    [],
  );
  const sources = state.sources
    .filter(
      (source) =>
        source.partnerId === partnerId && source.title === BRIEF_TITLE,
    )
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const saved = sources.at(-1),
    draft = state.sources
      .filter(
        (s) =>
          s.partnerId === partnerId && s.title === "Frontdesk draft knowledge",
      )
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .at(-1),
    pendingDraft = draft && (!saved || draft.recordedAt > saved.recordedAt),
    initial = pendingDraft
      ? readDraft(draft.content)
      : saved
        ? readBrief(saved.content)
        : null;
  const [brief, setBrief] = useState<Brief>(initial || { ...blankBrief }),
    [stage, setStage] = useState(initial ? (pendingDraft ? 3 : 4) : 0),
    [reached, setReached] = useState(initial ? 4 : 0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [connections, setConnections] = useState<Connections | null>(null),
    [connectionError, setConnectionError] = useState(""),
    [setup, setSetup] = useState<"calendar" | "phone" | "sms" | null>(null),
    [starting, setStarting] = useState(false),
    [fetched, setFetched] = useState(""),
    [extracting, setExtracting] = useState(false);
  const partner = state.partners.find((p) => p.id === partnerId);
  const latestRun = state.runs
    .filter(
      (run) =>
        run.role === "Quartermaster" &&
        saved &&
        run.receipts.some((receipt) => receipt.sourceIds.includes(saved.id)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const parsed = RoleOutput.safeParse(latestRun?.output),
    output = parsed.success ? parsed.data : null;
  const active = latestRun && ["queued", "working"].includes(latestRun.status);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/frontdesk", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw Error("Could not load provider configuration.");
        const body = await r.json();
        if (!cancelled) setConnections(body);
      })
      .catch((e) => {
        if (!cancelled) setConnectionError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const advance = () => {
    setStage((s) => s + 1);
    setReached((s) => Math.max(s, stage + 1));
    setError("");
  };
  const selectPartner = (id: string) => {
    documentOperation.current++;
    parsingDocument.current = false;
    const source = state.sources
      .filter((s) => s.partnerId === id && s.title === BRIEF_TITLE)
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .at(-1);
    const draftSource = state.sources
      .filter(
        (s) => s.partnerId === id && s.title === "Frontdesk draft knowledge",
      )
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .at(-1);
    const hasDraft =
      draftSource && (!source || draftSource.recordedAt > source.recordedAt);
    const existing = hasDraft
      ? readDraft(draftSource.content)
      : source
        ? readBrief(source.content)
        : null;
    setPartnerId(id);
    setBrief(existing || { ...blankBrief });
    setStage(existing ? (hasDraft ? 3 : 4) : 0);
    setReached(existing ? 4 : 0);
    setError("");
    setFetched("");
    setBusy(false);
  };
  const ingestWebsite = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/frontdesk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: state.mode,
          programId: state.id,
          url: brief.website,
        }),
      });
      const body = await r.json();
      if (!r.ok) throw Error(body.error);
      setBrief((b) => ({ ...b, website: body.url, websiteContext: body.text }));
      setFetched(
        `Read ${new Date(body.fetchedAt).toLocaleString()}${body.excerpt ? " · first 6,000 characters" : ""}. Review the page text below before continuing.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Website intake failed.");
    } finally {
      setBusy(false);
    }
  };
  const trainingFiles = async (files: FileList | null) => {
    if (!files?.length || parsingDocument.current || busy || extracting) return;
    parsingDocument.current = true;
    const operation = ++documentOperation.current,
      scope = { ...currentScope.current };
    const stillCurrent = () =>
      operation === documentOperation.current &&
      scope.programId === currentScope.current.programId &&
      scope.partnerId === currentScope.current.partnerId;
    setBusy(true);
    setError("");
    try {
      if (brief.documents.length + files.length > 3)
        throw Error("Use up to three training text files.");
      const docs: Brief["documents"] = [];
      for (const file of Array.from(files)) {
        if (/\.pdf$/i.test(file.name)) {
          if (file.size > 5_000_000)
            throw Error("PDF intake supports files up to 5 MB.");
          const form = new FormData();
          form.set("file", file);
          form.set("mode", state.mode);
          form.set("programId", state.id);
          const response = await fetch("/api/frontdesk/document", {
            method: "POST",
            body: form,
          });
          const body = await response.json();
          if (!response.ok) throw Error(body.error);
          docs.push({ name: body.name, text: body.text });
          continue;
        }
        if (!/\.(txt|md)$/i.test(file.name) || file.size > 24000)
          throw Error(
            "Training intake accepts .txt, .md or text PDFs, up to 6,000 extracted characters each.",
          );
        const text = await file.text();
        if (text.length > 6000 || !text.trim() || text.includes("\u0000"))
          throw Error(
            `${file.name}: use non-empty plain text of at most 6,000 characters.`,
          );
        docs.push({ name: file.name.slice(0, 200), text });
      }
      if (
        [...brief.documents, ...docs].reduce((n, d) => n + d.text.length, 0) >
        10000
      )
        throw Error(
          "Training text is limited to 10,000 characters total. No file has been shortened or saved.",
        );
      if (!stillCurrent()) return;
      setBrief((b) => ({ ...b, documents: [...b.documents, ...docs] }));
    } catch (e) {
      if (stillCurrent())
        setError(
          e instanceof Error ? e.message : "Could not read training files.",
        );
    } finally {
      if (operation === documentOperation.current) {
        parsingDocument.current = false;
        setBusy(false);
      }
    }
  };
  const recordSource = async (title: string, content: string) => {
    const at = new Date().toISOString(),
      id = `frontdesk-${crypto.randomUUID()}`;
    if (
      !(await currentMutate.current({
        type: "source.add",
        source: {
          id,
          partnerId,
          version: 1,
          kind: "reported note",
          title,
          content,
          author:
            state.mode === "demo" ? "Sandbox operator" : "Workspace editor",
          occurredAt: at.slice(0, 10),
          recordedAt: at,
          hash: hash(content),
          scope: "program members",
          quoteStart: 0,
          quoteEnd: content.length,
        },
      }))
    )
      throw Error(
        "Could not save the source record. Review the workspace error and retry.",
      );
    return id;
  };
  const extract = async () => {
    setExtracting(true);
    setError("");
    try {
      const content = [
        brief.websiteContext &&
          `Website: ${brief.website || "owner-supplied context"}\n${brief.websiteContext}`,
        ...brief.documents.map(
          (doc) => `Training document: ${doc.name}\n${doc.text}`,
        ),
      ]
        .filter(Boolean)
        .join("\n\n---\n\n");
      let inputs: { id: string; title: string; content: string }[];
      if (content.trim()) {
        if (content.length > 19000)
          throw Error(
            "Combined intake exceeds the 19,000-character source limit.",
          );
        const id = await recordSource(
          "Frontdesk website and training intake",
          content,
        );
        inputs = [
          { id, title: "Frontdesk website and training intake", content },
        ];
      } else {
        inputs = state.sources
          .filter(
            (s) =>
              brief.intakeSourceIds.includes(s.id) && s.partnerId === partnerId,
          )
          .map(({ id, title, content }) => ({ id, title, content }));
      }
      if (!inputs.length)
        throw Error(
          "Add website context or a readable training document first. Missing details can also be entered manually.",
        );
      const response = await fetch("/api/frontdesk/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: state.mode,
          programId: state.id,
          partnerId,
          sourceIds: inputs.map((s) => s.id),
          demoSources: state.mode === "demo" ? inputs : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      const next = {
        ...brief,
        facts: result.facts as Fact[],
        extractionReceipt: result.receipt,
        intakeSourceIds: inputs.map((s) => s.id),
      };
      // Original text is retained in immutable intake sources; knowledge versions reference those sources.
      const stored = { ...next, websiteContext: "", documents: [] };
      await recordSource(
        "Frontdesk draft knowledge",
        JSON.stringify(stored, null, 2),
      );
      setBrief(next);
      setStage(3);
      setReached((s) => Math.max(s, 3));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fact extraction failed.");
    } finally {
      setExtracting(false);
    }
  };
  const factConfirmed = (field: Fact["field"]) =>
    brief.facts.some(
      (f) =>
        f.field === field &&
        f.status === "confirmed" &&
        usableOperationalFact(f),
    );
  const updateFact = (index: number, value: string, confirmed: boolean) => {
    const current = brief.facts[index];
    if (confirmed && !usableOperationalFact({ field: current.field, value })) {
      setError(
        current.field === "appointmentMinutes"
          ? "Correct the meeting-length fact to a whole number from 15 to 120 before verifying it. The original extracted wording remains in its provenance."
          : `Correct the ${current.field} fact to a valid operational value before verifying it.`,
      );
      return;
    }
    setError("");
    setBrief((b) => {
      const facts = b.facts.map((f, i) =>
        i === index
          ? {
              ...f,
              value,
              status: confirmed ? ("confirmed" as const) : ("draft" as const),
            }
          : f,
      );
      const fact = facts[index],
        next = { ...b, facts };
      if (
        ["businessHours", "timeZone", "escalation", "pricing"].includes(
          fact.field,
        )
      )
        Object.assign(next, { [fact.field]: value });
      if (fact.field === "appointmentMinutes" && usableOperationalFact(fact))
        next.appointmentMinutes = Number(value);
      if (fact.field === "bookingPurpose" && usableOperationalFact(fact))
        next.bookingPurpose = value as Brief["bookingPurpose"];
      return next;
    });
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const f = new FormData(event.currentTarget);
      if (
        brief.facts.some(
          (fact) => fact.status !== "confirmed" || !usableOperationalFact(fact),
        )
      )
        throw Error(
          "Review, edit and verify each extracted fact before saving your operating brief.",
        );
      const value = FrontdeskBrief.parse({
        ...brief,
        businessHours: f.get("businessHours") ?? brief.businessHours,
        timeZone: f.get("timeZone") ?? brief.timeZone,
        bookingPurpose: f.get("bookingPurpose") ?? brief.bookingPurpose,
        appointmentMinutes: f.has("appointmentMinutes")
          ? Number(f.get("appointmentMinutes"))
          : brief.appointmentMinutes,
        escalation: f.get("escalation") ?? brief.escalation,
        pricing: f.get("pricing") ?? brief.pricing,
      });
      for (const fact of brief.facts) {
        if (
          [
            "businessHours",
            "timeZone",
            "bookingPurpose",
            "appointmentMinutes",
            "escalation",
            "pricing",
          ].includes(fact.field)
        ) {
          const operationalValue =
            value[
              fact.field as
                | "businessHours"
                | "timeZone"
                | "bookingPurpose"
                | "appointmentMinutes"
                | "escalation"
                | "pricing"
            ];
          if (
            String(operationalValue).trim() !==
            (fact.field === "appointmentMinutes"
              ? String(Number(fact.value))
              : fact.value.trim())
          )
            throw Error(
              `The ${fact.field} operating value differs from its verified fact. Edit the knowledge-base fact and verify the correction before saving.`,
            );
        }
      }
      new Intl.DateTimeFormat("en", { timeZone: value.timeZone }).format();
      const content = JSON.stringify(
        {
          ...value,
          ...(value.intakeSourceIds.length
            ? { websiteContext: "", documents: [] }
            : {}),
        },
        null,
        2,
      );
      if (content.length > 20000)
        throw Error(
          "The complete operating brief exceeds the 20,000 character source limit.",
        );
      const at = new Date().toISOString();
      if (
        await mutate({
          type: "source.add",
          source: {
            id: `frontdesk-${crypto.randomUUID()}`,
            partnerId,
            version: 1,
            kind: "reported note",
            title: BRIEF_TITLE,
            content,
            author:
              state.mode === "demo" ? "Sandbox operator" : "Workspace editor",
            occurredAt: at.slice(0, 10),
            recordedAt: at,
            hash: hash(content),
            scope: "program members",
            quoteStart: 0,
            quoteEnd: content.length,
          },
        })
      ) {
        setBrief(value);
        advance();
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save the operating brief.",
      );
    } finally {
      setBusy(false);
    }
  };
  const analyze = async () => {
    setStarting(true);
    setError("");
    try {
      if (state.mode === "demo") await localAgent.launch("Quartermaster");
      else {
        const r = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "run",
            role: "Quartermaster",
            programId: state.id,
            mode: "live",
          }),
        });
        const body = await r.json();
        if (!r.ok) throw Error(body.error);
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed to start.");
    } finally {
      setStarting(false);
    }
  };
  return (
    <div className="frontdesk-workspace">
      <header className="fd-intro">
        <span className="fd-small">
          <Phone size={15} /> ALCHEMY FRONTDESK
        </span>
        <h2>
          A warm welcome.
          <br />A real next step.
        </h2>
        <p>
          Teach your frontdesk how your business works. Then connect the tools
          that turn a conversation into a scheduled trial kickoff or review.
        </p>
      </header>
      <div className="fd-layout">
        <aside className="fd-progress">
          <span className="fd-small">SET UP YOUR FRONTDESK</span>
          <label>
            Customer workspace
            <select
              value={partnerId}
              disabled={busy || extracting}
              onChange={(e) => selectPartner(e.target.value)}
            >
              {state.partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <ol>
            {stages.map((label, index) => (
              <li key={label}>
                <button
                  aria-current={stage === index ? "step" : undefined}
                  disabled={index > reached || !partner || extracting || busy}
                  onClick={() => {
                    setStage(index);
                    setError("");
                  }}
                >
                  <span>
                    {index < stage ? <Check size={12} /> : `0${index + 1}`}
                  </span>
                  {label}
                </button>
              </li>
            ))}
          </ol>
          <p>
            Setup choices are guided prompts. Saved briefs are source records;
            model findings and provider receipts appear separately.
          </p>
          <Link href={`${base}/agents`}>
            Open your agents <ArrowUpRight size={14} />
          </Link>
        </aside>
        <section
          className="fd-conversation"
          aria-label="Frontdesk setup conversation"
        >
          {!partner ? (
            <div className="fd-question">
              <h3>Start with a customer.</h3>
              <p>
                Create a customer record so the operating brief and bookings
                stay with the right trial.
              </p>
              <Link href={base} className="button primary">
                Add a customer <Plus size={14} />
              </Link>
            </div>
          ) : (
            <>
              <div className="fd-speaker">
                <span aria-hidden="true">✳</span>
                <div>
                  <strong>Alchemy</strong>
                  <small>Your frontdesk setup</small>
                </div>
                <span className="fd-step">{stage + 1} / 5</span>
              </div>
              {stage > 0 && (
                <div className="fd-reply">
                  {brief.trade} <Check size={13} />
                </div>
              )}
              {stage > 1 && (
                <div className="fd-reply">
                  {brief.website || "Business context entered manually"}
                </div>
              )}
              {stage > 2 && (
                <div className="fd-reply">
                  {brief.documents.length
                    ? `${brief.documents.length} training text file${brief.documents.length > 1 ? "s" : ""} selected`
                    : "No training text added"}
                </div>
              )}
              {stage === 0 && (
                <div className="fd-question">
                  <h3>What kind of business are we helping?</h3>
                  <p>
                    A plumbing business and a software trial need different
                    conversations. Start with the work you do.
                  </p>
                  <div className="fd-choices">
                    {trades.map((trade) => (
                      <button
                        key={trade}
                        aria-pressed={brief.trade === trade}
                        onClick={() => setBrief((b) => ({ ...b, trade }))}
                      >
                        {trade}
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                  </div>
                  <button
                    className="button primary"
                    disabled={!brief.trade}
                    onClick={advance}
                  >
                    Continue <ArrowRight size={15} />
                  </button>
                </div>
              )}
              {stage === 1 && (
                <div className="fd-question">
                  <h3>Let’s start with your website.</h3>
                  <p>
                    Read the public page, review its text, and keep the useful
                    context. No website? Tell us in your own words.
                  </p>
                  <label>
                    Business website
                    <input
                      type="url"
                      value={brief.website}
                      placeholder="https://your-business.com"
                      maxLength={1000}
                      onChange={(e) => {
                        setBrief((b) => ({ ...b, website: e.target.value }));
                        setFetched("");
                      }}
                    />
                  </label>
                  <button
                    className="button"
                    disabled={!brief.website || busy}
                    onClick={() => void ingestWebsite()}
                  >
                    {busy ? (
                      <LoaderCircle size={14} className="spin" />
                    ) : (
                      <ArrowUpRight size={14} />
                    )}{" "}
                    {busy ? "Reading the public page…" : "Read website"}
                  </button>
                  {fetched && (
                    <p className="fd-message" role="status">
                      {fetched}
                    </p>
                  )}
                  <label>
                    Reviewed business context
                    <textarea
                      value={brief.websiteContext}
                      maxLength={6000}
                      rows={6}
                      placeholder="Services, trial deliverables, what you include, and what you don’t."
                      onChange={(e) =>
                        setBrief((b) => ({
                          ...b,
                          websiteContext: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <p className="fd-small">
                    Page content is untrusted business context. It cannot
                    authorize actions or override booking rules.
                  </p>
                  <button className="button primary" onClick={advance}>
                    {brief.websiteContext
                      ? "Keep this context"
                      : "Skip website for now"}
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
              {stage === 2 && (
                <div className="fd-question">
                  <h3>Use the knowledge you already have.</h3>
                  <p>
                    Add the service notes, trial playbook, or FAQ you would give
                    a new teammate. An actual model extracts supported facts and
                    cites the original text for your review.
                  </p>
                  <label className="fd-upload">
                    <FileText size={23} />
                    <strong>Add training text</strong>
                    <span>
                      .txt, .md or text PDF · up to 3 files · 6,000 extracted
                      characters each
                    </span>
                    <input
                      type="file"
                      disabled={busy || extracting}
                      accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
                      multiple
                      onChange={(e) => {
                        void trainingFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {brief.documents.map((doc, index) => (
                    <details
                      className="fd-document"
                      key={`${doc.name}-${index}`}
                    >
                      <summary>
                        <FileText size={14} />
                        {doc.name} <span>{doc.text.length} characters</span>
                      </summary>
                      <pre>{doc.text}</pre>
                      <button
                        className="text-button"
                        onClick={() =>
                          setBrief((b) => ({
                            ...b,
                            documents: b.documents.filter(
                              (_, i) => i !== index,
                            ),
                          }))
                        }
                      >
                        Remove from draft
                      </button>
                    </details>
                  ))}
                  <details className="fd-private">
                    <summary>Keep an original private attachment</summary>
                    <p>
                      Private file uploads are retained as evidence. They are
                      separate from training intake above. Scanned PDFs need OCR
                      or an approved text version; image text is not guessed.
                    </p>
                    <PrivateAttachments partnerId={partnerId} />
                  </details>
                  <button
                    className="button primary"
                    disabled={
                      busy ||
                      extracting ||
                      (!brief.websiteContext &&
                        !brief.documents.length &&
                        !brief.intakeSourceIds.length)
                    }
                    onClick={() => void extract()}
                  >
                    {extracting ? (
                      <LoaderCircle className="spin" size={15} />
                    ) : (
                      <ArrowUpRight size={15} />
                    )}
                    {extracting
                      ? "Extracting cited business facts…"
                      : "Extract business facts"}
                  </button>
                  <p className="fd-small">
                    Uses the configured model provider or your signed-in local
                    Codex session. Draft facts require owner verification.
                  </p>
                  <button
                    className="text-button"
                    disabled={busy || extracting}
                    onClick={advance}
                  >
                    {brief.websiteContext || brief.documents.length
                      ? "Enter and verify details manually"
                      : "Continue without documents"}
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
              {stage === 3 && (
                <div className="fd-question">
                  <h3>A few details, so we don’t guess.</h3>
                  <p>
                    Verify the facts already found, then answer only the missing
                    operational details. Editing a fact requires verifying it
                    again.
                  </p>
                  {brief.extractionReceipt && (
                    <div className="fd-extraction-receipt">
                      <span className="fd-small">
                        ACTUAL EXTRACTION RECEIPT
                      </span>
                      <p>
                        {brief.extractionReceipt.provider} ·{" "}
                        {brief.facts.length} source excerpts matched ·{" "}
                        {brief.extractionReceipt.tokens ?? "Unknown"} tokens
                      </p>
                      <small>
                        Request: {brief.extractionReceipt.requestId}
                      </small>
                    </div>
                  )}
                  {!!brief.facts.length && (
                    <section
                      className="fd-knowledge"
                      aria-label="Business knowledge review"
                    >
                      <h4>Your draft knowledge base</h4>
                      <p className="fd-small">
                        These are model-proposed values. An exact quote match
                        verifies source text, not the meaning of the claim.
                        Review each citation and confirm or correct its value.
                      </p>
                      {brief.facts.map((fact, index) => (
                        <article key={fact.field}>
                          <label>
                            {fact.field.replace(/([A-Z])/g, " $1")}
                            <textarea
                              aria-label={`Fact value: ${fact.field}`}
                              rows={2}
                              maxLength={1000}
                              value={fact.value}
                              onChange={(e) =>
                                updateFact(index, e.target.value, false)
                              }
                            />
                          </label>
                          <details>
                            <summary>Source citation</summary>
                            <blockquote>{fact.quote}</blockquote>
                            {fact.originalValue &&
                              fact.originalValue !== fact.value && (
                                <p className="fd-small">
                                  Owner correction · extracted value was “
                                  {fact.originalValue}”. The original source
                                  quote is preserved.
                                </p>
                              )}
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => openSource(fact.sourceId)}
                            >
                              Open original source <ArrowUpRight size={13} />
                            </button>
                          </details>
                          <label className="fd-checkbox">
                            <input
                              type="checkbox"
                              checked={fact.status === "confirmed"}
                              onChange={(e) =>
                                updateFact(index, fact.value, e.target.checked)
                              }
                            />
                            I verified this fact
                            {fact.status === "confirmed"
                              ? " · confirmed"
                              : " · draft"}
                          </label>
                        </article>
                      ))}
                    </section>
                  )}
                  <form key={`${state.id}:${partnerId}`} onSubmit={save}>
                    <p className="fd-small">
                      MISSING DETAILS / OWNER CONFIRMATION
                    </p>
                    <div className="fd-fields">
                      {!factConfirmed("bookingPurpose") && (
                        <label>
                          What should callers book?
                          <input
                            name="bookingPurpose"
                            defaultValue={brief.bookingPurpose}
                            required
                            maxLength={500}
                          />
                        </label>
                      )}
                      {!factConfirmed("appointmentMinutes") && (
                        <label>
                          Meeting length (minutes)
                          <input
                            name="appointmentMinutes"
                            type="number"
                            min={15}
                            max={120}
                            required
                            defaultValue={brief.appointmentMinutes}
                          />
                        </label>
                      )}
                    </div>
                    {!factConfirmed("businessHours") && (
                      <label>
                        Business hours
                        <input
                          name="businessHours"
                          defaultValue={brief.businessHours}
                          required
                          maxLength={500}
                        />
                      </label>
                    )}
                    {!factConfirmed("timeZone") && (
                      <label>
                        Business time zone
                        <input
                          name="timeZone"
                          defaultValue={brief.timeZone}
                          required
                          placeholder="America/Los_Angeles"
                          maxLength={100}
                        />
                      </label>
                    )}
                    {!factConfirmed("escalation") && (
                      <label>
                        When should a person take over?
                        <textarea
                          name="escalation"
                          defaultValue={brief.escalation}
                          required
                          minLength={5}
                          maxLength={1000}
                          rows={3}
                        />
                      </label>
                    )}
                    {!factConfirmed("pricing") && (
                      <label>
                        Pricing and commercial boundaries
                        <textarea
                          name="pricing"
                          defaultValue={brief.pricing}
                          maxLength={1000}
                          rows={3}
                        />
                      </label>
                    )}
                    <label className="fd-checkbox">
                      <input type="checkbox" required />I am the owner or
                      authorized editor and reviewed these business
                      instructions.
                    </label>
                    <button className="button primary" disabled={busy}>
                      {busy ? "Saving source version…" : "Save operating brief"}
                      <Check size={15} />
                    </button>
                  </form>
                </div>
              )}
              {stage === 4 && (
                <div className="fd-question">
                  <h3>Give the conversation somewhere to go.</h3>
                  <p>
                    {saved
                      ? "Your operating brief is saved. Connect the calendar, inbound phone agent, and optional SMS provider to make the full workflow live."
                      : "Save an operating brief before connecting a provider."}
                  </p>
                  {saved && (
                    <button
                      className="fd-saved"
                      onClick={() => openSource(saved.id)}
                    >
                      <Check size={15} />
                      <span>
                        Operating brief saved
                        <small>
                          {partner.name} ·{" "}
                          {new Date(saved.recordedAt).toLocaleString()}
                        </small>
                      </span>
                      <ArrowUpRight size={14} />
                    </button>
                  )}
                  {saved && (
                    <button className="text-button" onClick={() => setStage(3)}>
                      Edit and verify the knowledge base{" "}
                      <ArrowUpRight size={13} />
                    </button>
                  )}
                  {saved && (
                    <label>
                      Saved brief fingerprint
                      <input
                        readOnly
                        value={saved.hash}
                        onFocus={(event) => event.currentTarget.select()}
                      />
                      <span className="fd-small">
                        Before enabling bookings, review these business rules
                        against the server’s approved hours and time zone. Use
                        this fingerprint to approve this exact brief version;
                        edits require a new approval.
                      </span>
                    </label>
                  )}
                  <div className="fd-connections">
                    {(
                      [
                        [
                          "calendar",
                          "Google Calendar",
                          CalendarDays,
                          "Check availability and create the confirmed appointment.",
                        ],
                        [
                          "phone",
                          "Phone agent",
                          Phone,
                          "Answer an inbound call and use the scoped booking tools.",
                        ],
                        [
                          "sms",
                          "SMS confirmation",
                          MessageSquare,
                          "Submit the agreed booking details only after caller opt-in.",
                        ],
                      ] as const
                    ).map(([key, label, Icon, description]) => (
                      <article key={key}>
                        <Icon size={20} />
                        <div>
                          <h4>{label}</h4>
                          <p>{description}</p>
                          <small>
                            {connections
                              ? connections[key].configured
                                ? "Configured · live verification pending"
                                : "Setup required"
                              : "Checking configuration…"}
                          </small>
                        </div>
                        <button
                          className="button"
                          onClick={() => setSetup(key)}
                        >
                          {connections?.[key].configured
                            ? "View setup"
                            : "Connect"}
                          <ArrowUpRight size={13} />
                        </button>
                      </article>
                    ))}
                  </div>
                  {connectionError && (
                    <p role="alert" className="fd-message">
                      {connectionError}
                    </p>
                  )}
                  <p className="fd-small">
                    Configuration is not proof of a working integration. No
                    phone number, calendar event, or SMS delivery is simulated.
                  </p>
                  <p className="fd-small">
                    Reviewed hours and meeting rules must also be applied to the
                    server booking configuration and phone agent. Saving a brief
                    alone does not change those provider rules.
                  </p>
                  <BookingCard
                    key={`${state.id}:${partnerId}`}
                    partnerId={partnerId}
                    timeZone={brief.timeZone}
                  />
                </div>
              )}
              {error && (
                <p className="fd-message" role="alert">
                  {error}
                </p>
              )}
              {localAgent.error && (
                <p className="fd-message" role="alert">
                  {localAgent.error}
                </p>
              )}
            </>
          )}
        </section>
      </div>
      {saved && (
        <section className="fd-analysis">
          <div>
            <span className="fd-small">SOURCE REVIEW / QUARTERMASTER</span>
            <h3>Ask a real agent what’s missing.</h3>
            <p>
              Analyze the current program, including the saved business brief.
              This is source analysis; it does not place calls or make bookings.
            </p>
          </div>
          <button
            className="button primary"
            disabled={
              starting ||
              !!active ||
              (state.mode === "demo" && !localAgent.enabled)
            }
            onClick={() => void analyze()}
          >
            {active || starting ? (
              <LoaderCircle size={14} className="spin" />
            ) : (
              <ArrowUpRight size={14} />
            )}
            {active ? "Agent working…" : "Review setup with an agent"}
          </button>
          {latestRun && (
            <div className="fd-agent-result">
              <span className="fd-small">
                ACTUAL RUN · {latestRun.status} · INPUT v
                {latestRun.inputVersion}
              </span>
              <p>
                {latestRun.error ||
                  output?.summary ||
                  "The result will appear after the provider output and source citations are validated."}
              </p>
              <Link href={`${base}/agents`}>
                Read findings and execution receipts <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </section>
      )}
      {setup && (
        <Modal
          title={`Connect ${setup === "calendar" ? "Google Calendar" : setup === "phone" ? "your phone agent" : "SMS confirmations"}`}
          onClose={() => setSetup(null)}
        >
          <p>{connections?.[setup].detail}</p>
          {setup === "calendar" && (
            <ol>
              <li>Enable Google Calendar API in your Google Cloud project.</li>
              <li>
                Authorize the scheduling calendar with Calendar events and
                free/busy scopes. Keep its refresh token on the server.
              </li>
              <li>
                Configure the calendar credentials and bind the calendar to this
                live program.
              </li>
              <li>
                Run a live availability check, then confirm a test appointment
                and inspect its event receipt.
              </li>
            </ol>
          )}
          {setup === "phone" && (
            <ol>
              <li>
                Import an existing phone number into ElevenLabs and assign your
                voice agent.
              </li>
              <li>
                Provide the reviewed operating brief and approved training text
                as agent context.
              </li>
              <li>
                Configure the authenticated Alchemy availability and booking
                webhook tools, bound to one program and customer.
              </li>
              <li>
                Place a test inbound call, confirm the appointment, and verify
                the calendar and SMS receipts.
              </li>
            </ol>
          )}
          {setup === "sms" && (
            <ol>
              <li>
                Configure an approved Twilio sender and server credentials.
              </li>
              <li>
                Ask the caller for explicit consent to one booking confirmation
                message.
              </li>
              <li>
                Inspect the submission receipt and check delivery with your
                provider before claiming it was delivered.
              </li>
            </ol>
          )}
          <p className="fd-small">
            Account authorization and provider credentials are required. This
            button has not connected an account.
          </p>
          <Link
            className="button primary"
            href={`${base}/settings`}
            onClick={() => setSetup(null)}
          >
            Open workspace settings <ArrowUpRight size={14} />
          </Link>
        </Modal>
      )}
    </div>
  );
}
