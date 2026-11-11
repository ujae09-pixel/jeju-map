#!/usr/bin/env python3
"""기상청(공공데이터포털) 날씨를 받아 weather.json 으로 저장합니다.

- 현재 날씨: 초단기실황 (getUltraSrtNcst)
- 오늘~모레 예보: 단기예보 (getVilageFcst)
- 4~10일 뒤 예보: 중기예보 (getMidLandFcst, getMidTa)

인증키는 환경변수 KMA_KEY 로만 읽습니다 (코드/저장소에 넣지 않음).
GitHub Actions 에서 1시간마다 실행됩니다. 모든 호출이 실패하면 파일을 쓰지 않고 오류로 종료합니다.
"""
import json
import math
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))

# (이름, 위도, 경도, 중기예보 지역) - 이름은 places.js 의 WEATHER_REGIONS 와 같아야 합니다.
REGIONS = [
    ("제주시", 33.5097, 126.5219, "제주"),
    ("애월", 33.4630, 126.3100, "제주"),
    ("서부(협재)", 33.3943, 126.2397, "제주"),
    ("서귀포", 33.2541, 126.5601, "서귀포"),
    ("동부(성산)", 33.4614, 126.9424, "제주"),
    ("한라산(산간)", 33.3617, 126.5292, None),
]

VILAGE = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/"
MID = "https://apis.data.go.kr/1360000/MidFcstInfoService/"
MID_LAND_ID = "11G00000"  # 제주도 육상예보 구역
MID_TA_ID = {"제주": "11G00201", "서귀포": "11G00401"}  # 중기기온 지점


# ---------- 위경도 -> 기상청 격자(nx, ny) ----------
def to_grid(lat, lon):
    RE, GRID, SLAT1, SLAT2, OLON, OLAT, XO, YO = 6371.00877, 5.0, 30.0, 60.0, 126.0, 38.0, 43, 136
    d = math.pi / 180.0
    re = RE / GRID
    slat1, slat2, olon, olat = SLAT1 * d, SLAT2 * d, OLON * d, OLAT * d
    sn = math.tan(math.pi * 0.25 + slat2 * 0.5) / math.tan(math.pi * 0.25 + slat1 * 0.5)
    sn = math.log(math.cos(slat1) / math.cos(slat2)) / math.log(sn)
    sf = math.tan(math.pi * 0.25 + slat1 * 0.5)
    sf = math.pow(sf, sn) * math.cos(slat1) / sn
    ro = math.tan(math.pi * 0.25 + olat * 0.5)
    ro = re * sf / math.pow(ro, sn)
    ra = math.tan(math.pi * 0.25 + lat * d * 0.5)
    ra = re * sf / math.pow(ra, sn)
    theta = lon * d - olon
    if theta > math.pi:
        theta -= 2.0 * math.pi
    if theta < -math.pi:
        theta += 2.0 * math.pi
    theta *= sn
    x = math.floor(ra * math.sin(theta) + XO + 0.5)
    y = math.floor(ro - ra * math.cos(theta) + YO + 0.5)
    return int(x), int(y)


# ---------- API 호출 ----------
def call(base, endpoint, params, errors, label):
    """호출 후 items(list) 반환. 실패하면 None (오류 문구에는 인증키를 넣지 않음)."""
    key = os.environ.get("KMA_KEY", "").strip()
    if "%" in key:  # Encoding 키를 넣었어도 동작하도록
        key = urllib.parse.unquote(key)
    q = {"serviceKey": key}
    q.update(params)
    url = base + endpoint + "?" + urllib.parse.urlencode(q)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "jeju-map-weather/1.0"})
        with urllib.request.urlopen(req, timeout=25) as r:
            raw = r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        errors.append(f"{label}: HTTP {e.code}")
        return None
    except Exception as e:  # 네트워크 오류 등
        errors.append(f"{label}: {type(e).__name__}")
        return None
    try:
        j = json.loads(raw)
        header = j["response"]["header"]
        if header.get("resultCode") != "00":
            errors.append(f"{label}: {header.get('resultCode')} {header.get('resultMsg')}")
            return None
        items = j["response"]["body"]["items"]["item"]
        return items if isinstance(items, list) else [items]
    except Exception:
        # 인증키 오류 등은 XML 로 내려오기도 함 -> 앞부분만 기록
        snippet = " ".join(raw.split())[:120]
        errors.append(f"{label}: 응답 해석 실패 ({snippet})")
        return None


