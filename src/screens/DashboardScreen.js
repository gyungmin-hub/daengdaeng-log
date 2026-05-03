import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    SafeAreaView, ScrollView, Pressable, Image,
} from 'react-native';
import { getWalkRecords } from '../utils/storage';

const RECORD_ICON = require('../../assets/record_icon.png');
const RECORD_ICON_EMPTY = require('../../assets/record_icon_empty.png');

function analyzeWalkStyle(records) {
    if (records.length === 0) return null;
    const now = new Date();

    const weeksSet = new Set(records.map(r => {
        const d = new Date(r.date);
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.floor((d - startOfYear) / (7 * 24 * 3600 * 1000));
        return `${d.getFullYear()}-${weekNum}`;
    }));
    const totalWeeks = Math.max(weeksSet.size, 1);
    const avgPerWeek = records.length / totalWeeks;

    let freqScore = 1;
    if (avgPerWeek >= 7) freqScore = 5;
    else if (avgPerWeek >= 5) freqScore = 4;
    else if (avgPerWeek >= 3) freqScore = 3;
    else if (avgPerWeek >= 2) freqScore = 2;

    const totalSec = records.reduce((sum, r) => sum + r.duration, 0);
    const avgMin = (totalSec / records.length) / 60;

    let timeScore = 1;
    if (avgMin >= 40) timeScore = 5;
    else if (avgMin >= 30) timeScore = 4;
    else if (avgMin >= 20) timeScore = 3;
    else if (avgMin >= 10) timeScore = 2;

    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(now.getDate() - 28);

    const recentWeeks = new Set(
        records
            .filter(r => new Date(r.date) >= fourWeeksAgo)
            .map(r => {
                const d = new Date(r.date);
                const startOfYear = new Date(d.getFullYear(), 0, 1);
                const weekNum = Math.floor((d - startOfYear) / (7 * 24 * 3600 * 1000));
                return `${d.getFullYear()}-${weekNum}`;
            })
    );
    const activeWeeks = recentWeeks.size;

    let consistencyScore = 1;
    if (activeWeeks >= 4) consistencyScore = 5;
    else if (activeWeeks >= 3) consistencyScore = 3;
    else if (activeWeeks >= 2) consistencyScore = 2;

    const total = freqScore + timeScore + consistencyScore;

    const STYLES = [
        { max: 2, label: '산책 입문자형', emoji: '🌱', desc: '산책 습관을 만들어 가는 중이에요' },
        { max: 4, label: '소소한 탐방형', emoji: '🍃', desc: '가끔이지만 나름 즐기는 타입이에요' },
        { max: 6, label: '느긋한 산책형', emoji: '🐌', desc: '천천히 자기 페이스로 걷는 스타일이에요' },
        { max: 8, label: '꾸준한 거북이형', emoji: '🐢', desc: '빠르진 않아도 포기하지 않아요' },
        { max: 10, label: '균형잡힌 산책러', emoji: '⭐', desc: '빈도·시간·꾸준함 모두 안정적이에요' },
        { max: 11, label: '활발한 댕댕형', emoji: '🐕', desc: '자주 나가고 신나게 즐기는 타입이에요' },
        { max: 12, label: '열정 산책러형', emoji: '🔥', desc: '산책에 진심인 당신!' },
        { max: 13, label: '마라토너형', emoji: '🏃', desc: '긴 시간 꾸준히, 체력 끝판왕이에요' },
        { max: 14, label: '탐험가형', emoji: '🦁', desc: '매일 긴 탐험, 진정한 산책 고수예요' },
        { max: 15, label: '전설의 산책왕', emoji: '👑', desc: '완벽한 산책 습관의 소유자!' },
    ];

    const style = STYLES.find(s => total <= s.max) || STYLES[STYLES.length - 1];
    return {
        label: style.label, emoji: style.emoji, desc: style.desc,
        score: total, maxScore: 15,
        freqScore, timeScore, consistencyScore,
    };
}

