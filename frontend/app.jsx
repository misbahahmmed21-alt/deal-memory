import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Gauge,
  Home,
  Lightbulb,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { api } from "./api.js";
import ConnectedDashboard from "./dashboard.jsx";

const NAV = [
  ["Home", Home],
  ["Deals", Target],
  ["Meetings", CalendarDays],
  ["Memory", MessageSquare],
  ["Insights", Lightbulb],
  ["AI Assistant", Bot],
  ["Settings", Settings],
];

const metricCards = [
  { label: "Total Deals", value: 12, meta: "↑ 2 this week", tone: "gold", icon: Gauge },
  { label: "Active Accounts", value: 8, meta: "↑ 1 new", tone: "purple", icon: Users },
  { label: "Meetings This Week", value: 24, meta: "↑ 6%", tone: "amber", icon: CalendarDays },
  { label: "Revenue Pipeline", value: "$3.4M", meta: "↑ 12%", tone: "pink", icon: TrendingUp },
  { label: "Deals at Risk", value: 3, meta: "↓ 1", tone: "rose", icon: Activity },
  { label: "AI Insights", value: 18, meta: "↑ 5", tone: "blue", icon: Sparkles },
];

const pipelineStages = [
  {
    title: "Leads",
    accent: "purple",
    deals: [
      { name: "Acme Corporation", amount: "$450K", status: "Discovery", initials: "A", time: "2 days ago" },
      { name: "Zenith Ltd", amount: "$300K", status: "Inbound", initials: "Z", time: "4 days ago" },
      { name: "Orion Systems", amount: "$280K", status: "Outreach", initials: "O", time: "5 days ago" },
    ],
  },
  {
    title: "Qualified",
    accent: "teal",
    deals: [
      { name: "Northstar Solutions", amount: "$320K", status: "Proposal", initials: "N", time: "1 day ago" },
      { name: "Vertex Inc", amount: "$540K", status: "Demo", initials: "V", time: "3 days ago" },
      { name: "Summit Tech", amount: "$210K", status: "Qualification", initials: "S", time: "5 days ago" },
    ],
  },
  {
    title: "Proposal",
    accent: "amber",
    deals: [
      { name: "Globex Corp", amount: "$780K", status: "Proposal", initials: "G", time: "1 day ago" },
      { name: "Horizon Labs", amount: "$520K", status: "Pricing", initials: "H", time: "2 days ago" },
    ],
  },
  {
    title: "Negotiation",
    accent: "rose",
    deals: [
      { name: "Falcon Industries", amount: "$900K", status: "Negotiation", initials: "F", time: "3 days ago" },
    ],
  },
  {
    title: "Closed",
    accent: "green",
    deals: [
      { name: "BrightPath Co", amount: "$540K", status: "Close", initials: "B", time: "1 week ago" },
    ],
  },
];

