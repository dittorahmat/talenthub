import React, { useState, useEffect } from 'react'
import { TalentHubClient, OutreachTemplateItem } from '../services/apiClient'
import { interpolateTemplate, buildWhatsAppUrl, buildEmailMailtoUrl } from '../utils/outreach'

interface OutreachTemplateModalProps {
  channel: 'whatsapp' | 'email'
  candidateName: string
  candidateEmail?: string | null
  candidatePhone?: string | null
  jobTitle?: string | null
  companyName?: string | null
  onClose: () => void
}

export function OutreachTemplateModal({
  channel,
  candidateName,
  candidateEmail,
  candidatePhone,
  jobTitle,
  companyName = 'TalentHub',
  onClose,
}: OutreachTemplateModalProps) {
  const [templates, setTemplates] = useState<OutreachTemplateItem[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | 'custom'>('custom')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Load existing templates
  useEffect(() => {
    let active = true
    TalentHubClient.templates
      .list(channel)
      .then((items) => {
        if (!active) return
        setTemplates(items)
        if (items.length > 0) {
          setSelectedTemplateId(items[0].id)
          setSubject(items[0].subject || '')
          setBody(items[0].body)
        } else {
          // Defaults if no templates saved yet
          if (channel === 'whatsapp') {
            setBody(`Halo {{candidate_name}}, kami dari tim rekrutmen telah mereview CV Anda untuk posisi {{job_title}} di {{company_name}} dan tertarik untuk mengundang Anda ke tahap wawancara. Kapan waktu luang Anda?`)
          } else {
            setSubject(`Proses Rekrutmen: {{job_title}} - {{company_name}}`)
            setBody(`Halo {{candidate_name}},\n\nTerima kasih atas ketertarikan Anda untuk bergabung bersama kami. Kami telah meninjau CV Anda untuk posisi {{job_title}} dan ingin mengundang Anda ke tahapan proses selanjutnya.\n\nSalam,\nTim Rekrutmen`)
          }
        }
      })
      .catch(() => {
        if (!active) return
        setTemplates([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [channel])

  const handleSelectTemplate = (idStr: string) => {
    if (idStr === 'custom') {
      setSelectedTemplateId('custom')
      return
    }
    const numId = Number(idStr)
    setSelectedTemplateId(numId)
    const t = templates.find((item) => item.id === numId)
    if (t) {
      setSubject(t.subject || '')
      setBody(t.body)
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!newTemplateName.trim() || !body.trim()) return
    try {
      const created = await TalentHubClient.templates.create({
        name: newTemplateName.trim(),
        channel,
        subject: channel === 'email' ? subject.trim() : undefined,
        body: body.trim(),
      })
      setTemplates((prev) => [created, ...prev])
      setSelectedTemplateId(created.id)
      setIsSavingNew(false)
      setNewTemplateName('')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save template', err)
    }
  }

  // Preview interpolated message
  const previewSubject = interpolateTemplate(subject, { candidateName, jobTitle, companyName })
  const previewBody = interpolateTemplate(body, { candidateName, jobTitle, companyName })

  const actionUrl =
    channel === 'whatsapp'
      ? buildWhatsAppUrl({
          phone: candidatePhone,
          candidateName,
          jobTitle,
          companyName,
          customMessage: body,
        })
      : buildEmailMailtoUrl({
          email: candidateEmail,
          candidateName,
          jobTitle,
          companyName,
          customSubject: subject,
          customBody: body,
        })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {channel === 'whatsapp' ? 'Kirim Pesan WhatsApp' : 'Kirim Email Kandidat'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kandidat: <span className="font-medium text-slate-700">{candidateName}</span> ({jobTitle || 'Posisi Terkait'})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 text-sm rounded-md"
          >
            Tutup
          </button>
        </div>

        {/* Template Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Pilih Template Pesan</label>
          <div className="flex gap-2">
            <select
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              disabled={loading}
            >
              <option value="custom">-- Tulis Pesan Kustom --</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsSavingNew(!isSavingNew)}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              {isSavingNew ? 'Batal' : '+ Simpan Template'}
            </button>
          </div>
          {saveSuccess && (
            <p className="text-xs text-teal-700 font-medium">Template berhasil disimpan.</p>
          )}
        </div>

        {/* Save as new template form */}
        {isSavingNew && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <label className="text-xs font-medium text-slate-700">Nama Template Baru</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Contoh: Undangan Wawancara Final"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-md px-3 py-1.5 text-slate-800"
              />
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700"
              >
                Simpan
              </button>
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-3">
          {channel === 'email' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subjek Email</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                placeholder="Subjek email..."
              />
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">Draf Pesan</label>
              <span className="text-[11px] text-slate-400">Variabel: {'{{candidate_name}}'}, {'{{job_title}}'}, {'{{company_name}}'}</span>
            </div>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              placeholder="Tulis pesan..."
            />
          </div>
        </div>

        {/* Live Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
          <div className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">Preview Pesan Terkirim</div>
          {channel === 'email' && (
            <div className="text-xs font-medium text-slate-900 border-b border-slate-200 pb-1">
              Subjek: {previewSubject}
            </div>
          )}
          <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
            {previewBody}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
          >
            Batal
          </button>
          <a
            href={actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs ${
              channel === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {channel === 'whatsapp' ? 'Buka WhatsApp Web' : 'Buka Aplikasi Email'}
          </a>
        </div>
      </div>
    </div>
  )
}
