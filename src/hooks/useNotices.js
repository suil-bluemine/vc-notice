import { useState, useCallback } from 'react'

const API_KEY_STORAGE = 'vc_notice_apikey'
const CACHE_KEY = 'vc_notice_cache'
const CACHE_TTL = 6 * 60 * 60 * 1000

const SOURCES = {
  KVIC:  { name: 'KVIC 한국벤처투자',       color: '#0099ff' },
  KVCA:  { name: 'KVCA 벤처캐피탈협회',     color: '#7c5cfc' },
  KGF:   { name: '한국성장금융',             color: '#00d4aa' },
  VCS:   { name: '벤처투자종합포털(지자체)', color: '#ff9f1c' },
  KBIZ:  { name: '노란우산 중소기업중앙회',  color: '#ff6b9d' },
  KDB:   { name: '한국산업은행',             color: '#e040fb' },
  SMES:  { name: '중소기업진흥공단',         color: '#00bcd4' },
  KODIT: { name: '신용보증기금',             color: '#ff7043' },
  KIBO:  { name: '기술보증기금',             color: '#66bb6a' },
  NEWS:  { name: 'IB 뉴스 감지',            color: '#8a96a3' },
  기타:  { name: '기타',                     color: '#8a96a3' },
}

function buildPrompt(today) {
  return '오늘(' + today + ') 기준으로 한국 VC/PE 출자사업 공고를 웹에서 실시간 검색해서 수집해줘.\n\n수집 대상 소스 (최대한 많이):\n1. KVIC - kvic.or.kr\n2. KVCA - kvca.or.kr\n3. 한국성장금융 - kgrowth.or.kr\n4. vcs.go.kr 지자체 펀드\n5. kbiz.or.kr 노란우산\n6. 한국산업은행 kdb.co.kr\n7. 중소기업진흥공단 smes.go.kr\n8. 신용보증기금 kodit.or.kr\n9. 기술보증기금 kibo.or.kr\n10. 경찰공제회 poca.or.kr\n11. 군인공제회 kohla.kr\n12. 교직원공제회 ktcu.or.kr\n13. 대한지방행정공제회 lacts.or.kr\n14. 행정공제회 acgc.or.kr\n15. 경기도경제과학진흥원 gbsa.or.kr\n16. 서울산업진흥원 sba.seoul.kr\n17. 뉴스(딜사이트, 더벨, 이데일리마켓인)\n\n반드시 아래 JSON 배열만 반환. 마크다운 없이:\n[{"id":"1","title":"공고제목","source":"KVIC","institution":"기관명","date":"YYYY-MM-DD","deadline":"YYYY-MM-DD","amount":"500억원","gpCount":"3개사","tags":["VC"],"url":"https://...","summary":"요약3줄","isNew":true}]\n\n공고 없으면 [] 반환.'
}

function enrichNotices(raw) {
  const now = Date.now()
  const sevenDays = now + 7 * 24 * 60 * 60 * 1000
  return raw.map((n, i) => {
    const deadlineTs = n.deadline ? new Date(n.deadline).getTime() : null
    const expired = deadlineTs !== null && deadlineTs < now
    const urgent = deadlineTs !== null && !expired && deadlineTs <= sevenDays
    const daysLeft = deadlineTs !== null ? Math.ceil((deadlineTs - now) / 86400000) : null
    const dateTs = n.date ? new Date(n.date).getTime() : null
    const isNew = dateTs !== null && (now - dateTs) <= sevenDays
    return { ...n, id: String(i + 1), expired, urgent, daysLeft, isNew }
  }).sort((a, b) => {
    if (a.expired !== b.expired) return a.expired ? 1 : -1
    if (a.isNew !== b.isNew) return b.isNew ? 1 : -1
    return 0
  })
}

export function useSources() { return SOURCES }

export function useNotices() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '')
  const [isAutoData, setIsAutoData] = useState(false)

  const loadAutoData = useCallback(async () => {
    try {
      const base = import.meta.env.BASE_URL || '/'
      const res = await fetch(base + 'notices.json?t=' + Date.now())
      if (!res.ok) return false
      const json = await res.json()
      if (!json.notices || json.notices.length === 0) return false
      const enriched = enrichNotices(json.notices)
      setNotices(enriched)
      setLastFetched(json.updatedAt)
      setIsAutoData(true)
      return true
    } catch {
      return false
    }
  }, [])

  const loadCache = useCallback(() => {
    try {
      const c = localStorage.getItem(CACHE_KEY)
      if (!c) return false
      const { ts, data } = JSON.parse(c)
      if (Date.now() - ts < CACHE_TTL) {
        setNotices(data)
        setLastFetched(ts)
        return true
      }
    } catch {}
    return false
  }, [])

  const init = useCallback(async () => {
    const loaded = await loadAutoData()
    if (!loaded) loadCache()
  }, [loadAutoData, loadCache])

  const saveApiKey = useCallback((key) => {
    setApiKey(key)
    localStorage.setItem(API_KEY_STORAGE, key)
  }, [])

  const fetch_ = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const loaded = await loadAutoData()
      if (loaded) return
      if (loadCache()) return
    }

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
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 8000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: buildPrompt(today) }]
        })
      })

      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'API 오류: ' + res.status) }

      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const content = data.content || []
      const text = content.filter(b => b.type === 'text').map(b => b.text).join('')
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('공고 데이터 파싱 실패')

      const enriched = enrichNotices(JSON.parse(match[0]))
      const now = Date.now()
      setNotices(enriched)
      setLastFetched(now)
      setIsAutoData(false)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: now, data: enriched }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [apiKey, loadAutoData, loadCache])

  return { notices, loading, error, lastFetched, fetch_, apiKey, saveApiKey, loadCache, init, isAutoData }
}