function getFavoriteDay(records) {
    if (records.length === 0) return null;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const count = [0, 0, 0, 0, 0, 0, 0];
    records.forEach(r => { count[new Date(r.date).getDay()]++; });
    return days[count.indexOf(Math.max(...count))];
}

function getMonthlyStats(records, year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const thisMonth = records.filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === year && d.getMonth() === month;
    });
    const walkedDays = new Set(thisMonth.map(r => new Date(r.date).getDate())).size;
    return { walkedDays, daysInMonth };
}

export default function DashboardScreen({ navigation }) {
    const [records, setRecords] = useState([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth());
    const [calendarDays, setCalendar] = useState([]);
    const [showPicker, setShowPicker] = useState(false);
    const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
    const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
    const [imagesReady, setImagesReady] = useState(false);
    const [showStyleGuide, setShowStyleGuide] = useState(false);

    useEffect(() => { load(); }, []);
    useEffect(() => { buildCalendar(); }, [year, month, records]);
    useEffect(() => {
        const timer = setTimeout(() => setImagesReady(true), 100);
        return () => clearTimeout(timer);
    }, []);

    async function load() {
        const data = await getWalkRecords();
        setRecords(data);
    }

    function buildCalendar() {
        const firstDay = new Date(year, month, 1).getDay();
        const startOffset = firstDay;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const walkedDates = new Set(
            records
                .filter(r => {
                    const d = new Date(r.date);
                    return d.getFullYear() === year && d.getMonth() === month;
                })
                .map(r => new Date(r.date).getDate())
        );

        const cells = [];
        for (let i = 0; i < startOffset; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, walked: walkedDates.has(d) });
        setCalendar(cells);
    }

    function prevMonth() {
        if (month === 0) { setYear(y => y - 1); setMonth(11); }
        else setMonth(m => m - 1);
    }

    function nextMonth() {
        if (month === 11) { setYear(y => y + 1); setMonth(0); }
        else setMonth(m => m + 1);
    }

    const allTotalSec = records.reduce((sum, r) => sum + r.duration, 0);
    const WALK_SPEED_KMH = 2;

    // 이번 달 거리만 계산 (매월 리셋)
    const now = new Date();
    const thisMonthRecords = records.filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const thisMonthSec = thisMonthRecords.reduce((sum, r) => sum + r.duration, 0);
    const totalKm = Math.round((thisMonthSec / 3600) * WALK_SPEED_KMH * 10) / 10;

    const MIN_GOAL = 20;
    const MAX_GOAL = 40;
    const goal = totalKm >= MIN_GOAL ? MAX_GOAL : MIN_GOAL;
    const remaining = Math.max(Math.round((goal - totalKm) * 10) / 10, 0);
    const goalPercent = Math.min(Math.round((totalKm / goal) * 100), 100);
    const monthRecords = records.filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === year && d.getMonth() === month;
    });
    const totalSec = monthRecords.reduce((sum, r) => sum + r.duration, 0);
    const totalHour = Math.floor(totalSec / 3600);
    const totalMin = Math.floor((totalSec % 3600) / 60);
    const avgSec = monthRecords.length > 0 ? Math.floor(totalSec / monthRecords.length) : 0;
    const avgMin = Math.floor(avgSec / 60);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRecords = records.filter(r => new Date(r.date) >= thirtyDaysAgo);
    const walkStyle = analyzeWalkStyle(recentRecords.length > 0 ? recentRecords : records);
    const favoriteDay = getFavoriteDay(records);
    const monthlyStats = getMonthlyStats(records, year, month);


    const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* 헤더 */}
                <View style={s.header}>
                    <Pressable style={s.backBtn} onPress={() => {
                        if (navigation.canGoBack()) navigation.goBack();
                        else navigation.navigate('Home');
                    }}>
                        <Text style={s.backBtnText}>← 돌아가기</Text>
                    </Pressable>
                    <Text style={s.headerTitle} pointerEvents="none">댕댕 리포트</Text>
                    <View style={{ width: 80 }} />
                </View>

                {/* ── 캘린더 카드 ── */}
                <View style={s.card}>
                    <View style={s.calNav}>
                        <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
                            <Text style={s.navBtnText}>←</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                            setPickerYear(year);
                            setPickerMonth(month);
                            setShowPicker(true);
                        }}>
                            <Text style={s.calTitle}>{year}년 {MONTH_NAMES[month]}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
                            <Text style={s.navBtnText}>→</Text>
                        </TouchableOpacity>
                    </View>

                    {showPicker && (
                        <View style={s.pickerWrap}>
                            <View style={s.pickerRow}>
                                <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} style={s.pickerBtn}>
                                    <Text style={s.pickerBtnText}>◀</Text>
                                </TouchableOpacity>
                                <Text style={s.pickerVal}>{pickerYear}년</Text>
                                <TouchableOpacity
                                    onPress={() => setPickerYear(y => Math.min(y + 1, new Date().getFullYear()))}
                                    style={s.pickerBtn}
                                >
                                    <Text style={s.pickerBtnText}>▶</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={s.monthGrid}>
                                {MONTH_NAMES.map((m, i) => {
                                    const isSelected = i === pickerMonth;
                                    const isFuture = pickerYear === new Date().getFullYear() && i > new Date().getMonth();
                                    return (
                                        <TouchableOpacity
                                            key={m}
                                            style={[s.monthBtn, isSelected && s.monthBtnSelected, isFuture && s.monthBtnDisabled]}
                                            onPress={() => !isFuture && setPickerMonth(i)}
                                            disabled={isFuture}
                                        >
                                            <Text style={[s.monthBtnText, isSelected && s.monthBtnTextSelected, isFuture && s.monthBtnTextDisabled]}>
                                                {m}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <View style={s.pickerActions}>
                                <TouchableOpacity style={s.pickerCancel} onPress={() => setShowPicker(false)}>
                                    <Text style={s.pickerCancelText}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={s.pickerConfirm} onPress={() => {
                                    setYear(pickerYear);
                                    setMonth(pickerMonth);
                                    setShowPicker(false);
                                }}>
                                    <Text style={s.pickerConfirmText}>확인</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={s.calRow}>
                        {DAY_LABELS.map(d => (
                            <Text key={d} style={s.calDayLabel}>{d}</Text>
                        ))}
                    </View>

                    <View style={[s.calGrid, { opacity: imagesReady ? 1 : 0 }]}>
                        {calendarDays.map((cell, i) => (
                            <View key={i} style={s.calCell}>
                                {cell ? (
                                    <View style={s.calIconWrap}>
                                        <Image
                                            source={RECORD_ICON}
                                            style={[s.calIcon, { opacity: cell.walked ? 1 : 0.1 }]}
                                            resizeMode="contain"
                                        />
                                        <Text style={[s.calDayNum, cell.walked && s.calDayNumWalked]}>
                                            {cell.day}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── 레포팅 섹션 ── */}
                {records.length === 0 ? (
                    <View style={s.emptyCard}>
                        <Text style={s.emptyText}>아직 산책 기록이 없어요 🐾</Text>
                    </View>
                ) : (
                    <>
                        <View style={s.reportCard}>
                            {/* 누적 거리 */}
                            <View style={s.reportRow}>
                                <Text style={s.reportIcon}>🏆</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.reportLabel}>이번 달 산책 거리</Text>
                                    <Text style={s.reportValue}>
                                        {totalKm >= MAX_GOAL
                                            ? '🏆 최대 목표 달성!'
                                            : totalKm >= MIN_GOAL
                                                ? `🎉 행복한 댕댕이에요! 최대까지 ${remaining}km`
                                                : `${remaining}km 남았어요`}
                                    </Text>
                                    <Text style={s.reportSub}>
                                        {totalKm >= MAX_GOAL
                                            ? `${totalKm}km 달성 · 완벽한 한 달이에요!`
                                            : `목표 ${goal}km · 현재 ${totalKm}km`}
                                    </Text>
                                    <View style={s.progressBg}>
                                        <View style={[s.progressFill, { width: `${goalPercent}%` }]} />
                                    </View>
                                </View>
                            </View>

                            {/* 이 달의 성실도 */}
                            <View style={[s.reportRow, { marginTop: 12 }]}>
                                <Text style={s.reportIcon}>📅</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.reportLabel}>이 달의 성실도</Text>
                                    <Text style={s.reportValue}>
                                        {monthlyStats.walkedDays}/{monthlyStats.daysInMonth}일
                                        <Text style={s.earthPercentInline}> ({Math.round((monthlyStats.walkedDays / monthlyStats.daysInMonth) * 100)}% 완료)</Text>
                                    </Text>
                                    <View style={s.progressBg}>
                                        <View style={[s.progressFill, {
                                            width: `${Math.round((monthlyStats.walkedDays / monthlyStats.daysInMonth) * 100)}%`
                                        }]} />
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={s.statRow}>
                            <View style={[s.statCard, { flex: 1 }]}>
                                <Text style={s.statLabel}>월간 총 산책 시간</Text>
                                <Text style={s.statValue}>
                                    {totalHour > 0 ? `${totalHour}시간 ` : ''}
                                    {totalMin > 0 ? `${totalMin}분` : `${Math.floor(totalSec % 60)}초`}
                                </Text>
                            </View>
                            <View style={[s.statCard, { flex: 1 }]}>
                                <Text style={s.statLabel}>월 평균 산책 시간</Text>
                                <Text style={s.statValue}>
                                    {avgMin > 0 ? `${avgMin}분` : `${Math.floor(avgSec % 60)}초`}
                                </Text>
                            </View>
                        </View>

                        {walkStyle && (
                            <TouchableOpacity style={s.styleCard} onPress={() => setShowStyleGuide(true)} activeOpacity={0.85}>
                                <Text style={s.styleLabel}>나의 산책 스타일</Text>
                                <Text style={s.styleEmoji}>{walkStyle.emoji}</Text>
                                <Text style={s.styleValue}>{walkStyle.label}</Text>
                                <Text style={s.styleDesc}>{walkStyle.desc}</Text>
                                <View style={s.scoreRow}>
                                    <View style={s.scoreItem}>
                                        <Text style={s.scoreLabel}>빈도</Text>
                                        <Text style={s.scoreVal}>{walkStyle.freqScore}/5</Text>
                                    </View>
                                    <View style={s.scoreItem}>
                                        <Text style={s.scoreLabel}>시간</Text>
                                        <Text style={s.scoreVal}>{walkStyle.timeScore}/5</Text>
                                    </View>
                                    <View style={s.scoreItem}>
                                        <Text style={s.scoreLabel}>꾸준함</Text>
                                        <Text style={s.scoreVal}>{walkStyle.consistencyScore}/5</Text>
                                    </View>
                                </View>
                                <Text style={s.scoreTotal}>종합 점수 {walkStyle.score} / 15</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}

                <View style={{ height: 20 }} />
            </ScrollView>
            {/* 산책 스타일 가이드 모달 */}
            {showStyleGuide && (
                <TouchableOpacity
                    style={s.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowStyleGuide(false)}
                >
                    <View style={s.modalCard}>
                        <Text style={s.modalTitle}>🐾 산책 스타일 가이드</Text>
                        <Text style={s.modalSub}>종합 점수 (빈도+시간+꾸준함) 기준</Text>
                        {[
                            { score: '3~4점', emoji: '🌱', label: '산책 입문자형', desc: '산책 습관을 만들어가는 중' },
                            { score: '5~6점', emoji: '🍃', label: '소소한 산책형', desc: '가끔이지만 나름 즐기는 타입' },
                            { score: '7~8점', emoji: '🐌', label: '느긋한 산책형', desc: '자기 페이스로 천천히 걷는 스타일' },
                            { score: '9~10점', emoji: '🐢', label: '꾸준한 거북이형', desc: '빠르진 않아도 포기하지 않음' },
                            { score: '11~12점', emoji: '⭐', label: '균형잡힌 산책러', desc: '빈도·시간·꾸준함 모두 안정적' },
                            { score: '13점', emoji: '🐕', label: '활발한 댕댕형', desc: '자주 나가고 신나게 즐기는 타입' },
                            { score: '14점', emoji: '🔥', label: '열정 산책러형', desc: '산책에 진심인 타입' },
                            { score: '15점', emoji: '🏃', label: '마라토너형', desc: '긴 시간 꾸준히, 체력 끝판왕' },
                            { score: '16점', emoji: '🦁', label: '탐험가형', desc: '매일 긴 탐험, 진정한 산책 고수' },
                            { score: '17점', emoji: '👑', label: '전설의 산책왕', desc: '완벽한 산책 습관의 소유자' },
                        ].map((item, i) => (
                            <View key={i} style={s.guideRow}>
                                <Text style={s.guideEmoji}>{item.emoji}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.guideLabel}>{item.label}
                                        <Text style={s.guideScore}>  {item.score}</Text>
                                    </Text>
                                    <Text style={s.guideDesc}>{item.desc}</Text>
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity style={s.modalClose} onPress={() => setShowStyleGuide(false)}>
                            <Text style={s.modalCloseText}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            )}

        </SafeAreaView>
    );
}

const BG = '#FAF9F6';
const CARD = '#FFFFFF';
const INK = '#1F1A24';
const MUTED = '#9B8E80';
const BORDER = '#1F1A24';
const BTN = '#1F1A24';
const PURPLE = '#7B6FD0';

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    scroll: { padding: 14, paddingBottom: 16 },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    backBtn: { backgroundColor: BTN, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
    backBtnText: { fontSize: 12, fontWeight: '700', color: CARD },
    headerTitle: { fontSize: 17, fontWeight: '800', color: INK, position: 'absolute', left: 0, right: 0, textAlign: 'center' },

    card: {
        backgroundColor: CARD, borderRadius: 22, borderWidth: 1.5, borderColor: BORDER,
        padding: 12, marginBottom: 10,
    },
    calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    navBtn: { padding: 6 },
    navBtnText: { fontSize: 18, fontWeight: '700', color: INK },
    calTitle: { fontSize: 15, fontWeight: '800', color: INK },

    pickerWrap: {
        backgroundColor: '#F5F3FF', borderRadius: 16,
        borderWidth: 1.5, borderColor: PURPLE,
        padding: 14, marginBottom: 10,
    },
    pickerRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 20, marginBottom: 12,
    },
    pickerBtn: { padding: 8 },
    pickerBtnText: { fontSize: 16, fontWeight: '700', color: INK },
    pickerVal: { fontSize: 16, fontWeight: '800', color: INK, minWidth: 80, textAlign: 'center' },
    monthGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: 8, justifyContent: 'center', marginBottom: 12,
    },
    monthBtn: {
        width: '22%', paddingVertical: 8, borderRadius: 10,
        borderWidth: 1.5, borderColor: '#E0DCF0',
        backgroundColor: CARD, alignItems: 'center',
    },
    monthBtnSelected: { backgroundColor: PURPLE, borderColor: PURPLE },
    monthBtnDisabled: { opacity: 0.3 },
    monthBtnText: { fontSize: 13, fontWeight: '600', color: INK },
    monthBtnTextSelected: { color: CARD },
    monthBtnTextDisabled: { color: MUTED },
    pickerActions: { flexDirection: 'row', gap: 10 },
    pickerCancel: {
        flex: 1, paddingVertical: 10, borderRadius: 10,
        borderWidth: 1.5, borderColor: BORDER,
        backgroundColor: CARD, alignItems: 'center',
    },
    pickerCancelText: { fontSize: 14, fontWeight: '600', color: MUTED },
    pickerConfirm: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: INK, alignItems: 'center' },
    pickerConfirmText: { fontSize: 14, fontWeight: '700', color: CARD },

    calRow: { flexDirection: 'row', marginBottom: 4 },
    calDayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: MUTED },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calCell: { width: '14.28%', alignItems: 'center', paddingVertical: 2 },

    calIconWrap: { alignItems: 'center', justifyContent: 'center' },
    calIcon: { width: 32, height: 32 },
    calDayNum: { fontSize: 9, color: MUTED, fontWeight: '500', marginTop: -2 },
    calDayNumWalked: { fontSize: 9, color: INK, fontWeight: '800' },

    reportCard: {
        backgroundColor: CARD, borderRadius: 18, borderWidth: 1.5, borderColor: BORDER,
        padding: 12, marginBottom: 8,
    },
    reportRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    reportIcon: { fontSize: 28, marginTop: 4 },
    reportLabel: { fontSize: 10, color: MUTED, marginBottom: 2 },
    reportValue: { fontSize: 13, fontWeight: '800', color: INK },
    reportSub: { fontSize: 9, color: MUTED, marginTop: 1 },
    earthPercentInline: { fontSize: 13, color: PURPLE, fontWeight: '800' },

    progressBg: { height: 5, backgroundColor: '#EDE9FB', borderRadius: 3, marginTop: 4 },
    progressFill: { height: 5, backgroundColor: PURPLE, borderRadius: 3 },

    statRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    statCard: {
        backgroundColor: CARD, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER,
        padding: 12,
    },
    statLabel: { fontSize: 10, color: MUTED, marginBottom: 3, textAlign: 'center' },
    statValue: { fontSize: 17, fontWeight: '800', color: INK, textAlign: 'center' },

    styleCard: {
        backgroundColor: CARD, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER,
        paddingVertical: 12, paddingHorizontal: 14,
        alignItems: 'center', gap: 2, marginBottom: 8,
    },
    styleLabel: { fontSize: 10, color: MUTED },
    styleEmoji: { fontSize: 28, marginVertical: 3 },
    styleValue: { fontSize: 15, fontWeight: '800', color: INK },
    styleDesc: { fontSize: 11, color: MUTED },

    scoreRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
    scoreItem: { alignItems: 'center' },
    scoreLabel: { fontSize: 10, color: MUTED, marginBottom: 2 },
    scoreVal: { fontSize: 13, fontWeight: '800', color: INK },
    scoreTotal: { fontSize: 10, color: MUTED, marginTop: 4 },

    emptyCard: {
        backgroundColor: CARD, borderRadius: 18, borderWidth: 1.5, borderColor: BORDER,
        padding: 28, alignItems: 'center',
    },
    emptyText: { fontSize: 14, color: MUTED },
    modalOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: CARD,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: BORDER,
        padding: 20,
        width: '100%',
    },
    modalTitle: { fontSize: 16, fontWeight: '800', color: INK, marginBottom: 4, textAlign: 'center' },
    modalSub: { fontSize: 10, color: MUTED, textAlign: 'center', marginBottom: 14 },

    guideRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0EEF8' },
    guideEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
    guideLabel: { fontSize: 12, fontWeight: '800', color: INK },
    guideScore: { fontSize: 11, fontWeight: '400', color: MUTED },
    guideDesc: { fontSize: 10, color: MUTED, marginTop: 1 },

    modalClose: {
        marginTop: 14,
        backgroundColor: INK,
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
    },
    modalCloseText: { fontSize: 14, fontWeight: '700', color: CARD },
});