import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet,
    SafeAreaView, ScrollView, Alert, Platform, Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { saveProfile, getProfile, clearProfile } from '../utils/storage';

const DEFAULT_PROFILE = require('../../assets/default_profile.png');

function calcAge(birthday) {
    if (!birthday) return null;
    const today = new Date();
    const birth = new Date(birthday);
    const totalMonths =
        (today.getFullYear() - birth.getFullYear()) * 12 +
        (today.getMonth() - birth.getMonth());
    if (totalMonths < 1) return '1개월 미만';
    if (totalMonths < 12) return `${totalMonths}개월`;
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    return months > 0 ? `만 ${years}세 ${months}개월` : `만 ${years}세`;
}

const BREED_LIST = [
    '믹스견', '말티즈', '포메라니안', '치와와', '꼬통 드 툴레아',
    '말티푸', '푸들', '비숑 프리제', '시츄', '요크셔 테리어',
    '닥스훈트', '웰시 코기', '골든 리트리버', '래브라도 리트리버',
    '보더 콜리', '시베리안 허스키', '진돗개', '삽살개', '풍산개',
    '리트리버', '불독', '프렌치 불독', '퍼그', '비글',
    '슈나우저', '스피츠', '사모예드', '알래스칸 말라뮤트',
    '셰틀랜드 쉽독', '아키타', '샤페이', '달마시안', '그레이하운드',
    '시바견', '파피용', '페키니즈', '미니어처 핀셔', '코커 스패니얼',
    '잭 러셀 테리어', '아메리칸 불리', '도베르만', '로트와일러', '그레이트 데인',
];

const PERSONALITY_OPTIONS = [
    '활발함', '느긋함', '낯가림', '사람 좋아함',
    '먹는거 좋아함', '장난꾸러기', '애교쟁이',
    '독립적임', '호기심많음', '고집쟁이', '겁쟁이',
];

