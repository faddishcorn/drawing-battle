# 배틀 드로잉 게임

그림으로 만든 캐릭터로 배틀하고, AI가 승부와 짤막한 이유를 한국어로 판정해 주는 게임입니다.

## 핵심 기능

- ✏️ 캐릭터 그리기/저장 (Firebase Storage + 공개 URL)
- 👤 익명 포함 Firebase Auth 로그인 지원
- 📦 캐릭터 관리(내 캐릭터 목록, 삭제)
- ⚔️ AI 배틀(이미지 판단 + 한국어 이유, 최대 100자)
- 🏆 랭킹(이름/점수 위주 간단 표시)

## 아키텍처 개요

- 프론트엔드: Next.js(App Router) + React + TypeScript + Tailwind + shadcn/ui
- 데이터: Firebase Auth/Firestore/Storage (클라이언트 SDK로 수행)
- 서버 API: AI 판정 전용(`/api/battle`) — 상태 저장 없음
  - 입력: 플레이어/상대 캐릭터 ID와(가능하면) 이미지 URL
  - 처리: Google Gemini REST API에 이미지와 프롬프트 전달, JSON 파싱 실패 시 원문 텍스트 사용
  - 출력: { result: win|loss|draw, reasoning: string(≤100), pointsChange }

## 기술 스택

- Next.js(App Router), React, TypeScript
- Tailwind CSS, shadcn/ui
- Firebase(Auth/Firestore/Storage)
- Google Gemini REST API

