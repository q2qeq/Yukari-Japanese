import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

// ============================================================================
// 카카오톡 채널 인바운드 웹훅 — "카카오 i 오픈빌더"의 스킬(웹훅) 기능으로
// 채널 1:1 채팅에 들어온 상담 문의를 이 학원 앱의 consultations 테이블에
// 자동으로 기록한다.
// ----------------------------------------------------------------------------
// 설정 방법 (카카오 i 오픈빌더, https://i.kakao.com):
//   1. 오픈빌더에서 이 채널의 봇을 만들고, "폴백 블록"(어떤 발화에도 안 걸릴 때
//      실행되는 블록)이나 상담 시작 버튼에 연결된 블록에 스킬을 하나 추가한다.
//   2. 스킬 서버 URL을 다음과 같이 등록한다:
//        https://<배포 도메인>/api/kakao/consultation?secret=<KAKAO_WEBHOOK_SECRET 값>
//      (오픈빌더는 커스텀 헤더 인증을 지원하지 않으므로, 시크릿을 쿼리 파라미터로
//      검증한다. .env의 KAKAO_WEBHOOK_SECRET을 무작위의 긴 값으로 채워야 한다.)
//   3. 이름/전화번호를 폼(엔티티) 형태로 받도록 시나리오를 구성했다면
//      action.params에 { name, phone } 등의 키로 들어온다 — 아래 파싱 로직의
//      키 이름을 실제 구성한 파라미터 이름에 맞게 조정한다. 폼 없이 자유 발화만
//      받는다면 이름/전화번호 없이 발화 내용만 notes에 기록되고, 원장이
//      "상담 관리"에서 나머지를 채워 넣으면 된다.
//   4. 등록 후 오픈빌더의 "테스트" 기능으로 메시지를 보내 실제로
//      /director/consultations 에 새 상담이 뜨는지 확인한다.
// ============================================================================

export const runtime = "nodejs";

type KakaoSkillRequest = {
  userRequest?: {
    utterance?: string;
    user?: { id?: string };
  };
  action?: {
    params?: Record<string, string>;
  };
};

function skillResponse(text: string) {
  return NextResponse.json({
    version: "2.0",
    template: { outputs: [{ simpleText: { text } }] },
  });
}

function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  return digits || null;
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.KAKAO_WEBHOOK_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: KakaoSkillRequest;
  try {
    body = await req.json();
  } catch {
    return skillResponse("요청을 이해하지 못했어요. 다시 시도해주세요.");
  }

  const utterance = body.userRequest?.utterance?.trim() || "";
  const kakaoUserId = body.userRequest?.user?.id || null;
  const params = body.action?.params || {};

  const name = (params.name || params.이름 || "").trim() || "카카오톡 문의";
  const phone = normalizePhone(params.phone || params.전화번호);

  const notesParts = [
    utterance ? `문의 내용: ${utterance}` : null,
    kakaoUserId ? `(카카오 사용자 ID: ${kakaoUserId})` : null,
  ].filter(Boolean);

  try {
    await sql`
      insert into consultations (name, phone, source, notes)
      values (${name}, ${phone}, 'kakao_channel', ${notesParts.join("\n") || null})
    `;
  } catch (err) {
    console.error("kakao consultation webhook insert failed", err);
    return skillResponse("접수 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
  }

  revalidatePath("/director/consultations");
  revalidatePath("/director");

  return skillResponse("상담 신청이 접수됐어요. 곧 담당 선생님이 연락드릴게요!");
}

// 오픈빌더에 스킬 서버 URL을 등록할 때 연결 확인용으로 GET을 호출하기도 한다.
export async function GET() {
  return NextResponse.json({ ok: true });
}
