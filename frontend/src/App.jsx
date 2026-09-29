import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'http://localhost:8000'

const facts = [
  { key: 'budget', label: 'Budget', mark: '$' },
  { key: 'timeline', label: 'Timeline', mark: 'T' },
  { key: 'decision_maker', label: 'Decision maker', mark: 'D' },
  { key: 'pain_points', label: 'Pain points', mark: '!' },
  { key: 'competitors', label: 'Competitors', mark: 'C' },
  { key: 'next_steps', label: 'Next steps', mark: '>' },
]

async function readApiResponse(response) {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.detail || `Request failed (${response.status})`)
  }
  return payload
}

function today() {
  const current = new Date()
  return new Date(current.getTime() - current.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)
}

function FactValue({ value }) {
  if (value === null || value === undefined || value === '') {
    return <span className="not-captured">Not captured</span>
  }

  if (Array.isArray(value)) {
    return value.length ? (
      <ul className="fact-values">
        {value.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ul>
    ) : <span className="not-captured">Not captured</span>
  }

  return <span className="fact-value">{value}</span>
}

function App() {
  const [transcript, setTranscript] = useState('')
  const [source, setSource] = useState('')
  const [meetingDate, setMeetingDate] = useState(today)
  const [extracted, setExtracted] = useState(null)
  const [memories, setMemories] = useState([])
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [processing, setProcessing] = useState(false)
  const [asking, setAsking] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [processError, setProcessError] = useState('')
  const [memoryError, setMemoryError] = useState('')
  const [askError, setAskError] = useState('')
  const [notice, setNotice] = useState('')

  async function refreshMemories() {
    setRefreshing(true)
    setMemoryError('')
    try {
      const response = await fetch(`${API_URL}/memories`)
      setMemories(await readApiResponse(response))
    } catch (error) {
      setMemoryError(error.message || 'Could not load memories.')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    refreshMemories()
  }, [])

  async function submitTranscript(event) {
    event.preventDefault()
    setProcessing(true)
    setProcessError('')
    setNotice('')

    try {
      const response = await fetch(`${API_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, source, date: meetingDate }),
      })
      const result = await readApiResponse(response)
      setExtracted(result.extracted)
      setNotice(`${result.memories_saved} memories saved`)
      await refreshMemories()
    } catch (error) {
      setProcessError(error.message || 'Could not process this transcript.')
    } finally {
      setProcessing(false)
    }
  }

  async function askQuestion(event) {
    event.preventDefault()
    setAsking(true)
    setAskError('')
    setAnswer('')

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const result = await readApiResponse(response)
      setAnswer(result.answer)
    } catch (error) {
      setAskError(error.message || 'Could not answer this question.')
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#workspace" aria-label="Deal Memory home">
          <span className="brand-glyph">D<span>.</span></span>
          <span>DEAL MEMORY</span>
        </a>
        <div className="topbar-right">
          <span className="online-indicator"><i /> API CONNECTED</span>
          <span className="topbar-divider" />
          <span className="workspace-name">SALES / WORKSPACE</span>
        </div>
      </header>

      <main className="workspace" id="workspace">
        <section className="page-intro">
          <div>
            <div className="breadcrumb">INTELLIGENCE <span>/</span> MEETINGS</div>
            <h1>Meeting memory</h1>
          </div>
          <div className="intro-count"><strong>{memories.length.toString().padStart(2, '0')}</strong><span>stored facts</span></div>
        </section>

        {(processError || memoryError) && (
          <div className="notice notice-error" role="alert">
            <span className="notice-mark">!</span>
            <span>{processError || memoryError}</span>
            {memoryError && <button type="button" className="text-button" onClick={refreshMemories}>Retry</button>}
          </div>
        )}
        {notice && !processError && <div className="notice notice-success" role="status">{notice}</div>}

        <div className="primary-grid">
          <section className="surface intake-surface">
            <div className="section-head">
              <div className="section-index">01</div>
              <div><p className="section-eyebrow">NEW RECORD</p><h2>Process a meeting</h2></div>
            </div>

            <form onSubmit={submitTranscript} className="intake-form">
              <div className="metadata-fields">
                <label className="field source-field">
                  <span>Source</span>
                  <input
                    value={source}
                    onChange={(event) => setSource(event.target.value)}
                    placeholder="Meeting name or ID"
                    required
                    disabled={processing}
                  />
                </label>
                <label className="field date-field">
                  <span>Date</span>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(event) => setMeetingDate(event.target.value)}
                    required
                    disabled={processing}
                  />
                </label>
              </div>
              <label className="field transcript-field">
                <span>Transcript</span>
                <textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  placeholder="Paste meeting transcript..."
                  rows={12}
                  required
                  disabled={processing}
                />
              </label>
              <div className="form-bottom">
                <span className="character-count">{transcript.length.toLocaleString()} characters</span>
                <button className="primary-button" type="submit" disabled={processing || !transcript.trim() || !source.trim()}>
                  {processing ? <><span className="spinner" /> Processing</> : <>Submit <span aria-hidden="true">-&gt;</span></>}
                </button>
              </div>
            </form>
          </section>

          <section className="surface extraction-surface" aria-live="polite">
            <div className="section-head section-head-spread">
              <div className="head-label-group">
                <div className="section-index index-amber">02</div>
                <div><p className="section-eyebrow">STRUCTURED NOTES</p><h2>Extracted facts</h2></div>
              </div>
              {extracted && <span className="status-tag"><i /> COMPLETE</span>}
            </div>

            {extracted ? (
              <div className="fact-grid">
                {facts.map(({ key, label, mark }) => (
                  <article className="fact-card" key={key}>
                    <div className="fact-card-head"><span className={`fact-mark fact-mark-${key}`}>{mark}</span><span>{label}</span></div>
                    <FactValue value={extracted[key]} />
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-extraction">
                <div className="empty-art" aria-hidden="true"><span /><span /><span /><span /></div>
                <p>Extraction waiting</p>
                <span>Submit a meeting to populate its facts.</span>
              </div>
            )}
          </section>
        </div>

        <section className="surface memories-surface">
          <div className="section-head section-head-spread memories-head">
            <div className="head-label-group">
              <div className="section-index index-blue">03</div>
              <div><p className="section-eyebrow">ACCOUNT CONTEXT</p><h2>Memory ledger <span className="ledger-total">{memories.length}</span></h2></div>
            </div>
            <button className="quiet-button" type="button" onClick={refreshMemories} disabled={refreshing}>
              <span className={refreshing ? 'refresh-symbol spinning' : 'refresh-symbol'} aria-hidden="true">&#8635;</span>
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>

          {memories.length ? (
            <div className="ledger-wrap">
              <div className="ledger-row ledger-header" aria-hidden="true">
                <span>TYPE</span><span>MEMORY</span><span>SOURCE</span><span>DATE</span>
              </div>
              <ul className="ledger-list">
                {memories.map((memory) => (
                  <li className="ledger-row" key={memory.id}>
                    <span className={`type-chip type-${memory.type}`}>{memory.type.replaceAll('_', ' ')}</span>
                    <span className="ledger-value">{memory.value}</span>
                    <span className="ledger-source">{memory.source}</span>
                    <time className="ledger-date" dateTime={memory.date}>{memory.date}</time>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="empty-ledger">
              <span className="empty-ledger-mark">M</span>
              <div><strong>No memories yet</strong><span>Processed meeting facts will appear here.</span></div>
            </div>
          )}
        </section>

        <section className="surface ask-surface">
          <div className="ask-copy">
            <div className="section-head">
              <div className="section-index index-lime">04</div>
              <div><p className="section-eyebrow">RECALL</p><h2>Ask across meetings</h2></div>
            </div>
            <p className="ask-description">Search saved details across your meeting history.</p>
          </div>
          <div className="ask-workarea">
            <form className="ask-form" onSubmit={askQuestion}>
              <label className="visually-hidden" htmlFor="meeting-question">Question</label>
              <input
                id="meeting-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What did we agree on last time?"
                required
                disabled={asking}
              />
              <button className="ask-button" type="submit" disabled={asking || !question.trim()}>
                {asking ? 'Thinking...' : 'Ask'} <span aria-hidden="true">-&gt;</span>
              </button>
            </form>
            {askError && <p className="ask-error" role="alert">{askError}</p>}
            {answer && <div className="answer-block" role="status"><span className="answer-label">ANSWER</span><p>{answer}</p></div>}
          </div>
        </section>

        <footer className="page-footer"><span>DEAL MEMORY <b>/</b> PRIVATE WORKSPACE</span><span>LOCAL API <b>127.0.0.1:8000</b></span></footer>
      </main>
    </div>
  )
}

export default App
