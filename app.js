function showNotice(html) {
  const n = document.getElementById('notice');
  n.innerHTML = html;
  n.style.display = 'flex';
}

if (typeof kakao === 'undefined' || !kakao.maps) {
  showNotice(
    '<div><h3>지도를 불러오지 못했습니다</h3>' +
    '<p><code>index.html</code>의 카카오 JavaScript 키, <b>플랫폼 → Web 도메인 등록</b>, ' +
    '<b>카카오맵 사용 설정</b>을 확인하세요.</p></div>'
  );
} else {
  kakao.maps.load(init);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function safeUrl(u) { return /^https?:\/\//i.test(u) ? u : '#'; }

// index.html 의 카카오 지도 SDK 주소에서 JavaScript 키를 가져옵니다 (카카오내비 연동용)
const KAKAO_JS_KEY = (function () {
  const s = document.querySelector('script[src*="dapi.kakao.com"]');
  return s ? new URL(s.src, location.href).searchParams.get('appkey') : '';
})();

function init() {
  const map = new kakao.maps.Map(document.getElementById('map'), {
    center: new kakao.maps.LatLng(33.389, 126.55),
    level: 10
  });

  window.jejuMap = map; // 디버깅용

  // ---- 핀 이미지 (카테고리 색 + 종류별 크기) ----
  const imgCache = {};
  function pinImage(category, kind) {
    const key = category + '|' + kind;
    if (imgCache[key]) return imgCache[key];
    const c = CATEGORIES[category];
    const mine = kind === 'mine';
    const w = mine ? 40 : 32, h = mine ? 52 : 42;
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 40 52">' +
      '<path d="M20 1C9.5 1 1 9.5 1 20c0 14 19 31 19 31s19-17 19-31C39 9.5 30.500 1 20 1z" fill="' + c.color +
      '" fill-opacity="' + (mine ? 1 : 0.8) + '" stroke="#fff" stroke-width="2"' + (mine ? '' : ' stroke-dasharray="4 2"') + '/>' +
      '<circle cx="20" cy="20" r="14" fill="#fff"/>' +
      '<text x="20" y="26" font-size="16" text-anchor="middle">' + c.emoji + '</text></svg>';
    return (imgCache[key] = new kakao.maps.MarkerImage(
      'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
      new kakao.maps.Size(w, h),
      { offset: new kakao.maps.Point(w / 2, h) }
    ));
  }

  // ---- 일차별 방문 순서 (숙소·공항은 일차마다 순서가 다를 수 있음) ----
  const orderOf = (p, d) => (p.orders && p.orders[d] != null) ? p.orders[d] : p.order;
  const rank = {};
  Object.keys(DAYS).forEach(d => {
    rank[d] = {};
    PLACES.filter(p => p.days.includes(Number(d)))
      .sort((a, b) => orderOf(a, d) - orderOf(b, d))
      .forEach((p, i) => { rank[d][p.name] = i + 1; });
  });

  // ---- 마커 생성 ----
  const items = PLACES.map(p => {
    const marker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(p.lat, p.lng),
      title: p.name,
      image: pinImage(p.category, p.kind)
    });
    kakao.maps.event.addListener(marker, 'click', () => showDetail(p));
    return { p, marker, overlay: null };
  });

  // ---- 필터 상태 ----
  const state = { day: 'all', cat: '전체', route: false, list: false };
  let lastShown = [];
  const isMobile = () => window.matchMedia('(max-width: 720px)').matches;
  const listEl = document.getElementById('list');
  const gpsBtn = document.getElementById('gpsbtn');
  const gpsOff = document.getElementById('gpsoff');
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  let gpsWatch = null, lastPos = null; // 내 위치 추적 상태
  function toast(msg, ms) {
    toastEl.textContent = msg; toastEl.style.display = 'block';
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.style.display = 'none'; }, ms || 3500);
  }
  let polyline = null;

  const filters = document.getElementById('filters');
  const rowDay = document.createElement('div'); rowDay.className = 'frow';
  const rowCat = document.createElement('div'); rowCat.className = 'frow';
  filters.append(rowDay, rowCat);

  function chip(parent, label, onclick) {
    const b = document.createElement('button');
    b.className = 'chip'; b.textContent = label; b.onclick = onclick;
    parent.appendChild(b); return b;
  }

  const dayChips = [];
  [['all', '전체 일정']].concat(Object.keys(DAYS).map(d => [Number(d), DAYS[d]])).forEach(([v, label]) => {
    const b = chip(rowDay, label, () => { state.day = v; state.list = v !== 'all'; apply(true); });
    dayChips.push({ v, b });
  });
  const listChip = chip(rowDay, '📋 목록', () => { state.list = !state.list; renderList(); });
  const routeChip = chip(rowDay, '🔢 방문순서 보기', () => { state.route = !state.route; apply(false); });
  const restroomChip = chip(rowDay, '🚻 화장실 찾기', () => toggleRestroom());
  const restroomBox = document.createElement('div'); restroomBox.id = 'restroom';
  filters.appendChild(restroomBox);

  // ---- 급할 때: 내 위치(또는 지도 중심) 주변 공중화장실 (평소에는 표시하지 않음) ----
  let restroomMarkers = [], myPosOverlay = null, restroomOn = false;

  function clearRestroom() {
    restroomMarkers.forEach(m => m.setMap(null)); restroomMarkers = [];
    if (myPosOverlay) { myPosOverlay.setMap(null); myPosOverlay = null; }
    restroomBox.style.display = 'none'; restroomBox.innerHTML = '';
    restroomOn = false;
    restroomChip.style.background = '#fff'; restroomChip.style.color = '#333';
  }

  function toggleRestroom() {
    if (restroomOn) { clearRestroom(); return; }
    restroomOn = true;
    restroomChip.style.background = '#0b7285'; restroomChip.style.color = '#fff';
    restroomBox.style.display = 'block';
    restroomBox.textContent = '내 위치를 확인하는 중... (허용하지 않으면 지도 중심 기준)';
    if (gpsWatch !== null && lastPos) { searchRestroom(lastPos, false); return; } // 내 위치 추적 중이면 그 위치 기준
    const go = (lat, lng, mine) => searchRestroom(new kakao.maps.LatLng(lat, lng), mine);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => go(pos.coords.latitude, pos.coords.longitude, true),
        () => { const c = map.getCenter(); go(c.getLat(), c.getLng(), false); },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 });
    } else { const c = map.getCenter(); go(c.getLat(), c.getLng(), false); }
  }

  function searchRestroom(pos, mine) {
    const ps = new kakao.maps.services.Places();
    const opt = { location: pos, radius: 20000, sort: kakao.maps.services.SortBy.DISTANCE, size: 15 };
    const results = {};
    let pending = 2;
    const done = () => {
      if (--pending) return;
      if (!restroomOn) return;
      const list = Object.values(results).sort((a, b) => (+a.distance) - (+b.distance)).slice(0, 8);
      if (mine) {
        myPosOverlay = new kakao.maps.CustomOverlay({
          position: pos, yAnchor: 0.5, xAnchor: 0.5, zIndex: 9,
          content: '<div style="width:16px;height:16px;border-radius:50%;background:#228be6;border:3px solid #fff;box-shadow:0 0 6px rgba(0,0,0,.5)"></div>'
        });
        myPosOverlay.setMap(map);
      }
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 40 52"><path d="M20 1C9.500 1 1 9.500 1 20c0 14 19 31 19 31s19-17 19-31C39 9.500 30.500 1 20 1z" fill="#0b7285" stroke="#fff" stroke-width="2"/><circle cx="20" cy="20" r="14" fill="#fff"/><text x="20" y="26" font-size="16" text-anchor="middle">🚻</text></svg>';
      const img = new kakao.maps.MarkerImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
        new kakao.maps.Size(30, 38), { offset: new kakao.maps.Point(15, 38) });
      if (!list.length) {
        restroomBox.innerHTML = '<b>주변에서 찾지 못했습니다.</b><small>지도를 옮긴 뒤 다시 눌러 보세요.</small>';
        return;
      }
      const bounds = new kakao.maps.LatLngBounds(); bounds.extend(pos);
      restroomBox.innerHTML = '<b>🚻 가까운 화장실' + (mine ? '' : ' (지도 중심 기준)') + '</b>';
      list.forEach(x => {
        const ll = new kakao.maps.LatLng(+x.y, +x.x);
        const m = new kakao.maps.Marker({ map, position: ll, image: img, title: x.place_name });
        restroomMarkers.push(m); bounds.extend(ll);
        const d = +x.distance;
        const dist = isNaN(d) ? '' : (d >= 1000 ? (d / 1000).toFixed(1) + 'km' : d + 'm');
        const item = document.createElement('div'); item.className = 'item';
        item.innerHTML = '<b>' + esc(x.place_name) + '</b> ' + esc(dist) +
          '<small>' + esc(x.road_address_name || x.address_name) + '</small>' +
          '<a href="https://map.kakao.com/link/to/' + encodeURIComponent(x.place_name) + ',' + x.y + ',' + x.x +
          '" target="_blank" rel="noopener" style="font-size:12px;color:#1c4e9d">길찾기</a>';
        item.onclick = ev => { if (ev.target.tagName !== 'A') map.panTo(ll); };
        restroomBox.appendChild(item);
        kakao.maps.event.addListener(m, 'click', () => map.panTo(ll));
      });
      const note = document.createElement('small');
      note.textContent = '※ 개방 시간은 장소마다 다릅니다. 건물 내 화장실은 운영시간을 확인하세요.';
      restroomBox.appendChild(note);
      map.setBounds(bounds, 90, 40, 40, 40);
    };
    ['공중화장실', '개방화장실'].forEach(q =>
      ps.keywordSearch(q, (data, status) => {
        if (status === kakao.maps.services.Status.OK) data.forEach(x => { results[x.id] = x; });
        done();
      }, opt));
  }

  const catChips = [];
  ['전체'].concat(Object.keys(CATEGORIES)).forEach(name => {
    const label = name === '전체' ? '전체' : CATEGORIES[name].emoji + ' ' + name;
    const b = chip(rowCat, label, () => { state.cat = name; apply(true); });
    catChips.push({ v: name, b });
  });

  function paintChips() {
    dayChips.forEach(({ v, b }) => {
      const on = state.day === v;
      b.style.background = on ? '#333' : '#fff'; b.style.color = on ? '#fff' : '#333';
    });
    catChips.forEach(({ v, b }) => {
      const on = state.cat === v;
      b.style.background = on ? (v === '전체' ? '#333' : CATEGORIES[v].color) : '#fff';
      b.style.color = on ? '#fff' : '#333';
    });
    routeChip.style.background = state.route ? '#e03131' : '#fff';
    routeChip.style.color = state.route ? '#fff' : '#333';
    routeChip.style.display = state.day === 'all' ? 'none' : '';
  }

  function clearExtras() {
    if (polyline) { polyline.setMap(null); polyline = null; }
    items.forEach(it => { if (it.overlay) { it.overlay.setMap(null); it.overlay = null; } });
  }

  function apply(fit) {
    clearExtras();
    const shown = items.filter(({ p }) =>
      (state.day === 'all' || p.days.includes(state.day)) &&
      (state.cat === '전체' || p.category === state.cat));

    items.forEach(it => it.marker.setMap(shown.includes(it) ? map : null));

    // 하루를 선택하고 '방문순서 보기'를 켰을 때만 번호와 대략적인 연결선 표시
    if (state.day !== 'all' && state.route) {
      const ordered = shown.slice().sort((a, b) => orderOf(a.p, state.day) - orderOf(b.p, state.day));
      ordered.forEach(it => {
        it.overlay = new kakao.maps.CustomOverlay({
          position: it.marker.getPosition(), yAnchor: 1, xAnchor: 0.5, zIndex: 5,
          content: '<div style="transform:translate(16px,-44px);background:#222;color:#fff;' +
            'border-radius:999px;min-width:20px;height:20px;line-height:20px;text-align:center;' +
            'font-size:12px;padding:0 5px;pointer-events:none">' + rank[state.day][it.p.name] + '</div>'
        });
        it.overlay.setMap(map);
      });
      if (ordered.length > 1) {
        polyline = new kakao.maps.Polyline({
          map, path: ordered.map(it => it.marker.getPosition()),
          strokeWeight: 3, strokeColor: '#e03131', strokeOpacity: 0.6, strokeStyle: 'shortdash'
        });
      }
    }

    if (fit && shown.length) {
      const b = new kakao.maps.LatLngBounds();
      shown.forEach(it => b.extend(it.marker.getPosition()));
      // 위쪽 메뉴(날씨+필터)와 아래쪽 목록에 핀이 가려지지 않도록 여백 계산
      const mob = isMobile();
      const topPad = mob ? Math.ceil(filters.getBoundingClientRect().bottom) + 10 : 90;
      const botPad = (mob && state.list) ? Math.round(window.innerHeight * 0.42) + 10 : 40;
      const side = mob ? 14 : 40;
      map.setBounds(b, topPad, side, botPad, side);
    }
    lastShown = shown;
    paintChips();
    closePanel();
    renderList();
  }

  // ---- 오른쪽 목록: 카테고리 / 업소명 / 세부정보 ----
  function renderList() {
    const arr = lastShown.slice();
    if (state.day !== 'all') arr.sort((a, b) => orderOf(a.p, state.day) - orderOf(b.p, state.day));
    else arr.sort((a, b) => a.p.category.localeCompare(b.p.category, 'ko') || a.p.name.localeCompare(b.p.name, 'ko'));
    const title = (state.day === 'all' ? '전체 일정' : DAYS[state.day]) +
      (state.cat === '전체' ? '' : ' · ' + state.cat) + ' (' + arr.length + '곳)';
    listEl.innerHTML = '<div class="lh">' + esc(title) + '</div>';
    arr.forEach(it => {
      const p = it.p, c = CATEGORIES[p.category];
      const el = document.createElement('div'); el.className = 'li';
      el.innerHTML =
        '<div><span class="cat" style="background:' + c.color + '">' + c.emoji + ' ' + esc(p.category) + '</span>' +
        '<span class="kd">' + (p.kind === 'mine' ? '⭐ 반드시 방문' : '선택 추천') + '</span></div>' +
        '<div class="nm" style="margin-top:4px">' + esc(p.name) + '</div>' +
        '<div class="d">' + esc((p.tag ? p.tag + ' · ' : '') + p.address) + '</div>' +
        '<div class="d2">' + esc(p.intro) + '</div>';
      el.onclick = () => showDetail(p);
      listEl.appendChild(el);
    });
    listEl.scrollTop = 0;
    updateListVisibility();
    listChip.style.background = state.list ? '#333' : '#fff';
    listChip.style.color = state.list ? '#fff' : '#333';
  }

  function updateListVisibility() {
    const mobile = isMobile();
    const open = state.list && lastShown.length > 0 && !(mobile && panel.classList.contains('open'));
    listEl.classList.toggle('open', open);
    document.body.classList.toggle('withlist', state.list && !mobile);
    gpsBtn.classList.toggle('up', open && mobile);
  }

  // ---- 소개 패널 ----
  const panel = document.getElementById('panel');
  const detail = document.getElementById('detail');

  // 카카오내비: 모바일에서 앱이 실행됩니다. 실패하면 카카오맵 길찾기로 대체합니다.
  function startNavi(name, lat, lng) {
    try {
      if (typeof Kakao === 'undefined') throw new Error('no sdk');
      if (!Kakao.isInitialized()) Kakao.init(KAKAO_JS_KEY);
      Kakao.Navi.start({ name: name, x: lng, y: lat, coordType: 'wgs84' });
    } catch (e) {
      window.open('https://map.kakao.com/link/to/' + encodeURIComponent(name) + ',' + lat + ',' + lng, '_blank');
    }
  }

  function showDetail(p) {
    const c = CATEGORIES[p.category];
    const q = encodeURIComponent(p.name.replace(/\s*\(.*\)$/, ''));
    const dayText = p.days.map(d => DAYS[d]).join(' · ');
    const meta = (typeof PLACE_META !== 'undefined' && PLACE_META[p.name]) || null;
    const detailUrl = meta && meta.id
      ? 'https://place.map.kakao.com/' + meta.id
      : 'https://map.kakao.com/link/search/' + q;
    // 블로그 후기 검색 (장소명 + 제주)
    const bq = encodeURIComponent(p.name.replace(/\s*\(.*\)$/, '').replace(/,/g, '') + ' 제주');
    const links = ['<a class="hot" href="' + esc(detailUrl) + '" target="_blank" rel="noopener">영업시간·메뉴·후기 (카카오맵)</a>',
      '<a class="blog" href="https://search.naver.com/search.naver?ssc=tab.blog.all&query=' + bq + '" target="_blank" rel="noopener">📝 네이버 블로그 후기</a>',
      '<a class="blog" href="https://search.daum.net/search?w=blog&q=' + bq + '" target="_blank" rel="noopener">📝 다음 블로그 후기</a>']
      .concat((p.links || []).map(l =>
        '<a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(l.label) + '</a>')).join('');
    const phone = meta && meta.phone
      ? '<div class="row"><span class="label">전화</span><a href="tel:' + esc(meta.phone.replace(/[^0-9+]/g, '')) + '">' + esc(meta.phone) + '</a></div>' : '';
    const hoursRow = p.hours ? '<div class="row"><span class="label">영업시간</span>' + esc(p.hours).replace(/\n/g, '<br>') + '</div>' : '';
    const menuRow = p.menu ? '<div class="row"><span class="label">메뉴</span>' + esc(p.menu).replace(/\n/g, '<br>') + '</div>' : '';
    detail.innerHTML =
      '<span class="badge" style="background:' + c.color + '">' + c.emoji + ' ' + esc(p.category) + '</span>' +
      (p.tag ? '<span class="tagk">' + esc(p.tag) + '</span>' : '') +
      '<span class="kindbadge ' + p.kind + '">' + (p.kind === 'mine' ? '⭐ 반드시 방문' : '선택 추천') + '</span>' +
      '<h2>' + esc(p.name) + '</h2>' +
      (p.photo ? '<img src="' + esc(safeUrl(p.photo)) + '" alt="' + esc(p.name) + '">' : '') +
      '<div class="row"><span class="label">일정</span>' + esc(dayText) + '</div>' +
      '<div class="row"><span class="label">소개</span>' + esc(p.intro) + '</div>' +
      '<div class="row"><span class="label">위치</span>' + esc(p.address) + '</div>' +
      phone + hoursRow + menuRow +
      (p.memo ? '<div class="row"><span class="label">메모</span>' + esc(p.memo) + '</div>' : '') +
      '<div class="btns two">' +
        '<a href="#" class="navi" id="navibtn">카카오내비 안내</a>' +
        '<a class="sub" href="https://map.kakao.com/link/to/' + q + ',' + p.lat + ',' + p.lng + '" target="_blank" rel="noopener">카카오맵 길찾기</a>' +
        '<a href="https://map.kakao.com/link/map/' + q + ',' + p.lat + ',' + p.lng + '" target="_blank" rel="noopener">카카오맵에서 보기</a>' +
      '</div>' +
      '<div class="plinks">' + links + '</div>' +
      '<div id="note">※ 영업시간·휴무일은 변동될 수 있으니 방문 전 카카오맵 상세 또는 전화로 확인하세요.<br>카카오내비는 폰(카카오내비 앱 설치)에서 실행됩니다.</div>';
    document.getElementById('navibtn').onclick = ev => { ev.preventDefault(); startNavi(p.name, p.lat, p.lng); };
    panel.classList.add('open');
    updateListVisibility();
    map.panTo(new kakao.maps.LatLng(p.lat, p.lng));
  }

  function closePanel() { panel.classList.remove('open'); updateListVisibility(); }
  document.getElementById('close').onclick = closePanel;
  kakao.maps.event.addListener(map, 'click', closePanel);

  // ---- 내 위치 (GPS) ----
  let gpsDot = null, gpsCircle = null, gpsFirst = true;

  function drawMyPos(pos) {
    const ll = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    lastPos = ll;
    if (!gpsDot) {
      gpsDot = new kakao.maps.CustomOverlay({
        position: ll, yAnchor: 0.5, xAnchor: 0.5, zIndex: 20,
        content: '<div style="width:18px;height:18px;border-radius:50%;background:#228be6;border:3px solid #fff;box-shadow:0 0 8px rgba(0,0,0,.6)"></div>'
      });
      gpsDot.setMap(map);
      gpsCircle = new kakao.maps.Circle({
        map, center: ll, radius: Math.max(pos.coords.accuracy || 30, 15),
        strokeWeight: 1, strokeColor: '#228be6', strokeOpacity: 0.6, fillColor: '#228be6', fillOpacity: 0.15
      });
    } else {
      gpsDot.setPosition(ll); gpsCircle.setPosition(ll); gpsCircle.setRadius(Math.max(pos.coords.accuracy || 30, 15));
    }
    return ll;
  }

  function startGps() {
    if (!navigator.geolocation) { toast('이 브라우저는 위치 기능을 지원하지 않습니다.'); return; }
    gpsFirst = true;
    toast('내 위치를 찾는 중... 권한 요청이 뜨면 허용해 주세요.', 5000);
    gpsWatch = navigator.geolocation.watchPosition(pos => {
      const ll = drawMyPos(pos);
      if (gpsFirst) {
        gpsFirst = false;
        if (map.getLevel() > 6) map.setLevel(6);
        map.panTo(ll);
        toast('내 위치를 표시했습니다. 📍 버튼을 다시 누르면 내 위치로 이동합니다.');
      }
    }, err => {
      const msg = err.code === 1
        ? '위치 권한이 거부되었습니다. 브라우저(주소창 자물쇠) 설정에서 위치를 허용해 주세요. (https 주소에서만 동작)'
        : err.code === 2 ? '위치를 확인할 수 없습니다. GPS/위치 서비스를 켜 주세요.'
        : '위치 확인 시간이 초과되었습니다. 다시 시도해 주세요.';
      toast(msg, 6000);
      if (err.code === 1) stopGps();
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    gpsBtn.classList.add('on'); gpsOff.style.display = 'block';
  }

  function stopGps() {
    if (gpsWatch !== null) navigator.geolocation.clearWatch(gpsWatch);
    gpsWatch = null; lastPos = null;
    if (gpsDot) { gpsDot.setMap(null); gpsDot = null; }
    if (gpsCircle) { gpsCircle.setMap(null); gpsCircle = null; }
    gpsBtn.classList.remove('on'); gpsOff.style.display = 'none';
  }

  gpsBtn.onclick = () => {
    if (gpsWatch === null) startGps();
    else if (lastPos) { map.setLevel(Math.min(map.getLevel(), 6)); map.panTo(lastPos); }
  };
  gpsOff.onclick = () => { stopGps(); toast('내 위치 표시를 껐습니다.'); };

  // ---- 제주 날씨 (Open-Meteo: 무료·키 불필요, 15분 단위 현재값 + 일별 예보) ----
  const WMO = (c) => {
    if (c === 0) return ['☀️', '맑음'];
    if (c === 1) return ['🌤️', '대체로 맑음'];
    if (c === 2) return ['⛅', '구름 조금'];
    if (c === 3) return ['☁️', '흐림'];
    if (c === 45 || c === 48) return ['🌫️', '안개'];
    if (c >= 51 && c <= 57) return ['🌦️', '이슬비'];
    if (c >= 61 && c <= 67) return ['🌧️', '비'];
    if (c >= 71 && c <= 77) return ['🌨️', '눈'];
    if (c >= 80 && c <= 82) return ['🌦️', '소나기'];
    if (c === 85 || c === 86) return ['🌨️', '눈 소나기'];
    if (c >= 95) return ['⛈️', '뇌우'];
    return ['❔', '-'];
  };
  const weatherEl = document.getElementById('weather');
  // 날씨 줄이 줄바꿈으로 높이가 바뀌어도 아래 메뉴가 겹치지 않도록 높이를 CSS 변수로 전달
  function syncWeatherHeight() {
    document.documentElement.style.setProperty('--wh', weatherEl.offsetHeight + 'px');
  }
  if (window.ResizeObserver) new ResizeObserver(syncWeatherHeight).observe(weatherEl);
  window.addEventListener('resize', syncWeatherHeight);
  syncWeatherHeight();
  // 평소에는 1줄로 접혀 있고, 두 번 누르면(더블클릭/더블탭) 전체 지역 날씨가 펼쳐짐
  weatherEl.title = '두 번 누르면 전체 날씨를 펼치거나 접습니다';
  let lastWTap = 0;
  weatherEl.addEventListener('click', ev => {
    if (ev.target.closest('button')) return;
    const now = Date.now();
    if (now - lastWTap < 400) { weatherEl.classList.toggle('open'); lastWTap = 0; }
    else lastWTap = now;
  });
  const wcard = document.getElementById('wcard');
  let wdata = null; // Open-Meteo (대체용, 먼 예보용)
  let kma = null;   // 기상청 (weather.json, GitHub Actions 가 1시간마다 갱신)

  // 기상청 하늘상태(SKY)·강수형태(PTY) -> 아이콘/문구
  function kmaIcon(sky, pty) {
    if (pty === 1) return ['🌧️', '비'];
    if (pty === 2) return ['🌧️', '비/눈'];
    if (pty === 3) return ['🌨️', '눈'];
    if (pty === 4) return ['🌦️', '소나기'];
    if (pty === 5) return ['🌦️', '빗방울'];
    if (pty === 6 || pty === 7) return ['🌨️', '눈날림'];
    if (sky === 1) return ['☀️', '맑음'];
    if (sky === 3) return ['⛅', '구름많음'];
    if (sky === 4) return ['☁️', '흐림'];
    return ['❔', '-'];
  }
  // 중기예보 날씨 문구("구름많고 비" 등) -> 아이콘
  function wfIcon(t) {
    t = t || '';
    if (t.includes('눈')) return ['🌨️', t];
    if (t.includes('소나기')) return ['🌦️', t];
    if (t.includes('비')) return ['🌧️', t];
    if (t.includes('흐')) return ['☁️', t];
    if (t.includes('구름')) return ['⛅', t];
    if (t.includes('맑')) return ['☀️', t];
    return ['❔', t || '-'];
  }
  const okVal = v => v != null && v > -900; // 기상청 결측값(-999, -998.9)은 사용하지 않음
  const kmaFresh = () => !!(kma && kma.updated && (Date.now() - Date.parse(kma.updated)) < 4 * 3600 * 1000);

  // 지역별 현재 날씨: 기상청 우선, 없으면 Open-Meteo
  function currentOf(i) {
    const name = WEATHER_REGIONS[i].name;
    const k = kmaFresh() && kma.regions && kma.regions[name] && kma.regions[name].now;
    if (k && okVal(k.temp)) { // 기상청 결측값(-999 등)이면 Open-Meteo 로 대체
      return { temp: k.temp, wind: okVal(k.wsd) ? k.wsd : null, rain: okVal(k.rn1) ? k.rn1 : 0,
        icon: kmaIcon(k.sky, k.pty), src: 'kma', base: k.base };
    }
    const d = wdata && wdata[i] && wdata[i].current;
    if (d) {
      return { temp: d.temperature_2m, wind: d.wind_speed_10m / 3.6, rain: d.precipitation, icon: WMO(d.weather_code), src: 'om' };
    }
    return null;
  }

  // 지역·날짜별 예보: 기상청 단기 -> 기상청 중기 -> Open-Meteo 순
  function dailyOf(i, date) {
    const r = WEATHER_REGIONS[i];
    const kr = kmaFresh() && kma.regions && kma.regions[r.name];
    const sd = kr && kr.daily && kr.daily[date];
    if (sd && okVal(sd.tmx)) {
      return { tmx: sd.tmx, tmn: okVal(sd.tmn) ? sd.tmn : null, pop: sd.pop, icon: kmaIcon(sd.sky, sd.pty), src: 'kma' };
    }
    const md = kr && !r.mountain && kr.mid && kma.mid && kma.mid[kr.mid] && kma.mid[kr.mid][date];
    if (md && okVal(md.tmx)) {
      return { tmx: md.tmx, tmn: okVal(md.tmn) ? md.tmn : null, pop: md.pop, icon: wfIcon(md.wf), src: 'kma' };
    }
    const d = wdata && wdata[i];
    const k = d ? d.daily.time.indexOf(date) : -1;
    if (d && k >= 0) {
      return { tmx: d.daily.temperature_2m_max[k], tmn: d.daily.temperature_2m_min[k],
        pop: d.daily.precipitation_probability_max[k], icon: WMO(d.daily.weather_code[k]), src: 'om' };
    }
    return null;
  }

  function renderWeather() {
    const cur = WEATHER_REGIONS.map((r, i) => currentOf(i));
    if (!cur.some(Boolean)) return;
    const low = cur.filter((c, i) => c && !WEATHER_REGIONS[i].mountain);
    const avg = low.length ? Math.round(low.reduce((s, c) => s + c.temp, 0) / low.length) : null;
    const cnt = {}; low.forEach(c => { const k = c.icon[0] + '|' + c.icon[1]; cnt[k] = (cnt[k] || 0) + 1; });
    const topKey = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    const w0 = topKey ? topKey.split('|') : ['❔', '-'];
    const usedKma = cur.some(c => c && c.src === 'kma');
    let html = '<button id="wbtn">📅 3일 예보</button>' +
      '<span class="w"><b>제주도 전체</b> ' + w0[0] + ' ' + (avg == null ? '-' : avg) + '° ' + esc(w0[1]) + '</span>';
    cur.forEach((c, i) => {
      if (!c) return;
      html += '<span class="w"><b>' + esc(WEATHER_REGIONS[i].name) + '</b> ' + c.icon[0] + ' ' + Math.round(c.temp) + '° · 💨' +
        (c.wind == null ? '-' : (+c.wind).toFixed(1)) + 'm/s' + (c.rain > 0 ? ' · 💧' + c.rain + 'mm' : '') + '</span>';
    });
    const kc = cur.find(c => c && c.src === 'kma');
    const t = new Date();
    const stamp = usedKma
      ? '기상청 ' + ((kc.base || '').slice(11, 16)) + ' 기준'
      : 'Open-Meteo ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') + ' 갱신';
    html += '<span class="upd">' + stamp + ' · 두 번 누르면 펼치기/접기</span>';
    weatherEl.innerHTML = html;
    document.getElementById('wbtn').onclick = () => {
      wcard.style.display = wcard.style.display === 'block' ? 'none' : 'block';
    };

    // 여행 날짜 예보 표
    const dates = TRIP_DATES;
    let tb = '<table><tr><th>지역</th>' + dates.map(d => '<th>' + d.slice(5).replace('-', '/') + '</th>').join('') + '</tr>';
    WEATHER_REGIONS.forEach((r, i) => {
      tb += '<tr><td>' + esc(r.name) + '</td>';
      dates.forEach(date => {
        const d = dailyOf(i, date);
        if (!d) { tb += '<td>-</td>'; return; }
        tb += '<td>' + d.icon[0] + ' ' + Math.round(d.tmx) + '° / ' + (d.tmn == null ? '-' : Math.round(d.tmn)) + '°' + (d.src === 'om' ? '*' : '') +
          '<br><small style="margin:0">☔ ' + (d.pop == null ? '-' : Math.round(d.pop)) + '%</small></td>';
      });
      tb += '</tr>';
    });
    tb += '</table><small>※ ' + (usedKma
        ? '기상청 단기·중기예보를 우선 표시하고, 기상청 값이 없는 날짜는 Open-Meteo 값(*)으로 채웁니다. 중기예보는 제주/서귀포 단위라 지역별 차이는 반영되지 않습니다. 한라산 산간은 격자 값이라 실제와 다를 수 있습니다.'
        : 'Open-Meteo 예보 모델 값입니다. (기상청 자료 준비 중)') +
      ' 비·바람 특보는 <a href="https://www.weather.go.kr" target="_blank" rel="noopener">기상청 날씨누리</a>에서 확인하세요.</small>';
    wcard.innerHTML = tb;
  }

  let weatherShown = false;

  function loadKma() {
    return fetch('weather.json?t=' + Date.now(), { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { kma = (j && j.updated) ? j : null; })
      .catch(() => { kma = null; });
  }

  function loadOpenMeteo() {
    const lat = WEATHER_REGIONS.map(r => r.lat).join(',');
    const lng = WEATHER_REGIONS.map(r => r.lng).join(',');
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng +
      '&current=temperature_2m,weather_code,wind_speed_10m,precipitation' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&timezone=Asia%2FSeoul&forecast_days=16';
    return fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(j => { wdata = Array.isArray(j) ? j : [j]; })
      .catch(() => {});
  }

  function loadWeather() {
    Promise.all([loadKma(), loadOpenMeteo()]).then(() => {
      const ok = WEATHER_REGIONS.some((r, i) => currentOf(i));
      if (!ok) { if (!weatherShown) weatherEl.textContent = '날씨 정보를 불러오지 못했습니다. (인터넷 연결 확인)'; return; }
      const first = !weatherShown; weatherShown = true;
      renderWeather();
      // 처음 날씨가 뜨면 상단 메뉴 높이가 바뀌므로 핀이 가려지지 않게 지도 범위를 다시 맞춤
      if (first) setTimeout(() => apply(true), 80);
    });
  }

  loadWeather();
  setInterval(loadWeather, 10 * 60 * 1000);

  apply(true);
}
