"use client";

// 1. 팀 이름(한글)과 파일명(영어)을 연결하는 지도
const TEAM_MAP: Record<string, string> = {
  // 야구 (KBO)
  "LG 트윈스": "LG",
  "LG": "LG",
  "KIA 타이거즈": "KIA",
  "KIA": "KIA",
  "삼성 라이온즈": "Samsung",
  "두산 베어스": "Doosan",
  "롯데 자이언츠": "Lotte",
  "한화 이글스": "Hanwha",
  "SSG 랜더스": "SSG",
  "키움 히어로즈": "Kiwoom",
  "NC 다이노스": "NC",
  "KT 위즈": "KT",

  // 축구 (K리그)
  "FC 서울": "Seoul",
  "울산 HD": "Ulsan",
  "전북 현대": "Jeonbuk",
  "포항 스틸러스": "Pohang",
  "수원 삼성": "Suwon",
  
  // 테스트용
  "알람테스트팀": "Test",
};

interface Props {
  teamName: string;
  size?: number; // 크기 조절용 (기본값 있음)
}

export default function TeamLogo({ teamName, size = 50 }: Props) {
  // 맵핑된 영어 이름 가져오기 (없으면 그냥 원래 이름 사용)
  const fileKey = TEAM_MAP[teamName] || "default"; 
  
  // 이미지 경로 (/logos/LG.png)
  const src = `/logos/${fileKey}.png`;

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      {/* 로고 이미지 */}
      <div 
        className="relative overflow-hidden"
        style={{ width: size, height: size }}
      >
        <img 
          src={src} 
          alt={teamName}
          className="object-contain w-full h-full"
          // 이미지가 없을 경우(에러) 깨진 그림 대신 기본 아이콘이나 빈공간 처리
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/50?text=" + teamName.charAt(0);
          }}
        />
      </div>
      
      {/* 팀 이름 (작게 표시) */}
      <span className="text-xs font-medium text-gray-600 break-keep text-center">
        {teamName.replace(" 프로축구단", "").replace("불러오기", "")}
      </span>
    </div>
  );
}