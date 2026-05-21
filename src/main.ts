import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene }    from './scenes/MenuScene';
import { GameScene }    from './scenes/GameScene';
import { C }           from './constants';

new Phaser.Game({
  type:   Phaser.AUTO,
  width:  C.ScreenWidth,
  height: C.ScreenHeight,
  backgroundColor: '#000000',
  scale: {
    mode:            Phaser.Scale.FIT,
    autoCenter:      Phaser.Scale.CENTER_BOTH,
    width:           C.ScreenWidth,
    height:          C.ScreenHeight,
  },
  scene: [PreloadScene, MenuScene, GameScene],
  audio: { disableWebAudio: false },
});
