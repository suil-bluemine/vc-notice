import React from 'react'

export default function Header({ lastFetched, loading, onRefresh, noticeCount }) {
  const fmt = ts => ts
    ? new Date(ts).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <header style={{
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      padding: '0 2rem',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      background: 'rgba(10,12,15,0.95)',
      backdropFilter: 'blur(12px)',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 28, height: 28,
            background: 'linear-gradient(135deg, #00d4aa, #0099ff)',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#000',
          }}>VC</div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>출자사업 공고 모니터</span>
        </div>
        {noticeCount > 0 && (
          <span style={{
            background: 'rgba(0,212,170,0.12)', color: '#00d4aa',
            border: '1px solid rgba(0,212,170,0.2)',
            borderRadius: 20, padding: '2px 10px', fontSize: 12,
          }}>{noticeCount}건</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {lastFetched && (
          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            업데이트: {fmt(lastFetched)}
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            background: loading ? 'var(--bg3)' : 'linear-gradient(135deg, #00d4aa22, #0099ff22)',
            border: '1px solid rgba(0,212,170,0.3)',
            color: loading ? 'var(--text3)' : 'var(--accent)',
            borderRadius: 'var(--r)',
            padding: '6px 14px',
            fontSize: 13,
            fontFamily: 'var(--sans)',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s',
          }}
        >
          {loading ? (
            <>
              <Spinner />수집 중...
            </>
          ) : (
            <>↻ 공고 수집</>
          )}
        </button>
      </div>
    </header>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 12, height: 12,
      border: '1.5px solid rgba(255,255,255,0.1)',
      borderTopColor: '#00d4aa',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}
