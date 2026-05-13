#!/usr/bin/env python3
import json
import os
import sys
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))
TODAY = datetime.now(KST).strftime('%Y-%m-%d')
NOW_TS = int(datetime.now(KST).timestamp() * 1000)
SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
NAVER_ID = os.environ.get('NAVER_CLIENT_ID', '')
NAVER_SECRET = os.environ.get('NAVER_CLIENT_SECRET', '')

NAVER_KEYWORDS = [
    '벤처펀드 출자사업 공고',
    'VC 블라인드펀드 GP 선정',
    '모태펀드 출자사업',
    '공제회 벤처펀드 출자',
    '지자체 벤처펀드 위탁운용사',
    '서울 벤처펀드 출자사업',
    '경기 벤처펀드 출자사업',
]

ANTHROPIC_PROMPT = f"""오늘({TODAY}) 기준으로 한국 VC/PE 출자사업 공고를 웹에서 실시간 검색해서 수집해줘.

수집 대상:
1. KVIC(한국벤처투자) - kvic.or.kr
2. KVCA(한국벤처캐피탈협회) - kvca.or.kr
3. 한국성장금융 - kgrowth.or.kr
4. 벤처투자종합포털 - vcs.go.kr
5. 중소기업중앙회 - kbiz.or.kr
6. 한국산업은행 - kdb.co.kr
7. 중소기업진흥공단 - smes.go.kr
8. 신용보증기금 - kodit.or.kr
9. 기술보증기금 - kibo.or.kr
10. 경찰/군인/교직원/지방행정/행정 공제회
11. 경기도경제과학진흥원, 서울산업진흥원 등 지자체

반드시 아래 JSON 배열만 반환. 마크다운 없이:
[{{"id":"1","title":"공고제목","source":"KVIC","institution":"기관명","date":"YYYY-MM-DD","deadline":"YYYY-MM-DD","amount":"500억원","gpCount":"3개사","tags":["VC"],"url":"https://...","summary":"요약3줄","isNew":true}}]

공고 없으면 [] 반환."""


def naver_news_search():
    """네이버 뉴스 API로 출자사업 공고 수집"""
    if not NAVER_ID or not NAVER_SECRET:
        print("[WARN] Naver API key not set, skipping")
        return []

    results = []
    seen_titles = set()

    for keyword in NAVER_KEYWORDS:
        try:
            query = urllib.parse.urlencode({'query': keyword, 'display': 10, 'sort': 'date'})
            url = f'https://openapi.naver.com/v1/search/news.json?{query}'
            req = urllib.request.Request(url, headers={
                'X-Naver-Client-Id': NAVER_ID,
                'X-Naver-Client-Secret': NAVER_SECRET,
            })
            with urllib.request.urlopen(req, timeout=10) as res:
                data = json.loads(res.read().decode('utf-8'))

            for item in data.get('items', []):
                title = item.get('title', '').replace('<b>', '').replace('</b>', '').replace('&amp;', '&').replace('&quot;', '"')
                link = item.get('link', '')
                pub_date = item.get('pubDate', '')
                description = item.get('description', '').replace('<b>', '').replace('</b>', '')

                # 출자사업 관련 키워드 필터
                keywords_check = ['출자', '펀드', 'GP', '위탁운용', '블라인드', '공모']
                if not any(k in title for k in keywords_check):
                    continue

                if title in seen_titles:
                    continue
                seen_titles.add(title)

                # 날짜 파싱 (RFC 822 형식)
                date_str = None
                try:
                    dt = datetime.strptime(pub_date, '%a, %d %b %Y %H:%M:%S %z')
                    date_str = dt.astimezone(KST).strftime('%Y-%m-%d')
                except Exception:
                    pass

                results.append({
                    'title': title,
                    'source': 'NEWS',
                    'institution': '뉴스감지',
                    'date': date_str,
                    'deadline': None,
                    'amount': None,
                    'gpCount': None,
                    'tags': ['VC'],
                    'url': link,
                    'summary': description,
                    'isNew': True,
                })

            print(f"[INFO] Naver '{keyword}': {len(data.get('items', []))}건")
        except Exception as e:
            print(f"[WARN] Naver search failed for '{keyword}': {e}")

    print(f"[INFO] Naver total: {len(results)}건")
    return results


def anthropic_search():
    """Anthropic Claude + Web Search로 공고 수집"""
    url = 'https://api.anthropic.com/v1/messages'
    payload = {
        'model': 'claude-sonnet-4-6',
        'max_tokens': 8000,
        'tools': [{'type': 'web_search_20250305', 'name': 'web_search'}],
        'messages': [{'role': 'user', 'content': ANTHROPIC_PROMPT}]
    }
    req = urllib.request.Request(
        url,
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
    print(f"[DEBUG] Anthropic response length: {len(text)}")

    start = text.find('[')
    if start == -1:
        return []

    depth, real_end = 0, start
    for i, ch in enumerate(text[start:]):
        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                real_end = start + i + 1
                break

    raw = json.loads(text[start:real_end])
    print(f"[INFO] Anthropic: {len(raw)}건")
    return raw


def enrich(notices):
    """만료/긴급/신규 여부 계산 및 중복 제거"""
    seen = set()
    enriched = []

    for i, n in enumerate(notices):
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
        urgent = deadline_ts is not None and not expired and deadline_ts <= NOW_TS + SEVEN_DAYS_MS
        days_left = round((deadline_ts - NOW_TS) / 86400000) if deadline_ts else None
        is_new = date_ts is not None and (NOW_TS - date_ts) <= SEVEN_DAYS_MS and not expired

        enriched.append({
            **n,
            'id': str(len(enriched) + 1),
            'expired': expired,
            'urgent': urgent,
            'daysLeft': days_left,
            'isNew': is_new,
        })

    enriched.sort(key=lambda x: (x['expired'], not x.get('isNew', False)))
    return enriched


def main():
    if not ANTHROPIC_KEY:
        print("[ERROR] ANTHROPIC_API_KEY not set")
        sys.exit(1)

    print(f"[INFO] Collecting notices for {TODAY}...")

    all_notices = []

    # 1. 네이버 뉴스 검색
    try:
        naver_results = naver_news_search()
        all_notices.extend(naver_results)
    except Exception as e:
        print(f"[WARN] Naver search error: {e}")

    # 2. Anthropic Web Search
    try:
        anthropic_results = anthropic_search()
        all_notices.extend(anthropic_results)
    except Exception as e:
        print(f"[ERROR] Anthropic search failed: {e}")
        if os.path.exists('public/notices.json'):
            print("[INFO] Keeping existing notices.json")
            sys.exit(0)

    enriched = enrich(all_notices)
    print(f"[INFO] Total after dedup: {len(enriched)}건")

    os.makedirs('public', exist_ok=True)
    output = {
        'updatedAt': NOW_TS,
        'updatedDate': TODAY,
        'count': len(enriched),
        'notices': enriched,
    }
    with open('public/notices.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[INFO] Saved {len(enriched)} notices")


if __name__ == '__main__':
    main()