import Phaser from 'phaser';
import { CharacterType } from '../types';
import { C } from '../constants';

const FONT   = '"Arial Black", "Arial Bold", Arial, sans-serif';
const SHADOW = { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true };

const WORKSPACE_TIPS = [
  { text: 'Workspace ONE',                            color: '#ffff00' },
  { text: '--------------------------------------',   color: '#8888aa' },
  { text: '[+] Full device visibility built-in',      color: '#00ff00' },
  { text: '[+] Automated policies out-of-box',        color: '#00ff00' },
  { text: '[+] Comprehensive tooling from day one',   color: '#00ff00' },
  { text: '',                                         color: '#ffffff' },
  { text: '    Subscription based service',           color: '#aaaaaa' },
  { text: '',                                         color: '#ffffff' },
  { text: 'No hidden surprises.',                     color: '#ffffff' },
  { text: "You pay for what you get.",                color: '#ffffff' },
];

const OTHERGUY_TIPS = [
  { text: 'The Other Guy',                            color: '#ffff00' },
  { text: '--------------------------------------',   color: '#8888aa' },
  { text: "[+] 'Free'",                              color: '#00ff00' },
  { text: '',                                         color: '#ffffff' },
  { text: '[-] Limited visibility (add-ons needed)', color: '#ff4444' },
  { text: '[-] Policies run every 8 hours (slow!)',  color: '#ff4444' },
  { text: '[-] True automation needs add-ons',       color: '#ff4444' },
  { text: '',                                         color: '#ffffff' },
  { text: "The hidden costs of 'free'",               color: '#ffffff' },
  { text: "add up faster than you think.",            color: '#ffffff' },
];

export class MenuScene extends Phaser.Scene {
  private activeTooltip   = -1;
  private showInstructions = false;
  private instrOverlay!: Phaser.GameObjects.Container;
  private wsTooltip!:    Phaser.GameObjects.Container;
  private ogTooltip!:    Phaser.GameObjects.Container;

  constructor() { super('MenuScene'); }

  create() {
    this.activeTooltip    = -1;
    this.showInstructions = false;

    this.add.text(600, 105, 'Platform Wars: Other Guy vs Workspace ONE', {
      fontFamily: FONT, fontSize: '36px', color: '#ffffff', shadow: SHADOW,
    }).setOrigin(0.5, 0);
    this.add.text(600, 152, 'Click a character to begin', {
      fontFamily: FONT, fontSize: '22px', color: '#888888', shadow: SHADOW,
    }).setOrigin(0.5, 0);

    this.buildCard(
      210, 200, 340, 185,
      'WORKSPACE ONE',
      'Full visibility · Fast movement\nBalanced starting gun',
      0x1e50c8, 0x0078ff,
      0, 520, 202,
      CharacterType.Workspace,
    );

    this.buildCard(
      650, 200, 340, 185,
      'OTHER GUY',
      'More starting cash · Limited sight\nSlow movement',
      0x14823c, 0x00d250,
      1, 960, 202,
      CharacterType.OtherGuy,
    );

    this.add.text(600, 428, 'WASD to move  ·  Mouse to aim  ·  Left-click to shoot', {
      fontFamily: FONT, fontSize: '20px', color: '#b4b4b4', shadow: SHADOW,
    }).setOrigin(0.5, 0);
    this.add.text(600, 458, 'Buy upgrades between waves to improve your character', {
      fontFamily: FONT, fontSize: '18px', color: '#8c8c8c', shadow: SHADOW,
    }).setOrigin(0.5, 0);

    // Instructions button
    const instrBtnBg = this.add.rectangle(600, 512, 200, 40, 0x1e1e50, 200).setInteractive();
    this.add.text(600, 512, 'HOW TO PLAY', {
      fontFamily: FONT, fontSize: '18px', color: '#a0b4ff', shadow: SHADOW,
    }).setOrigin(0.5);
    instrBtnBg.on('pointerover',  () => { instrBtnBg.setFillStyle(0x3c3c8c, 240); });
    instrBtnBg.on('pointerout',   () => { instrBtnBg.setFillStyle(0x1e1e50, 200); });
    instrBtnBg.on('pointerdown',  (_p: unknown, _x: unknown, _y: unknown, evt: Phaser.Types.Input.EventData) => {
      evt.stopPropagation(); // prevent the scene-level handler from closing it in the same tick
      this.showInstructions = true;
      this.instrOverlay.setVisible(true);
    });

    this.wsTooltip = this.buildTooltip(WORKSPACE_TIPS, 80,  390);
    this.ogTooltip = this.buildTooltip(OTHERGUY_TIPS,  450, 390);
    this.wsTooltip.setVisible(false);
    this.ogTooltip.setVisible(false);

    this.instrOverlay = this.buildInstructionsOverlay();
    this.instrOverlay.setVisible(false);

    // Close instructions on click anywhere
    this.input.on('pointerdown', () => {
      if (this.showInstructions) {
        this.showInstructions = false;
        this.instrOverlay.setVisible(false);
      }
    });
  }