def num(v, default=None):
    """숫자로 변환. 기상청은 결측값을 -999, -998.9 등으로 주므로 None 으로 처리."""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return default
    return default if f <= -900 else f


# ---------- 현재 날씨 (초단기실황) ----------
def fetch_now(nx, ny, now, errors, label, fetch=call):
    t = now - timedelta(minutes=40)  # 정시 자료는 매시 40분 이후 제공
    base_date, base_time = t.strftime("%Y%m%d"), t.strftime("%H00")
    items = fetch(VILAGE, "getUltraSrtNcst", dict(
        pageNo=1, numOfRows=100, dataType="JSON",
        base_date=base_date, base_time=base_time, nx=nx, ny=ny), errors, label + " 현재")
    if not items:
        return None
    v = {it["category"]: num(it.get("obsrValue")) for it in items}
    return {
        "temp": v.get("T1H"), "rn1": v.get("RN1"), "pty": int(v.get("PTY") or 0),
        "wsd": v.get("WSD"), "reh": v.get("REH"),
        "base": f"{base_date[:4]}-{base_date[4:6]}-{base_date[6:]} {base_time[:2]}:00",
    }


# ---------- 단기예보 ----------
def short_base(now):
    avail = [2, 5, 8, 11, 14, 17, 20, 23]
    t = now - timedelta(minutes=10)
    hrs = [h for h in avail if h <= t.hour]
    if hrs:
        d, h = t.date(), hrs[-1]
    else:
        d, h = (t - timedelta(days=1)).date(), 23
    return d.strftime("%Y%m%d"), f"{h:02d}00"


