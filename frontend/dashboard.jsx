import React, { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  Clock3,
  Database,
  Lightbulb,
  LoaderCircle,
  Send,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { api } from "./api.js";

const statDefinitions = [
  { label: "Meetings tracked", type: "meetings", tone: "gold", icon: CalendarDays },
  { label: "Memory records", type: "memories", tone: "purple", icon: Database },
  { label: "Budgets captured", type: "budget", tone: "amber", icon: Target },
  { label: "Decision makers", type: "decision_maker", tone: "pink", icon: Users },
  { label: "Pain points", type: "pain_points", tone: "rose", icon: Activity },
  { label: "Next steps", type: "next_steps", tone: "blue", icon: Sparkles },
];

function groupMemories(memories) {
  const groups = new Map();

  for (const memory of memories) {
    const source = memory.source?.trim() || "Untitled meeting";
    const key = `${source}::${memory.date || ""}`;
    const group = groups.get(key) || { key, source, date: memory.date, memories: [] };
    group.memories.push(memory);
    if (memory.date > group.date) group.date = memory.date;
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date));
}

function readableType(type) {
  return type.replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function EmptyState({ loading, query }) {
  return (
    <div className="connected-empty">
      <Database size={22} />
      <strong>{loading ? "Loading saved records" : query ? "No matching records" : "Nothing here yet"}</strong>
      <span>{query ? "Try another search." : "Process a meeting transcript to populate this view."}</span>
    </div>
  );
}

export default function ConnectedDashboard({ loading, query, memories, page, apiError, onRefresh }) {
  const [source, setSource] = useState("");
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState("");
  const [processError, setProcessError] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");

  const groups = useMemo(() => groupMemories(memories), [memories]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = normalizedQuery
    ? groups.filter((group) =>
        `${group.source} ${group.memories.map((item) => item.value).join(" ")}`
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : groups;
  const matchingMemories = normalizedQuery
    ? memories.filter((memory) =>
        `${memory.source} ${memory.type} ${memory.value}`.toLowerCase().includes(normalizedQuery)
      )
    : memories;
  const counts = useMemo(() => {
    const values = Object.fromEntries(statDefinitions.map(({ type }) => [type, 0]));
    values.meetings = groups.length;
    values.memories = memories.length;
    for (const memory of memories) {
      if (Object.hasOwn(values, memory.type) && memory.type !== "meetings" && memory.type !== "memories") {
        values[memory.type] += 1;
      }
    }
    return values;
  }, [groups.length, memories]);

  const nextSteps = matchingMemories.filter((memory) => memory.type === "next_steps").slice(-4).reverse();

  async function handleProcess(event) {
    event.preventDefault();
    if (!source.trim() || !transcript.trim()) {
      setProcessError("Enter a meeting name and a non-empty transcript.");
      return;
    }
    setProcessing(true);
    setProcessMessage("");
    setProcessError("");
    try {
      const result = await api.processMeeting({
        transcript,
        source: source.trim(),
        date: meetingDate,
      });
      const refreshed = await onRefresh();
      setProcessMessage(refreshed
        ? `Saved ${result.memories_saved} memory records. Dashboard updated.`
        : `Saved ${result.memories_saved} memory records, but the dashboard could not refresh.`);
      setTranscript("");
    } catch (error) {
      setProcessError(error.message || "Could not process this meeting.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleAsk(event) {
    event.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAskError("");
    setAnswer("");
    try {
      const result = await api.ask(question.trim());
      setAnswer(result.answer);
    } catch (error) {
      setAskError(error.message || "Could not get an answer.");
    } finally {
      setAsking(false);
    }
  }

  const meetingForm = (
    <section className="panel-card meeting-import" id="meeting-import">
      <div className="panel-head small-head">
        <div className="panel-title-wrap"><Sparkles size={15} /><span>Process a meeting</span></div>
      </div>
      <form className="meeting-form" onSubmit={handleProcess}>
        <div className="meeting-fields">
          <label>Meeting or account name
            <input required value={source} onChange={(event) => { setSource(event.target.value); setProcessError(""); }} placeholder="e.g. Acme discovery" />
          </label>
          <label>Date
            <input required type="date" value={meetingDate} onChange={(event) => { setMeetingDate(event.target.value); setProcessError(""); }} />
          </label>
        </div>
        <label>Transcript
          <textarea required minLength={1} value={transcript} onChange={(event) => { setTranscript(event.target.value); setProcessError(""); }} placeholder="Paste meeting notes or a transcript..." />
        </label>
        <div className="meeting-submit-row">
          <span className={processError ? "inline-error" : "inline-success"} role="status">
            {processError || processMessage || "Saved results appear in the dashboard immediately."}
          </span>
          <button className="ask-thread-button" type="submit" disabled={processing}>
            {processing ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}
            {processing ? "Processing" : "Process transcript"}
          </button>
        </div>
      </form>
    </section>
  );

  const assistantPanel = (
    <aside className="assistant-panel">
      <div className="assistant-header">
        <div className="assistant-title-wrap"><Bot size={16} /><strong>Ask your memory</strong></div>
      </div>
      <div className="assistant-content">
        <div className="chat-row bot-row">Ask a question about information extracted from your processed meetings.</div>
        {answer && <div className="chat-row bot-row">{answer}</div>}
        {askError && <div className="inline-error">{askError}</div>}
      </div>
      <form className="assistant-input-box" onSubmit={handleAsk}>
        <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about your meetings..." />
        <button type="submit" aria-label="Ask" disabled={asking || !question.trim()}>{asking ? <LoaderCircle size={16} className="spin" /> : <Send size={15} />}</button>
      </form>
    </aside>
  );

  if (page !== "Home") {
    return (
      <div className="dashboard-page">
        <div className="hero-copy section-hero">
          <h1>{page}</h1>
          <p>{page === "Deals" ? "Account facts grouped from your processed conversations." : `Live ${page.toLowerCase()} data from your meeting memory.`}</p>
        </div>

        {page === "Deals" && (
          <section className="panel-card">
            <div className="panel-head small-head">
              <div className="panel-title-wrap"><Target size={15} /><span>Accounts from meeting sources</span></div>
              <span className="category-pill">{visibleGroups.length}</span>
            </div>
            <p className="view-note">Deal stages and values are not stored by the current backend. These account summaries show only extracted facts.</p>
            {visibleGroups.length ? <div className="records-grid">
              {visibleGroups.map((group) => (
                <article className="record-card" key={group.key}>
                  <div className="record-card-head">
                    <div className="deal-avatar purple">{group.source.slice(0, 1).toUpperCase()}</div>
                    <div className="deal-meta"><strong>{group.source}</strong><span>{formatDate(group.date)}</span></div>
                    <span className="record-count">{group.memories.length}</span>
                  </div>
                  <div className="record-facts">
                    {group.memories.filter((item) => ["budget", "timeline", "decision_maker"].includes(item.type)).map((item) => (
                      <div className="record-fact" key={item.id}><span>{readableType(item.type)}</span><strong>{item.value}</strong></div>
                    ))}
                  </div>
                </article>
              ))}
            </div> : <EmptyState loading={loading} query={normalizedQuery} />}
          </section>
        )}

        {page === "Meetings" && <div className="secondary-grid">
          {meetingForm}
          <section className="panel-card">
            <div className="panel-head small-head"><div className="panel-title-wrap"><CalendarDays size={15} /><span>Processed meetings</span></div></div>
            {visibleGroups.length ? <div className="next-step-list">
              {visibleGroups.map((group) => <div className="next-step-item" key={group.key}>
                <span className="next-step-dot" /><div><strong>{group.source}</strong><small>{formatDate(group.date)} · {group.memories.length} extracted records</small></div>
              </div>)}
            </div> : <EmptyState loading={loading} query={normalizedQuery} />}
          </section>
        </div>}

        {page === "Memory" && <section className="panel-card">
          <div className="panel-head small-head"><div className="panel-title-wrap"><Database size={15} /><span>Extracted memory records</span></div><span className="category-pill">{matchingMemories.length}</span></div>
          {matchingMemories.length ? <div className="memory-table">
            {matchingMemories.slice().reverse().map((memory) => <article className="memory-row" key={memory.id}>
              <span className="memory-type">{readableType(memory.type)}</span><strong>{memory.value}</strong><span>{memory.source}</span><time>{formatDate(memory.date)}</time>
            </article>)}
          </div> : <EmptyState loading={loading} query={normalizedQuery} />}
        </section>}

        {page === "Insights" && <>
          <div className="metric-grid">
            {statDefinitions.map(({ label, type, tone, icon: Icon }) => <div key={type} className={`metric-card ${tone}`}>
              <div className="metric-topline"><div className="metric-icon"><Icon size={16} /></div></div>
              <div className="metric-label">{label}</div><div className="metric-value">{loading ? "..." : counts[type]}</div>
              <div className="metric-meta">Calculated from saved records</div>
            </div>)}
          </div>
          <section className="panel-card"><div className="panel-head small-head"><div className="panel-title-wrap"><Lightbulb size={15} /><span>Next steps mentioned</span></div></div>
            {nextSteps.length ? <div className="next-step-list">{nextSteps.map((memory) => <div className="next-step-item" key={memory.id}><span className="next-step-dot" /><div><strong>{memory.value}</strong><small>{memory.source} · {formatDate(memory.date)}</small></div></div>)}</div> : <EmptyState loading={loading} query={normalizedQuery} />}
          </section>
        </>}

        {page === "AI Assistant" && <div className="assistant-page-view">{assistantPanel}</div>}

        {page === "Settings" && <section className="panel-card settings-panel">
          <div className="panel-head small-head"><div className="panel-title-wrap"><Activity size={15} /><span>Backend connection</span></div></div>
          <div className="setting-row"><div><strong>Memory API</strong><span>{apiError || (loading ? "Checking connection..." : "Connected; data loads from the backend API")}</span></div><span className={`connection-state ${apiError ? "offline" : "online"}`}>{apiError ? "Offline" : loading ? "Checking" : "Online"}</span></div>
          <div className="setting-row"><div><strong>API address</strong><span>Configured frontend backend endpoint</span></div><code>{import.meta.env.VITE_API_BASE || "http://localhost:8000"}</code></div>
          <div className="setting-row"><div><strong>Storage</strong><span>Transcript memories are persisted by the backend in SQLite.</span></div><Database size={16} /></div>
          <button className="refresh-button" onClick={onRefresh} disabled={loading}><Activity size={15} /> Refresh backend data</button>
        </section>}
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="hero-row">
        <div className="hero-copy">
          <h1>Sales memory <span className="hero-spark">✦</span></h1>
          <p>Live intelligence from the meetings you process.</p>
        </div>
        <a className="ask-thread-button" href="#meeting-import">
          <Bot size={16} /> Add a meeting <ArrowRight size={16} />
        </a>
      </div>

      <div className="metric-grid">
        {statDefinitions.map(({ label, type, tone, icon: Icon }) => (
          <div key={type} className={`metric-card ${tone}`}>
            <div className="metric-topline"><div className="metric-icon"><Icon size={16} /></div></div>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{loading ? "..." : counts[type]}</div>
            <div className="metric-meta">From saved backend records</div>
          </div>
        ))}
      </div>

      <div className="board-layout">
        <div className="board-panel">
          <div className="panel-head">
            <div className="panel-title-wrap"><CalendarDays size={16} /><span>Processed meetings</span></div>
            <span className="category-pill">{visibleGroups.length} meetings</span>
          </div>
          {visibleGroups.length ? (
            <div className="records-grid">
              {visibleGroups.map((group) => (
                <article className="record-card" key={group.key}>
                  <div className="record-card-head">
                    <div className="deal-avatar purple">{group.source.slice(0, 1).toUpperCase()}</div>
                    <div className="deal-meta"><strong>{group.source}</strong><span>{formatDate(group.date)}</span></div>
                    <span className="record-count">{group.memories.length}</span>
                  </div>
                  <div className="record-facts">
                    {group.memories.slice(0, 4).map((memory) => (
                      <div className="record-fact" key={memory.id}>
                        <span>{readableType(memory.type)}</span>
                        <strong>{memory.value}</strong>
                      </div>
                    ))}
                    {group.memories.length > 4 && <span className="record-more">+{group.memories.length - 4} more records</span>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="connected-empty">
              <Database size={22} />
              <strong>{loading ? "Loading saved meetings" : normalizedQuery ? "No matching meetings" : "No meetings processed yet"}</strong>
              <span>{normalizedQuery ? "Try another search." : "Process a transcript to add the first live records here."}</span>
            </div>
          )}
        </div>

        <aside className="assistant-panel">
          <div className="assistant-header">
            <div className="assistant-title-wrap"><Bot size={16} /><strong>Ask your memory</strong></div>
          </div>
          <div className="assistant-content">
            <div className="chat-row bot-row">Ask a question about information extracted from your processed meetings.</div>
            {answer && <div className="chat-row bot-row">{answer}</div>}
            {askError && <div className="inline-error">{askError}</div>}
          </div>
          <form className="assistant-input-box" onSubmit={handleAsk}>
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about your meetings..." />
            <button type="submit" aria-label="Ask" disabled={asking || !question.trim()}>{asking ? <LoaderCircle size={16} className="spin" /> : <Send size={15} />}</button>
          </form>
        </aside>
      </div>

      <div className="bottom-grid">
        <section className="panel-card meeting-import" id="meeting-import">
          <div className="panel-head small-head">
            <div className="panel-title-wrap"><Sparkles size={15} /><span>Process a meeting</span></div>
          </div>
          <form className="meeting-form" onSubmit={handleProcess}>
            <div className="meeting-fields">
              <label>Meeting or account name
                <input required value={source} onChange={(event) => setSource(event.target.value)} placeholder="e.g. Acme discovery" />
              </label>
              <label>Date
                <input required type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} />
              </label>
            </div>
            <label>Transcript
              <textarea required minLength={1} value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="Paste meeting notes or a transcript..." />
            </label>
            <div className="meeting-submit-row">
              <span className={processError ? "inline-error" : "inline-success"} role="status">
                {processError || processMessage || "Saved results appear in the dashboard immediately."}
              </span>
              <button className="ask-thread-button" type="submit" disabled={processing}>
                {processing ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}
                {processing ? "Processing" : "Process transcript"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel-card timeline-card">
          <div className="panel-head small-head">
            <div className="panel-title-wrap"><Lightbulb size={15} /><span>Next steps from meetings</span></div>
            <Clock3 size={15} />
          </div>
          {nextSteps.length ? (
            <div className="next-step-list">
              {nextSteps.map((memory) => (
                <div className="next-step-item" key={memory.id}>
                  <span className="next-step-dot" />
                  <div><strong>{memory.value}</strong><small>{memory.source} · {formatDate(memory.date)}</small></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="connected-empty compact-empty"><span>No next steps found in processed meetings yet.</span></div>
          )}
        </section>
      </div>
    </div>
  );
}