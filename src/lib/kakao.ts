import "server-only";

// ============================================================================
// 카카오 알림톡 발송 어댑터
// ----------------------------------------------------------------------------
// 카카오 알림톡을 실제로 보내려면 사업자등록 + 카카오 비즈니스 채널 개설 +
// 알림톡 중계사(예: Solapi, NHN Cloud Notification, Bizmsg 등) 계약 + 템플릿
// 사전승인이 먼저 필요합니다. 이 파일은 그 절차가 끝나기 전에도 앱이 정상
// 동작하도록, 아래 환경변수가 비어 있으면 실제 API를 호출하지 않고 "발송
// 대기(pending)"로만 기록하는 폴백 모드로 동작합니다.
//
// 실제 연동 시 할 일 (벤더 계약 후):
//   1. .env.local에 KAKAO_ALIMTALK_PROVIDER_URL / KAKAO_ALIMTALK_API_KEY /
//      KAKAO_PF_ID(카카오 채널 pfId) 를 채운다.
//   2. 아래 callProviderApi() 안의 요청 바디/헤더를 실제 계약한 중계사의
//      API 문서에 맞게 수정한다 (중계사마다 필드명이 다릅니다 — 여기 있는
//      형태는 일반적인 구조를 보여주는 틀일 뿐, 특정 벤더로 테스트되지
//      않았습니다).
//   3. 카카오에서 승인받은 템플릿 코드를 KakaoTemplateCode와 실제 템플릿
//      문구에 맞춰 정리한다 (변수 치환 방식은 중계사 문서를 따른다).
// 그 외 로직(발송 이력 저장, 배지, 재발송 방지)은 이미 완성되어 있어
// 그대로 동작합니다.
// ============================================================================

export type KakaoTemplateCode = "LOW_BALANCE_REMIND" | "PAYMENT_OVERDUE_REMIND";

export type NotificationChannel = "kakao_alimtalk" | "app_push" | "kakao_friendtalk" | "sms";

export type SendOutcome = {
  /** true면 최소한 알림 로그 저장까지는 정상 처리됨(실제 발송 성공 여부와는 별개) */
  ok: boolean;
  channel: NotificationChannel;
  status: "sent" | "pending" | "failed";
  error?: string;
};

function isConfigured() {
  return Boolean(
    process.env.KAKAO_ALIMTALK_PROVIDER_URL &&
      process.env.KAKAO_ALIMTALK_API_KEY &&
      process.env.KAKAO_PF_ID,
  );
}

async function callProviderApi(params: {
  to: string;
  templateCode: KakaoTemplateCode;
  content: string;
}): Promise<{ ok: boolean; error?: string }> {
  // 일반적인 REST 알림톡 중계사 형태를 가정한 예시 호출입니다. 실제 계약한
  // 벤더의 API 스펙(엔드포인트, 인증 방식, 바디 필드명)에 맞게 조정하세요.
  const res = await fetch(process.env.KAKAO_ALIMTALK_PROVIDER_URL as string, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.KAKAO_ALIMTALK_API_KEY}`,
    },
    body: JSON.stringify({
      pfId: process.env.KAKAO_PF_ID,
      to: params.to,
      templateCode: params.templateCode,
      text: params.content,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `通知メッセージ送信APIエラー (${res.status}): ${body.slice(0, 200)}` };
  }
  return { ok: true };
}

export async function sendKakaoAlimtalk({
  to,
  templateCode,
  content,
}: {
  to: string | null;
  templateCode: KakaoTemplateCode;
  content: string;
}): Promise<SendOutcome> {
  if (!to) {
    return {
      ok: false,
      channel: "kakao_alimtalk",
      status: "failed",
      error: "受信番号(生徒または保護者の連絡先)がありません。",
    };
  }

  if (!isConfigured()) {
    return {
      ok: true,
      channel: "kakao_alimtalk",
      status: "pending",
      error:
        "カカオ通知メッセージ連携前のため、実際の送信は行わず記録のみ保存しました。事業者登録・テンプレート承認後に.envにキーを設定すると自動的に実際の送信が始まります。",
    };
  }

  try {
    const result = await callProviderApi({ to, templateCode, content });
    if (!result.ok) {
      return { ok: false, channel: "kakao_alimtalk", status: "failed", error: result.error };
    }
    return { ok: true, channel: "kakao_alimtalk", status: "sent" };
  } catch (err) {
    console.error("sendKakaoAlimtalk failed", err);
    return {
      ok: false,
      channel: "kakao_alimtalk",
      status: "failed",
      error: err instanceof Error ? err.message : "不明なエラー",
    };
  }
}
