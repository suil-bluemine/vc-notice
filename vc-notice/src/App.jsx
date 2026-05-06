import React, { useState, useEffect, useMemo } from 'react'
import Header from './components/Header.jsx'
import StatsBar from './components/StatsBar.jsx'
import FilterBar from './components/FilterBar.jsx'
import NoticeCard from './components/NoticeCard.jsx'
import ApiKeyModal from './components/ApiKeyModal.jsx'
import { useNotices } from './hooks/useNotices.js'

export default function App() {
  const { notices, loading, error, lastFetched, fetch_, apiKey, saveApiKey, loadCache } = useNotices()

  const [source, setSource] = useState('전체')
  const [tag, setTag] = useState('전체')
  const [sort, setSort] = useState('date')

  useEffect(() => {
    loadCache()
  }, [])

  const filtered = useMemo(() => {
    let list = notices.filter(n => {
      if (source !== '전체' && n.source !== source) return false
      if (tag !== '전체' && !(n.tags || []).includes(tag)) return false
      return true
    })

    if (sort === 'deadline') {
      list = [...list].sort((a, b) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline) - new Date(b.deadline)
      })
    } else if (sort === 'amount') {
      list = [...list].sort((a, b) => {
        const parse = s => parseInt((s || '').replace(/[^0-9]/g, '')) || 0
        return parse(b.amount) - parse(a.amount)
      })
    }

    return list
  }, [notices, source, tag, sort])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Keyframe injection */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <Header
        lastFetched={lastFetched}
        loading={loading}
        onRefresh={() => fetch_(true)}
        noticeCount={notices.length}
      />

      <main style={{ flex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', paddingBottom: '4rem' }}>
        {/* Top controls row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 2rem 0',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            Powered by Anthropic Claude + Web Search
          </div>
          <ApiKeyModal onSave={saveApiKey} defaultKey={apiKey} />
        </div>

        <StatsBar notices={notices} />

        {/* Error */}
        {error && (
          <div style={{
            margin: '0 2rem 1rem',
            background: 'rgba(255,59,59,0.08)',
            border: '1px solid rgba(255,59,59,0.2)',
            borderRadius: 'var(--r)',
            padding: '0.75rem 1rem',
            fontSize: 13, color: '#ff6b6b',
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && notices.length === 0 && !error && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '5rem 2rem', gap: '1rem',
          }}>
            <div style={{
              width: 60, height: 60,
              background: 'linear-gradient(135deg, #00d4aa22, #0099ff22)',
              border: '1px solid rgba(0,212,170,0.2)',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>📋</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>공고를 수집해보세요</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                상단의 "공고 수집" 버튼을 누르면<br />
                AI가 6개 출자기관 소스에서 실시간으로 공고를 수집합니다
              </div>
              {!apiKey && (
                <div style={{ marginTop: 12, fontSize: 13, color: '#ff9f1c' }}>
                  ⚠ 먼저 우측 상단 "API 키 설정"을 완료해주세요
                </div>
              )}
            </div>
            <button
              onClick={() => fetch_(true)}
              disabled={loading || !apiKey}
              style={{
                marginTop: 8,
                background: apiKey ? 'linear-gradient(135deg, #00d4aa, #0099ff)' : 'var(--bg3)',
                color: apiKey ? '#000' : 'var(--text3)',
                border: 'none', borderRadius: 'var(--r)',
                padding: '10px 24px', fontSize: 14, fontWeight: 500,
                cursor: apiKey ? 'pointer' : 'not-allowed', fontFamily: 'var(--sans)',
              }}
            >
              지금 수집하기
            </button>
          </div>
        )}

        {/* Filter + list */}
        {notices.length > 0 && (
          <>
            <FilterBar
              source={source} setSource={setSource}
              tag={tag} setTag={setTag}
              sort={sort} setSort={setSort}
              total={notices.length} filtered={filtered.length}
            />
            <div style={{ padding: '1rem 2rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)', fontSize: 13 }}>
                  해당 조건의 공고가 없습니다
                </div>
              ) : (
                filtered.map((n, i) => (
                  <div key={n.id || i} style={{ animation: `fadeIn 0.2s ease ${i * 0.03}s both` }}>
                    <NoticeCard notice={n} />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>

      <footer style={{
        borderTop: '1px solid var(--line)',
        padding: '1rem 2rem',
        textAlign: 'center',
        fontSize: 12, color: 'var(--text3)',
      }}>
        VC 출자사업 공고 모니터 · Powered by BLUEMINE &amp; Anthropic Claude
      </footer>
    </div>
  )
}
