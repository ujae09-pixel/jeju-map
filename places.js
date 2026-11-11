// 장소 데이터: 여기만 수정하면 지도에 반영됩니다.
// 좌표/주소는 카카오 장소검색 결과로 채웠습니다.
//
// kind : "mine" = 직접 정한 곳, "rec" = 추천(선택) 장소
// days : 방문일차 [1,2,3]   order : 그날의 대략적인 방문 순서
// links: [{label, url}]  소개 패널에 버튼으로 표시됩니다.

const TRIP = {
  title: "제주 여행 (3명)",
  lines: [
    "11/19(수) 제주행 에어서울 RS6407  09:55 → 11:15",
    "11/21(금) 김포행 이스타항공 ZE0278  21:10 → 22:25",
    "이동수단: 렌터카",
    "1일차 공항 → 탐라렌트카 → 점심(미가) → 동쪽 해안 → 헤이 서귀포",
    "2일차 서쪽 해안 → 더스테이센추리호텔(애월)",
    "3일차 제주시 → 탐라렌트카 반납 → 제주공항 (여유 있게)"
  ]
};

// 날씨 예보에 표시할 여행 날짜
const TRIP_DATES = ["2026-11-19", "2026-11-20", "2026-11-21"];

// 날씨를 보여줄 지역 (좌표는 대략적인 대표 지점)
const WEATHER_REGIONS = [
  { name: "제주시",       lat: 33.5097, lng: 126.5219 },
  { name: "애월",         lat: 33.4630, lng: 126.3100 },
  { name: "서부(협재)",   lat: 33.3943, lng: 126.2397 },
  { name: "서귀포",       lat: 33.2541, lng: 126.5601 },
  { name: "동부(성산)",   lat: 33.4614, lng: 126.9424 },
  { name: "한라산(산간)", lat: 33.3617, lng: 126.5292, mountain: true }
];

const DAYS = {
  1: "1일차 추천지 (11/19)",
  2: "2일차 추천지 (11/20)",
  3: "3일차 추천지 (11/21)"
};

const CATEGORIES = {
  "관광지":  { color: "#2e8b57", emoji: "🏝️" },
  "전시":    { color: "#d6336c", emoji: "🖼️" },
  "맛집":    { color: "#e8590c", emoji: "🍽️" },
  "카페":    { color: "#a8742a", emoji: "☕" },
  "사우나":  { color: "#1c7ed6", emoji: "♨️" },
  "숙박":    { color: "#7b5cd6", emoji: "🛏️" },
  "공항":    { color: "#495057", emoji: "✈️" },
  "렌터카":  { color: "#868e96", emoji: "🚗" }
};

