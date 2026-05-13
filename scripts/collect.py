#!/usr/bin/env python3
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))
TODAY = datetime.now(KST).strftime('%Y-%m-%d')
NOW_TS = int(datetime.now(KST).timestamp() * 1000)
SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

PROMPT = f"""오늘({TODAY}) 기준으로 한국 VC/PE 출자사업 공고를 웹에서 검색해줘.

규칙:
1. 오늘 기준 접수 중이거나 최근 30일 이내 공고된 것만
2. 마감이 지난 공고 제외
3. 뉴스 기사 제외 - 반드시 기관 공식 공고만
4. date(공고일), deadline(마감일) 정확히 찾아줘. 모르면 null

검색 대상 기관 사이트:
- kvic.or.kr (KVIC 한국벤처투자)
- kvca.or.kr (KVCA 벤처캐피탈협회)
- kgrowth.or.kr (한국성장금융)
- vcs.go.kr (벤처투자종합포털)
- kbiz.or.kr (노란우산)
- kdb.co.kr (산업은행)
- smes.go.kr (중진공)
- kodit.or.kr (신보)
- kibo.or.kr (기보)
- poca.or.kr, kohla.kr, ktcu.or.kr, lacts.or.kr, acgc.or.kr (공제회)
- gbsa.or.kr, sba.seoul.kr (지자체)

JSON 배열만 반환. 마크다운 없이:
[{{"id":"1","title":"공고제목","source":"KVIC","institution":"기관명","date":"YYYY-MM-DD","deadline":"YYYY-MM-DD","amount":"500억원","gpCount":"3개사","tags":["VC"],"url":"https://...","summary":"요약3줄","isNew":true}}]

source 값: KVIC, KVCA, KGF, VCS, KBIZ, KDB, SMES, KODIT, KIBO, 공제회, 지자체, 기타
공고 없으면 [] 반환."""


def anthropic_search():
    payload = {
        'model': 'claude-sonnet-4-6',
        'max_tokens': 2000,
        'tools': [{'type': 'web_search_20250305', 'name': 'web_search'}],
        'messages': [{'role': 'user', 'content': PROMPT}]
    }
    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages',
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
        },
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=120) as res:
        body = json.loads(res.read().decode('utf-8'))

    text = ''.join(b.get('text', '') for b in body.get('content', []) if b.get('type') == 'text')
    print(f"[DEBUG] Response length: {len(text)}")

    start = text.find('[')
    if start == -1:
        return []

    depth, real_end = 0, start
    for i, ch in enumerate(text[start:]):
        if ch == '[': depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                real_end = start + i + 1
                break

    raw = json.loads(text[start:real_end])
    print(f"[INFO] Anthropic: {len(raw)}건")
    return raw


def enrich(notices):
    seen = set()
    enriched = []

    for n in notices:
        title = n.get('title', '')
        if title in seen:
            continue
        seen.add(title)

        deadline = n.get('deadline')
        deadline_ts = None
        if deadline:
            try:
                deadline_ts = int(datetime.strptime(deadline, '%Y-%m-%d').replace(tzinfo=KST).timestamp() * 1000)
            except Exception:
                pass

        date_str = n.get('date')
        date_ts = None
        if date_str:
            try:
                date_ts = int(datetime.strptime(date_str, '%Y-%m-%d').replace(tzinfo=KST).timestamp() * 1000)
            except Exception:
                pass

        expired = deadline_ts is not None and deadline_ts < NOW_TS
        if expired:
            continue

        # deadline 없고 공고일 30일 초과 제외
        if deadline_ts is None and date_ts is not None and (NOW_TS - date_ts) > THIRTY_DAYS_MS:
            continue

        urgent = deadline_ts is not None and deadline_ts <= NOW_TS + SEVEN_DAYS_MS
        days_left = round((deadline_ts - NOW_TS) / 86400000) if deadline_ts else None
        is_new = date_ts is not None and (NOW_TS - date_ts) <= SEVEN_DAYS_MS

        enriched.append({
            **n,
            'id': str(len(enriched) + 1),
            'expired': False,
            'urgent': urgent,
            'daysLeft': days_left,
            'isNew': is_new,
        })

    enriched.sort(key=lambda x: not x.get('isNew', False))
    return enriched


def main():
    if not ANTHROPIC_KEY:
        print("[ERROR] ANTHROPIC_API_KEY not set")
        sys.exit(1)

    print(f"[INFO] Collecting notices for {TODAY}...")

    try:
        notices = anthropic_search()
    except Exception as e:
        print(f"[ERROR] API call failed: {e}")
        if os.path.exists('public/notices.json'):
            print("[INFO] Keeping existing notices.json")
            sys.exit(0)
        notices = []

    enriched = enrich(notices)
    print(f"[INFO] Total: {len(enriched)}건")

    os.makedirs('public', exist_ok=True)
    with open('public/notices.json', 'w', encoding='utf-8') as f:
        json.dump({
            'updatedAt': NOW_TS,
            'updatedDate': TODAY,
            'count': len(enriched),
            'notices': enriched,
        }, f, ensure_ascii=False, indent=2)

    print(f"[INFO] Saved {len(enriched)} notices")


if __name__ == '__main__':
    main()
