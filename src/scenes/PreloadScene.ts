import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() { super('PreloadScene'); }

  preload() {
    // Progress bar
    const bar = this.add.graphics();
    this.load.on('progress', (v: number) => {
      bar.clear();
      bar.fillStyle(0x0090ff, 1);
      bar.fillRect(200, 430, 800 * v, 20);
    });
    this.add.rectangle(600, 440, 804, 24).setStrokeStyle(2, 0x334466);
    this.add.text(600, 400, 'Loading…', {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: '28px', color: '#ffffff',
    }).setOrigin(0.5);

    // Player sprites (4 directions × 2 characters)
    for (const dir of ['up', 'down', 'left', 'right']) {
      this.load.image(`workspace_${dir}`, `assets/workspace_${dir}.png`);
      this.load.image(`otherguy_${dir}`,  `assets/other_p_${dir}.png`);
    }

    // Shared sprites
    this.load.image('threat_sprite', 'assets/monster_sprite.png');
    this.load.image('base_sprite',   'assets/base_sprite.png');

    // Sounds
    this.load.audio('shoot',    'assets/shoot.wav');
    this.load.audio('hit',      'assets/monster_hit.wav');
  }

  create() {
    this.scene.start('MenuScene');
  }
}
