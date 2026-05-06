import { useState, useCallback } from 'react'

const API_KEY_STORAGE = 'vc_notice_apikey'
const CACHE_KEY = 'vc_notice_cache'
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6시간

const SOURCES = {
  KVIC:    { name: 'KVIC 한국벤처투자',     url: 'https://www.kvic.or.kr/notice/notice1_1',                                                                  color: '#0099ff' },
  KVCA:    { name: 'KVCA 벤처캐피탈협회',   url: 'https://www.kvca.or.kr/Program/invest/list.html?a_gb=board&a_cd=8&a_item=0&sm=2_2_2',                      color: '#7c5cfc' },
  KGF:     { name: '한국성장금융',           url: 'https://www.kgrowth.or.kr/notice.asp',                                                                       color: '#00d4aa' },
  VCS:     { name: '벤처투자종합포털(지자체)', url: 'https://www.vcs.go.kr/web/portal/bbs/invtnotice/list',                                                    color: '#ff9f1c' },
  KBIZ:    { name: '노란우산 중소기업중앙회', url: 'https://www.kbiz.or.kr/ko/contents/bbs/list.do?mnSeq=211',                                                  color: '#ff6b9d' },
  NEWS:    { name: 'IB 뉴스 감지',          url: '',                                                                                                             color: '#8a96a3' },
}

function buildPrompt(today) {
  return `오늘(${today}) 기준으로 한국 VC/PE 출자사업 공고를 웹에서 실시간 검색해서 수집해줘.

수집 대상 소스:
1. KVIC(한국벤처투자) - kvic.or.kr - 모태펀드, 지역혁신벤처펀드, 엔젤모펀드 등
2. KVCA(한국벤처캐피탈협회) - kvca.or.kr - 공제회 포함 출자공고 취합
3. 한국성장금융 - kgrowth.or.kr
4. 벤처투자종합포털(vcs.go.kr) - 지자체 벤처펀드 포함
5. 중소기업중앙회(kbiz.or.kr) - 노란우산 출자사업
6. 뉴스 (딜사이트, 이데일리마켓인, 더벨, 한국경제) - 경찰공제회, 군인공제회, 교직원공제회, 대한지방행정공제회 등 비정기 공제회 공고

반드시 다음 JSON 배열 형식으로만 응답해줘. 마크다운 코드블록, 설명 텍스트 없이 순수 JSON만:
[
  {
    "id": "고유ID(숫자)",
    "title": "공고 제목",
    "source": "KVIC | KVCA | KGF | VCS | KBIZ | NEWS",
    "institution": "실제 출자기관명 (예: 한국벤처투자, 경찰공제회, 충남도 등)",
    "date": "YYYY-MM-DD 또는 null",
    "deadline": "YYYY-MM-DD 또는 null",
    "amount": "출자 규모 문자열 (예: 500억원) 또는 null",
    "gpCount": "선정 GP 수 (예: 3개사) 또는 null",
    "tags": ["VC", "PE", "루키", "지역", "공제회", "모태펀드" 중 해당하는 것들 배열],
    "url": "원문 공고 URL 또는 null",
    "summary": "공고 핵심 내용 3줄 이내 요약 (지원자격, 규모, 일정 중심)",
    "isNew": true
  }
]

공고가 전혀 없으면 빈 배열 []을 반환해. id는 1부터 순번.`
}

export function useSources() {
  return SOURCES
}

export function useNotices() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(() => {
    const c = localStorage.getItem(CACHE_KEY)
    if (!c) return null
    try { return JSON.parse(c).ts } catch { return null }
  })
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '')

  const loadCache = useCallback(() => {
    const c = localStorage.getItem(CACHE_KEY)
    if (!c) return false
    try {
      const { ts, data } = JSON.parse(c)
      if (Date.now() - ts < CACHE_TTL) {
        setNotices(data)
        setLastFetched(ts)
        return true
      }
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
    if (!key) {
      setError('API 키를 입력해주세요')
      return
    }

    setLoading(true)
    setError(null)

    const today = new Date().toISOString().split('T')[0]

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
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

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || `API 오류: ${res.status}`)
      }

      const data = await res.json()
      const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('')
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('공고 데이터 파싱 실패')

      const raw = JSON.parse(match[0])
      const now = Date.now()
      const sevenDays = now + 7 * 24 * 60 * 60 * 1000

      const enriched = raw.map(n => ({
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
