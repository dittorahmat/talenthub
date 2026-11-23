import React, { useState, useEffect } from 'react'
import {
  TalentHubClient,
  ScorecardItem,
  ScorecardAggregate,
  CandidateNoteItem,
} from '../services/apiClient'

interface CandidateScorecardTabProps {
  applicantId: number
  candidateName: string
}

export function CandidateScorecardTab({ applicantId, candidateName }: CandidateScorecardTabProps) {
  const [scorecards, setScorecards] = useState<ScorecardItem[]>([])
  const [aggregate, setAggregate] = useState<ScorecardAggregate | null>(null)
  const [teamNotes, setTeamNotes] = useState<CandidateNoteItem[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [techScore, setTechScore] = useState<number>(4)
  const [cultScore, setCultScore] = useState<number>(4)
  const [commScore, setCommScore] = useState<number>(4)
  const [recommendation, setRecommendation] = useState<'Strong Yes' | 'Yes' | 'Neutral' | 'No'>('Yes')
  const [evalNotes, setEvalNotes] = useState('')
  const [isSubmittingScore, setIsSubmittingScore] = useState(false)
  const [newTeamNote, setNewTeamNote] = useState('')
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)

  const loadData = () => {
    Promise.all([
      TalentHubClient.scorecards.get(applicantId),
      TalentHubClient.teamNotes.list(applicantId),
    ])
      .then(([scRes, notesRes]) => {
        setScorecards(scRes.scorecards)
        setAggregate(scRes.aggregate)
        setTeamNotes(notesRes)
      })
      .catch((err) => console.error('Failed to load scorecards/notes', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [applicantId])

  const handleSubmitScorecard = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingScore(true)
    try {
      await TalentHubClient.scorecards.create(applicantId, {
        technicalScore: techScore,
        cultureScore: cultScore,
        communicationScore: commScore,
        recommendation,
        notes: evalNotes.trim() || undefined,
      })
      setEvalNotes('')
      loadData()
    } catch (err) {
      console.error('Failed to submit scorecard', err)
    } finally {
      setIsSubmittingScore(false)
    }
  }

  const handleAddTeamNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamNote.trim()) return
    setIsSubmittingNote(true)
    try {
      await TalentHubClient.teamNotes.create(applicantId, newTeamNote.trim())
      setNewTeamNote('')
      loadData()
    } catch (err) {
      console.error('Failed to add team note', err)
    } finally {
      setIsSubmittingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        Memuat lembar evaluasi dan catatan kolaborasi...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Aggregate Overview Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">
              Konsensus Evaluasi Tim
            </span>
            <h4 className="text-sm font-semibold text-slate-900 mt-0.5">
              {aggregate && aggregate.count > 0
                ? `${aggregate.count} Evaluasi Terkumpul`
                : 'Belum Ada Evaluasi Masuk'}
            </h4>
          </div>
          {aggregate && aggregate.count > 0 && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Skor Rata-rata</span>
                <span className="text-xl font-bold text-teal-700">{aggregate.avgOverall} / 5.0</span>
              </div>
            </div>
          )}
        </div>

        {aggregate && aggregate.count > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-200 text-center">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Teknis</span>
              <span className="text-sm font-bold text-slate-800">{aggregate.avgTechnical} / 5</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Kultur / Attitude</span>
              <span className="text-sm font-bold text-slate-800">{aggregate.avgCulture} / 5</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Komunikasi</span>
              <span className="text-sm font-bold text-slate-800">{aggregate.avgCommunication} / 5</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Scorecard Form */}
      <form
        onSubmit={handleSubmitScorecard}
        className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 space-y-4 shadow-xs"
      >
        <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
          Beri Penilaian Wawancara ({candidateName})
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Keahlian Teknis (1-5)</label>
            <select
              value={techScore}
              onChange={(e) => setTechScore(Number(e.target.value))}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            >
              {[1, 2, 3, 4, 5].map((num) => (
                <option key={num} value={num}>
                  {num} - {num >= 4 ? 'Kompeten / Mahir' : num === 3 ? 'Cukup' : 'Kurang'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Culture Fit (1-5)</label>
            <select
              value={cultScore}
              onChange={(e) => setCultScore(Number(e.target.value))}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            >
              {[1, 2, 3, 4, 5].map((num) => (
                <option key={num} value={num}>
                  {num} - {num >= 4 ? 'Sangat Sesuai' : num === 3 ? 'Netral' : 'Kurang Cocok'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Komunikasi (1-5)</label>
            <select
              value={commScore}
              onChange={(e) => setCommScore(Number(e.target.value))}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            >
              {[1, 2, 3, 4, 5].map((num) => (
                <option key={num} value={num}>
                  {num} - {num >= 4 ? 'Artikulatif / Lugas' : num === 3 ? 'Cukup' : 'Kaku'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Rekomendasi Keputusan</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(['Strong Yes', 'Yes', 'Neutral', 'No'] as const).map((rec) => (
              <button
                key={rec}
                type="button"
                onClick={() => setRecommendation(rec)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  recommendation === rec
                    ? rec === 'Strong Yes' || rec === 'Yes'
                      ? 'bg-teal-50 border-teal-500 text-teal-800'
                      : rec === 'Neutral'
                      ? 'bg-amber-50 border-amber-500 text-amber-800'
                      : 'bg-rose-50 border-rose-500 text-rose-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {rec}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Catatan Kualitatif Interviewer</label>
          <textarea
            rows={2}
            value={evalNotes}
            onChange={(e) => setEvalNotes(e.target.value)}
            placeholder="Kekuatan utama, hal yang perlu diklarifikasi, atau pertimbangan teknis..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmittingScore}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {isSubmittingScore ? 'Menyimpan...' : 'Kirim Evaluasi Scorecard'}
          </button>
        </div>
      </form>

      {/* Scorecards Feed */}
      {scorecards.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
            Riwayat Evaluasi Pewawancara ({scorecards.length})
          </h4>
          <div className="space-y-2.5">
            {scorecards.map((sc) => (
              <div key={sc.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-900">{sc.evaluatorName}</span>
                    <span className="text-[11px] text-slate-400 ml-2">
                      {new Date(sc.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                      sc.recommendation === 'Strong Yes' || sc.recommendation === 'Yes'
                        ? 'bg-teal-50 text-teal-800 border border-teal-200'
                        : sc.recommendation === 'Neutral'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {sc.recommendation}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-slate-600 pt-1">
                  <span>Teknis: <strong className="text-slate-800">{sc.technicalScore}/5</strong></span>
                  <span>Kultur: <strong className="text-slate-800">{sc.cultureScore}/5</strong></span>
                  <span>Komunikasi: <strong className="text-slate-800">{sc.communicationScore}/5</strong></span>
                </div>
                {sc.notes && (
                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {sc.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Internal Team Discussion Thread */}
      <div className="space-y-3 pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
            Catatan Internal Tim (Private)
          </h4>
          <span className="text-[11px] text-slate-400">Tidak tampak pada tautan share publik</span>
        </div>

        <form onSubmit={handleAddTeamNote} className="space-y-2">
          <textarea
            rows={2}
            value={newTeamNote}
            onChange={(e) => setNewTeamNote(e.target.value)}
            placeholder="Tinggalkan catatan atau diskusikan kandidat ini dengan tim..."
            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmittingNote || !newTeamNote.trim()}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              {isSubmittingNote ? 'Mengirim...' : 'Tambah Catatan Tim'}
            </button>
          </div>
        </form>

        <div className="space-y-2">
          {teamNotes.map((note) => (
            <div key={note.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-900">{note.authorName}</span>
                <span className="text-[11px] text-slate-400">
                  {new Date(note.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{note.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
