import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { NextResponse } from "next/server";

// 1. AWS 연결 설정 (변함 없음)
const client = new DynamoDBClient({
  region: "ap-northeast-2", // 또는 process.env.DB_REGION
  credentials: {
    accessKeyId: process.env.DB_ACCESS_KEY_ID!,        // ✅ 변경됨
    secretAccessKey: process.env.DB_SECRET_ACCESS_KEY!, // ✅ 변경됨
  },
});

const ddb = DynamoDBDocumentClient.from(client);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const type = searchParams.get("type"); // ★ 추가: URL에서 종목 가져오기 (baseball 또는 soccer)

  if (!date) {
    return NextResponse.json({ error: "날짜가 필요합니다" }, { status: 400 });
  }

  try {
    // 쿼리 옵션 기본 설정 (날짜로 조회)
    const queryParams: any = {
      TableName: "SportsSchedules",
      KeyConditionExpression: "#date = :date",
      ExpressionAttributeNames: {
        "#date": "date",
      },
      ExpressionAttributeValues: {
        ":date": date,
      },
    };

    // ★ 추가: 종목(type)이 있으면 필터링 조건 추가
    if (type) {
      queryParams.FilterExpression = "#type = :type"; // 조건: type 컬럼이 입력받은 값과 같아야 함
      queryParams.ExpressionAttributeNames["#type"] = "type"; // type도 예약어일 수 있어서 별칭 사용
      queryParams.ExpressionAttributeValues[":type"] = type;
    }

    const command = new QueryCommand(queryParams);
    const result = await ddb.send(command);

    // ★ 팁: 시간을 기준으로 정렬해서 보내주면 프론트엔드가 편함 (선택사항)
    // sort 함수를 써서 time(예: "18:30") 순서대로 정렬
    const sortedItems = result.Items?.sort((a, b) => (a.time > b.time ? 1 : -1));

    return NextResponse.json({ matches: sortedItems });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "DB 조회 실패" }, { status: 500 });
  }
}