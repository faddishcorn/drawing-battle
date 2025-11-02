# 배틀 드로잉 게임

사용자가 캐릭터를 그리고 AI 판정으로 배틀하는 게임입니다.

## 주요 기능

- ✏️ 캔버스에서 캐릭터 그리기 (선, 지우개, 색상 선택)
- 🖼️ 사용자당 최대 3개의 캐릭터 보유
- ⚔️ AI 기반 배틀 시스템
- 🏆 랭킹 시스템
- 📊 승/패/무승부 통계

## 현재 구현 상태

현재는 **Mock 데이터**로 구현되어 있습니다. 실제 프로덕션 환경에서는 아래의 백엔드 구조가 필요합니다.

---

## Firebase 백엔드 구조 상세 가이드

### 1. Firebase Authentication

**설정:**
- 이메일/비밀번호 인증 활성화
- 사용자 세션 관리

**구현 예시:**
\`\`\`typescript
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

// 회원가입
const auth = getAuth()
const userCredential = await createUserWithEmailAndPassword(auth, email, password)

// 로그인
await signInWithEmailAndPassword(auth, email, password)
\`\`\`

---

### 2. Firestore Database 구조

#### 📁 Users Collection: `users/{userId}`

| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `id` | string | 사용자 고유 ID (Auth UID와 동일) | - |
| `email` | string | 사용자 이메일 | - |
| `characterCount` | number | 현재 보유 캐릭터 수 | 0 |
| `createdAt` | timestamp | 계정 생성 시간 | serverTimestamp() |

**예시 문서:**
\`\`\`json
{
  "id": "user-abc123",
  "email": "player@example.com",
  "characterCount": 2,
  "createdAt": "2024-01-15T10:30:00Z"
}
\`\`\`

**인덱스:**
- 단일 필드 인덱스: `createdAt` (DESC)

---

#### 📁 Characters Collection: `characters/{characterId}`

| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `id` | string | 캐릭터 고유 ID | auto-generated |
| `userId` | string | 소유자 ID (users 참조) | - |
| `imageUrl` | string | Firebase Storage 이미지 URL | - |
| `rank` | number | 현재 랭크 점수 | 1000 |
| `wins` | number | 승리 횟수 | 0 |
| `losses` | number | 패배 횟수 | 0 |
| `draws` | number | 무승부 횟수 | 0 |
| `totalBattles` | number | 총 배틀 횟수 (계산용) | 0 |
| `winRate` | number | 승률 (%) | 0 |
| `createdAt` | timestamp | 생성 시간 | serverTimestamp() |
| `updatedAt` | timestamp | 마지막 업데이트 시간 | serverTimestamp() |

**예시 문서:**
\`\`\`json
{
  "id": "char-xyz789",
  "userId": "user-abc123",
  "imageUrl": "https://firebasestorage.googleapis.com/.../char-xyz789.png",
  "rank": 1250,
  "wins": 15,
  "losses": 5,
  "draws": 2,
  "totalBattles": 22,
  "winRate": 68.18,
  "createdAt": "2024-01-15T10:35:00Z",
  "updatedAt": "2024-03-20T14:22:00Z"
}
\`\`\`

**인덱스:**
- 복합 인덱스: `userId` (ASC) + `createdAt` (DESC)
- 단일 필드 인덱스: `rank` (DESC) - 랭킹 조회용

**계산 로직:**
\`\`\`typescript
totalBattles = wins + losses + draws
winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0
\`\`\`

---

#### 📁 Battles Collection: `battles/{battleId}`

| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `id` | string | 배틀 고유 ID | auto-generated |
| `characterId` | string | 배틀 신청자 캐릭터 ID | - |
| `opponentId` | string | 상대 캐릭터 ID | - |
| `result` | string | 결과: 'win', 'loss', 'draw' | - |
| `reasoning` | string | AI 판정 이유 (한글) | - |
| `pointsChange` | number | 랭크 점수 변화 (+/-) | - |
| `characterRankBefore` | number | 배틀 전 신청자 랭크 | - |
| `characterRankAfter` | number | 배틀 후 신청자 랭크 | - |
| `opponentRankBefore` | number | 배틀 전 상대 랭크 | - |
| `opponentRankAfter` | number | 배틀 후 상대 랭크 | - |
| `createdAt` | timestamp | 배틀 발생 시간 | serverTimestamp() |

**예시 문서:**
\`\`\`json
{
  "id": "battle-def456",
  "characterId": "char-xyz789",
  "opponentId": "char-abc123",
  "result": "win",
  "reasoning": "당신의 캐릭터는 강력한 검술과 민첩한 움직임으로 상대를 압도했습니다!",
  "pointsChange": 25,
  "characterRankBefore": 1225,
  "characterRankAfter": 1250,
  "opponentRankBefore": 1180,
  "opponentRankAfter": 1155,
  "createdAt": "2024-03-20T14:22:00Z"
}
\`\`\`

**인덱스:**
- 복합 인덱스: `characterId` (ASC) + `createdAt` (DESC) - 캐릭터별 배틀 히스토리
- 복합 인덱스: `opponentId` (ASC) + `createdAt` (DESC) - 상대로 참여한 배틀 조회
- 단일 필드 인덱스: `createdAt` (DESC) - 최근 배틀 조회

**점수 변화 로직:**
\`\`\`typescript
// 승리 시
const pointsChange = 20 + Math.floor((opponentRank - characterRank) / 100)
// 최소 10점, 최대 50점

// 패배 시
const pointsChange = -(15 + Math.floor((characterRank - opponentRank) / 100))
// 최소 -10점, 최대 -40점

// 무승부 시
const pointsChange = 0
\`\`\`

---

### 3. Firebase Storage 구조

**경로 구조:**
\`\`\`
/characters/{userId}/{characterId}.png
\`\`\`

**예시:**
\`\`\`
/characters/user-abc123/char-xyz789.png
/characters/user-abc123/char-def456.png
\`\`\`

**이미지 저장 프로세스:**
1. 캔버스에서 그림 완성
2. `canvas.toBlob()` 또는 `canvas.toDataURL()`로 이미지 데이터 추출
3. Firebase Storage에 업로드
4. 다운로드 URL 받기
5. Firestore의 `characters` 컬렉션에 URL 저장

**구현 예시:**
\`\`\`typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'

async function saveCharacterImage(userId: string, characterId: string, blob: Blob) {
  const storageRef = ref(storage, `characters/${userId}/${characterId}.png`)
  await uploadBytes(storageRef, blob)
  const downloadURL = await getDownloadURL(storageRef)
  return downloadURL
}
\`\`\`

---

### 4. Firebase Security Rules

#### Firestore Rules

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users Collection
    match /users/{userId} {
      // 모든 인증된 사용자는 읽기 가능
      allow read: if request.auth != null;
      
      // 본인만 생성/수정 가능
      allow create: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId;
      
      // 삭제 불가 (필요시 추가)
      allow delete: if false;
    }
    
    // Characters Collection
    match /characters/{characterId} {
      // 모든 인증된 사용자는 읽기 가능 (랭킹 조회용)
      allow read: if request.auth != null;
      
      // 생성: 본인만 가능 + 3개 제한 체크
      allow create: if request.auth != null 
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.rank == 1000  // 초기 랭크 강제
        && request.resource.data.wins == 0
        && request.resource.data.losses == 0
        && request.resource.data.draws == 0;
      
      // 수정: 본인만 가능 (배틀 결과 업데이트)
      allow update: if request.auth.uid == resource.data.userId;
      
      // 삭제: 본인만 가능
      allow delete: if request.auth.uid == resource.data.userId;
    }
    
    // Battles Collection
    match /battles/{battleId} {
      // 모든 인증된 사용자는 읽기 가능
      allow read: if request.auth != null;
      
      // 생성: 인증된 사용자만 가능
      allow create: if request.auth != null;
      
      // 수정/삭제 불가 (배틀 기록은 불변)
      allow update, delete: if false;
    }
  }
}
\`\`\`

#### Storage Rules

\`\`\`javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /characters/{userId}/{characterId} {
      // 모든 인증된 사용자는 읽기 가능
      allow read: if request.auth != null;
      
      // 본인만 업로드 가능
      allow write: if request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024  // 5MB 제한
        && request.resource.contentType.matches('image/.*');  // 이미지만 허용
    }
  }
}
\`\`\`

---

### 5. Next.js API Routes 구현

#### POST `/api/characters/create`

**요청:**
\`\`\`typescript
{
  imageData: string  // base64 or blob
}
\`\`\`

**처리 로직:**
1. 사용자 인증 확인
2. 현재 캐릭터 수 확인 (3개 제한)
3. 이미지를 Firebase Storage에 업로드
4. Firestore에 캐릭터 문서 생성
5. User의 `characterCount` 증가

**응답:**
\`\`\`typescript
{
  success: true,
  characterId: string,
  imageUrl: string
}
\`\`\`

---

#### POST `/api/battle/start`

**요청:**
\`\`\`typescript
{
  characterId: string
}
\`\`\`

**처리 로직:**
1. 사용자 인증 확인
2. 캐릭터 소유권 확인
3. 랜덤 상대 선택 (본인 캐릭터 제외)
4. AI 판정 요청 (Gemini API)
5. 결과에 따라 양쪽 캐릭터 랭크 업데이트
6. Battles 컬렉션에 기록 저장
7. Characters 컬렉션의 wins/losses/draws 업데이트

**응답:**
\`\`\`typescript
{
  result: 'win' | 'loss' | 'draw',
  reasoning: string,
  pointsChange: number,
  newRank: number,
  opponent: {
    id: string,
    rank: number,
    wins: number,
    losses: number,
    draws: number
  }
}
\`\`\`

---

#### GET `/api/rankings`

**쿼리 파라미터:**
\`\`\`typescript
{
  limit?: number  // 기본값: 100
  offset?: number  // 페이지네이션용
}
\`\`\`

**처리 로직:**
1. Firestore에서 `characters` 컬렉션 조회
2. `rank` 기준 내림차순 정렬
3. 페이지네이션 적용

**응답:**
\`\`\`typescript
{
  characters: Array<{
    id: string,
    userId: string,
    imageUrl: string,
    rank: number,
    wins: number,
    losses: number,
    draws: number,
    winRate: number
  }>,
  total: number
}
\`\`\`

---

#### GET `/api/characters/user`

**처리 로직:**
1. 사용자 인증 확인
2. 해당 사용자의 캐릭터 조회 (`userId` 필터)
3. `createdAt` 기준 정렬

**응답:**
\`\`\`typescript
{
  characters: Array<Character>,
  count: number
}
\`\`\`

---

### 6. AI 판정 시스템 (Gemini API)

**현재 구현:**
- Mock 데이터로 랜덤 결과 반환

**실제 구현 방법:**

\`\`\`typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

async function judgeBattle(
  char1ImageUrl: string,
  char2ImageUrl: string,
  char1Rank: number,
  char2Rank: number
) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const prompt = `
두 캐릭터가 전투를 벌입니다. 
캐릭터 1의 현재 랭크: ${char1Rank}
캐릭터 2의 현재 랭크: ${char2Rank}

