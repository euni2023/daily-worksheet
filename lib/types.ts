// 학습지 JSON(content/days/dayNN.json)의 형식.
// 문자열 안의 **굵게** 표시는 화면과 인쇄에서 굵은 글씨로 보인다.

export type Area = "vocab" | "reading" | "writing" | "english" | "wrapup" | "survey";

export const AREA_LABEL: Record<Area, string> = {
  vocab: "어휘",
  reading: "읽기",
  writing: "쓰기",
  english: "영어",
  wrapup: "마무리",
  survey: "자기평가",
};

export type Day = {
  id: string; // "day00"
  number: number;
  title: string;
  subtitle?: string; // "1단계 · 1주차 월요일"
  stage?: number;
  showChecklist?: boolean; // 맨 위 "오늘 할 일" 표
  intro?: string[]; // 맨 위 안내 상자
  sections: Section[];
  parentGuide?: ParentGuide;
};

export type Section = {
  id: string;
  title: string;
  time?: string;
  area: Area;
  checklistLabel?: string; // "오늘 할 일" 표에 쓸 짧은 이름
  blocks: Block[];
};

export type Block =
  | { kind: "text"; text: string }
  | { kind: "heading"; text: string; note?: string }
  | { kind: "box"; lines: string[]; tone?: "gray" | "blue" }
  | { kind: "passage"; title?: string; paragraphs: string[] }
  | { kind: "table"; header?: string[]; rows: string[][] }
  | { kind: "practice"; rows: { word: string; meaning: string }[] } // 단어 따라 쓰기
  | ({ kind: "question" } & Question);

type QuestionBase = {
  id: string; // 같은 학습지 안에서 고유: "q1"
  label: string; // "1." 또는 "D-3"
  prompt: string;
  quote?: string; // 문제 아래에 따로 보여 줄 문장(고칠 문장, 영어 문장 등)
  explain?: string; // 해설·채점 포인트 (엄마 화면)
};

export type Question = QuestionBase &
  (
    | { type: "mc"; choices: string[]; answer: number } // 0부터 시작
    | { type: "multi"; choices: string[]; answer: number[] }
    | { type: "short"; answer: string[] } // 맞는 답 후보들
    | { type: "essay"; lines?: number; sample?: string; rubric?: string }
    | { type: "ox"; items: { text: string; answer: "O" | "X" }[] }
    // text 안의 ___ 자리마다 빈칸 하나. answers[i] = i번째 빈칸에 맞는 답 후보들
    | { type: "blank"; items: { text: string; answers: string[][] }[] }
    // text 안의 ___ 자리에 options 중 하나를 고른다
    | { type: "pick"; items: { text: string; options: string[]; answer: string }[] }
    | { type: "phonics"; rows: { label: string; words: string[] }[] }
    | { type: "survey"; items: { text: string; options?: string[] }[] }
  );

export type QuestionType = Question["type"];

export type ParentGuide = {
  note?: string;
  answerTable?: { header: string[]; rows: string[][] }; // 정답표를 직접 정할 때 (없으면 문항에서 만든다)
  tables?: { title?: string; header: string[]; rows: string[][] }[];
  boxes?: { title?: string; lines: string[] }[];
};

// ---- 답안과 채점 ----

// 문항 id → 답. 하위 항목이 있는 문항은 배열.
export type AnswerValue = string | number | number[] | string[];
export type Answers = Record<string, AnswerValue>;

// 채점 단위: 문항 하나 또는 하위 항목 하나
export type ItemResult = {
  key: string; // "q5" 또는 "q5.2"
  questionId: string;
  label: string; // 사람이 읽는 번호 "5-(2)"
  area: Area;
  given: string;
  correct: boolean | null; // null = 채점 안 함(서술형 AI 없음, 설문 등)
  note?: string;
};

export type GradeResult = {
  items: ItemResult[];
  score: number;
  total: number;
  byArea: Partial<Record<Area, { score: number; total: number }>>;
  feedback: string;
  aiUsed: boolean;
};

export type Submission = {
  dayId: string;
  submittedAt: string;
  mode: "screen" | "photo";
  answers?: Answers;
  result: GradeResult;
};