  private buildCard(
    x: number, y: number, w: number, h: number,
    title: string, subtitle: string,
    bgColor: number, borderColor: number,
    tooltipIndex: number, qx: number, qy: number,
    charType: CharacterType,
  ) {
    const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, bgColor, 220).setInteractive();
    const border = this.add.rectangle(x + w / 2, y + h / 2, w, h).setStrokeStyle(1.5, borderColor);

    bg.on('pointerover',  () => { bg.setFillStyle(bgColor, 255); border.setStrokeStyle(3, borderColor); });
    bg.on('pointerout',   () => { bg.setFillStyle(bgColor, 220); border.setStrokeStyle(1.5, borderColor); });
    bg.on('pointerdown',  () => {
      if (this.showInstructions) return;
      this.activeTooltip = -1;
      this.wsTooltip.setVisible(false);
      this.ogTooltip.setVisible(false);
      this.scene.start('GameScene', { character: charType });
    });

    const cx = x + w / 2;
    this.add.text(cx, y + 28, title, {
      fontFamily: FONT, fontSize: '22px', color: '#ffffff', shadow: SHADOW,
    }).setOrigin(0.5, 0);

    const lines = subtitle.split('\n');
    lines.forEach((line, i) => {
      this.add.text(cx, y + 60 + i * 20, line, {
        fontFamily: FONT, fontSize: '14px', color: '#c8c8c8', shadow: SHADOW,
      }).setOrigin(0.5, 0);
    });

    this.add.text(cx, y + 125, 'Click to select', {
      fontFamily: FONT, fontSize: '15px', color: '#888888', shadow: SHADOW,
    }).setOrigin(0.5, 0);

    // "?" button
    const qBg = this.add.rectangle(qx + 13, qy + 13, 26, 26, 0x3c3c3c, 200).setInteractive();
    this.add.text(qx + 13, qy + 13, '?', {
      fontFamily: FONT, fontSize: '18px', color: '#ffffff', shadow: SHADOW,
    }).setOrigin(0.5);