export default function ProfileScreen({ navigation }) {
    const [profile, setProfile] = useState({
        name: '',
        gender: null,
        breed: '',
        birthday: null,
        neutered: null,
        weight: '',
        personality: [],
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);
    const [breedSearch, setBreedSearch] = useState('');
    const [showBreedList, setShowBreedList] = useState(false);

    useEffect(() => { loadProfile(); }, []);

    async function loadProfile() {
        const saved = await getProfile();
        if (saved) {
            setProfile(saved);
            setHasSaved(true);
        }
    }

    function set(key, value) {
        setProfile(prev => ({ ...prev, [key]: value }));
    }

    function togglePersonality(item) {
        setProfile(prev => {
            const list = prev.personality.includes(item)
                ? prev.personality.filter(p => p !== item)
                : [...prev.personality, item];
            return { ...prev, personality: list };
        });
    }

    async function handleSave() {
        if (!profile.name.trim()) {
            Alert.alert('이름을 입력해주세요 🐾');
            return;
        }
        await saveProfile(profile);
        setHasSaved(true);
        Alert.alert(
            '저장 완료!',
            `${profile.name}의 프로필이 저장됐어요 🐶`,
            [{
                text: '확인', onPress: () => {
                    if (navigation.canGoBack()) navigation.goBack();
                    else navigation.navigate('Home');
                }
            }]
        );
    }

    async function handleReset() {
        Alert.alert('프로필 초기화', '정말 삭제할까요?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제', style: 'destructive',
                onPress: async () => {
                    await clearProfile();
                    setProfile({
                        name: '', gender: null, breed: '',
                        birthday: null, neutered: null, weight: '', personality: [],
                    });
                    setHasSaved(false);
                },
            },
        ]);
    }

    const age = calcAge(profile.birthday);

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* 헤더 */}
                <View style={s.header}>
                    <Pressable style={s.backBtn} onPress={() => {
                        if (navigation.canGoBack()) navigation.goBack();
                        else navigation.navigate('Home');
                    }}>
                        <Text style={s.backBtnText}>← 돌아가기</Text>
                    </Pressable>
                    <Text style={s.headerTitle} pointerEvents="none">강아지 프로필</Text>
                    <View style={{ width: 80 }} />
                </View>

                {/* 아바타 */}
                <View style={s.avatarWrap}>
                    <View style={s.avatar}>
                        <Image source={DEFAULT_PROFILE} style={s.avatarImg} />
                    </View>
                    {profile.name
                        ? <Text style={s.avatarName}>{profile.name}</Text>
                        : <Text style={s.avatarNameEmpty}>이름을 입력해주세요</Text>
                    }
                    {age && <Text style={s.avatarAge}>{age}</Text>}
                </View>

                {/* 입력 폼 */}
                <View style={s.form}>

                    {/* 이름 */}
                    <View style={s.fieldBlock}>
                        <Text style={s.label}>이름 <Text style={s.required}>*</Text></Text>
                        <TextInput
                            style={s.input}
                            placeholder="예) 초코, 뭉치"
                            placeholderTextColor={MUTED}
                            value={profile.name}
                            onChangeText={v => set('name', v)}
                            maxLength={10}
                        />
                    </View>

                    {/* 성별 */}
                    <View style={s.fieldBlock}>
                        <Text style={s.label}>성별</Text>
                        <View style={s.toggleRow}>
                            {['남아', '여아'].map(g => (
                                <TouchableOpacity
                                    key={g}
                                    style={[s.toggleBtn, profile.gender === g && s.toggleSelected]}
                                    onPress={() => set('gender', profile.gender === g ? null : g)}
                                >
                                    <Text style={[s.toggleText, profile.gender === g && s.toggleTextSelected]}>
                                        {g === '남아' ? '♂ 남아' : '♀ 여아'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* 견종 */}
                    <View style={s.fieldBlock}>
                        <Text style={s.label}>견종</Text>
                        <TextInput
                            style={s.input}
                            placeholder="견종을 선택하세요"
                            placeholderTextColor={MUTED}
                            value={breedSearch || profile.breed}
                            onChangeText={v => {
                                setBreedSearch(v);
                                set('breed', v);
                                setShowBreedList(v.length > 0);
                            }}
                            onFocus={() => setShowBreedList((breedSearch || profile.breed).length > 0)}
                            onBlur={() => setTimeout(() => setShowBreedList(false), 150)}
                        />
                        {showBreedList && (
                            <View style={s.breedDropdown}>
                                {BREED_LIST
                                    .filter(b => b.includes(breedSearch || profile.breed))
                                    .slice(0, 5)
                                    .map(b => (
                                        <TouchableOpacity
                                            key={b}
                                            style={s.breedItem}
                                            onPress={() => {
                                                set('breed', b);
                                                setBreedSearch(b);
                                                setShowBreedList(false);
                                            }}
                                        >
                                            <Text style={s.breedItemText}>{b}</Text>
                                        </TouchableOpacity>
                                    ))
                                }
                            </View>
                        )}
                    </View>

                    {/* 생일 */}
                    <View style={s.fieldBlock}>
                        <Text style={s.label}>생일</Text>
                        <TouchableOpacity
                            style={s.dateBtn}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={profile.birthday ? s.dateText : s.datePlaceholder}>
                                {profile.birthday
                                    ? `🎂 ${profile.birthday}${age ? `  (${age})` : ''}`
                                    : '날짜를 선택해주세요'}
                            </Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={profile.birthday ? new Date(profile.birthday) : new Date()}
                                mode="date"
                                display="spinner"
                                locale="ko-KR"
                                maximumDate={new Date()}
                                onChange={(e, date) => {
                                    if (Platform.OS !== 'ios') setShowDatePicker(false);
                                    if (date) {
                                        const yyyy = date.getFullYear();
                                        const mm = String(date.getMonth() + 1).padStart(2, '0');
                                        const dd = String(date.getDate()).padStart(2, '0');
                                        set('birthday', `${yyyy}-${mm}-${dd}`);
                                    }
                                }}
                            />
                        )}
                        {showDatePicker && Platform.OS === 'ios' && (
                            <TouchableOpacity
                                style={s.dateConfirmBtn}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Text style={s.dateConfirmText}>선택 완료</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* 중성화 여부 */}
                    <View style={s.fieldBlock}>
                        <Text style={s.label}>중성화 여부</Text>
                        <View style={s.toggleRow}>
                            {[{ label: '했어요', value: true }, { label: '안했어요', value: false }].map(opt => (
                                <TouchableOpacity
                                    key={String(opt.value)}
                                    style={[s.toggleBtn, profile.neutered === opt.value && s.toggleSelected]}
                                    onPress={() => set('neutered', profile.neutered === opt.value ? null : opt.value)}
                                >
                                    <Text style={[s.toggleText, profile.neutered === opt.value && s.toggleTextSelected]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* 몸무게 */}
                    <View style={s.fieldBlock}>
                        <Text style={s.label}>몸무게</Text>
                        <View style={s.weightRow}>
                            <TextInput
                                style={[s.input, { flex: 1 }]}
                                placeholder="예) 5.2"
                                placeholderTextColor={MUTED}
                                value={profile.weight}
                                onChangeText={v => set('weight', v.replace(/[^0-9.]/g, ''))}
                                keyboardType="decimal-pad"
                                maxLength={5}
                            />
                            <Text style={s.weightUnit}>kg</Text>
                        </View>
                    </View>

                    {/* 성격 */}
                    <View style={s.fieldBlock}>
                        <Text style={s.label}>성격 <Text style={s.labelHint}>(복수 선택 가능)</Text></Text>
                        <View style={s.chipWrap}>
                            {PERSONALITY_OPTIONS.map(item => {
                                const selected = profile.personality.includes(item);
                                return (
                                    <TouchableOpacity
                                        key={item}
                                        style={[s.chip, selected && s.chipSelected]}
                                        onPress={() => togglePersonality(item)}
                                    >
                                        <Text style={[s.chipText, selected && s.chipTextSelected]}>
                                            {item}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                </View>

                {/* 저장 버튼 */}
                <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                    <Text style={s.saveBtnText}>저장하기</Text>
                </TouchableOpacity>

                {/* 초기화 버튼 */}
                {hasSaved && (
                    <TouchableOpacity style={s.resetBtn} onPress={handleReset}>
                        <Text style={s.resetBtnText}>프로필 초기화</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const BG = '#FAF9F6';
const CARD = '#FFFFFF';
const INK = '#1F1A24';
const MUTED = '#9B8E80';
const BORDER = '#1F1A24';
const BTN = '#1F1A24';
const GREEN = '#1F1A24';

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    scroll: { padding: 16, paddingBottom: 24 },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    backBtn: { backgroundColor: BTN, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
    backBtnText: { fontSize: 12, fontWeight: '700', color: CARD },
    headerTitle: { fontSize: 17, fontWeight: '800', color: INK, position: 'absolute', left: 0, right: 0, textAlign: 'center' },

    avatarWrap: { alignItems: 'center', marginBottom: 14 },
    avatar: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', marginBottom: 6, borderWidth: 1.5, borderColor: '#D0CDD4' },
    avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    avatarName: { fontSize: 16, fontWeight: '800', color: INK },
    avatarNameEmpty: { fontSize: 13, color: MUTED },
    avatarAge: { fontSize: 12, color: MUTED, marginTop: 2 },

    form: { gap: 12 },
    fieldBlock: { gap: 6 },
    label: { fontSize: 12, fontWeight: '700', color: INK },
    required: { color: BTN },
    labelHint: { fontSize: 11, fontWeight: '400', color: MUTED },

    input: {
        backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER,
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
        fontSize: 14, color: INK,
    },

    toggleRow: { flexDirection: 'row', gap: 8 },
    toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD, alignItems: 'center' },
    toggleSelected: { backgroundColor: BTN, borderColor: BTN },
    toggleText: { fontSize: 13, fontWeight: '600', color: MUTED },
    toggleTextSelected: { color: CARD },

    breedDropdown: {
        backgroundColor: CARD,
        borderWidth: 1.5,
        borderColor: BORDER,
        borderRadius: 10,
        marginTop: 4,
        overflow: 'hidden',
    },
    breedItem: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0EEF8',
    },
    breedItemText: { fontSize: 14, color: INK },

    dateBtn: { backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    dateText: { fontSize: 14, color: INK },
    datePlaceholder: { fontSize: 14, color: MUTED },
    dateConfirmBtn: { backgroundColor: BTN, borderRadius: 10, paddingVertical: 8, alignItems: 'center', marginTop: 6 },
    dateConfirmText: { fontSize: 13, fontWeight: '700', color: CARD },

    weightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    weightUnit: { fontSize: 14, fontWeight: '700', color: MUTED },

    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD },
    chipSelected: { backgroundColor: BTN, borderColor: BTN },
    chipText: { fontSize: 12, fontWeight: '600', color: MUTED },
    chipTextSelected: { color: CARD },

    saveBtn: { backgroundColor: BTN, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
    saveBtnText: { fontSize: 15, fontWeight: '700', color: CARD },

    resetBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 2 },
    resetBtnText: { fontSize: 12, color: MUTED },
});