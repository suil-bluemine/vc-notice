import React, { useState } from 'react'

const SOURCE_COLORS = {
  KVIC: '#0099ff', KVCA: '#7c5cfc', KGF: '#00d4aa',
  VCS: '#ff9f1c', KBIZ: '#ff6b9d', NEWS: '#8a96a3',
}
const SOURCE_NAMES = {
  KVIC: 'KVIC', KVCA: 'KVCA', KGF: '한국성장금융',
  VCS: '지자체(VCS)', KBIZ: '노란우산', NEWS: 'IB뉴스',
}
const TAG_COLORS = {
  VC: '#0099ff22', PE: '#7c5cfc22', 루키: '#00d4aa22',
  지역: '#ff9f1c22', 공제회: '#ff6b9d22', 모태펀드: '#ffffff11',
}
const TAG_TEXT = {
  VC: '#0099ff', PE: '#7c5cfc', 루키: '#00d4aa',
  지역: '#ff9f1c', 공제회: '#ff6b9d', 모태펀드: '#8a96a3',
}

export default function NoticeCard({ notice }) {
  const [open, setOpen] = useState(false)
  const srcColor = SOURCE_COLORS[notice.source] || '#8a96a3'
  const srcName = SOURCE_NAMES[notice.source] || notice.source

  const urgentBg = notice.urgent ? 'rgba(255,59,59,0.05)' : 'var(--bg2)'
  const urgentBorder = notice.urgent ? 'rgba(255,59,59,0.2)' : 'rgba(255,255,255,0.07)'
  const newAccent = notice.isNew ? '#00d4aa' : 'transparent'

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        background: urgentBg,
        border: `1px solid ${urgentBorder}`,
        borderLeft: `3px solid ${notice.isNew ? newAccent : srcColor}`,
        borderRadius: 'var(--r2)',
        padding: '1rem 1.25rem',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.borderLeftColor = srcColor }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = urgentBorder; e.currentTarget.style.borderLeftColor = notice.isNew ? newAccent : srcColor }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 500,
              background: srcColor + '22', color: srcColor,
              border: `1px solid ${srcColor}33`,
              borderRadius: 20, padding: '2px 8px',
            }}>{srcName}</span>
            {notice.institution && notice.institution !== srcName && (
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{notice.institution}</span>
            )}
            {notice.isNew && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: '#00d4aa22', color: '#00d4aa',
                borderRadius: 20, padding: '1px 7px', letterSpacing: '0.5px',
              }}>NEW</span>
            )}
            {notice.urgent && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: '#ff3b3b22', color: '#ff3b3b',
                borderRadius: 20, padding: '1px 7px', letterSpacing: '0.5px',
              }}>마감임박</span>
            )}
            {(notice.tags || []).map(t => (
              <span key={t} style={{
                fontSize: 11, background: TAG_COLORS[t] || '#ffffff11',
                color: TAG_TEXT[t] || '#8a96a3',
                borderRadius: 20, padding: '1px 8px',
              }}>{t}</span>
            ))}
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.45, color: 'var(--text)' }}>
            {notice.title}
          </div>
        </div>

        {/* Right meta */}
        <div style={{ textAlign: 'right', flexShrink: 0, fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          {notice.amount && (
            <div style={{ fontSize: 13, fontWeight: 500, color: '#00d4aa', marginBottom: 2 }}>{notice.amount}</div>
          )}
          {notice.gpCount && <div style={{ marginBottom: 2 }}>GP {notice.gpCount}</div>}
          {notice.date && <div>{notice.date}</div>}
        </div>
      </div>

      {/* Deadline bar */}
      {notice.deadline && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>마감</span>
          <span style={{
            fontSize: 12, fontFamily: 'var(--mono)',
            color: notice.urgent ? '#ff3b3b' : 'var(--text2)',
          }}>{notice.deadline}</span>
          {notice.daysLeft !== null && (
            <span style={{
              fontSize: 11,
              color: notice.daysLeft <= 3 ? '#ff3b3b' : notice.daysLeft <= 7 ? '#ff9f1c' : 'var(--text3)',
            }}>
              ({notice.daysLeft > 0 ? `D-${notice.daysLeft}` : notice.daysLeft === 0 ? '오늘 마감' : '마감'})
            </span>
          )}
        </div>
      )}

      {/* Expanded summary */}
      {open && notice.summary && (
        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--line)',
          fontSize: 13,
          color: 'var(--text2)',
          lineHeight: 1.75,
          whiteSpace: 'pre-wrap',
        }}>
          {notice.summary}
          {notice.url && (
            <div style={{ marginTop: 10 }}>
              <a
                href={notice.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontSize: 12, color: 'var(--accent2)' }}
              >
                원문 공고 보기 →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
