"use client";

import { useEffect, useState } from "react";
import { getFCMToken } from "@/lib/firebase";
import TeamLogo from "@/components/TeamLogo"; // 로고 컴포넌트 재사용

const KBO_TEAMS = [
  "LG 트윈스", "KT 위즈", "SSG 랜더스", "NC 다이노스", "두산 베어스",
  "KIA 타이거즈", "롯데 자이언츠", "삼성 라이온즈", "한화 이글스", "키움 히어로즈"
];

// ★ 추가: 안전한 UUID 생성 함수 (어떤 환경에서도 동작함)
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function HomePage() {
  const [isTokenFound, setTokenFound] = useState(false);
  const [fcmToken, setFcmToken] = useState("");
  const [myTeam, setMyTeam] = useState(""); // 내 응원팀 상태
  const [userId, setUserId] = useState("");

  // 1. 초기화: 권한 확인 및 내 정보 불러오기
  useEffect(() => {
    // ID 확인
    let storedId = localStorage.getItem("sports_user_id");
    if (!storedId) {
      storedId = generateUUID();
      localStorage.setItem("sports_user_id", storedId);
    }
    setUserId(storedId);

    // 알림 권한 확인
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        getFCMToken(setTokenFound).then((token) => {
          if (token) setFcmToken(token);
        });
      }
    }

    // 서버에서 내 응원팀 가져오기
    async function fetchMyInfo() {
      if (!storedId) return;
      try {
        const res = await fetch(`/api/alarm?userId=${storedId}`);
        const data = await res.json();
        if (data.team) setMyTeam(data.team);
      } catch (e) {
        console.error(e);
      }
    }
    fetchMyInfo();
  }, []);

  // 2. 알림 권한 요청
  const requestPermission = async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getFCMToken(setTokenFound);
      if (token) setFcmToken(token);
    } else {
      alert("알림을 허용해야 합니다.");
    }
  };

  // 3. 응원팀 선택 함수
  const handleSelectTeam = async (teamName: string) => {
    // 이미 선택된 팀을 다시 누르면 취소(해제)
    const newTeam = myTeam === teamName ? "" : teamName;
    setMyTeam(newTeam); // 화면 먼저 반영 (반응속도)

    // 서버 저장
    try {
      await fetch("/api/alarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          favoriteTeam: newTeam,
          action: "set_team"
        }),
      });
      console.log("팀 저장 완료:", newTeam);
    } catch (e) {
      console.error("팀 저장 실패:", e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <div className="bg-white border-b border-gray-200 p-4 text-center">
        <h1 className="font-bold text-lg text-gray-900">홈 / 설정</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* 섹션 1: 알림 권한 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <h2 className="font-bold text-gray-800 mb-2">🔔 알림 권한</h2>
          {!isTokenFound ? (
            <button
              onClick={requestPermission}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              알림 켜기
            </button>
          ) : (
            <div className="bg-green-50 text-green-700 py-3 rounded-xl font-bold border border-green-200">
              ✅ 알림이 켜져있습니다
            </div>
          )}
        </div>

        {/* 섹션 2: 내 응원팀 설정 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 text-center">⚾ 내 응원팀 선택</h2>
          <p className="text-xs text-gray-400 text-center mb-4">
            팀을 선택하면 해당 경기는 자동으로 알림이 켜집니다.
          </p>
          
          <div className="grid grid-cols-5 gap-3">
            {KBO_TEAMS.map((team) => {
              const isSelected = myTeam === team;
              return (
                <button
                  key={team}
                  onClick={() => handleSelectTeam(team)}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                    isSelected 
                      ? "bg-blue-50 border-2 border-blue-500 scale-105" 
                      : "hover:bg-gray-50 border-2 border-transparent"
                  }`}
                >
                  <TeamLogo teamName={team} size={40} />
                  {/* 팀 이름 간략화 (앞 두글자만) */}
                  <span className={`text-[10px] mt-1 ${isSelected ? "font-bold text-blue-600" : "text-gray-500"}`}>
                    {team.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-center text-xs text-gray-300 py-4">
          Sports Alarm App v1.0
        </div>
      </div>
    </div>
  );
}