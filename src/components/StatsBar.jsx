import React, { useState } from 'react'

const ALL_SOURCES = [
  { cat: '정책기관', list: [
    { name: '한국벤처투자', url: 'kvic.or.kr' },
    { name: '한국벤처캐피탈협회', url: 'kvca.or.kr' },
    { name: '한국성장금융', url: 'kgrowth.or.kr' },
    { name: '한국산업은행', url: 'kdb.co.kr' },
    { name: '중소기업진흥공단', url: 'smes.go.kr' },
    { name: '신용보증기금', url: 'kodit.or.kr' },
    { name: '기술보증기금', url: 'kibo.or.kr' },
    { name: '노란우산(중기중앙회)', url: 'kbiz.or.kr' },
  ]},
  { cat: '공제회', list: [
    { name: '경찰공제회', url: 'poca.or.kr' },
    { name: '군인공제회', url: 'kohla.kr' },
    { name: '교직원공제회', url: 'ktcu.or.kr' },
    { name: '대한지방행정공제회', url: 'lacts.or.kr' },
    { name: '행정공제회', url: 'acgc.or.kr' },
  ]},
  { cat: '지자체', list: [
    { name: '벤처투자종합포털', url: 'vcs.go.kr' },
    { name: '경기도경제과학진흥원', url: 'gbsa.or.kr' },
    { name: '서울산업진흥원', url: 'sba.seoul.kr' },
  ]},
  { cat: '뉴스감지', list: [
    { name: '딜사이트', url: 'dealsite.co.kr' },
    { name: '더벨', url: 'thebell.co.kr' },
    { name: '이데일리마켓인', url: 'marketin.edaily.co.kr' },
  ]},
]

const TOTAL = ALL_SOURCES.reduce((s, c) => s + c.list.length, 0)

const CAT_COLORS = {
  '정책기관': '#0099ff',
  '공제회': '#ff6b9d',
  '지자체': '#ff9f1c',
  '뉴스감지': '#8a96a3',
}

export default function StatsBar({ notices }) {
  const [showModal, setShowModal] = useState(false)
  const newCount = notices.filter(n => n.isNew).length
  const urgentCount = notices.filter(n => n.urgent).length
  const activeSrcs = new Set(notices.map(n => n.source)).size

  const stat = (label, value, color = 'var(--text)', onClick) => (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg2)', border: '1px solid var(--line)',
        borderRadius: 'var(--r)', padding: '0.875rem 1.25rem',
        flex: 1, minWidth: 80,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = 'var(--line)')}
    >
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 300, color, fontFamily: 'var(--mono)' }}>
        {value}
        {onClick && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>↗</span>}
      </div>
    </div>
  )

  return (
    <>
      <div style={{ display: 'flex', gap: 10, padding: '1.25rem 2rem', flexWrap: 'wrap' }}>
        {stat('전체 공고', notices.length)}
        {stat('신규 공고', newCount, '#00d4aa')}
        {stat('마감 임박 (7일)', urgentCount, urgentCount > 0 ? '#ff3b3b' : 'var(--text)')}
        {stat('수집 소스', activeSrcs)}
        {stat('모니터링 기관', TOTAL, '#00d4aa', () => setShowModal(true))}
      </div>

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999, padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg2)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10, padding: '1.5rem',
              width: '100%', maxWidth: 560,
              maxHeight: '85vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 500 }}>모니터링 기관</h3>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>총 {TOTAL}개 기관 · 매일 08:00 KST 자동 수집</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}
              >×</button>
            </div>

            {ALL_SOURCES.map(({ cat, list }) => (
              <div key={cat} style={{ marginBottom: '1.25rem' }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
                  color: CAT_COLORS[cat] || 'var(--text3)', marginBottom: 8,
                }}>{cat} ({list.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {list.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'var(--bg3)', borderRadius: 6, padding: '8px 12px', fontSize: 13,
                    }}>
                      <span style={{ color: 'var(--text)' }}>{s.name}</span>
                      <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 11 }}>{s.url}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem',
              background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.15)',
              borderRadius: 6, fontSize: 12, color: 'var(--text2)', lineHeight: 1.7,
            }}>
              공제회는 비정기 공고 특성상 뉴스(딜사이트, 더벨, 이데일리)를 통해 감지됩니다.
            </div>
          </div>
        </div>
      )}
    </>
  )
}