두 캐릭터의 그림을 보고 다음을 판정해주세요:
1. 승자 결정 (캐릭터 1 승리, 캐릭터 2 승리, 무승부)
2. 판정 이유를 한국어로 2-3문장으로 설명

응답 형식:
{
  "winner": 1 또는 2 또는 0(무승부),
  "reasoning": "판정 이유"
}
`

  const image1 = await fetch(char1ImageUrl).then(r => r.arrayBuffer())
  const image2 = await fetch(char2ImageUrl).then(r => r.arrayBuffer())

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: Buffer.from(image1).toString('base64'),
        mimeType: 'image/png'
      }
    },
    {
      inlineData: {
        data: Buffer.from(image2).toString('base64'),
        mimeType: 'image/png'
      }
    }
  ])

  const response = JSON.parse(result.response.text())
  
  // 결과 변환
  let battleResult: 'win' | 'loss' | 'draw'
  if (response.winner === 1) battleResult = 'win'
  else if (response.winner === 2) battleResult = 'loss'
  else battleResult = 'draw'

  // 점수 계산
  let pointsChange = 0
  if (battleResult === 'win') {
    pointsChange = 20 + Math.floor((char2Rank - char1Rank) / 100)
    pointsChange = Math.max(10, Math.min(50, pointsChange))
  } else if (battleResult === 'loss') {
    pointsChange = -(15 + Math.floor((char1Rank - char2Rank) / 100))
    pointsChange = Math.max(-40, Math.min(-10, pointsChange))
  }

  return {
    result: battleResult,
    reasoning: response.reasoning,
    pointsChange
  }
}
\`\`\`

**대안: Vercel AI SDK 사용 (권장)**

\`\`\`typescript
import { generateText } from 'ai'

async function judgeBattle(char1ImageUrl: string, char2ImageUrl: string) {
  const { text } = await generateText({
    model: 'google/gemini-2.5-flash-image',
    messages: [
      {
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: '두 캐릭터의 전투를 판정하고 승자와 이유를 JSON 형식으로 반환해주세요.' 
          },
          { type: 'image', image: char1ImageUrl },
          { type: 'image', image: char2ImageUrl },
        ],
      },
    ],
  })
  
  return JSON.parse(text)
}
\`\`\`

---

### 7. 환경 변수

**`.env.local` 파일:**

\`\`\`env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Gemini API (Google AI Studio에서 발급)
GEMINI_API_KEY=your_gemini_api_key

# 또는 Vercel AI Gateway 사용 시 (자동 설정)
# AI_SDK_GOOGLE_API_KEY=your_gemini_api_key
\`\`\`

---

### 8. 데이터 마이그레이션 가이드

**Mock 데이터 → Firebase 전환 체크리스트:**

1. **Firebase 프로젝트 설정**
   - [ ] Firebase Console에서 프로젝트 생성
   - [ ] Authentication 활성화 (이메일/비밀번호)
   - [ ] Firestore Database 생성 (프로덕션 모드)
   - [ ] Storage 버킷 생성

2. **Security Rules 적용**
   - [ ] Firestore Rules 배포
   - [ ] Storage Rules 배포

3. **인덱스 생성**
   - [ ] `characters` 컬렉션: `rank` (DESC)
   - [ ] `characters` 컬렉션: `userId` (ASC) + `createdAt` (DESC)
   - [ ] `battles` 컬렉션: `characterId` (ASC) + `createdAt` (DESC)

4. **코드 수정**
   - [ ] `lib/firebase.ts` 생성 (Firebase 초기화)
   - [ ] `lib/auth-context.tsx` 수정 (Firebase Auth 연동)
   - [ ] `lib/mock-data.ts` 제거 또는 주석 처리
   - [ ] API Routes 구현 (`/api/characters/*`, `/api/battle/*`)
   - [ ] 컴포넌트에서 Mock 데이터 호출 → API 호출로 변경

5. **테스트**
   - [ ] 회원가입/로그인 테스트
   - [ ] 캐릭터 생성 (이미지 업로드) 테스트
   - [ ] 3개 제한 테스트
   - [ ] 배틀 시스템 테스트
   - [ ] 랭킹 조회 테스트

---

## 개발 순서 권장사항

1. **Firebase 프로젝트 설정** (30분)
   - Firebase Console에서 프로젝트 생성
   - Authentication, Firestore, Storage 활성화
   - 환경 변수 설정

2. **Firebase SDK 통합** (1시간)
   - `lib/firebase.ts` 생성
   - Firebase 초기화 코드 작성
   - Authentication Context 수정

3. **이미지 업로드 구현** (2시간)
   - 캔버스 → Blob 변환
   - Firebase Storage 업로드
   - Firestore에 URL 저장

4. **캐릭터 CRUD API** (2시간)
   - 생성, 조회, 삭제 API Routes
   - 3개 제한 로직
   - 프론트엔드 연동

5. **배틀 시스템 구현** (3시간)
   - 랜덤 매칭 로직
   - Gemini API 연동
   - 랭크 업데이트 로직
   - 배틀 기록 저장

6. **랭킹 시스템** (1시간)
   - 랭킹 조회 API
   - 페이지네이션
   - 프론트엔드 연동

7. **Security Rules 및 테스트** (2시간)
   - Rules 작성 및 배포
   - 전체 기능 테스트
   - 버그 수정

**총 예상 시간: 11-12시간**

---

## 기술 스택

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Backend**: Firebase (Auth, Firestore, Storage)
- **AI**: Google Gemini API (gemini-2.0-flash-exp)
- **Deployment**: Vercel

---

## 시작하기

\`\`\`bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
\`\`\`

브라우저에서 http://localhost:3000 을 열어주세요.

---

## 참고 자료

- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Next.js 공식 문서](https://nextjs.org/docs)
- [Gemini API 문서](https://ai.google.dev/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