const PLACES = [
  // ===== 공항 =====
  {
    name: "제주국제공항", category: "공항", kind: "mine", days: [1, 3], order: 0, orders: { 1: 0, 3: 99 },
    lat: 33.50684, lng: 126.49272, address: "제주 제주시 공항로 2",
    intro: "1일차 도착(11:15) 후 렌터카 수령, 3일차 렌터카 반납 후 김포행(21:10) 출발.",
    memo: "3일차는 렌터카 반납과 체크인 시간을 넉넉히 잡기"
  },
  {
    name: "탐라렌트카 제주공항점", category: "렌터카", kind: "mine", days: [1, 3], order: 0.3, orders: { 1: 0.3, 3: 98 },
    lat: 33.50678, lng: 126.49331, address: "제주 제주시 공항로 5 탐라렌트카",
    intro: "1일차 렌터카 수령, 3일차 반납 장소. 공항에서 수령·반납 절차에 시간이 걸릴 수 있다.",
    memo: "예약 확인 / 3일차 반납은 비행(21:10) 2시간 전까지 여유 있게 · 카카오 검색 지점 좌표는 공항로 2 부근으로 표시됨"
  },
  {
    name: "미가", category: "맛집", tag: "해물/생선", kind: "mine", days: [1], order: 0.6,
    lat: 33.51114, lng: 126.51938, address: "제주 제주시 서사로 14 1층",
    intro: "1일차 점심 식당. 공항에서 렌터카를 받은 뒤 제주시 원도심에서 식사하고 동쪽으로 출발한다.",
    memo: "점심 후 만장굴 방향으로 이동 (약 40~50분 거리)"
  },

  // ===== 1일차: 동쪽 해안 =====
  {
    name: "만장굴", category: "관광지", tag: "자연", kind: "mine", days: [1], order: 1,
    lat: 33.52838, lng: 126.77162, address: "제주 제주시 구좌읍 만장굴길 182",
    intro: "세계적인 규모의 용암동굴. 일부 구간만 개방되며 동굴 안은 연중 시원해 겉옷이 필요하다.",
    links: [
      { label: "정보", url: "https://m.visitjeju.net/kr/detail/view?contentsid=CONT_000000000500182" },
      { label: "위치(네이버)", url: "https://naver.me/GB3gxXCo" },
      { label: "주차장(네이버)", url: "https://naver.me/xiqYUnCu" }
    ]
  },
  {
    name: "다랑쉬오름", category: "관광지", tag: "자연", kind: "mine", days: [1], order: 2,
    lat: 33.47769, lng: 126.82154, address: "제주 제주시 구좌읍 세화리 산 6",
    intro: "동쪽 구좌 지역의 대표 오름. 둥근 분화구와 주변 오름·들판 전망이 좋다.",
    memo: "해가 일찍 지는 11월이라 시간 배분 주의",
    links: [
      { label: "정보", url: "https://www.visitjeju.net/kr/detail/view?contentsid=CONT_000000000500118" },
      { label: "위치(네이버)", url: "https://naver.me/GfCsMFi3" },
      { label: "주차장(네이버)", url: "https://naver.me/GYCfPJxa" }
    ]
  },
  {
    name: "제주 해녀박물관", category: "전시", tag: "박물관", kind: "rec", days: [1], order: 3,
    lat: 33.52358, lng: 126.86343, address: "제주 제주시 구좌읍 해녀박물관길 26",
    intro: "제주 해녀의 삶과 문화를 보여 주는 박물관. 둘러보는 데 1~2시간 정도로 이동 경로(구좌) 위에 있다.",
    memo: "휴관일·관람시간 방문 전 확인"
  },
  {
    name: "지미봉", category: "관광지", tag: "자연", kind: "mine", days: [1], order: 4,
    lat: 33.49931, lng: 126.90244, address: "제주 제주시 구좌읍 종달리 산 3-1",
    intro: "종달리에 있는 오름. 정상에서 성산일출봉과 우도 방향 바다 전망을 볼 수 있다.",
    links: [
      { label: "정보", url: "https://www.visitjeju.net/kr/detail/view?contentsid=CONT_000000000500610" },
      { label: "위치(네이버)", url: "https://naver.me/5EUZHKL3" },
      { label: "주차장(네이버)", url: "https://naver.me/x8tAV1or" }
    ]
  },
  {
    name: "빛의 벙커", category: "전시", tag: "미디어아트", kind: "rec", days: [1], order: 5,
    lat: 33.43988, lng: 126.89921, address: "제주 서귀포시 성산읍 서성일로1168번길 89-17",
    intro: "옛 군사 벙커를 활용한 몰입형 미디어아트 전시관. 1시간 안팎이면 충분해 오름 일정 사이에 넣기 좋다.",
    memo: "운영시간·예약 방문 전 확인"
  },
  {
    name: "성산일출봉", category: "관광지", tag: "자연", kind: "rec", days: [1], order: 6,
    lat: 33.45913, lng: 126.94054, address: "제주 서귀포시 성산읍 성산리 78",
    intro: "유네스코 세계자연유산으로 동쪽 해안의 대표 명소. 정상까지 올라가거나 주변 풍경만 봐도 좋다.",
    memo: "입장 마감 시간(일몰 전) 확인"
  },
  {
    name: "섭지코지", category: "관광지", tag: "해안", kind: "rec", days: [1], order: 7,
    lat: 33.42394, lng: 126.93061, address: "제주 서귀포시 성산읍 섭지코지로 107",
    intro: "바다 위로 뻗은 해안 산책로와 등대가 있는 곳. 성산에서 남쪽 해안으로 내려가는 길에 있다."
  },
  {
    name: "큰엉해안경승지", category: "관광지", tag: "해안", kind: "mine", days: [1], order: 8,
    lat: 33.27335, lng: 126.70371, address: "제주 서귀포시 남원읍 태위로 522-17",
    intro: "남원 해안 절벽을 따라 걷는 산책로. 숲길 사이로 바다 풍경이 이어진다.",
    links: [
      { label: "정보", url: "https://m.blog.naver.com/jejudo_official/224228767988" },
      { label: "위치(네이버)", url: "https://naver.me/52R5EIWs" },
      { label: "주차장(네이버)", url: "https://naver.me/5nhl9uem" }
    ]
  },
  {
    name: "서귀포층 패류화석산지", category: "관광지", tag: "자연", kind: "mine", days: [1], order: 9,
    lat: 33.23952, lng: 126.55805, address: "제주 서귀포시 남성중로 43",
    intro: "조개류 화석이 층을 이루고 있는 천연기념물 지질 명소. 숙소가 있는 서귀포 시내에서 가깝다.",
    links: [
      { label: "정보", url: "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_000000000020170" },
      { label: "위치(네이버)", url: "https://naver.me/5mIuE6my" },
      { label: "주차장(네이버)", url: "https://naver.me/xGIjH6Qt" }
    ]
  },
  {
    name: "서귀포매일올레시장", category: "맛집", tag: "시장", kind: "rec", days: [1], order: 10,
    lat: 33.25015, lng: 126.56323, address: "제주 서귀포시 중앙로62번길 18",
    intro: "서귀포 시내의 상설 시장. 숙소에서 가까워 저녁 먹거리와 간식을 고르기 좋다.",
    memo: "가게별 영업시간 확인"
  },
  {
    name: "헤이, 서귀포", category: "숙박", kind: "mine", days: [1, 2], order: 11, orders: { 1: 11, 2: 0 },
    lat: 33.24618, lng: 126.56011, address: "제주 서귀포시 태평로 363",
    intro: "첫째 날 숙소 (11/19 투숙, 11/20 오전 출발)."
  },
  {
    name: "건강나라 (찜질방)", category: "사우나", tag: "찜질방", kind: "rec", days: [1], order: 12,
    lat: 33.25907, lng: 126.55631, address: "제주 서귀포시 홍중로 74",
    intro: "서귀포 시내 찜질방. 숙소에서 차로 가까워 저녁 후 피로를 풀기 좋다.",
    memo: "영업시간·요금 방문 전 확인"
  },

  // ===== 2일차: 서쪽 해안 =====
  {
    name: "본태박물관", category: "전시", tag: "박물관", kind: "rec", days: [2], order: 1,
    lat: 33.30377, lng: 126.39248, address: "제주 서귀포시 안덕면 산록남로762번길 69",
    intro: "전통 공예품과 현대미술을 함께 전시하는 박물관. 관람 1~2시간 규모로 서귀포에서 서쪽으로 가는 길에 있다.",
    memo: "관람시간 확인"
  },
  {
    name: "오설록 티뮤지엄", category: "카페", tag: "차/디저트", kind: "rec", days: [2], order: 2,
    lat: 33.30592, lng: 126.28949, address: "제주 서귀포시 안덕면 신화역사로 15",
    intro: "녹차 음료와 디저트를 즐길 수 있는 티뮤지엄. 본태박물관과 같은 서쪽 방향이라 이어 가기 좋다."
  },
  {
    name: "용머리해안", category: "관광지", tag: "자연", kind: "mine", days: [2], order: 3,
    lat: 33.23166, lng: 126.31472, address: "제주 서귀포시 안덕면 사계리 112-3",
    intro: "산방산 아래 층층이 쌓인 사암 절벽 해안. 파도가 높거나 만조일 때는 출입이 제한될 수 있다.",
    memo: "당일 출입 가능 여부·물때 확인",
    links: [
      { label: "정보", url: "https://www.visitjeju.net/kr/detail/view?contentsid=CONT_000000000500471" },
      { label: "위치(네이버)", url: "https://naver.me/55rm7lSA" },
      { label: "주차장(네이버)", url: "https://naver.me/xMjTtYuf" }
    ]
  },
  {
    name: "산방산 탄산온천", category: "사우나", tag: "온천", kind: "mine", days: [2], order: 4,
    lat: 33.24891, lng: 126.29874, address: "제주 서귀포시 안덕면 사계북로41번길 192",
    intro: "산방산 가까이에 있는 탄산 온천. 용머리해안 바로 옆이라 동선이 짧다.",
    memo: "영업시간·요금 확인"
  },
  {
    name: "송악산 둘레길", category: "관광지", tag: "도보/풍경", kind: "mine", days: [2], order: 5,
    lat: 33.19682, lng: 126.29308, address: "제주 서귀포시 대정읍 상모리",
    intro: "바다 절벽을 따라 도는 산책길. 날씨가 맑으면 해안 풍경이 좋다.",
    links: [
      { label: "정보", url: "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_200000000014386" },
      { label: "위치(네이버)", url: "https://naver.me/FbOveq9e" },
      { label: "주차장(네이버)", url: "https://naver.me/5iTRVogM" }
    ]
  },
  {
    name: "알뜨르비행장", category: "관광지", tag: "역사/사색", kind: "mine", days: [2], order: 6,
    lat: 33.20472, lng: 126.27153, address: "제주 서귀포시 대정읍 상모리 1670",
    intro: "일제강점기에 만든 비행장 터와 격납고가 남아 있는 곳. 탁 트인 들판에서 걸으며 사색하기 좋다.",
    links: [
      { label: "정보", url: "https://www.visitjeju.net/kr/detail/view?contentsid=CONT_000000000500417" },
      { label: "위치1(네이버)", url: "https://naver.me/FA2xJBpN" },
      { label: "위치2(네이버)", url: "https://naver.me/GvcYj3Gf" },
      { label: "위치3(네이버)", url: "https://naver.me/xCBvFSVG" },
      { label: "주차장(네이버)", url: "https://naver.me/GQ19bIom" }
    ]
  },
  {
    name: "사일리커피", category: "카페", tag: "카페/디저트", kind: "mine", days: [2], order: 7,
    lat: 33.19994, lng: 126.27586, address: "제주 서귀포시 대정읍 최남단해안로 412",
    intro: "대정읍 해안도로변의 카페. 송악산·알뜨르 일정 사이에 들르기 좋다.",
    memo: "영업시간 확인",
    links: [
      { label: "정보", url: "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_300000000015698" },
      { label: "위치(네이버)", url: "https://naver.me/5oE5DDkg" }
    ]
  },
  {
    name: "산방식당", category: "맛집", tag: "밀냉면/수육", kind: "mine", days: [2], order: 8,
    lat: 33.22346, lng: 126.25421, address: "제주 서귀포시 대정읍 하모이삼로 62",
    intro: "밀냉면과 수육으로 알려진 식당. 모슬포 쪽에서 점심으로 좋다.",
    memo: "점심 또는 저녁 중 옥돔식당과 택1 · 영업시간 확인",
    links: [
      { label: "정보", url: "https://www.visitjeju.net/kr/detail/view?contentsid=CONT_000000000501267" },
      { label: "위치(네이버)", url: "https://naver.me/FW6h3XFs" }
    ]
  },
  {
    name: "옥돔식당", category: "맛집", tag: "칼국수", kind: "mine", days: [2], order: 9,
    lat: 33.21997, lng: 126.24901, address: "제주 서귀포시 대정읍 신영로36번길 62",
    intro: "칼국수가 대표 메뉴인 대정읍 식당. 산방식당과 가까워 둘 중 한 곳을 고르면 된다.",
    memo: "휴무일·영업시간 확인",
    links: [
      { label: "정보", url: "https://www.tripinfo.co.kr/info.html?content_type_id=39&content_id=2678818" },
      { label: "위치(네이버)", url: "https://naver.me/GMmgEth8" }
    ]
  },
  {
    name: "신창 풍차해안도로", category: "관광지", tag: "해안", kind: "mine", days: [2], order: 10,
    lat: 33.34308, lng: 126.17421, address: "제주 제주시 한경면 신창리 1322-1",
    intro: "바다 위로 풍력발전기가 늘어선 해안도로. 해질 무렵 풍경이 좋은 드라이브·산책 코스.",
    memo: "11월 일몰은 대략 17시 30분 전후",
    links: [
      { label: "정보", url: "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_200000000007676" },
      { label: "위치(네이버)", url: "https://naver.me/5k7fN2eE" },
      { label: "주차장(네이버)", url: "https://naver.me/xX7hajXU" }
    ]
  },
  {
    name: "협재해수욕장", category: "관광지", tag: "해안", kind: "rec", days: [2], order: 11,
    lat: 33.39431, lng: 126.23965, address: "제주 제주시 한림읍 협재리",
    intro: "맑은 바다 색으로 유명한 서쪽 해변. 비양도가 보이는 풍경이 좋다."
  },
  {
    name: "한림칼국수", category: "맛집", tag: "칼국수", kind: "mine", days: [2], order: 12,
    lat: 33.41557, lng: 126.26151, address: "제주 제주시 한림읍 한림해안로 141",
    intro: "한림 해안 쪽의 칼국수 식당. 협재 일정 후 저녁으로 연결하기 좋다.",
    memo: "영업시간 확인"
  },
  {
    name: "제주봄날", category: "카페", tag: "카페", kind: "rec", days: [2], order: 13,
    lat: 33.46242, lng: 126.30961, address: "제주 제주시 애월읍 애월로1길 25",
    intro: "애월 해안 쪽 카페. 호텔로 가는 길에 들르기 좋다.",
    memo: "영업시간 확인"
  },
  {
    name: "아르떼뮤지엄 제주", category: "전시", tag: "미디어아트", kind: "rec", days: [2], order: 14,
    lat: 33.39670, lng: 126.34501, address: "제주 제주시 애월읍 어림비로 478",
    intro: "대형 몰입형 미디어아트 전시관. 관람 1~2시간 규모로 호텔(애월) 근처다.",
    memo: "운영시간·예약 확인"
  },
  {
    name: "더스테이센추리호텔", category: "숙박", kind: "mine", days: [2, 3], order: 15, orders: { 2: 15, 3: 0 },
    lat: 33.48491, lng: 126.40893, address: "제주 제주시 애월읍 일주서로 7113",
    intro: "둘째 날 숙소 (11/20 투숙, 11/21 체크아웃)."
  },
  {
    name: "해미안 녹차해수사우나", category: "사우나", tag: "해수사우나", kind: "mine", days: [2], order: 16,
    lat: 33.49382, lng: 126.43214, address: "제주 제주시 일주서로 7353",
    intro: "호텔에서 차로 가까운 해수 사우나. 2일차 저녁 체크인 후 가기 좋다.",
    memo: "영업시간 확인"
  },

  // ===== 3일차: 제주시 → 공항 =====
  {
    name: "우진해장국", category: "맛집", tag: "해장국", kind: "rec", days: [3], order: 1,
    lat: 33.51152, lng: 126.52, address: "제주 제주시 서사로 11",
    intro: "제주시 원도심의 해장국 식당. 아침 식사로 들르기 좋다.",
    memo: "영업시간·대기 확인"
  },
  {
    name: "국립제주박물관", category: "전시", tag: "박물관", kind: "rec", days: [3], order: 2,
    lat: 33.5136, lng: 126.54888, address: "제주 제주시 일주동로 17",
    intro: "제주의 역사와 문화를 다루는 국립박물관. 상설 전시는 1~2시간이면 둘러볼 수 있다.",
    memo: "휴관일 확인"
  },
  {
    name: "골목식당", category: "맛집", tag: "꿩구이", kind: "mine", days: [3], order: 3,
    lat: 33.5118, lng: 126.52503, address: "제주 제주시 중앙로 63-9",
    intro: "꿩 요리를 하는 제주시 원도심 식당.",
    memo: "영업시간·예약 확인",
    links: [
      { label: "정보", url: "https://blog.naver.com/hanvitora3/223829418296" },
      { label: "위치(네이버)", url: "https://naver.me/xxY2UlOF" }
    ]
  },
  {
    name: "신설오름", category: "맛집", tag: "제주전통음식", kind: "mine", days: [3], order: 4,
    lat: 33.50543, lng: 126.54157, address: "제주 제주시 고마로17길 2",
    intro: "제주 전통 음식을 내는 식당. 국립제주박물관과 가깝다.",
    memo: "영업시간 확인",
    links: [
      { label: "정보", url: "https://m.blog.naver.com/kkj12486/224200053864" },
      { label: "위치(네이버)", url: "https://naver.me/FG7x0Dln" }
    ]
  },
  {
    name: "물항식당 탑동점", category: "맛집", tag: "생선구이", kind: "mine", days: [3], order: 5,
    lat: 33.51691, lng: 126.52908, address: "제주 제주시 임항로 37-4",
    intro: "생선구이를 내는 탑동 쪽 식당.",
    memo: "카카오 검색에서는 '물항식당 본점'으로 나온 위치를 사용함 · 탑동점 위치는 네이버 링크로 확인",
    links: [
      { label: "정보", url: "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_300000000015682" },
      { label: "위치(네이버)", url: "https://naver.me/5UEc3P7J" }
    ]
  },
  {
    name: "카페진정성 종점", category: "카페", tag: "카페/디저트", kind: "mine", days: [3], order: 6,
    lat: 33.50241, lng: 126.46287, address: "제주 제주시 서해안로 124",
    intro: "공항 서쪽 해안도로 쪽 카페. 공항으로 가기 전 쉬어 가기 좋다.",
    memo: "영업시간 확인",
    links: [
      { label: "정보", url: "https://blog.naver.com/yu_muggle/223745100608" },
      { label: "위치(네이버)", url: "https://naver.me/FG7xnfER" }
    ]
  },
  {
    name: "도두봉", category: "관광지", tag: "전망/산책", kind: "rec", days: [3], order: 7,
    lat: 33.50791, lng: 126.46837, address: "제주 제주시 도두일동 산 2",
    intro: "공항 근처의 낮은 오름. 짧게 올라 바다와 비행기가 뜨는 풍경을 볼 수 있다."
  },
  {
    name: "도두해수파크", category: "사우나", tag: "해수사우나", kind: "mine", days: [3], order: 8,
    lat: 33.50844, lng: 126.47134, address: "제주 제주시 서해안로 236",
    intro: "공항에서 가까운 해수 사우나. 마지막 일정으로 몸을 풀고 공항으로 가기 좋다.",
    memo: "영업시간 확인"
  },

  // ===== 추가 장소 (1일차: 동쪽) =====
  {
    name: "비자림", category: "관광지", tag: "자연/숲길", kind: "mine", days: [1], order: 1.6,
    lat: 33.49041, lng: 126.80999, address: "제주 제주시 구좌읍 비자숲길 55",
    intro: "수백 년 된 비자나무가 모여 있는 숲길. 평평한 산책로라 부담 없이 걸을 수 있다.",
    memo: "입장 마감 시간 확인"
  },
  {
    name: "으뜨미", category: "맛집", tag: "한정식", kind: "mine", days: [1], order: 1.3,
    lat: 33.47070, lng: 126.78710, address: "제주 제주시 구좌읍 중산간동로 2287",
    intro: "송당리 중산간 도로변의 한정식 식당. 만장굴과 비자림 사이에 있어 동선이 자연스럽다.",
    memo: "영업시간·휴무일·예약 확인"
  },
  {
    name: "카페한라산", category: "카페", tag: "카페", kind: "mine", days: [1], order: 3.3,
    lat: 33.52478, lng: 126.86303, address: "제주 제주시 구좌읍 면수1길 48",
    intro: "해녀박물관 근처 카페. 박물관 관람 뒤 쉬어 가기 좋다.",
    memo: "영업시간 확인"
  },
  {
    name: "시흥리 해녀의집", category: "맛집", tag: "해물/생선", kind: "mine", days: [1], order: 4.3,
    lat: 33.47798, lng: 126.90830, address: "제주 서귀포시 성산읍 시흥하동로 114",
    intro: "시흥리 바닷가 마을의 해녀의집 식당. 해산물 요리를 낸다.",
    memo: "영업시간·휴무일 확인"
  },
  {
    name: "오른 (orrrn)", category: "카페", tag: "카페", kind: "mine", days: [1], order: 4.6,
    lat: 33.47180, lng: 126.91575, address: "제주 서귀포시 성산읍 해맞이해안로 2714",
    intro: "성산 해맞이해안로변 카페. 성산일출봉 가기 전후에 들르기 좋다.",
    memo: "영업시간 확인"
  },
  {
    name: "대수산봉", category: "관광지", tag: "자연/오름", kind: "mine", days: [1], order: 5.3,
    lat: 33.43968, lng: 126.90165, address: "제주 서귀포시 성산읍 고성리 2039-1",
    intro: "성산읍 고성리의 오름. 빛의 벙커 바로 근처라 함께 묶기 좋다."
  },
  {
    name: "물영아리오름", category: "관광지", tag: "자연/오름", kind: "mine", days: [1], order: 7.5,
    lat: 33.36839, lng: 126.69206, address: "제주 서귀포시 남원읍 수망리 산 188",
    intro: "분화구에 습지가 있는 오름(람사르습지). 성산에서 남원으로 넘어가는 중산간 길에 있다.",
    memo: "탐방 가능 시간·일몰 시간 확인"
  },
  {
    name: "와랑와랑", category: "카페", tag: "커피", kind: "mine", days: [1], order: 8.3,
    lat: 33.27229, lng: 126.67655, address: "제주 서귀포시 남원읍 위미중앙로300번길 28",
    intro: "위미 마을의 커피 전문점. 큰엉해안경승지를 보고 서귀포로 가는 길에 있다.",
    memo: "영업시간 확인"
  },
  {
    name: "공천포식당", category: "맛집", tag: "한식", kind: "mine", days: [1], order: 8.6,
    lat: 33.26639, lng: 126.64259, address: "제주 서귀포시 남원읍 공천포로 89",
    intro: "남원 공천포 포구 근처의 한식당. 숙소(서귀포)로 가기 전 저녁 식사로 좋다.",
    memo: "영업시간·휴무일 확인"
  },

  // ===== 추가 장소 (2일차: 서쪽) =====
  {
    name: "안덕계곡", category: "관광지", tag: "자연/계곡", kind: "mine", days: [2], order: 1.3,
    lat: 33.25720, lng: 126.35258, address: "제주 서귀포시 안덕면 감산리 1946",
    intro: "상록수림이 우거진 계곡 산책 코스. 본태박물관에서 서쪽으로 가는 길에 있다."
  },
  {
    name: "중앙식당", category: "맛집", tag: "한식", kind: "mine", days: [2], order: 1.5,
    lat: 33.24670, lng: 126.33494, address: "제주 서귀포시 안덕면 화순로 108",
    intro: "화순 마을의 한식당. 안덕계곡 일정과 이어 점심으로 좋다.",
    memo: "영업시간·휴무일 확인"
  },
  {
    name: "풀베개", category: "카페", tag: "카페", kind: "mine", days: [2], order: 1.7,
    lat: 33.28551, lng: 126.30322, address: "제주 서귀포시 안덕면 화순서서로 492-4",
    intro: "안덕면 카페. 오설록 티뮤지엄 가기 전후에 쉬어 가기 좋다.",
    memo: "영업시간 확인"
  },
  {
    name: "춘미향음식점", category: "맛집", tag: "한식", kind: "mine", days: [2], order: 3.2,
    lat: 33.23147, lng: 126.29653, address: "제주 서귀포시 안덕면 산방로 378",
    intro: "산방산·용머리해안 근처의 한식당.",
    memo: "영업시간·휴무일 확인"
  },
  {
    name: "제주추사관", category: "전시", tag: "전시/역사", kind: "mine", days: [2], order: 7.5,
    lat: 33.24997, lng: 126.27822, address: "제주 서귀포시 대정읍 추사로 44",
    intro: "추사 김정희의 제주 유배 생활과 작품을 소개하는 전시관. 대정읍 일정 중에 들르기 좋다.",
    memo: "관람시간·휴관일 확인"
  },
  {
    name: "와토커피", category: "카페", tag: "카페", kind: "mine", days: [2], order: 7.8,
    lat: 33.22546, lng: 126.25654, address: "제주 서귀포시 대정읍 동일하모로 238",
    intro: "대정읍 모슬포 쪽 카페.",
    memo: "영업시간 확인"
  },
  {
    name: "수월봉 지질트레일", category: "관광지", tag: "도보/지질", kind: "mine", days: [2], order: 9.5,
    lat: 33.29481, lng: 126.16333, address: "제주 제주시 한경면 고산리 3760",
    intro: "화산이 만든 해안 절벽 지층을 따라 걷는 코스. 일몰 명소로도 알려져 있다.",
    memo: "일몰 시간에 맞추면 좋음"
  },
  {
    name: "명리동식당 본점", category: "맛집", tag: "고기", kind: "mine", days: [2], order: 10.5,
    lat: 33.31659, lng: 126.27042, address: "제주 제주시 한경면 녹차분재로 498",
    intro: "한경면 녹차분재로변의 고기 식당. 신창 풍차해안도로에서 한림으로 넘어가는 중간에 있다.",
    memo: "영업시간·대기 확인"
  },
  {
    name: "육고깃집", category: "맛집", tag: "고기", kind: "mine", days: [2], order: 12.3,
    lat: 33.41162, lng: 126.26506, address: "제주 제주시 한림읍 한림중앙로 34",
    intro: "한림읍 중심가의 고기 식당. 협재해수욕장과 한림칼국수 근처라 저녁 식사로 연결하기 좋다.",
    memo: "영업시간·예약·대기 확인"
  },
  {
    name: "단소 제주 애월본점", category: "맛집", tag: "한식", kind: "mine", days: [2], order: 13.5,
    lat: 33.46442, lng: 126.32262, address: "제주 제주시 애월읍 애월로 139-4",
    intro: "애월 해안 쪽 한식당. 숙소(더스테이센추리호텔)로 가기 전 저녁 식사로 좋다.",
    memo: "영업시간·예약·대기 확인"
  },
  {
    name: "오또도넛", category: "카페", tag: "도넛", kind: "mine", days: [2], order: 0.5,
    lat: 33.25593, lng: 126.42733, address: "제주 서귀포시 중문상로 87 1층",
    intro: "중문 시내의 도넛 가게. 서귀포 숙소에서 서쪽으로 출발하는 길에 간식·아침으로 들르기 좋다.",
    memo: "영업시간·재고 확인"
  },
  {
    name: "사계의시간", category: "맛집", tag: "장어", kind: "mine", days: [2], order: 3.3,
    lat: 33.23231, lng: 126.30884, address: "제주 서귀포시 안덕면 사계남로 214",
    intro: "사계 마을의 장어 식당. 용머리해안·산방산과 가까워 점심으로 좋다.",
    memo: "영업시간·예약 확인 · 제주선채향, 춘미향음식점과 점심 택1"
  },
  {
    name: "제주선채향 본점", category: "맛집", tag: "국수", kind: "mine", days: [2], order: 3.4,
    lat: 33.22637, lng: 126.29899, address: "제주 서귀포시 안덕면 사계남로84번길 6",
    intro: "사계 마을의 국수 식당. 용머리해안과 송악산 사이에 있다.",
    memo: "영업시간·대기 확인"
  },
  {
    name: "미영이네", category: "맛집", tag: "회", kind: "mine", days: [2], order: 8.8,
    lat: 33.21774, lng: 126.24983, address: "제주 서귀포시 대정읍 하모항구로 42",
    intro: "모슬포 하모항 근처의 회 식당. 산방식당·옥돔식당과 같은 모슬포 권역이라 저녁 후보가 된다.",
    memo: "영업시간·예약 확인"
  },
  {
    name: "금돈가 제주 애월해안도로 본점", category: "맛집", tag: "고기", kind: "mine", days: [2], order: 14.6,
    lat: 33.48430, lng: 126.39113, address: "제주 제주시 애월읍 가문동남길 63 1층",
    intro: "애월해안도로변의 고기 식당. 숙소(더스테이센추리호텔)에서 가까워 마지막 저녁 후보로 좋다.",
    memo: "영업시간·예약·대기 확인"
  },

  // ===== 추가 장소 (3일차: 애월 → 제주시) =====
  {
    name: "까미노", category: "카페", tag: "카페", kind: "mine", days: [3], order: 0.3,
    lat: 33.45791, lng: 126.34767, address: "제주 제주시 애월읍 고하상로 91-12",
    intro: "애월 고하리의 카페. 호텔에서 나와 제주시로 가기 전에 들르기 좋다.",
    memo: "영업시간 확인"
  },
  {
    name: "금산공원", category: "관광지", tag: "공원/숲", kind: "mine", days: [3], order: 0.6,
    lat: 33.43369, lng: 126.33017, address: "제주 제주시 애월읍 납읍리 1457",
    intro: "납읍리 마을의 숲 공원. 가볍게 산책하기 좋다.",
    memo: "같은 이름의 공원이 다른 지역에도 있어 카카오맵 위치 확인"
  }
];
