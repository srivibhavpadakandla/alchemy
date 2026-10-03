"use client";
import "./email-automation.css";
import { useEffect, useState } from "react";
import { useGuild } from "./Workspace";

const triggers = [
  "kickoff",
  "task assignment",
  "due reminder",
  "missing measurement",
  "trial end",
] as const;
type Trigger = (typeof triggers)[number];
type Delivery = {
  key: string;
  recipient: string;
  sender: string;
  subject: string;
  body: string;
  event: string;
  status: string;
  provider_id: string | null;
  error: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
};
type Draft = {
  recipients: string;
  triggers: Trigger[];
  timeZone: string;
  time: string;
  subject: string;
  template: string;
};
const initial: Draft = {
  recipients: "",
  triggers: ["due reminder", "missing measurement", "trial end"],
  timeZone: "America/Los_Angeles",
  time: "09:00",
  subject: "{{customer}} · {{trigger}}",
  template:
    "Hello {{customer}},\n\n{{task}}\nDue: {{due}}\n\nReview your shared trial: {{reportUrl}}\n\nPlease sign in using your invited account. Contact the trial owner if you need access.",
};

export function EmailAutomationPanel({ partnerId }: { partnerId: string }) {
  const { state } = useGuild();
  const customer = state.partners.find((p) => p.id === partnerId);
  const plan = state.trialPlans.filter((p) => p.partnerId === partnerId).at(-1);
  const [draft, setDraft] = useState<Draft>(initial);
  const [setup, setSetup] = useState({
    configured: false,
    schedulerConfigured: false,
    enabled: false,
  });
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [reviewDigest, setReviewDigest] = useState("");
  const [validatedPreviews, setValidatedPreviews] = useState<
    { trigger: Trigger; subject: string; text: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setDraft(initial);
    setReviewed(false);
    setDeliveries([]);
    setError("");
    if (revision === 0) setMessage("");
    setReviewDigest("");
    setValidatedPreviews([]);
    setSetup({ configured: false, schedulerConfigured: false, enabled: false });
    if (state.mode !== "live") return;
    fetch(
      `/api/email-automation?programId=${encodeURIComponent(state.id)}&partnerId=${encodeURIComponent(partnerId)}`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error || "Email setup could not be loaded.");
        if (!active) return;
        setSetup({
          configured: b.configured,
          schedulerConfigured: b.schedulerConfigured,
          enabled: !!b.rule?.enabled,
        });
        setDeliveries(b.deliveries ?? []);
        if (b.rule?.last_error) setError(b.rule.last_error);
        if (b.rule?.payload)
          setDraft({
            ...b.rule.payload,
            recipients: b.rule.payload.recipients.join(", "),
          });
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [state.id, state.mode, partnerId, revision]);
  if (!customer) return null;
  const patch = (value: Partial<Draft>) => {
    setDraft((old) => ({ ...old, ...value }));
    setReviewed(false);
    setReviewDigest("");
    setValidatedPreviews([]);
    setMessage("");
  };
  const ready =
    state.mode === "live" &&
    setup.configured &&
    setup.schedulerConfigured &&
    !!plan?.founderApprovalSourceId &&
    !!plan?.customerApprovalSourceId;
  const preview = (trigger: Trigger, value: string) => {
    const task = state.trialTasks.find(
      (t) =>
        t.partnerId === partnerId &&
        t.planVersion === plan?.version &&
        t.owner === "customer" &&
        t.status !== "done",
    );
    const action =
      trigger === "kickoff"
        ? "Review the shared trial plan and arrange kickoff."
        : trigger === "trial end"
          ? "Review the sourced trial results together. Buying and payment decisions remain explicit."
          : trigger === "missing measurement"
            ? `Record the agreed ${plan?.metric.name ?? "trial"} measurement with its source.`
            : (task?.title ??
              "No open customer-owned task; this trigger is suppressed.");
    return value
      .replaceAll("{{customer}}", customer.name)
      .replaceAll("{{trigger}}", trigger)
      .replaceAll("{{task}}", action)
      .replaceAll(
        "{{due}}",
        trigger === "trial end"
          ? (plan?.end ?? "No plan yet")
          : trigger === "kickoff"
            ? (plan?.start ?? "No plan yet")
            : (task?.due ?? "Next eligible day"),
      )
      .replaceAll("{{reportUrl}}", `/customer/${state.id}/${partnerId}`);
  };
  const save = async (
    action: "draft" | "enable" | "pause" | "cancel" | "preview",
  ) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body =
        action === "pause" || action === "cancel"
          ? { programId: state.id, partnerId, action }
          : {
              ...draft,
              programId: state.id,
              partnerId,
              expectedVersion: state.version,
              recipients: draft.recipients
                .split(/[,;\n]/)
                .map((s) => s.trim())
                .filter(Boolean),
              enabled: action === "enable",
              reviewed: true,
              action,
              reviewDigest,
            };
      const r = await fetch("/api/email-automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const b = await r.json();
      if (!r.ok)
        throw Error(b.error || "Email configuration could not be saved.");
      if (action === "preview") {
        setReviewDigest(b.reviewDigest);
        setValidatedPreviews(b.previews);
        setMessage(
          "Current message previews validated. Review them and check the authorization box to continue.",
        );
        return;
      }
      setRevision((n) => n + 1);
      setMessage(
        action === "enable"
          ? "Automation enabled. The scheduler re-checks the trial before each submission."
          : action === "draft"
            ? "Reviewed draft saved; automation remains off."
            : "Automation paused. Unsubmitted messages are cancelled; in-flight messages cannot be recalled.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Email update failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel email-automation">
      <div className="trial-plan-bar">
        <h3>Customer email automation</h3>
        <span className="tag">{setup.enabled ? "Enabled" : "Off"}</span>
      </div>
      <p>
        Review the recipient list and exact message before enabling. Messages
        link to the scoped customer portal and exclude internal notes.
      </p>
      {!ready && (
        <p className="muted">
          Setup blocked:{" "}
          {state.mode !== "live"
            ? "use a hosted authenticated workspace"
            : !plan?.founderApprovalSourceId || !plan?.customerApprovalSourceId
              ? "both sides must review the current plan"
              : !setup.configured
                ? "connect Resend and configure a verified sender"
                : "connect the durable job scheduler"}
          . Automation cannot be enabled until setup is complete.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save("draft");
        }}
      >
        <div className="trial-two-column">
          <label>
            Customer email recipients · maximum 5
            <input
              type="text"
              value={draft.recipients}
              onChange={(e) => patch({ recipients: e.target.value })}
              placeholder="owner@your-customer.example"
              required
            />
          </label>
          <label>
            Time zone
            <input
              value={draft.timeZone}
              onChange={(e) => patch({ timeZone: e.target.value })}
              required
            />
          </label>
          <label>
            Daily sending time
            <input
              type="time"
              value={draft.time}
              onChange={(e) => patch({ time: e.target.value })}
              required
            />
          </label>
        </div>
        <p className="muted">
          The scheduler checks every 15 minutes and sends at or after this local
          time. Assignments and kickoff send once; overdue reminders send at
          most daily; missing measurement requests send at most weekly.
        </p>
        <fieldset>
          <legend>Triggers</legend>
          {triggers.map((t) => (
            <label className="email-trigger" key={t}>
              <input
                type="checkbox"
                checked={draft.triggers.includes(t)}
                onChange={(e) =>
                  patch({
                    triggers: e.target.checked
                      ? [...draft.triggers, t]
                      : draft.triggers.filter((a) => a !== t),
                  })
                }
              />
              {t}
            </label>
          ))}
        </fieldset>
        <label>
          Subject
          <input
            maxLength={180}
            value={draft.subject}
            onChange={(e) => patch({ subject: e.target.value })}
            required
          />
        </label>
        <label>
          Plain text message
          <textarea
            rows={7}
            maxLength={4000}
            value={draft.template}
            onChange={(e) => patch({ template: e.target.value })}
            required
          />
        </label>
        <p className="muted">
          Available fields:{" "}
          {"{{customer}}, {{trigger}}, {{task}}, {{due}}, {{reportUrl}}"}.
          Portal links require an invited signed-in account.
        </p>
        <details open>
          <summary>Review message previews</summary>
          {draft.triggers.map((t) => (
            <article className="email-preview" key={t}>
              <small>
                {t.toUpperCase()} ·{" "}
                {draft.recipients || "No recipients entered"}
              </small>
              <strong>
                {(
                  validatedPreviews.find((p) => p.trigger === t)?.subject ||
                  preview(t, draft.subject)
                )
                  .replace(/[\r\n]+/g, " ")
                  .slice(0, 180)}
              </strong>
              <p className="preserve-lines">
                {validatedPreviews.find((p) => p.trigger === t)?.text ||
                  preview(t, draft.template)}
              </p>
            </article>
          ))}
          <p className="muted">
            Previews show message wording. No scheduled delivery or sent receipt
            is implied. The live portal URL uses the configured application
            origin. Task names, due dates and missing measurement requests are
            filled from the current shared trial at send time; completed tasks
            and paused trials are suppressed.
          </p>
        </details>
        <button
          type="button"
          className="button"
          disabled={
            busy ||
            state.mode !== "live" ||
            !plan?.customerApprovalSourceId ||
            !plan?.founderApprovalSourceId
          }
          onClick={() => void save("preview")}
        >
          Validate current previews
        </button>
        <label className="email-trigger">
          <input
            type="checkbox"
            checked={reviewed}
            disabled={state.mode === "live" && !reviewDigest}
            onChange={(e) => setReviewed(e.target.checked)}
          />
          I reviewed recipients, wording, triggers, time zone and schedule, and
          authorize these templates with current shared trial fields for these
          customer emails.
        </label>
        <div className="trial-plan-bar">
          <button
            className="button"
            disabled={
              busy ||
              !reviewed ||
              !reviewDigest ||
              state.mode !== "live" ||
              !plan?.customerApprovalSourceId ||
              !plan?.founderApprovalSourceId
            }
          >
            Save reviewed draft
          </button>
          <button
            type="button"
            className="button primary"
            disabled={
              busy ||
              !reviewed ||
              !reviewDigest ||
              !ready ||
              !draft.recipients ||
              !draft.triggers.length
            }
            onClick={() => void save("enable")}
          >
            {busy ? "Saving…" : "Enable automation"}
          </button>
          <button
            type="button"
            className="button"
            disabled={busy || state.mode !== "live" || !setup.enabled}
            onClick={() => void save("pause")}
          >
            Pause / cancel queue
          </button>
        </div>
      </form>
      <h4>Send history</h4>
      <p className="muted">
        Accepted means the provider accepted the request. Delivered requires the
        provider’s delivery receipt. Reply detection is not connected. Pausing
        cannot recall messages already submitted.
      </p>
      <button
        type="button"
        className="text-button"
        disabled={busy || state.mode !== "live"}
        onClick={() => setRevision((n) => n + 1)}
      >
        Refresh actual receipts ↗
      </button>
      {deliveries.length ? (
        deliveries.map((d) => (
          <details key={d.key} className="email-history">
            <summary>
              {d.recipient} · {d.status} · {d.created_at}
            </summary>
            <p>
              From: {d.sender}
              <br />
              Trigger: {d.event}
              <br />
              Provider receipt: {d.provider_id || "None"}
              <br />
              Attempts: {d.attempts}
              <br />
              Last checked: {d.updated_at}
            </p>
            <strong>{d.subject}</strong>
            <p className="preserve-lines">{d.body}</p>
            {d.error && <p role="status">{d.error}</p>}
          </details>
        ))
      ) : (
        <p>No email submissions recorded.</p>
      )}
    </section>
  );
}
