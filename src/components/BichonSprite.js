import React from 'react';
import { View, Image } from 'react-native';

const SPRITE_W = 531;
const SPRITE_H = 1107;
const SECTION_H = 369;
const DISPLAY_W = 220;
const SCALE = DISPLAY_W / SPRITE_W;
const SCALED_TOTAL_H = Math.round(SPRITE_H * SCALE);
const SCALED_SEC_H = Math.round(SECTION_H * SCALE);

const OFFSETS = {
  walking: 0,
  idle: -SCALED_SEC_H,
  finished: -SCALED_SEC_H * 2,
};

export default function BichonSprite({ status = 'idle' }) {
  const offsetY = OFFSETS[status] ?? OFFSETS.idle;
  return (
    <View style={{ width: DISPLAY_W, height: SCALED_SEC_H, overflow: 'hidden', backgroundColor: 'transparent' }}>
      <Image
        source={require('../../assets/bichon_sprite.png')}
        style={{ width: DISPLAY_W, height: SCALED_TOTAL_H, position: 'absolute', top: offsetY, left: 0 }}
        resizeMode="contain"
      />
    </View>
  );
}