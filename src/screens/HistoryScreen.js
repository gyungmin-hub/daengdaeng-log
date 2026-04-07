import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Pressable, StyleSheet,
  SafeAreaView, FlatList, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWalkRecords, formatDuration, formatDate } from '../utils/storage';

function formatTotalTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  if (m > 0) return `${m}분`;
  return `${seconds}초`;
}

export default function HistoryScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [totalSeconds, setTotal] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => { loadRecords(); }, []);

  async function loadRecords() {
    const data = await getWalkRecords();
    setRecords(data);
    setTotal(data.reduce((sum, r) => sum + r.duration, 0));
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmDeleteSelected() {
    if (selected.size === 0) {
      Alert.alert('알림', '삭제할 기록을 선택해주세요.');
      return;
    }
    Alert.alert(
      '기록 삭제',
      `선택한 ${selected.size}개의 기록을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제', style: 'destructive',
          onPress: async () => {
            const remaining = records.filter(r => !selected.has(r.id));
            await AsyncStorage.setItem('dogwalk_records', JSON.stringify(remaining));
            setRecords(remaining);
            setTotal(remaining.reduce((sum, r) => sum + r.duration, 0));
            setSelected(new Set());
            setEditMode(false);
          },
        },
      ]
    );
  }

  function cancelEdit() {
    setEditMode(false);
    setSelected(new Set());
  }

  const uniqueDays = records.length > 0
    ? new Set(records.map(r => r.date.slice(0, 10))).size
    : 1;
  const avg = records.length > 0 ? Math.floor(totalSeconds / uniqueDays) : 0;

  return (
    <SafeAreaView style={s.safe}>

      {/* 헤더 */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => {
          cancelEdit();
          if (navigation.canGoBack()) navigation.goBack();
          else navigation.navigate('Home');
        }}>
          <Text style={s.backBtnText}>← 돌아가기</Text>
        </Pressable>
        <Text style={s.title} pointerEvents="none">전체 기록</Text>
        {records.length > 0 ? (
          editMode ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={confirmDeleteSelected}>
                <Text style={s.delText}>삭제{selected.size > 0 ? `(${selected.size})` : ''}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelEdit}>
                <Text style={s.cancelText}>취소</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditMode(true)}>
              <Text style={s.editText}>편집</Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>

      {/* 통계 */}
      {records.length > 0 && (
        <View style={s.statBar}>
          <View style={s.statItem}>
            <Text style={s.statVal}>{records.length}회</Text>
            <Text style={s.statLbl}>총 횟수</Text>
          </View>
          <View style={s.statDiv} />
          <View style={s.statItem}>
            <Text style={s.statVal}>{formatTotalTime(totalSeconds)}</Text>
            <Text style={s.statLbl}>총 시간</Text>
          </View>
          <View style={s.statDiv} />
          <View style={s.statItem}>
            <Text style={s.statVal}>{formatDuration(avg)}</Text>
            <Text style={s.statLbl}>하루 평균</Text>
          </View>
        </View>
      )}

      {/* 목록 */}
      {records.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🐕</Text>
          <Text style={s.emptyText}>아직 산책 기록이 없어요</Text>
          <TouchableOpacity style={s.goBtn} onPress={() => navigation.goBack()}>
            <Text style={s.goBtnText}>산책 시작하기 →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={r => r.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const isSelected = selected.has(item.id);
            return (
              <TouchableOpacity
                onPress={() => editMode && toggleSelect(item.id)}
                activeOpacity={editMode ? 0.7 : 1}
              >
                <View style={[
                  s.rec,
                  index === 0 && s.recTop,
                  isSelected && s.recSelected,
                ]}>
                  {editMode && (
                    <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
                      {isSelected && <Text style={s.checkmark}>✓</Text>}
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.recIdx}>#{records.length - index}</Text>
                    <Text style={s.recDate}>{formatDate(item.date)}</Text>
                  </View>
                  <Text style={s.recDur}>{formatDuration(item.duration)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 12 },
  backBtn: { backgroundColor: BTN, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  backBtnText: { fontSize: 12, fontWeight: '700', color: CARD },
  title: { fontSize: 17, fontWeight: '800', color: INK, position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  delText: { fontSize: 13, color: '#E05C5C', fontWeight: '700' },
  cancelText: { fontSize: 13, color: MUTED, fontWeight: '600' },
  editText: { fontSize: 13, color: INK, fontWeight: '700' },

  statBar: { backgroundColor: CARD, borderWidth: 2, borderColor: BORDER, borderRadius: 18, margin: 16, marginTop: 4, padding: 16, flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: { fontSize: 17, fontWeight: '800', color: INK },
  statLbl: { fontSize: 11, color: MUTED, textAlign: 'center' },
  statDiv: { width: 1.5, backgroundColor: BORDER },

  list: { paddingHorizontal: 16, paddingBottom: 40 },
  rec: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  recTop: { borderWidth: 2, borderColor: BORDER },
  recSelected: { borderColor: '#E05C5C', backgroundColor: '#FFF0F0' },
  recIdx: { fontSize: 10, color: INK, fontWeight: '700', marginBottom: 2 },
  recDate: { fontSize: 13, fontWeight: '700', color: INK },
  recDur: { fontSize: 16, fontWeight: '800', color: INK },

  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#E05C5C', borderColor: '#E05C5C' },
  checkmark: { fontSize: 13, color: CARD, fontWeight: '700' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 52 },
  emptyText: { fontSize: 15, color: MUTED, fontWeight: '500' },
  goBtn: { backgroundColor: BTN, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  goBtnText: { fontSize: 14, fontWeight: '700', color: CARD },
});