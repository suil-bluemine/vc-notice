#!/usr/bin/env python3
"""
VC 출자사업 공고 자동 수집 스크립트
GitHub Actions에서 매일 실행
"""
import json
import os
import sys
from datetime import datetime, timezone, timedelta
import urllib.request
import urllib.error

KST = timezone(timedelta(hours=9))
TODAY = datetime.now(KST).strftime('%Y-%m-%d')
NOW_TS = int(datetime.now(KST).timestamp() * 1000)
SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

PROMPT = f"""오늘({TODAY}) 기준으로 한국 VC/PE 출자사업 공고를 웹에서 실시간 검색해서 수집해줘.

수집 대상 소스 (최대한 많이 찾아줘):
1. KVIC(한국벤처투자) - kvic.or.kr - 모태펀드, 지역혁신벤처펀드
2. KVCA(한국벤처캐피탈협회) - kvca.or.kr - 공제회 포함 취합 공고
3. 한국성장금융 - kgrowth.or.kr
4. 벤처투자종합포털 - vcs.go.kr - 지자체 벤처펀드
5. 중소기업중앙회 - kbiz.or.kr - 노란우산 출자사업
6. 한국산업은행 - kdb.co.kr - PE/인프라 출자
7. 중소기업진흥공단 - smes.go.kr
8. 신용보증기금 - kodit.or.kr
9. 기술보증기금 - kibo.or.kr
10. 경찰공제회 - poca.or.kr
11. 군인공제회 - kohla.kr
12. 교직원공제회 - ktcu.or.kr
13. 대한지방행정공제회 - lacts.or.kr
14. 행정공제회 - acgc.or.kr
15. 경기도경제과학진흥원 - gbsa.or.kr
16. 서울산업진흥원 - sba.seoul.kr
17. 뉴스(딜사이트, 더벨, 이데일리마켓인, 한국경제) - 비정기 공제회 공고 포착

반드시 아래 JSON 배열 형식으로만 응답해줘. 마크다운 없이 순수 JSON만:
[{{"id":"1","title":"공고제목","source":"KVIC","institution":"실제기관명","date":"YYYY-MM-DD","deadline":"YYYY-MM-DD or null","amount":"500억원 or null","gpCount":"3개사 or null","tags":["VC","PE","루키","지역","공제회","모태펀드" 중 해당],"url":"https://... or null","summary":"핵심내용 3줄 (지원자격/규모/일정 중심)","isNew":true}}]

공고 없으면 빈 배열 [] 반환. id는 1부터 순번."""


def call_api(api_key: str) -> list:
    url = 'https://api.anthropic.com/v1/messages'
    payload = {
        'model': 'claude-sonnet-4-6',
        'max_tokens': 8000,
        'tools': [{'type': 'web_search_20250305', 'name': 'web_search'}],
        'messages': [{'role': 'user', 'content': PROMPT}]
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            'Content-Type': 'application/json',
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01',
        },
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=120) as res:
        body = json.loads(res.read().decode('utf-8'))

    text = ''.join(b.get('text', '') for b in body.get('content', []) if b.get('type') == 'text')
    print(f"[DEBUG] Response text length: {len(text)}")

    start = text.find('[')
    end = text.rfind(']') + 1
    if start == -1 or end == 0:
        print("[WARN] No JSON array found in response")
        return []

    json_str = text[start:end]
    # 중첩 JSON 배열이 있을 경우 첫 번째 완전한 배열만 추출
    depth = 0
    real_end = start
    for i, ch in enumerate(json_str):
        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                real_end = start + i + 1
                break

    raw = json.loads(json_str[:real_end - start])

    enriched = []
    for i, n in enumerate(raw):
        deadline = n.get('deadline')
        deadline_ts = None
        if deadline:
            try:
                deadline_ts = int(datetime.strptime(deadline, '%Y-%m-%d').replace(tzinfo=KST).timestamp() * 1000)
            except Exception:
                pass
        expired = deadline_ts is not None and deadline_ts < NOW_TS
        urgent = deadline_ts is not None and not expired and deadline_ts <= NOW_TS + SEVEN_DAYS_MS
        days_left = round((deadline_ts - NOW_TS) / 86400000) if deadline_ts else None
        enriched.append({
            **n,
            'id': str(i + 1),
            'expired': expired,
            'urgent': urgent,
            'daysLeft': days_left,
        })

    # 정렬: 마감완료 → 하단, 신규 → 상단
    enriched.sort(key=lambda x: (x['expired'], not x.get('isNew', False)))
    return enriched


def main():
    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        print("[ERROR] ANTHROPIC_API_KEY not set")
        sys.exit(1)

    print(f"[INFO] Collecting notices for {TODAY}...")
    try:
        notices = call_api(api_key)
        print(f"[INFO] Collected {len(notices)} notices")
    except Exception as e:
        print(f"[ERROR] API call failed: {e}")
        # 기존 데이터 유지 (실패 시 빈 파일로 덮어쓰지 않음)
        if os.path.exists('public/notices.json'):
            print("[INFO] Keeping existing notices.json")
            sys.exit(0)
        notices = []

    output = {
        'updatedAt': NOW_TS,
        'updatedDate': TODAY,
        'count': len(notices),
        'notices': notices,
    }

    os.makedirs('public', exist_ok=True)
    with open('public/notices.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[INFO] Saved to public/notices.json ({len(notices)} items)")


if __name__ == '__main__':
    main()

