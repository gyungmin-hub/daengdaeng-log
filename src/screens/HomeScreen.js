import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, AppState, Alert,
} from 'react-native';
import { saveWalkRecord, getWalkRecords, formatDuration, formatDate } from '../utils/storage';
import BichonSprite from '../components/BichonSprite';

export default function HomeScreen({ navigation }) {
  const [status, setStatus]        = useState('idle');
  const [elapsed, setElapsed]      = useState(0);
  const [recentRecords, setRecent] = useState([]);

  const intervalRef   = useRef(null);
  const startedAtRef  = useRef(null);
  const pausedAtRef   = useRef(null); // 1. 일시정지 시점 저장
  const appStateRef   = useRef(AppState.currentState);

  useEffect(() => { loadRecords(); }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadRecords);
    return unsub;
  }, [navigation]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (appStateRef.current === 'active' && next.match(/inactive|background/)) {
        clearInterval(intervalRef.current);
      } else if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        if (startedAtRef.current && !pausedAtRef.current) {
          setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
          tick(startedAtRef.current);
        }
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  async function loadRecords() {
    const records = await getWalkRecords();
    setRecent(records.slice(0, 3));
  }

  function tick(from) {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - from) / 1000));
    }, 1000);
  }

  function handleStart() {
    const now = Date.now();
    startedAtRef.current = now;
    pausedAtRef.current = null;
    setElapsed(0);
    setStatus('walking');
    tick(now);
  }

  function handleStop() {
    // 1. 타이머 일시정지
    clearInterval(intervalRef.current);
    pausedAtRef.current = elapsed; // 현재 경과 시간 저장

    Alert.alert('산책 종료', '산책을 끝낼까요?', [
      {
        text: '계속 산책',
        style: 'cancel',
        onPress: () => {
          // 취소 시 타이머 재개 — 일시정지된 시간부터 이어서
          const resumeFrom = Date.now() - (pausedAtRef.current * 1000);
          startedAtRef.current = resumeFrom;
          pausedAtRef.current = null;
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
    await loadRecords();
    setStatus('idle');
    setElapsed(0);
    startedAtRef.current = null;
    pausedAtRef.current = null;
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  const cheer = status === 'idle'     ? '오늘도 산책 가볼까요?'
              : status === 'walking'  ? (
                  elapsed < 60  ? '신나는 산책이 시작됐어요!' :
                  elapsed < 600 ? '잘 하고 있어요, 계속 걸어봐요 🌿' :
                                  '오늘 최고의 산책이에요 ⭐'
                )
              : '산책 완료! 정말 수고했어요 🎉';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={s.appName}>댕댕로그</Text>
        <Text style={s.cheer}>{cheer}</Text>

        {status === 'idle' && (
          <TouchableOpacity style={s.startCard} onPress={handleStart} activeOpacity={1}>
            <BichonSprite status="idle" />
            <Text style={s.startLabel}>산책 시작</Text>
            <Text style={s.startHint}>탭하면 타이머가 시작돼요</Text>
          </TouchableOpacity>
        )}

        {status !== 'idle' && (
          <View style={s.walkArea}>
            <BichonSprite status={status} />
            {status === 'walking' && (
              <View style={s.timerBox}>
                <Text style={s.timerLabel}>경과 시간</Text>
                <Text style={s.timerNum}>{mm}:{ss}</Text>
              </View>
            )}
            {status === 'finished' && (
              <Text style={s.finishedSub}>
                {formatDuration(elapsed)} 동안 산책했어요
              </Text>
            )}
          </View>
        )}

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

        {status === 'idle' && (
          <View style={s.section}>
            <View style={s.secHead}>
              <Text style={s.secTitle}>최근 산책</Text>
              <TouchableOpacity
                style={s.allBtn}
                onPress={() => navigation.navigate('History')}
              >
                <Text style={s.allBtnText}>전체보기 →</Text>
              </TouchableOpacity>
            </View>

            {recentRecords.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyText}>아직 산책 기록이 없어요</Text>
                <Text style={s.emptySub}>첫 산책을 시작해보세요!</Text>
              </View>
            ) : (
              recentRecords.map((r, i) => (
                <View key={r.id} style={[s.rec, i === 0 && s.recTop]}>
                  <View>
                    <Text style={s.recDate}>{formatDate(r.date)}</Text>
                    <Text style={s.recDur}>{formatDuration(r.duration)}</Text>
                  </View>
                  <PawIcon color={i === 0 ? '#1A1A1A' : '#C8C0B4'} />
                </View>
              ))
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function PawIcon({ color = '#1A1A1A', size = 36 }) {
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

const BG     = '#FAF9F6';
const INK    = '#1A1A1A';
const MUTED  = '#9B8E80';
const BORDER = '#E8E3DB';

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { padding: 24, paddingBottom: 52 },
  appName: { fontSize: 26, fontWeight: '800', color: INK, letterSpacing: -0.5, marginBottom: 3 },
  cheer:   { fontSize: 13, color: MUTED, marginBottom: 18, minHeight: 18 },
  startCard: { backgroundColor: BG, borderRadius: 22, borderWidth: 2, borderColor: '#D6D0C8', padding: 28, alignItems: 'center', gap: 10, marginBottom: 20 },
  startLabel: { fontSize: 22, fontWeight: '800', color: INK, letterSpacing: -0.3 },
  startHint:  { fontSize: 12, color: '#6B5E54' },
  walkArea: { alignItems: 'center', marginBottom: 18 },
  timerBox:  { alignItems: 'center', marginTop: 12 },
  timerLabel: { fontSize: 11, color: MUTED, marginBottom: 3 },
  timerNum:   { fontSize: 52, fontWeight: '800', color: INK, letterSpacing: -2 },
  finishedSub: { fontSize: 14, color: MUTED, fontWeight: '600', marginTop: 12 },
  actionBtn:     { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  btnStop:       { backgroundColor: '#3D3530' },
  btnSave:       { backgroundColor: '#2A5C3F' },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  section: {},
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  secTitle: { fontSize: 15, fontWeight: '700', color: INK },
  allBtn:   { backgroundColor: INK, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  allBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  rec:    { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1.5, borderColor: BORDER, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recTop: { borderWidth: 2, borderColor: INK, backgroundColor: '#F5F2ED' },
  recDate: { fontSize: 12, color: MUTED, marginBottom: 3 },
  recDur:  { fontSize: 20, fontWeight: '800', color: INK, letterSpacing: -0.3 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed', padding: 28, alignItems: 'center', gap: 6 },
  emptyText: { fontSize: 14, fontWeight: '600', color: INK },
  emptySub:  { fontSize: 12, color: MUTED },
});
