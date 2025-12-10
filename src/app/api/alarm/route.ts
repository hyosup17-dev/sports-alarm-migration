import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { NextResponse } from "next/server";

const client = new DynamoDBClient({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.DB_ACCESS_KEY_ID!,
    secretAccessKey: process.env.DB_SECRET_ACCESS_KEY!,
  },
});

const ddb = DynamoDBDocumentClient.from(client);

// 1. [GET] 내 정보 가져오기 (알람 목록 + 응원팀)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) return NextResponse.json({ matches: [], team: "" });

  try {
    const command = new GetCommand({
      TableName: "SportsUsers",
      Key: { user_id: userId },
    });

    const result = await ddb.send(command);

    if (!result.Item) {
      return NextResponse.json({ matches: [], team: "" });
    }

    // Set -> Array 변환
    const matches = result.Item.subscribed_matches 
      ? Array.from(result.Item.subscribed_matches) 
      : [];
    
    // 저장된 응원팀 가져오기
    const team = result.Item.favorite_team || "";
    
    return NextResponse.json({ matches, team });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "불러오기 실패" }, { status: 500 });
  }
}

// 2. [POST] 각종 저장 요청 처리
export async function POST(request: Request) {
  try {
    // favoriteTeam 추가됨
    const { userId, matchId, action, fcmToken, favoriteTeam } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "유저 ID가 없습니다." }, { status: 400 });
    }

    // ★ Case 1: 응원팀 설정 (추가된 기능)
    if (action === "set_team") {
      const command = new UpdateCommand({
        TableName: "SportsUsers",
        Key: { user_id: userId },
        UpdateExpression: "SET favorite_team = :t",
        ExpressionAttributeValues: {
          ":t": favoriteTeam,
        },
      });
      await ddb.send(command);
      return NextResponse.json({ success: true, message: "응원팀 설정 완료" });
    }

    // ★ Case 2: FCM 토큰 저장
    if (action === "save_token") {
      if (!fcmToken) return NextResponse.json({ error: "토큰 없음" }, { status: 400 });

      const command = new UpdateCommand({
        TableName: "SportsUsers",
        Key: { user_id: userId },
        UpdateExpression: "SET fcm_token = :t",
        ExpressionAttributeValues: { ":t": fcmToken },
      });

      await ddb.send(command);
      return NextResponse.json({ success: true });
    }

    // ★ Case 3: 경기 알람 구독/해제
    if (!matchId) return NextResponse.json({ error: "경기 ID 없음" }, { status: 400 });

    const command = new UpdateCommand({
      TableName: "SportsUsers",
      Key: { user_id: userId },
      UpdateExpression: action === 'on' 
        ? "ADD subscribed_matches :m"
        : "DELETE subscribed_matches :m",
      ExpressionAttributeValues: {
        ":m": new Set([String(matchId)]),
      },
    });

    await ddb.send(command);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}