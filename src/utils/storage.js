import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'dogwalk_records';
const ACTIVE_WALK_KEY = '@daengdaeng_active_walk'; // 🆕 진행 중 산책 상태

/**
 * 산책 기록 1개 저장
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

// 🆕 진행 중인 산책 상태 저장
export async function saveActiveWalk(startTimestamp) {
  await AsyncStorage.setItem(ACTIVE_WALK_KEY, JSON.stringify({ startTimestamp }));
}

// 🆕 진행 중인 산책 상태 불러오기
export async function getActiveWalk() {
  const raw = await AsyncStorage.getItem(ACTIVE_WALK_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

// 🆕 진행 중인 산책 상태 삭제
export async function clearActiveWalk() {
  await AsyncStorage.removeItem(ACTIVE_WALK_KEY);
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

const PROFILE_KEY = '@daengdaeng_profile';

// 프로필 저장
export async function saveProfile(profile) {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// 프로필 불러오기
export async function getProfile() {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

// 프로필 삭제
export async function clearProfile() {
  await AsyncStorage.removeItem(PROFILE_KEY);
}