    qBg.on('pointerdown', (ptr: Phaser.Input.Pointer, lx: number, ly: number, evt: Phaser.Types.Input.EventData) => {
      evt.stopPropagation();
      if (this.activeTooltip === tooltipIndex) {
        this.activeTooltip = -1;
        this.wsTooltip.setVisible(false);
        this.ogTooltip.setVisible(false);
      } else {
        this.activeTooltip = tooltipIndex;
        this.wsTooltip.setVisible(tooltipIndex === 0);
        this.ogTooltip.setVisible(tooltipIndex === 1);
      }
    });
  }

  private buildTooltip(lines: { text: string; color: string }[], x: number, y: number) {
    const lineH   = 24;
    const padding = 14;
    const boxW    = 420;
    const boxH    = lines.length * lineH + padding * 2;

    // Clamp so the box never runs off-screen
    const cx = Math.min(x, C.ScreenWidth  - boxW);
    const cy = Math.min(y, C.ScreenHeight - boxH);

    const c = this.add.container(cx, cy).setDepth(18);

    // Alpha must be 0–1 (not 0–255)
    c.add(this.add.rectangle(boxW / 2, boxH / 2, boxW, boxH, 0x0a0a28, 1));
    c.add(this.add.rectangle(boxW / 2, boxH / 2, boxW, boxH).setStrokeStyle(1, 0x87ceeb));

    lines.forEach((l, i) => {
      c.add(this.add.text(padding, padding + i * lineH, l.text, {
        fontFamily: FONT, fontSize: '16px', color: l.color, shadow: SHADOW,
      }));
    });
    return c;
  }

  private buildInstructionsOverlay() {
    // Container at (0,0) so the fullscreen dim covers the entire canvas
    const px = 100, py = 50, pw = 1000, ph = 800;
    const c = this.add.container(0, 0).setDepth(20);

    // Fullscreen dark backdrop
    c.add(this.add.rectangle(C.ScreenWidth / 2, C.ScreenHeight / 2,
      C.ScreenWidth, C.ScreenHeight, 0x000000, 0.82));

    // Panel — alpha must be 0–1 (not 0–255)
    c.add(this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph, 0x08081e, 1));
    c.add(this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph).setStrokeStyle(2, 0x87ceeb));

    // Absolute coordinates (container is at 0,0 now)
    let y = py + 28;
    const cx = px + pw / 2; // 600

    const line = (txt: string, fontSize: number, color: string, dy: number) => {
      c.add(this.add.text(cx, y, txt, {
        fontFamily: FONT, fontSize: `${fontSize}px`, color, shadow: SHADOW,
        align: 'center', wordWrap: { width: pw - 60 },
      }).setOrigin(0.5, 0));
      y += dy;
    };
    const divider = () => {
      c.add(this.add.rectangle(cx, y, pw - 60, 1, 0x505078));
      y += 18;
    };

    line('PLATFORM WARS: OTHER GUY VS WORKSPACE ONE', 24, '#ffff00', 36);
    divider();
    line('THE PREMISE', 18, '#87ceeb', 28);
    line('Waves of cyber threats are attacking your company\'s IT infrastructure.', 15, '#ffffff', 21);
    line('Defend your management bases and keep subscription costs under control — or the company goes bankrupt.', 15, '#ffffff', 32);

    line('CONTROLS', 18, '#87ceeb', 28);
    line('WASD — Move     |     Mouse — Aim     |     Left Click — Shoot', 15, '#ffffff', 32);

    line('YOUR BASES', 18, '#87ceeb', 28);
    line('Three management bases must be defended. Each absorbs 10 hits before going OFFLINE.', 15, '#ffffff', 21);
    line('If all three are destroyed, the network is compromised and the game ends.', 15, '#ffffff', 21);
    line('Destroyed bases can be rebuilt between waves using the REBUILD BASE upgrade ($300).', 15, '#ffa03c', 32);

    line('THE ECONOMY', 18, '#87ceeb', 28);
    line('Neutralise threats to earn $50 each — but each destroyed base cuts rewards by 33% (minimum $10).', 15, '#ffffff', 21);
    line('At the end of every wave your annual subscription bill is charged.', 15, '#ffffff', 21);
    line('Each surviving base adds devices over time — more devices means a bigger bill next year.', 15, '#ffffff', 21);
    line('Cannot pay your subscription? The game ends.', 15, '#ff8800', 32);

    line('UPGRADES  (between waves)', 18, '#87ceeb', 28);
    line('WIDER VIEW  •  BETTER GUN  •  FASTER LEGS', 15, '#ffffff', 21);
    line('REPAIR BASE ($50, one-time)  •  REBUILD BASE ($300, one-time)', 15, '#ffa03c', 21);
    line('WIDER VIEW / BETTER GUN / FASTER LEGS also raise your annual subscription bill.', 15, '#ffffff', 21);
    line('You can stack multiple upgrades — as long as you can afford the bill when you proceed.', 15, '#ffffff', 32);

    line('CHARACTERS', 18, '#87ceeb', 28);
    line('WORKSPACE ONE — Wide visibility, fast movement. You see threats early. Higher starting cost.', 15, '#64a0ff', 21);

    line("OTHER GUY — Extra starting cash, limited sight, slow movement. The true cost of 'free'.", 15, '#50d278', 21);

    c.add(this.add.text(cx, py + ph - 22, 'Click anywhere to close', {
      fontFamily: FONT, fontSize: '16px', color: '#828282', shadow: SHADOW,
    }).setOrigin(0.5, 1));

    return c;
  }
}
