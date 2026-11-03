import React from 'react'

export function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)', color: 'var(--text)' }}>
      {/* Top Header / Brand Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '16px 32px'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)' }}>TalentHub</span>
            <span style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              background: 'var(--pill-neutral-bg)',
              color: 'var(--pill-neutral-ink)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border)'
            }}>
              v2.4 · Cloudflare Native
            </span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <a href="#how-it-works" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)', textDecoration: 'none' }}>Workflow</a>
            <a href="#evidence" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)', textDecoration: 'none' }}>Evidence</a>
            <a href="#pricing" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)', textDecoration: 'none' }}>Ledger & Pricing</a>
            <a href="#/superadmin" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)', textDecoration: 'none' }}>Superadmin</a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href="#/login"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text)',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--border)',
                background: 'var(--surface)'
              }}
            >
              Log in
            </a>
            <a
              href="#/register"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#ffffff',
                background: 'var(--accent)',
                textDecoration: 'none',
                padding: '8px 18px',
                borderRadius: 'var(--radius-control)'
              }}
            >
              Claim 20 Free Credits
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section: Type and Nothing Else Direction (Editorial Headline + Authentic App Preview) */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '96px 32px 72px' }}>
        <div style={{ maxWidth: '960px', marginBottom: '40px' }}>
          <div style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
            marginBottom: '16px'
          }}>
            Talent Screening Infrastructure · Southeast Asia
          </div>
          <h1 className="editorial-headline" style={{ fontSize: 'clamp(2.75rem, 5.5vw, 5rem)', color: 'var(--text)', marginBottom: '24px' }}>
            Evaluate hundreds of resumes in seconds. Settle every credit with mathematical precision.
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--muted)', maxWidth: '680px', lineHeight: 1.6, marginBottom: '32px' }}>
            Built specifically for high-volume hiring teams. TalentHub couples asynchronous Cloudflare queue processing with an audit-grade double-entry credit ledger and objective AI fit scoring.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a
              href="#/register"
              style={{
                background: 'var(--accent)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                padding: '12px 24px',
                borderRadius: 'var(--radius-control)',
                textDecoration: 'none'
              }}
            >
              Start Free Corporate Trial (20 Credits)
            </a>
            <a
              href="#/login"
              style={{
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: 500,
                padding: '12px 20px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--border)',
                textDecoration: 'none'
              }}
            >
              Explore Live Demo Workspace
            </a>
          </div>
        </div>

        {/* Authentic App Fragment (Achromatic Ledger Look) */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          marginTop: '48px'
        }}>
          {/* Mock Browser/Workspace Top */}
          <div style={{
            padding: '12px 20px',
            background: 'var(--raised)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#cbd5e1' }}></span>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#cbd5e1' }}></span>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#cbd5e1' }}></span>
              <span style={{ marginLeft: '12px', color: 'var(--muted)' }}>pipeline/senior-fullstack-engineer/screening</span>
            </div>
            <div style={{ display: 'flex', gap: '16px', color: 'var(--muted)' }}>
              <span>QUEUE: 0 IDLE</span>
              <span style={{ color: 'var(--positive)' }}>LEDGER: VERIFIED</span>
            </div>
          </div>

          {/* Table Fragment */}
          <div style={{ padding: '0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', background: 'var(--surface)' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 500 }}>Candidate</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500 }}>Role Applied</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500 }}>Fit Score</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500 }}>Match Status</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, textAlign: 'right' }}>Credit Settlement</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600 }}>Rian Pratama, S.Kom</td>
                  <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>Senior Fullstack Engineer</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="tabular-numbers" style={{ fontWeight: 700, color: 'var(--chart-primary)', fontSize: '14px' }}>92</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>/100</span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      background: 'var(--pill-positive-bg)',
                      color: 'var(--pill-positive-ink)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      STRONG MATCH
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)' }}>
                    -1 CR (SETTLED)
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600 }}>Citra Dewi</td>
                  <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>Senior Fullstack Engineer</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="tabular-numbers" style={{ fontWeight: 700, color: 'var(--chart-primary)', fontSize: '14px' }}>74</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>/100</span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      background: 'var(--pill-warning-bg)',
                      color: 'var(--pill-warning-ink)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      CONSIDER
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)' }}>
                    -1 CR (SETTLED)
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '14px 20px', fontWeight: 600 }}>Budi Santoso</td>
                  <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>Senior Fullstack Engineer</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="tabular-numbers" style={{ fontWeight: 700, color: 'var(--negative)', fontSize: '14px' }}>41</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>/100</span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      background: 'var(--pill-negative-bg)',
                      color: 'var(--pill-negative-ink)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      REJECT
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)' }}>
                    -1 CR (SETTLED)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Three Pillars: Substantive Capabilities */}
      <section id="evidence" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '80px 32px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '48px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>01 / ARCHITECTURE</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>Cloudflare Queue Asynchrony</h3>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
                Recruiters upload hundreds of PDF or TXT resumes in one drop. Our queue consumers orchestrate parsing and LLM screening concurrently without thread bottlenecks or browser timeouts.
              </p>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>02 / INTEGRITY</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>Strict Double-Entry Ledger</h3>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
                Every AI evaluation reserves credit atomically. Corrupted files and parsing faults trigger automatic immediate refunds. Your ledger balance always matches your bank of processed candidates.
              </p>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>03 / COLLABORATION</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>Executive 1-Page Summary</h3>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
                Cut hiring manager review time by 80%. Generate a concise WhatsApp-formatted overview, structured interview questions based on candidate skill gaps, and secure tokenized share links.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Transparent Ledger & Pricing Section */}
      <section id="pricing" style={{ borderTop: '1px solid var(--border)', background: 'var(--ground)', padding: '80px 32px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ maxWidth: '640px', marginBottom: '48px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>TRANSPARENT LEDGER PACKAGES</div>
            <h2 className="editorial-headline" style={{ fontSize: '36px', color: 'var(--text)', marginBottom: '16px' }}>
              Pay strictly per screened candidate. No monthly waste.
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.6 }}>
              Top up credits instantly via QRIS or Indonesian Virtual Accounts. Credits never expire and remain bound to your organization's multi-tenant workspace.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {/* Starter */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Starter Tier</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>For single position screening batches</div>
                <div className="tabular-numbers" style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                  Rp 150.000
                </div>
                <div style={{ fontSize: '13px', color: 'var(--chart-primary)', fontWeight: 600, marginBottom: '24px' }}>
                  100 Verified AI Screenings
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Includes candidate fit scoring, gap analysis, and 1-page WhatsApp summary generation.
                </div>
              </div>
              <a
                href="#/register"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: 'var(--raised)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-control)',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginTop: '32px',
                  textDecoration: 'none'
                }}
              >
                Get Started
              </a>
            </div>

            {/* Growth */}
            <div style={{
              background: 'var(--surface)',
              border: '2px solid var(--text)',
              borderRadius: 'var(--radius-card)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Growth Tier</div>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--text)',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    RECOMMENDED
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>Ideal for growing hiring agencies & tech teams</div>
                <div className="tabular-numbers" style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                  Rp 600.000
                </div>
                <div style={{ fontSize: '13px', color: 'var(--chart-primary)', fontWeight: 600, marginBottom: '24px' }}>
                  500 Verified AI Screenings
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Full multi-tenant collaboration, async Cloudflare batch processing, and tokenized share links.
                </div>
              </div>
              <a
                href="#/register"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: 'var(--accent)',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-control)',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginTop: '32px',
                  textDecoration: 'none'
                }}
              >
                Claim Growth Package
              </a>
            </div>

            {/* Enterprise */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>High Volume</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>Bulk seasonal recruitment campaigns</div>
                <div className="tabular-numbers" style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                  Rp 2.500.000
                </div>
                <div style={{ fontSize: '13px', color: 'var(--chart-primary)', fontWeight: 600, marginBottom: '24px' }}>
                  2.500 Verified AI Screenings
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Priority queue processing, tailored qualification rubrics, and automated audit reports.
                </div>
              </div>
              <a
                href="#/register"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: 'var(--raised)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-control)',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginTop: '32px',
                  textDecoration: 'none'
                }}
              >
                Inquire High Volume
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '48px 32px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--muted)' }}>
          <div>
            © 2026 TalentHub AI · Production Worker: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>talenthub.tech1solusi.workers.dev</code>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <a href="#/superadmin" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Superadmin Portal</a>
            <a href="#/login" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Workspace Sign In</a>
            <a href="#/register" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Corporate Free Trial</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
