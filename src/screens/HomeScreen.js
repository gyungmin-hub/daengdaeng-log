import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, AppState, Alert, Image,
} from 'react-native';
import {
  saveWalkRecord, getWalkRecords, formatDuration, formatDate,
  saveActiveWalk, getActiveWalk, clearActiveWalk, getProfile,
} from '../utils/storage';
import BichonSprite from '../components/BichonSprite';

const DEFAULT_PROFILE = require('../../assets/default_profile.png');
const RECORD_ICON = require('../../assets/record_icon.png');
const RECORD_ICON_EMPTY = require('../../assets/record_icon_empty.png');

export default function HomeScreen({ navigation }) {
  const [status, setStatus] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [recentRecords, setRecent] = useState([]);
  const [dogName, setDogName] = useState('');
  const [weekStats, setWeekStats] = useState({ count: 0, minutes: 0, walkedDays: [] });

  const intervalRef = useRef(null);
  const startedAtRef = useRef(null);
  const pausedAtRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    restoreActiveWalk();
    loadRecords();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { loadRecords(); });
    return unsub;
  }, [navigation]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      if (appStateRef.current === 'active' && next.match(/inactive|background/)) {
        clearInterval(intervalRef.current);
      } else if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        const active = await getActiveWalk();
        if (active && !pausedAtRef.current) {
          startedAtRef.current = active.startTimestamp;
          const realElapsed = Math.floor((Date.now() - active.startTimestamp) / 1000);
          setElapsed(realElapsed);
          tick(active.startTimestamp);
        }
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  async function restoreActiveWalk() {
    const active = await getActiveWalk();
    if (active) {
      const realElapsed = Math.floor((Date.now() - active.startTimestamp) / 1000);
      startedAtRef.current = active.startTimestamp;
      setElapsed(realElapsed);
      setStatus('walking');
      tick(active.startTimestamp);
    }
  }

  async function loadRecords() {
    const records = await getWalkRecords();
    setRecent(records.slice(0, 3));
    const profile = await getProfile();
    setDogName(profile?.name || '');
    calcWeekStats(records);
  }

  function calcWeekStats(records) {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const thisWeek = records.filter(r => {
      const d = new Date(r.date);
      return d >= monday && d <= sunday;
    });

    const walkedDays = [...new Set(thisWeek.map(r => new Date(r.date).getDay()))];
    const totalSec = thisWeek.reduce((sum, r) => sum + r.duration, 0);

    setWeekStats({
      count: thisWeek.length,
      minutes: Math.floor(totalSec / 60),
      walkedDays,
    });
  }

  function tick(from) {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - from) / 1000));
    }, 1000);
  }

  async function handleStart() {
    const now = Date.now();
    startedAtRef.current = now;
    pausedAtRef.current = null;
    setElapsed(0);
    setStatus('walking');
    await saveActiveWalk(now);
    tick(now);
  }

  function handleStop() {
    clearInterval(intervalRef.current);
    pausedAtRef.current = elapsed;
    Alert.alert('산책 종료', '산책을 끝낼까요?', [
      {
        text: '계속 산책',
        style: 'cancel',
        onPress: () => {
          const resumeFrom = Date.now() - (pausedAtRef.current * 1000);
          startedAtRef.current = resumeFrom;
          pausedAtRef.current = null;
          saveActiveWalk(resumeFrom);
          tick(resumeFrom);
        },
      },
      {
        text: '종료',
        style: 'destructive',
        onPress: () => {
          pausedAtRef.current = null;
          setStatus('finished');
        },
      },
    ]);
  }

  async function handleSave() {
    await saveWalkRecord({
      id: String(Date.now()),
      date: new Date().toISOString(),
      duration: elapsed,
    });
    await clearActiveWalk();
    await loadRecords();
    setStatus('idle');
    setElapsed(0);
    startedAtRef.current = null;
    pausedAtRef.current = null;
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  const cheer = status === 'idle' ? `오늘도 산책 가볼까요?`


    : status === 'walking' ? (
      elapsed < 60 ? '신나는 산책이 시작됐어요!' :
        elapsed < 600 ? '잘 하고 있어요, 계속 걸어봐요 🌿' :
          '오늘 최고의 산책이에요 ⭐'
    ) : '산책 완료! 정말 수고했어요 🎉';

  const WEEK_DAYS = [
    { label: '월', jsDay: 1 },
    { label: '화', jsDay: 2 },
    { label: '수', jsDay: 3 },
    { label: '목', jsDay: 4 },
    { label: '금', jsDay: 5 },
    { label: '토', jsDay: 6 },
    { label: '일', jsDay: 0 },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>

        {/* 상단 타이틀 + 프로필 */}
        <View style={s.topRow}>
          <View style={s.topLeft}>
            <Text style={s.appName}>댕댕로그</Text>
            <Text style={s.cheer} numberOfLines={1}>{cheer}</Text>
          </View>
          <TouchableOpacity
            style={s.profileBtnWrap}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={s.profileBtn}>
              <Image source={DEFAULT_PROFILE} style={s.profileBtnImg} />
            </View>
            {dogName
              ? <Text style={s.profileBtnName}>{dogName}</Text>
              : <Text style={s.profileBtnNameEmpty}>프로필</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── idle: 산책 시작 카드 ── */}
        {status === 'idle' && (
          <TouchableOpacity style={s.mainCard} onPress={handleStart} activeOpacity={0.9}>
            <View style={s.spriteWrap}>
              <View style={{ transform: [{ scale: 0.8 }] }}>
                <BichonSprite status="idle" />
              </View>
            </View>
            <Text style={s.startLabel}>산책 시작</Text>
            <Text style={s.startHint}>탭하면 타이머가 시작돼요</Text>
          </TouchableOpacity>
        )}

        {/* ── walking: 경과 시간 카드 ── */}
        {status === 'walking' && (
          <View style={s.mainCard}>
            <View style={s.spriteWrap}>
              <View style={{ transform: [{ scale: 0.8 }] }}>
                <BichonSprite status="walking" />
              </View>
            </View>
            <Text style={s.timerLabel}>경과 시간</Text>
            <Text style={s.timerNum}>{mm}:{ss}</Text>
          </View>
        )}

        {/* ── finished: 산책 완료 카드 ── */}
        {status === 'finished' && (
          <View style={s.mainCard}>
            <View style={s.spriteWrap}>
              <View style={{ transform: [{ scale: 0.8 }] }}>
                <BichonSprite status="finished" />
              </View>
            </View>
            <Text style={s.finishedSub}>
              {formatDuration(elapsed)} 동안 산책했어요
            </Text>
          </View>
        )}

        {/* ── 버튼 ── */}
        {status === 'walking' && (
          <TouchableOpacity style={[s.actionBtn, s.btnStop]} onPress={handleStop} activeOpacity={0.85}>
            <Text style={s.actionBtnText}>산책 종료</Text>
          </TouchableOpacity>
        )}
        {status === 'finished' && (
          <TouchableOpacity style={[s.actionBtn, s.btnSave]} onPress={handleSave} activeOpacity={0.85}>
            <Text style={s.actionBtnText}>오늘의 기록 저장</Text>
          </TouchableOpacity>
        )}

        {/* ── idle 전용 ── */}
        {status === 'idle' && (
          <>
            {/* 이번 주 산책 현황 헤더 */}
            <View style={s.secHead}>
              <Text style={s.secTitle}>이번 주 산책 현황</Text>
              <TouchableOpacity style={s.allBtn} onPress={() => navigation.navigate('Dashboard')}>
                <Text style={s.allBtnText}>댕댕리포트 →</Text>
              </TouchableOpacity>
            </View>

            {/* 이번 주 카드 */}
            <TouchableOpacity style={s.statusCard} onPress={() => navigation.navigate('Dashboard')} activeOpacity={0.85}>
              <Text style={s.statusStat}>
                <Text style={s.statusStatBold}>{weekStats.count}회</Text>
                {'   '}
                <Text style={s.statusStatBold}>
                  {weekStats.minutes > 0 ? `${weekStats.minutes}분` : '0분'}
                </Text>
              </Text>

              {/* ✅ 요일별 아이콘 */}
              <View style={s.weekRow}>
                {WEEK_DAYS.map(({ label, jsDay }) => {
                  const walked = weekStats.walkedDays.includes(jsDay);
                  return (
                    <View key={label} style={s.dayItem}>
                      {walked ? (
                        <Image
                          source={RECORD_ICON}
                          style={{ width: 42, height: 42 }}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}>
                          <Image
                            source={RECORD_ICON_EMPTY}
                            style={{ width: 42, height: 42, opacity: 0.2 }}
                            resizeMode="contain"
                          />
                          <Text style={{
                            position: 'absolute',
                            fontSize: 11,
                            fontWeight: '700',
                            color: '#CCCCCC',
                          }}>{label}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>

            {/* 최근 산책기록 헤더 */}
            <View style={s.secHead}>
              <Text style={s.secTitle}>최근 산책</Text>
              <TouchableOpacity style={s.allBtn} onPress={() => navigation.navigate('History')}>
                <Text style={s.allBtnText}>전체보기 →</Text>
              </TouchableOpacity>
            </View>

            {/* 최근 산책 목록 */}
            {recentRecords.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyText}>아직 산책 기록이 없어요</Text>
                <Text style={s.emptySub}>첫 산책을 시작해보세요!</Text>
              </View>
            ) : (
              recentRecords.map((r, i) => (
                <TouchableOpacity
                  key={r.id}
                  style={[s.rec, i === 0 && s.recTop]}
                  onPress={() => navigation.navigate('History')}
                  activeOpacity={0.85}
                >
                  <View>
                    <Text style={s.recDate}>{formatDate(r.date)}</Text>
                    <Text style={s.recDur}>{formatDuration(r.duration)}</Text>
                  </View>
                  <PawIcon color={INK} />
                </TouchableOpacity>
              ))
            )}
          </>
        )}

      </View>
    </SafeAreaView>
  );
}

function PawIcon({ color = '#1F1A24', size = 36 }) {
  const r = size / 36;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', left: 7 * r, top: 14 * r, width: 22 * r, height: 19 * r, borderRadius: 11 * r, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 0, top: 4 * r, width: 9.6 * r, height: 9.6 * r, borderRadius: 4.8 * r, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 13 * r, top: 0, width: 11 * r, height: 11 * r, borderRadius: 5.5 * r, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 26 * r, top: 4 * r, width: 9.6 * r, height: 9.6 * r, borderRadius: 4.8 * r, backgroundColor: color }} />
    </View>
  );
}
function getParticle(name) {
  if (!name) return '댕댕이와';
  const lastChar = name[name.length - 1];
  const code = lastChar.charCodeAt(0);
  const hasBatchim = (code - 0xAC00) % 28 !== 0;
  return name + (hasBatchim ? '이와' : '와');
}

const BG = '#FAF9F6';
const CARD = '#FFFFFF';
const INK = '#1F1A24';
const MUTED = '#9B8E80';
const BORDER = '#1F1A24';
const BTN = '#1F1A24';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  topLeft: { flex: 1, justifyContent: 'flex-end', paddingRight: 12 },
  appName: { fontSize: 26, fontWeight: '800', color: INK, letterSpacing: -0.5, marginBottom: 4 },
  cheer: { fontSize: 15, color: MUTED },

  profileBtnWrap: { alignItems: 'center', gap: 4 },
  profileBtn: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', borderWidth: 1.5, borderColor: '#D0CDD4' },
  profileBtnImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  profileBtnName: { fontSize: 11, fontWeight: '700', color: INK },
  profileBtnNameEmpty: { fontSize: 11, color: MUTED },

  // ✅ idle / walking / finished 공통 카드 — 동일한 크기와 스타일
  mainCard: {
    backgroundColor: CARD,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: BORDER,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  spriteWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  startLabel: { fontSize: 20, fontWeight: '800', color: INK, letterSpacing: -0.3 },
  startHint: { fontSize: 13, color: MUTED },
  timerLabel: { fontSize: 11, color: MUTED },
  timerNum: { fontSize: 42, fontWeight: '800', color: INK, letterSpacing: -2 },
  finishedSub: { fontSize: 14, color: MUTED, fontWeight: '600' },

  actionBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 14 },
  btnStop: { backgroundColor: BTN },
  btnSave: { backgroundColor: BTN },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: CARD },

  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  secTitle: { fontSize: 16, fontWeight: '800', color: INK },
  allBtn: { backgroundColor: INK, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  allBtnText: { fontSize: 12, fontWeight: '700', color: CARD },

  statusCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    marginBottom: 14,
  },
  statusStat: { fontSize: 20, textAlign: 'center', marginBottom: 12, color: INK },
  statusStatBold: { fontSize: 20, fontWeight: '800', color: INK },

  weekRow: { flexDirection: 'row', justifyContent: 'space-around' },
  dayItem: { alignItems: 'center', justifyContent: 'center' },

  // ✅ 산책 있는 날: 테두리/배경 없이 이미지만
  recordIcon: {
    width: 42,
    height: 42,
  },

  // ✅ 산책 없는 날: 연회색 + 투명도
  recordIconEmpty: {
    width: 42,
    height: 42,
    tintColor: '#D3D3D3',
    opacity: 0.4,
  },

  // 오버레이 래퍼
  iconWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabelOverlay: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '700',
    color: '#BBBBBB',
  },

  rec: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recTop: { borderWidth: 2, borderColor: BORDER },
  recDate: { fontSize: 12, color: MUTED, marginBottom: 2 },
  recDur: { fontSize: 18, fontWeight: '800', color: INK, letterSpacing: -0.3 },

  emptyCard: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 6 },
  emptyText: { fontSize: 14, fontWeight: '600', color: INK },
  emptySub: { fontSize: 12, color: MUTED },
});