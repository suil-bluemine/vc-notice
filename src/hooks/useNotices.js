import { useState, useCallback } from 'react'

const API_KEY_STORAGE = 'vc_notice_apikey'
const CACHE_KEY = 'vc_notice_cache'
const CACHE_TTL = 6 * 60 * 60 * 1000

const SOURCES = {
  KVIC:  { name: 'KVIC 한국벤처투자',      color: '#0099ff' },
  KVCA:  { name: 'KVCA 벤처캐피탈협회',    color: '#7c5cfc' },
  KGF:   { name: '한국성장금융',            color: '#00d4aa' },
  VCS:   { name: '벤처투자종합포털(지자체)', color: '#ff9f1c' },
  KBIZ:  { name: '노란우산 중소기업중앙회', color: '#ff6b9d' },
  NEWS:  { name: 'IB 뉴스 감지',           color: '#8a96a3' },
}

function buildPrompt(today) {
  return `오늘(${today}) 기준으로 한국 VC/PE 출자사업 공고를 웹에서 실시간 검색해서 수집해줘.

수집 대상 소스:
1. KVIC(한국벤처투자) - kvic.or.kr
2. KVCA(한국벤처캐피탈협회) - kvca.or.kr
3. 한국성장금융 - kgrowth.or.kr
4. 벤처투자종합포털(vcs.go.kr)
5. 중소기업중앙회(kbiz.or.kr) - 노란우산
6. 뉴스(딜사이트, 이데일리마켓인, 더벨) - 공제회 비정기 공고

반드시 아래 JSON 배열 형식으로만 응답해줘. 마크다운 없이 순수 JSON만:
[{"id":"1","title":"공고제목","source":"KVIC","institution":"기관명","date":"YYYY-MM-DD","deadline":"YYYY-MM-DD","amount":"500억원","gpCount":"3개사","tags":["VC"],"url":"https://...","summary":"요약 3줄","isNew":true}]

공고 없으면 빈 배열 [] 반환.`
}

export function useSources() { return SOURCES }

export function useNotices() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(() => {
    try { const c = localStorage.getItem(CACHE_KEY); return c ? JSON.parse(c).ts : null } catch { return null }
  })
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '')

  const loadCache = useCallback(() => {
    try {
      const c = localStorage.getItem(CACHE_KEY)
      if (!c) return false
      const { ts, data } = JSON.parse(c)
      if (Date.now() - ts < CACHE_TTL) { setNotices(data); setLastFetched(ts); return true }
    } catch {}
    return false
  }, [])

  const saveApiKey = useCallback((key) => {
    setApiKey(key)
    localStorage.setItem(API_KEY_STORAGE, key)
  }, [])

  const fetch_ = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && loadCache()) return
    const key = apiKey || localStorage.getItem(API_KEY_STORAGE)
    if (!key) { setError('API 키를 입력해주세요'); return }

    setLoading(true)
    setError(null)
    const today = new Date().toISOString().split('T')[0]

    try {
      const res = await fetch('https://morning-lake-7f11.suil.workers.dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-calls': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: buildPrompt(today) }]
        })
      })

      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `API 오류: ${res.status}`) }

      const data = await res.json()
      const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('')
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('공고 데이터 파싱 실패')

      const now = Date.now()
      const sevenDays = now + 7 * 24 * 60 * 60 * 1000
      const enriched = JSON.parse(match[0]).map(n => ({
        ...n,
        urgent: n.deadline ? new Date(n.deadline).getTime() <= sevenDays : false,
        daysLeft: n.deadline ? Math.ceil((new Date(n.deadline).getTime() - now) / 86400000) : null,
      }))

      setNotices(enriched)
      setLastFetched(now)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: now, data: enriched }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [apiKey, loadCache])

  return { notices, loading, error, lastFetched, fetch_, apiKey, saveApiKey, loadCache }
}
