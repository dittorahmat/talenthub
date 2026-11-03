import React from 'react'
import { landingCopy } from '../constants/copy'

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
            <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)' }}>{landingCopy.brand.name}</span>
            <span style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              background: 'var(--pill-neutral-bg)',
              color: 'var(--pill-neutral-ink)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border)'
            }}>
              {landingCopy.brand.version}
            </span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <a href="#how-it-works" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)', textDecoration: 'none' }}>{landingCopy.nav.workflow}</a>
            <a href="#evidence" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)', textDecoration: 'none' }}>{landingCopy.nav.evidence}</a>
            <a href="#pricing" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)', textDecoration: 'none' }}>{landingCopy.nav.pricing}</a>
            <a href="#/superadmin" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)', textDecoration: 'none' }}>{landingCopy.nav.superadmin}</a>
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
              {landingCopy.nav.login}
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
              {landingCopy.nav.claimTrial}
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
            {landingCopy.brand.eyebrow}
          </div>
          <h1 className="editorial-headline" style={{ fontSize: 'clamp(2.75rem, 5.5vw, 5rem)', color: 'var(--text)', marginBottom: '24px' }}>
            {landingCopy.hero.headline}
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--muted)', maxWidth: '680px', lineHeight: 1.6, marginBottom: '32px' }}>
            {landingCopy.hero.subhead}
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
              {landingCopy.hero.ctaPrimary}
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
              {landingCopy.hero.ctaSecondary}
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
              <span>ANTREAN: 0 SIAP</span>
              <span style={{ color: 'var(--positive)' }}>BUKU BESAR: TERVERIFIKASI</span>
            </div>
          </div>

          {/* Table Fragment */}
          <div style={{ padding: '0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', background: 'var(--surface)' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 500 }}>Kandidat</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500 }}>Posisi Dilamar</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500 }}>Skor Kecocokan</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500 }}>Rekomendasi</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, textAlign: 'right' }}>Status Saldo</th>
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
                      SANGAT COCOK
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)' }}>
                    -1 KREDIT (SELESAI)
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
                      PERTIMBANGKAN
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)' }}>
                    -1 KREDIT (SELESAI)
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
                      TIDAK COCOK
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)' }}>
                    -1 KREDIT (SELESAI)
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
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>01 / KECEPATAN</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>Pemrosesan Antrean Cepat</h3>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
                Upload puluhan atau ratusan file CV PDF dan TXT sekaligus dalam satu drop. Sistem antrean memproses ekstraksi teks dan penilaian AI secara simultan tanpa risiko browser macet atau timeout.
              </p>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>02 / KEPASTIAN BIAYA</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>Jaminan Saldo Transparan</h3>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
                Setiap evaluasi menggunakan sistem reservasi kredit yang aman. File rusak, corrupt, atau tidak terbaca otomatis memicu pengembalian kredit seketika (refund 100%) ke dompet Anda.
              </p>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>03 / KOLABORASI</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>Ringkasan Eksekutif 1 Halaman</h3>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
                Pangkas waktu review hiring manager hingga 80%. Hasilkan ringkasan siap kirim via WhatsApp, panduan pertanyaan wawancara adaptif berbasis gap keahlian, dan link token share yang aman.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Transparent Ledger & Pricing Section */}
      <section id="pricing" style={{ borderTop: '1px solid var(--border)', background: 'var(--ground)', padding: '80px 32px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ maxWidth: '640px', marginBottom: '48px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>PAKET KREDIT TRANSPARAN</div>
            <h2 className="editorial-headline" style={{ fontSize: '36px', color: 'var(--text)', marginBottom: '16px' }}>
              Bayar per kandidat yang dievaluasi. Skema saldo prabayar fleksibel.
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.6 }}>
              Isi ulang saldo kredit instan via QRIS atau Virtual Account bank lokal. Kredit berlaku selamanya dan dapat digunakan bersama seluruh tim rekrutmen Anda.
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
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Paket Pemula</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>Ideal untuk pembukaan 1 posisi kerja</div>
                <div className="tabular-numbers" style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                  Rp 150.000
                </div>
                <div style={{ fontSize: '13px', color: 'var(--chart-primary)', fontWeight: 600, marginBottom: '24px' }}>
                  100 Evaluasi CV Terverifikasi
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Termasuk skor kecocokan AI, analisis kesenjangan skill, dan ringkasan eksekutif format WhatsApp.
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
                Mulai Sekarang
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
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Paket Pertumbuhan</div>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--text)',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    PILIHAN TERBAIK
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>Untuk agensi rekrutmen & tim teknologi berkembang</div>
                <div className="tabular-numbers" style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                  Rp 600.000
                </div>
                <div style={{ fontSize: '13px', color: 'var(--chart-primary)', fontWeight: 600, marginBottom: '24px' }}>
                  500 Evaluasi CV Terverifikasi
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Kolaborasi multi-pengguna, pemrosesan batch otomatis, dan tautan ringkasan kandidat berizin aman.
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
                Pilih Paket Pertumbuhan
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
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Paket Volume Tinggi</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>Perekrutan massal dan kampanye musiman</div>
                <div className="tabular-numbers" style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                  Rp 2.500.000
                </div>
                <div style={{ fontSize: '13px', color: 'var(--chart-primary)', fontWeight: 600, marginBottom: '24px' }}>
                  2.500 Evaluasi CV Terverifikasi
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Prioritas antrean tertinggi, rubrik evaluasi kustom per divisi, dan laporan audit transaksi lengkap.
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
                Pilih Volume Tinggi
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
            <a href="#/superadmin" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Portal Superadmin</a>
            <a href="#/login" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Masuk Workspace</a>
            <a href="#/register" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Uji Coba Perusahaan Gratis</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
