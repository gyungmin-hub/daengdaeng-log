import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'dogwalk_records';

/**
 * 산책 기록 1개 저장
 * record: { id, date, duration (초) }
 */
export async function saveWalkRecord(record) {
  const existing = await getWalkRecords();
  const updated = [record, ...existing];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/**
 * 모든 산책 기록 불러오기 (최신순)
 */
export async function getWalkRecords() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

/**
 * 초 → "mm분 ss초" 형식 변환
 */
export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}초`;
  return `${m}분 ${s > 0 ? s + '초' : ''}`.trim();
}

/**
 * ISO 날짜 문자열 → "3월 16일 (월)" 형식 변환
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}