function App() {
  const [page, setPage] = useState("Home");
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [query, setQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const searchInput = useRef(null);

  async function loadMemories() {
    try {
      setLoading(true);
      setApiError("");
      const data = await api.getMemories();
      setMemories(Array.isArray(data) ? data : []);
      return true;
    } catch (error) {
      setMemories([]);
      setApiError("Backend is unavailable. Dashboard records could not be loaded.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  function navigate(nextPage) {
    setPage(nextPage);
    setNotificationsOpen(false);
    setActionsOpen(false);
  }

  useEffect(() => {
    loadMemories();
  }, []);

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
        setNotificationsOpen(false);
        setActionsOpen(false);
      }
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setActionsOpen(false);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <div className="brand-mark-inner" />
          </div>
          <div className="brand-copy">
            <div className="brand-name">THREAD</div>
            <div className="brand-subtitle">Deal Intelligence Agent</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map(([label, Icon]) => (
            <button
              key={label}
              className={`nav-item ${page === label ? "active" : ""}`}
              onClick={() => navigate(label)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-callout">
          <div className="callout-glow" />
          <div className="callout-title">Your AI copilot</div>
          <div className="callout-copy">for every deal.</div>
          <div className="callout-actions">
            <button className="callout-button" aria-label="Add a meeting" onClick={() => navigate("Meetings")}>+</button>
            <button className="callout-button callout-next" aria-label="Open AI assistant" onClick={() => navigate("AI Assistant")}>→</button>
          </div>
        </div>

        <div className="sidebar-profile">
          <div className="profile-avatar">M</div>
          <div className="profile-copy">
            <strong>Misbah Ahmed</strong>
            <span>Sales Team</span>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-search">
            <Search size={15} />
            <input ref={searchInput} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search accounts, memories, meetings..." />
            <span className="search-shortcut">Ctrl K</span>
          </div>

          <div className="topbar-actions">
            <button
              className="icon-button"
              aria-label="Recent memory updates"
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setActionsOpen(false);
              }}
            >
              <Bell size={16} />
            </button>
            <div className="profile-pill">
              <div className="small-avatar">M</div>
              <div className="profile-text">
                <strong>Misbah Ahmed</strong>
                <span>Sales Team</span>
              </div>
            </div>
            <button
              className="icon-button"
              aria-label="Open actions"
              aria-expanded={actionsOpen}
              onClick={() => {
                setActionsOpen((open) => !open);
                setNotificationsOpen(false);
              }}
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
          {notificationsOpen && (
            <div className="topbar-popover" role="status">
              <strong>Recent memory updates</strong>
              {memories.length ? memories.slice(-3).reverse().map((memory) => (
                <div className="popover-row" key={memory.id}>
                  <span>{memory.source}</span>
                  <small>{memory.type.replaceAll("_", " ")}: {memory.value}</small>
                </div>
              )) : <span className="popover-empty">No processed meeting updates yet.</span>}
            </div>
          )}
          {actionsOpen && (
            <div className="topbar-popover action-popover">
              <button onClick={loadMemories}><Activity size={14} /> Refresh dashboard</button>
              <button onClick={() => navigate("Settings")}><Settings size={14} /> Backend settings</button>
            </div>
          )}
        </header>

        {apiError && (
          <div className="connection-banner">
            <Activity size={14} />
            <span>{apiError}</span>
            <button onClick={loadMemories}>Retry</button>
          </div>
        )}

        <section className="content-shell">
          <ConnectedDashboard
            loading={loading}
            query={query}
            memories={memories}
            page={page}
            apiError={apiError}
            onRefresh={loadMemories}
          />
        </section>
      </main>
    </div>
  );
}

function DashboardView({ loading, query, sources, memories }) {
  const filtered = query
    ? pipelineStages.flatMap((stage) =>
        stage.deals.filter((deal) =>
          `${deal.name} ${deal.status}`.toLowerCase().includes(query.toLowerCase())
        )
      )
    : [];

  const summary = [
    { title: "Total Deals", value: "12", change: "+2 this week", tone: "gold", icon: Gauge },
    { title: "Active Accounts", value: "8", change: "+1 new", tone: "purple", icon: Users },
    { title: "Meetings This Week", value: "24", change: "+6%", tone: "amber", icon: CalendarDays },
    { title: "Revenue Pipeline", value: "$3.4M", change: "+12%", tone: "pink", icon: TrendingUp },
    { title: "Deals at Risk", value: "3", change: "-1", tone: "rose", icon: Activity },
    { title: "AI Insights", value: "18", change: "+5", tone: "blue", icon: Sparkles },
  ];

  return (
    <div className="dashboard-page">
      <div className="hero-row">
        <div className="hero-copy">
          <h1>
            Good afternoon, Misbah <span className="hero-spark">✦</span>
          </h1>
          <p>Your sales memory is working. Here&apos;s what&apos;s happening with your deals.</p>
        </div>
        <div className="hero-badge">
          <span className="hero-badge-text">Better conversations.</span>
          <span className="hero-badge-text hero-badge-small">Bigger wins.</span>
        </div>
        <button className="ask-thread-button">
          <Bot size={16} /> Ask Thread <ArrowRight size={16} />
        </button>
      </div>

      <div className="metric-grid">
        {summary.map(({ title, value, change, tone, icon: Icon }) => (
          <div key={title} className={`metric-card ${tone}`}>
            <div className="metric-topline">
              <div className="metric-icon">
                <Icon size={16} />
              </div>
            </div>
            <div className="metric-label">{title}</div>
            <div className="metric-value">{loading ? "—" : value}</div>
            <div className="metric-meta">{change}</div>
            <div className="sparkline">
              <span /><span /><span /><span /><span /><span />
            </div>
          </div>
        ))}
      </div>

      <div className="board-layout">
        <div className="board-panel">
          <div className="panel-head">
            <div className="panel-title-wrap">
              <Target size={16} />
              <span>Sales Pipeline</span>
            </div>
            <button className="category-pill">All Deals</button>
            <div className="mini-search">
              <Search size={12} />
              <span>Search deals...</span>
            </div>
          </div>

          <div className="pipeline-columns">
            {pipelineStages.map((stage) => (
              <div key={stage.title} className={`pipeline-col ${stage.accent}`}>
                <div className="pipeline-column-head">
                  <span>{stage.title}</span>
                  <strong>{stage.deals.length}</strong>
                </div>

                {stage.deals.map((deal) => (
                  <div key={`${stage.title}-${deal.name}`} className="deal-card">
                    <div className="deal-card-top">
                      <div className={`deal-avatar ${stage.accent}`}>{deal.initials}</div>
                      <div className="deal-meta">
                        <strong>{deal.name}</strong>
                        <span>{deal.status}</span>
                      </div>
                      <div className="deal-amount">{deal.amount}</div>
                    </div>
                    <div className="deal-footer">
                      <span>{deal.time}</span>
                      <ChevronRight size={13} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <aside className="assistant-panel">
          <div className="assistant-header">
            <div className="assistant-title-wrap">
              <Bot size={16} />
              <strong>AI Assistant</strong>
            </div>
            <button className="assistant-close" aria-label="Close assistant"><X size={14} /></button>
          </div>

          <div className="assistant-content">
            <div className="chat-row user-row">
              <span>What are the main objections from Northstar, and how should I handle them?</span>
            </div>
            <div className="chat-row bot-row">
              <span>Based on your previous conversations with Northstar, there are three main objections and how to handle them.</span>
            </div>

            <div className="insight-list">
              <div className="insight-pill">
                <span>1. Pricing concerns</span>
                <strong>High Priority</strong>
              </div>
              <div className="insight-copy">
                They feel your pricing is higher than competitors. Focus on ROI and long-term value.
              </div>

              <div className="insight-pill">
                <span>2. Integration timeline</span>
                <strong>Medium</strong>
              </div>
              <div className="insight-copy">
                They need integration within 30 days. Showcase your implementation plan.
              </div>

              <div className="insight-pill">
                <span>3. Security & compliance</span>
                <strong>Medium</strong>
              </div>
              <div className="insight-copy">
                Their CTO wants detailed security documentation. Be ready with case studies and certifications.
              </div>
            </div>
          </div>

          <div className="assistant-input-box">
            <input placeholder="Ask anything about your deals..." />
            <button>↑</button>
          </div>
        </aside>
      </div>

      <div className="bottom-grid">
        <div className="panel-card intelligence-card">
          <div className="panel-head small-head">
            <div className="panel-title-wrap">
              <Lightbulb size={15} />
              <span>Deal Intelligence</span>
            </div>
            <button className="text-link">View All</button>
          </div>

          <div className="deal-intelligence-item">
            <div className="deal-intel-avatar">N</div>
            <div className="deal-intel-copy">
              <div className="intel-header">
                <strong>Northstar Solutions</strong>
                <span className="priority-badge">High Priority</span>
              </div>
              <div className="intel-sub">Enterprise • $32K • 500 users</div>
              <div className="progress-bar">
                <span style={{ width: "60%" }} />
              </div>
            </div>
          </div>

          <div className="intel-meta-row">
            <div className="meta-pill">3 key stakeholders</div>
            <div className="meta-pill">12 memories</div>
            <div className="meta-pill">4 risks</div>
          </div>
        </div>

        <div className="panel-card timeline-card">
          <div className="panel-head small-head">
            <div className="panel-title-wrap">
              <Clock3 size={15} />
              <span>Deal Timeline</span>
            </div>
            <button className="text-link">View All</button>
          </div>

          <div className="timeline-row">
            <div className="timeline-step active">
              <span className="dot" />
              <label>Discovery</label>
              <small>Sep 12</small>
            </div>
            <div className="timeline-step active">
              <span className="dot" />
              <label>Pricing</label>
              <small>Sep 20</small>
            </div>
            <div className="timeline-step active">
              <span className="dot" />
              <label>Security</label>
              <small>Oct 08</small>
            </div>
            <div className="timeline-step">
              <span className="dot" />
              <label>Proposal</label>
              <small>Oct 12</small>
            </div>
            <div className="timeline-step">
              <span className="dot" />
              <label>Review</label>
              <small>Oct 16</small>
            </div>
          </div>

          <div className="recommendation-box">
            <div className="recommendation-title">AI Recommendation</div>
            <div className="recommendation-text">
              Schedule a security review with their technical team before the next call on Oct 8. Address pricing with ROI reasoning and prepare an integration timeline (30 days).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
