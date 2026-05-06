import React from 'react'

export default function StatsBar({ notices }) {
  const newCount = notices.filter(n => n.isNew).length
  const urgentCount = notices.filter(n => n.urgent).length
  const sources = [...new Set(notices.map(n => n.source))].length

  const stat = (label, value, color = 'var(--text)') => (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r)',
      padding: '0.875rem 1.25rem',
      flex: 1,
      minWidth: 100,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 300, color, fontFamily: 'var(--mono)' }}>{value}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: 10, padding: '1.25rem 2rem', flexWrap: 'wrap' }}>
      {stat('전체 공고', notices.length)}
      {stat('신규 공고', newCount, '#00d4aa')}
      {stat('마감 임박 (7일)', urgentCount, urgentCount > 0 ? '#ff3b3b' : 'var(--text)')}
      {stat('수집 소스', sources)}
      {stat('모니터링 기관', 6)}
    </div>
  )
}
