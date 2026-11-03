import React from 'react'

export function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Navigation Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #E2E8F0',
        padding: '14px 24px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px',
              boxShadow: '0 4px 10px rgba(13, 148, 136, 0.3)'
            }}>
              T
            </div>
            <div>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>TalentHub</span>
              <span style={{ marginLeft: '8px', fontSize: '11px', background: '#CCFBF1', color: '#0F766E', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>AI SAAS</span>
            </div>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <a href="#features" style={{ fontSize: '14px', fontWeight: 500, color: '#475569', textDecoration: 'none' }}>Fitur</a>
            <a href="#workflow" style={{ fontSize: '14px', fontWeight: 500, color: '#475569', textDecoration: 'none' }}>Cara Kerja</a>
            <a href="#pricing" style={{ fontSize: '14px', fontWeight: 500, color: '#475569', textDecoration: 'none' }}>Harga Kredit</a>
            <a href="#faq" style={{ fontSize: '14px', fontWeight: 500, color: '#475569', textDecoration: 'none' }}>FAQ</a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href="#/login"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#0F172A',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1'
              }}
            >
              Masuk
            </a>
            <a
              href="#/register"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'white',
                background: '#0D9488',
                textDecoration: 'none',
                padding: '8px 18px',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(13, 148, 136, 0.3)'
              }}
            >
              Mulai Free Trial
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '72px 24px 60px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#F0FDFA',
          border: '1px solid #99F6E4',
          borderRadius: '24px',
          padding: '6px 16px',
          fontSize: '13px',
          color: '#0F766E',
          fontWeight: 600,
          marginBottom: '24px'
        }}>
          <span>✨ Generasi Baru Talent Intelligence Platform</span>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#0D9488' }} />
          <span>Screening CV 10x Lebih Cepat</span>
        </div>

        <h1 style={{ fontSize: '52px', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-1.5px', maxWidth: '850px', margin: '0 auto 20px', color: '#0F172A' }}>
          Screening Ratusan CV dalam Hitungan Detik dengan <span style={{ color: '#0D9488' }}>AI Talent Intelligence</span>
        </h1>

        <p style={{ fontSize: '18px', color: '#475569', maxWidth: '640px', margin: '0 auto 36px', lineHeight: 1.6 }}>
          Otomatisasi evaluasi kualifikasi pelamar, deteksi kecocokan skill, kalkulasi skor objektif, dan rangkuman 1-halaman kandidat siap wawancara langsung ke WhatsApp.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '48px' }}>
          <a
            href="#/register"
            style={{
              background: '#0D9488',
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
              padding: '14px 28px',
              borderRadius: '10px',
              textDecoration: 'none',
              boxShadow: '0 10px 25px -5px rgba(13, 148, 136, 0.4)'
            }}
          >
            Daftar & Dapatkan 20 Kredit Gratis
          </a>
          <a
            href="#/login"
            style={{
              background: 'white',
              color: '#334155',
              border: '1px solid #CBD5E1',
              fontSize: '16px',
              fontWeight: 600,
              padding: '14px 24px',
              borderRadius: '10px',
              textDecoration: 'none'
            }}
          >
            Buka Workspace Demo
          </a>
        </div>

        {/* Feature Highlights Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', textAlign: 'left', marginTop: '30px' }}>
          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>
              ⚡
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>Batch CV Processing</h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6 }}>
              Unggah hingga puluhan CV sekaligus. Cloudflare Queues memproses parsing, OCR, dan penilaian AI di latar belakang secara asinkron tanpa browser lag.
            </p>
          </div>

          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>
              🎯
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>Objective Scoring & Bands</h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6 }}>
              Setiap kandidat diberi skor 0-100 dan kategori (High, Medium, Low) lengkap dengan daftar matched skills, gap skills, dan pertanyaan penggugur otomatis.
            </p>
          </div>

          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>
              📲
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>1-Click Summary & WhatsApp</h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6 }}>
              Bagikan ringkasan profil kandidat, pertanyaan wawancara rekomendasi, dan link review interaktif ke hiring manager secara instan via WhatsApp atau PDF.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ background: 'white', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>Harga Kredit Pay-as-You-Go Fleksibel</h2>
          <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '600px', margin: '0 auto 48px' }}>
            Tanpa biaya langganan bulanan yang hangus. Beli paket kredit sesuai kebutuhan screening perusahaan Anda. 1 kredit = 1 CV full AI screening.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', textAlign: 'left' }}>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '32px', background: '#F8FAFC' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>Starter</h3>
              <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>Cocok untuk lowongan single position</p>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', margin: '24px 0 8px' }}>Rp 150.000</div>
              <div style={{ fontSize: '14px', color: '#0D9488', fontWeight: 600, marginBottom: '24px' }}>100 Kredit AI Screening</div>
              <a href="#/register" style={{ display: 'block', textAlign: 'center', background: 'white', border: '1px solid #CBD5E1', padding: '12px', borderRadius: '8px', color: '#0F172A', fontWeight: 600, textDecoration: 'none' }}>
                Pilih Starter
              </a>
            </div>

            <div style={{ border: '2px solid #0D9488', borderRadius: '16px', padding: '32px', background: 'white', position: 'relative', boxShadow: '0 10px 25px -5px rgba(13, 148, 136, 0.15)' }}>
              <div style={{ position: 'absolute', top: '-12px', right: '24px', background: '#0D9488', color: 'white', fontSize: '11px', fontWeight: 800, padding: '3px 12px', borderRadius: '12px', textTransform: 'uppercase' }}>
                Paling Populer
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>Growth</h3>
              <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>Ideal untuk tim rekrutmen aktif</p>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', margin: '24px 0 8px' }}>Rp 600.000</div>
              <div style={{ fontSize: '14px', color: '#0D9488', fontWeight: 600, marginBottom: '24px' }}>500 Kredit AI Screening</div>
              <a href="#/register" style={{ display: 'block', textAlign: 'center', background: '#0D9488', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>
                Pilih Growth
              </a>
            </div>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '32px', background: '#F8FAFC' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>Enterprise</h3>
              <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>Volume tinggi & bulk hiring</p>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', margin: '24px 0 8px' }}>Rp 2.500.000</div>
              <div style={{ fontSize: '14px', color: '#0D9488', fontWeight: 600, marginBottom: '24px' }}>2.500 Kredit AI Screening</div>
              <a href="#/register" style={{ display: 'block', textAlign: 'center', background: 'white', border: '1px solid #CBD5E1', padding: '12px', borderRadius: '8px', color: '#0F172A', fontWeight: 600, textDecoration: 'none' }}>
                Pilih Enterprise
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#64748B' }}>
        <div>
          © 2026 TalentHub AI · Dedicated Talent Intelligence Platform
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="#/superadmin" style={{ color: '#94A3B8', textDecoration: 'none' }}>Portal Superadmin (Testing)</a>
          <a href="#/login" style={{ color: '#64748B', textDecoration: 'none' }}>Sign In</a>
          <a href="#/register" style={{ color: '#64748B', textDecoration: 'none' }}>Claim Free Trial</a>
        </div>
      </footer>
    </div>
  )
}