def summarize_short(items, now):
    """단기예보 items -> ({날짜: 일 요약}, 현재시각 이후 첫 하늘상태)"""
    days, sky_series = {}, []
    for it in items:
        d, tm, c, v = it["fcstDate"], it["fcstTime"], it["category"], it["fcstValue"]
        rec = days.setdefault(d, {"tmp": [], "pop": [], "sky": {}, "pty": {}, "tmn": None, "tmx": None})
        if c == "TMP":
            rec["tmp"].append(num(v))
        elif c == "TMN":
            rec["tmn"] = num(v)
        elif c == "TMX":
            rec["tmx"] = num(v)
        elif c == "POP":
            rec["pop"].append(num(v, 0))
        elif c == "SKY":
            rec["sky"][tm] = int(num(v, 1))
            sky_series.append((d + tm, int(num(v, 1))))
        elif c == "PTY":
            rec["pty"][tm] = int(num(v, 0))
    out = {}
    for d, r in days.items():
        tmp = [x for x in r["tmp"] if x is not None]
        sky = r["sky"].get("1200") or r["sky"].get("1500") or (list(r["sky"].values()) or [None])[len(r["sky"]) // 2 if r["sky"] else 0]
        out[f"{d[:4]}-{d[4:6]}-{d[6:]}"] = {
            "tmn": r["tmn"] if r["tmn"] is not None else (min(tmp) if tmp else None),
            "tmx": r["tmx"] if r["tmx"] is not None else (max(tmp) if tmp else None),
            "pop": max(r["pop"]) if r["pop"] else None,
            "sky": sky,
            "pty": max(r["pty"].values()) if r["pty"] else 0,
        }
    cur_key = now.strftime("%Y%m%d%H00")
    sky_series.sort()
    sky_now = next((s for k, s in sky_series if k >= cur_key), sky_series[-1][1] if sky_series else None)
    return out, sky_now


def fetch_short(nx, ny, now, errors, label, fetch=call):
    base_date, base_time = short_base(now)
    items = fetch(VILAGE, "getVilageFcst", dict(
        pageNo=1, numOfRows=1500, dataType="JSON",
        base_date=base_date, base_time=base_time, nx=nx, ny=ny), errors, label + " 단기")
    if not items:
        return None, None
    return summarize_short(items, now)


# ---------- 중기예보 ----------
def mid_tmfc(now):
    t = now - timedelta(minutes=30)
    if t.hour >= 18:
        d, h = t.date(), "1800"
    elif t.hour >= 6:
        d, h = t.date(), "0600"
    else:
        d, h = (t - timedelta(days=1)).date(), "1800"
    return d, d.strftime("%Y%m%d") + h


def fetch_mid(now, errors, fetch=call):
    base_day, tmfc = mid_tmfc(now)
    land_items = fetch(MID, "getMidLandFcst", dict(
        pageNo=1, numOfRows=10, dataType="JSON", regId=MID_LAND_ID, tmFc=tmfc), errors, "중기 육상")
    land = (land_items or [None])[0]
    result = {}
    for area, reg_id in MID_TA_ID.items():
        ta_items = fetch(MID, "getMidTa", dict(
            pageNo=1, numOfRows=10, dataType="JSON", regId=reg_id, tmFc=tmfc), errors, f"중기 기온({area})")
        ta = (ta_items or [None])[0]
        if not land and not ta:
            continue
        days = {}
        for n in range(4, 11):
            date = (base_day + timedelta(days=n)).strftime("%Y-%m-%d")
            rec = {"tmn": None, "tmx": None, "pop": None, "wf": None}
            if ta:
                rec["tmn"], rec["tmx"] = num(ta.get(f"taMin{n}")), num(ta.get(f"taMax{n}"))
            if land:
                if n <= 7:
                    pops = [num(land.get(f"rnSt{n}Am")), num(land.get(f"rnSt{n}Pm"))]
                    rec["wf"] = land.get(f"wf{n}Pm") or land.get(f"wf{n}Am")
                else:
                    pops = [num(land.get(f"rnSt{n}"))]
                    rec["wf"] = land.get(f"wf{n}")
                pops = [p for p in pops if p is not None]
                rec["pop"] = max(pops) if pops else None
            days[date] = rec
        result[area] = days
    return result, tmfc


# ---------- 전체 ----------
def build(now, fetch=call):
    errors, regions = [], {}
    for name, lat, lon, mid_area in REGIONS:
        nx, ny = to_grid(lat, lon)
        now_data = fetch_now(nx, ny, now, errors, name, fetch)
        daily, sky_now = fetch_short(nx, ny, now, errors, name, fetch)
        if now_data is not None and sky_now is not None:
            now_data["sky"] = sky_now
        regions[name] = {"nx": nx, "ny": ny, "now": now_data, "daily": daily or {}, "mid": mid_area}
    mid, tmfc = fetch_mid(now, errors, fetch)
    return {
        "updated": now.isoformat(timespec="seconds"),
        "source": "기상청 (공공데이터포털 단기예보·중기예보)",
        "regions": regions,
        "mid": mid,
        "midBase": tmfc,
        "errors": errors,
    }


def main():
    if not os.environ.get("KMA_KEY", "").strip():
        print("KMA_KEY 환경변수가 없습니다.", file=sys.stderr)
        return 1
    now = datetime.now(KST)
    data = build(now)
    got = sum(1 for r in data["regions"].values() if r["now"] or r["daily"]) + len(data["mid"])
    for e in data["errors"]:
        print("경고:", e)
    if got == 0:
        print("모든 호출이 실패해서 weather.json 을 갱신하지 않습니다.", file=sys.stderr)
        return 1
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "weather.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print("weather.json 저장 완료:", data["updated"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
