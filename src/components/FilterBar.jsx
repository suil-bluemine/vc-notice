import React from 'react'

const CATEGORIES = {
  '전체': null,
  '정책기관': ['KVIC', 'KVCA', 'KGF', 'KDB', 'SMES', 'KODIT', 'KIBO', 'KBIZ'],
  '공제회': ['공제회', 'NEWS'],
  '지자체': ['VCS', '지자체'],
  '기타': ['기타'],
}

const TAGS = ['전체', 'VC', 'PE', '루키', '지역', '공제회', '모태펀드']

export default function FilterBar({ source, setSource, tag, setTag, sort, setSort, total, filtered }) {
  const btnStyle = (active) => ({
    background: active ? 'rgba(0,212,170,0.15)' : 'var(--bg3)',
    border: `1px solid ${active ? 'rgba(0,212,170,0.4)' : 'var(--line)'}`,
    color: active ? '#00d4aa' : 'var(--text2)',
    borderRadius: 20,
    padding: '4px 14px',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'var(--sans)',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  })

  const handleSource = (cat) => {
    setSource(cat)
  }

  const matchSource = (notice, cat) => {
    if (cat === '전체') return true
    const sources = CATEGORIES[cat] || []
    return sources.includes(notice.source)
  }

  return (
    <div style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', minWidth: 36 }}>카테고리</span>
        {Object.keys(CATEGORIES).map(cat => (
          <button key={cat} style={btnStyle(source === cat)} onClick={() => handleSource(cat)}>
            {cat}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', minWidth: 36 }}>유형</span>
        {TAGS.map(t => (
          <button key={t} style={btnStyle(tag === t)} onClick={() => setTag(t)}>
            {t}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{filtered}/{total}건</span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              background: 'var(--bg3)', border: '1px solid var(--line)',
              color: 'var(--text2)', borderRadius: 'var(--r)',
              padding: '4px 10px', fontSize: 12, fontFamily: 'var(--sans)', cursor: 'pointer',
            }}
          >
            <option value="date">최신순</option>
            <option value="deadline">마감임박순</option>
            <option value="amount">규모순</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export { CATEGORIES }
