"use client";
import { FormEvent, useState } from "react";
import { CalendarDays, Check, ArrowUpRight } from "lucide-react";
import { useGuild } from "../Workspace";
type Receipt = {
  status: string;
  calendarStatus: string;
  smsStatus: string;
  eventId?: string;
  smsId?: string;
  error?: string;
  refreshError?: string;
  smsErrorCode?: string;
  providerCheckedAt?: string;
  operatorAction?: string;
};
export function BookingCard({
  partnerId,
  timeZone,
}: {
  partnerId: string;
  timeZone: string;
}) {
  const { state } = useGuild();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [checked, setChecked] = useState(""),
    [bookingKey, setBookingKey] = useState("");
  const live = state.mode === "live";
  const check = async (form: HTMLFormElement) => {
    setBusy(true);
    setMessage("");
    setChecked("");
    setReceipt(null);
    try {
      const f = new FormData(form),
        start = new Date(String(f.get("start"))).toISOString(),
        end = new Date(String(f.get("end"))).toISOString();
      const r = await fetch(
        `/api/frontdesk/availability?${new URLSearchParams({ programId: state.id, partnerId, start, end })}`,
        { cache: "no-store" },
      );
      const body = await r.json();
      if (!r.ok) throw Error(body.error || "Calendar check failed.");
      if (!body.available) {
        setMessage("That window is unavailable. Choose another time.");
        return;
      }
      setChecked(`${start}/${end}`);
      setBookingKey(crypto.randomUUID());
      setMessage(
        "The calendar reports this window free. Confirm the details before booking; availability is checked again on submit.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Availability check failed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const book = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const f = new FormData(event.currentTarget),
        start = new Date(String(f.get("start"))).toISOString(),
        end = new Date(String(f.get("end"))).toISOString();
      if (checked !== `${start}/${end}`)
        throw Error("Check the updated appointment window before confirming.");
      const r = await fetch("/api/frontdesk/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: state.id,
          partnerId,
          start,
          end,
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          timeZone,
          key: bookingKey,
          confirmed: f.get("confirmed") === "on",
          smsConsent: f.get("smsConsent") === "on",
        }),
      });
      const body = await r.json();
      if (!r.ok) throw Error(body.error || "Booking failed.");
      setReceipt(body);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Booking failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="frontdesk-booking">
      <span className="fd-small">
        <CalendarDays size={15} /> LIVE BOOKING
      </span>
      <h3>A time you can actually confirm.</h3>
      <p>
        Check the calendar, confirm the caller’s details, then write the
        appointment. SMS is a separate opt-in step.
      </p>
      {!live && (
        <p className="fd-blocked">
          External bookings are disabled in the fictional sandbox. Use an
          authenticated workspace and configured providers for a real call,
          calendar write, and SMS receipt.
        </p>
      )}
      <form
        onSubmit={book}
        onChange={(event) => {
          if (
            event.target instanceof HTMLInputElement &&
            ["start", "end"].includes(event.target.name)
          )
            setChecked("");
        }}
      >
        <fieldset disabled={!live || busy}>
          <div className="fd-fields">
            <label>
              Appointment starts
              <input name="start" type="datetime-local" required />
            </label>
            <label>
              Appointment ends
              <input name="end" type="datetime-local" required />
            </label>
          </div>
          <p className="fd-small">
            Enter times in this device’s local time zone. Calendar display zone:{" "}
            {timeZone}.
          </p>
          <button
            type="button"
            className="button"
            onClick={(event) => void check(event.currentTarget.form!)}
          >
            Check availability <ArrowUpRight size={14} />
          </button>
          <div className="fd-fields">
            <label>
              Caller name
              <input name="name" required maxLength={160} autoComplete="name" />
            </label>
            <label>
              Caller email
              <input name="email" type="email" required autoComplete="email" />
            </label>
          </div>
          <label>
            Caller phone · international format
            <input
              name="phone"
              type="tel"
              placeholder="+1…"
              autoComplete="tel"
            />
          </label>
          <label className="fd-checkbox">
            <input type="checkbox" name="confirmed" required /> The caller
            explicitly confirmed this appointment window and details.
          </label>
          <label className="fd-checkbox">
            <input type="checkbox" name="smsConsent" /> The caller opted in to
            one SMS with the booking details.
          </label>
          <button className="button primary" disabled={!checked || busy}>
            {busy ? "Checking provider…" : "Confirm and book"}{" "}
            <Check size={14} />
          </button>
        </fieldset>
      </form>
      {message && (
        <p role="status" className="fd-message">
          {message}
        </p>
      )}
      {receipt && (
        <div className="fd-receipt" role="status">
          <strong>Provider receipt · {receipt.status}</strong>
          <p>
            Calendar: {receipt.calendarStatus} · SMS: {receipt.smsStatus}
          </p>
          {receipt.eventId && (
            <p>
              Calendar event: <code>{receipt.eventId}</code>
            </p>
          )}
          {receipt.smsId && (
            <p>
              SMS submission: <code>{receipt.smsId}</code>
            </p>
          )}
          {receipt.error && <p>{receipt.error}</p>}
          {receipt.operatorAction && (
            <p>Owner action: {receipt.operatorAction}</p>
          )}
          {receipt.refreshError && (
            <p>Receipt refresh: {receipt.refreshError}</p>
          )}
          {receipt.smsErrorCode && (
            <p>SMS provider error: {receipt.smsErrorCode}</p>
          )}
          {receipt.providerCheckedAt && (
            <p>
              Provider checked:{" "}
              {new Date(receipt.providerCheckedAt).toLocaleString()}
            </p>
          )}
          {live && bookingKey && (
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setMessage("");
                try {
                  const r = await fetch("/api/frontdesk/booking", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "refresh",
                      programId: state.id,
                      partnerId,
                      key: bookingKey,
                    }),
                  });
                  const body = await r.json();
                  if (!r.ok)
                    throw Error(
                      body.error || "Could not refresh provider receipts.",
                    );
                  setReceipt(body);
                } catch (e) {
                  setMessage(
                    e instanceof Error
                      ? e.message
                      : "Could not refresh provider receipts.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Refresh provider receipts <ArrowUpRight size={13} />
            </button>
          )}
          <small>
            A booking is not a completed trial, accepted paid offer, or payment.
            SMS submission is not proof of delivery.
          </small>
        </div>
      )}
    </section>
  );
}
