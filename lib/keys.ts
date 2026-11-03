// 답안 저장 키: 문항 id 뒤에 하위 항목 번호를 점으로 잇는다. 예) "q5.1", "q1.0.0"
export function subKey(id: string, ...idx: number[]) {
  return [id, ...idx].join(".");
}
