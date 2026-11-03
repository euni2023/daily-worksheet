# 매일 학습지 (daily-worksheet)

초등 6학년을 위한 매일 학습지 웹앱입니다. 어휘 → 짧은 글 읽기 → 문장 쓰기 → 영어 → 마무리 순서로 하루 50~60분 풉니다.

- **학생 화면** (`/`, `/day/day01`): 화면에서 바로 풀고 제출하거나, 종이에 푼 학습지 사진을 올려 채점받습니다. 제출하면 칭찬 위주의 짧은 피드백이 나옵니다.
- **인쇄/PDF** (`/print/day01`): 정답 없는 A4 학습지. 인쇄 창에서 "PDF로 저장"을 고르면 PDF가 됩니다.
- **엄마 화면** (`/parent`, PIN 잠금): 진도표, 회차별 정답·해설(인쇄 가능), 학생 답과 채점 결과, AI 요약(틀린 문제, 약한 영역, 다음에 할 일).

기술: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, `@anthropic-ai/sdk` (모델 `claude-opus-5-5`).

## 로컬에서 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기 (아래 참고)
npm run dev                  # http://localhost:3000
```

`.env.local`

| 이름 | 설명 |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API 키. 비워 두면 자동 채점만 하고, 서술형은 "엄마 확인"으로 남습니다. 사진 채점과 AI 요약은 키가 있어야 합니다. |
| `PARENT_PIN` | 엄마 화면 PIN (숫자 4~8자리 권장). 비워 두면 엄마 화면이 열리지 않습니다. |

`.env.local`은 `.gitignore`에 들어 있어 GitHub에 올라가지 않습니다. API 키는 서버(API 라우트)에서만 읽고 브라우저로 보내지 않습니다.

## Vercel 배포

1. [vercel.com](https://vercel.com)에 GitHub 계정으로 로그인합니다.
2. **Add New → Project**에서 `euni2023/daily-worksheet` 저장소를 **Import** 합니다. 프레임워크는 Next.js로 자동 인식됩니다.
3. **Environment Variables**에 다음 두 개를 넣습니다 (Production, Preview 모두 체크).
   - `ANTHROPIC_API_KEY` = [Claude Console](https://console.anthropic.com/settings/keys)에서 만든 키
   - `PARENT_PIN` = 엄마 화면 PIN
4. **Deploy**를 누릅니다. 이후 `main` 브랜치에 push할 때마다 자동으로 다시 배포됩니다.

환경변수를 나중에 바꾸면 **Settings → Environment Variables**에서 고친 뒤 **Deployments → 가장 최근 배포 → Redeploy**를 해야 반영됩니다.

> 사진 채점은 30초 이상 걸릴 수 있습니다. API 라우트는 `maxDuration = 120`초로 설정돼 있습니다. Vercel Hobby 요금제에서 허용하는 최대 시간보다 길면 Vercel이 자동으로 줄입니다.

## 학습지 추가하기

`content/days/` 폴더에 `day02.json`, `day03.json` … 을 추가하면 목록에 자동으로 나타납니다 (커밋하고 push하면 배포에도 반영). 형식은 `lib/types.ts`에 정의돼 있고, `day00.json`, `day01.json`이 예시입니다.

문항 유형 (`"type"`):

| 유형 | 용도 | 정답 필드 |
| --- | --- | --- |
| `mc` | 객관식 | `"answer": 1` (0부터 시작하는 보기 번호) |
| `multi` | 여러 개 고르기 | `"answer": [0, 2]` |
| `short` | 단답 | `"answer": ["왼쪽", "왼쪽으로"]` (맞는 답 후보) |
| `essay` | 서술 | `"sample"`(예시 답), `"rubric"`(채점 기준). AI가 채점 |
| `ox` | O/X | `"items": [{"text": "...", "answer": "O"}]` |
| `blank` | 빈칸 | 문장 속 `___` 자리마다 빈칸, `"answers": [["예방"], ["헬멧", "장비"]]` |
| `pick` | 괄호 안에서 고르기 | `"text": "비가 왔다. ___ 천천히 달렸다.", "options": ["그래서", "하지만"], "answer": "그래서"` |
| `phonics` | 파닉스 소리 내어 읽기 체크표 | 엄마가 듣고 ○△× 표시 (점수에는 안 들어감) |
| `survey` | 자기평가·설문 | 없음 |

그 밖의 블록: `text`, `heading`, `box`, `passage`(지문), `table`, `practice`(단어 따라 쓰기). 엄마용 정답표와 안내는 `parentGuide`에 넣습니다 (`answerTable`이 없으면 문항에서 자동으로 만듭니다).

규칙: 영어 연재 캐릭터는 준(Jun, 빨간 자전거, 검은 헬멧). 인쇄물에서 깨질 수 있으니 이모지는 쓰지 않습니다.

## 기록 저장

제출 기록은 지금은 **브라우저 localStorage**에 저장됩니다. 같은 기기, 같은 브라우저에서만 보이므로 학생과 엄마가 같은 기기를 쓰는 것을 전제로 합니다. 여러 기기에서 같이 보려면 `lib/storage.ts`의 함수만 Vercel KV나 Supabase로 바꾸면 됩니다.

## 폴더 구조

```
app/
  page.tsx, day-list.tsx        학생 홈 (회차 목록)
  day/[id]/                     학생 풀이 화면 + 사진 제출
  print/[id]/                   인쇄용 빈 학습지
  parent/                       엄마 화면 (진도표, AI 요약)
  parent/day/[id]/              정답·해설 + 최근 제출
  api/feedback/                 채점 + AI 피드백 (텍스트 답안, 사진)
  api/parent/{login,session,day,summary}/
components/worksheet.tsx        학습지 렌더러 (풀기/인쇄 모드)
lib/                            타입, 콘텐츠 읽기, 채점, Claude 호출, PIN, localStorage
content/days/                   학습지 JSON
legacy/                         예전 한글(hwpx) 학습지 생성 스크립트 (JSON의 원본)
```
