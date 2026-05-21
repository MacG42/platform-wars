import Phaser from 'phaser';
import { C } from '../constants';
import { CharacterType, GameState, UpgradeType, UpgradeDef } from '../types';
import { MusicPlayer } from '../audio/MusicPlayer';

const FONT   = '"Arial Black", "Arial Bold", Arial, sans-serif';
const SHADOW = { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true };

// ─────────────────────────────────────────────────────────────────────────────
// Upgrade definitions
// ─────────────────────────────────────────────────────────────────────────────
const UPGRADES: UpgradeDef[] = [
  { type: UpgradeType.Visibility, title: 'WIDER VIEW',
    desc:   `+${C.VisibilityUpgradeAmount} visibility radius`,
    flavor: 'Deploy Cloud Monitoring Agent',
    costAdd: C.UpgradeVisibilityCostAdd, buyCost: C.UpgradeVisibilityBuyCost },
  { type: UpgradeType.Weapon, title: 'BETTER GUN',
    desc:   `+${C.WeaponUpgradeAmount} weapon power (bigger bullets)`,
    flavor: 'Enable AI Threat Detection',
    costAdd: C.UpgradeWeaponCostAdd, buyCost: C.UpgradeWeaponBuyCost },
  { type: UpgradeType.Speed, title: 'FASTER LEGS',
    desc:   `+${(C.SpeedUpgradeAmount / 60).toFixed(1)} move speed`,
    flavor: 'Streamline Compliance Policies',
    costAdd: C.UpgradeSpeedCostAdd, buyCost: C.UpgradeSpeedBuyCost },
  { type: UpgradeType.RepairBase, title: 'REPAIR BASE',
    desc:   '+1 HP to most damaged base',
    flavor: 'Emergency Patch Deployment',
    costAdd: 0, buyCost: C.UpgradeRepairBuyCost },
  { type: UpgradeType.RebuildBase, title: 'REBUILD BASE',
    desc:   `Restore destroyed base (${C.RebuildBaseHp} HP)`,
    flavor: 'Emergency Infrastructure Recovery',
    costAdd: 0, buyCost: C.UpgradeRebuildBuyCost },
];

// ─────────────────────────────────────────────────────────────────────────────
// Small data classes
// ─────────────────────────────────────────────────────────────────────────────
class Bullet {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  alive = true;
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, sx: number, sy: number, tx: number, ty: number, power: number) {
    const angle = Math.atan2(ty - sy, tx - sx);
    this.x  = sx; this.y = sy;
    this.vx = Math.cos(angle) * C.BulletSpeed;
    this.vy = Math.sin(angle) * C.BulletSpeed;
    this.radius = Math.min(C.BulletMaxRadius, C.BulletBaseRadius + (power - 1) * C.BulletRadiusPerPower);
    this.gfx = scene.add.graphics().setDepth(8);
    this.draw();
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < 0 || this.x > C.ScreenWidth || this.y < 0 || this.y > C.ScreenHeight)
      this.alive = false;
    this.draw();
  }

  private draw() {
    this.gfx.clear();
    if (!this.alive) return;
    this.gfx.fillStyle(0xffff44, 1);
    this.gfx.fillCircle(this.x, this.y, this.radius);
  }

  setVisible(v: boolean) { this.gfx.setVisible(v); }
  destroy() { this.gfx.destroy(); }

  get bounds() {
    return new Phaser.Geom.Rectangle(
      this.x - this.radius, this.y - this.radius,
      this.radius * 2, this.radius * 2);
  }
}

class Threat {
  x: number; y: number;
  health: number;
  speed: number;
  private sprite: Phaser.GameObjects.Image;
  private bar:    Phaser.GameObjects.Graphics;
  private hs: number;

  constructor(scene: Phaser.Scene, speed: number) {
    this.health = C.ThreatStartHealth;
    this.speed  = speed;
    this.hs     = C.ThreatSize / 2;

    const edge = Math.floor(Math.random() * 4);
    const pad  = C.EdgeSpawnPadding;
    if (edge === 0) { this.x = Math.random() * C.ScreenWidth;  this.y = -pad; }
    else if (edge === 1) { this.x = C.ScreenWidth + pad;  this.y = Math.random() * C.ScreenHeight; }
    else if (edge === 2) { this.x = Math.random() * C.ScreenWidth;  this.y = C.ScreenHeight + pad; }
    else                 { this.x = -pad; this.y = Math.random() * C.ScreenHeight; }

    this.sprite = scene.add.image(this.x, this.y, 'threat_sprite')
      .setDisplaySize(C.ThreatSize, C.ThreatSize)
      .setDepth(1);
    this.bar = scene.add.graphics().setDepth(2);
  }

  update(dt: number, bases: GameBase[]) {
    let nearest: GameBase | null = null;
    let bestDist = Infinity;
    for (const b of bases) {
      if (b.isDestroyed) continue;
      const d = Math.hypot(b.x - this.x, b.y - this.y);
      if (d < bestDist) { bestDist = d; nearest = b; }
    }
    if (!nearest) return;
    const angle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
    this.x += Math.cos(angle) * this.speed * dt;
    this.y += Math.sin(angle) * this.speed * dt;
    this.sprite.setPosition(this.x, this.y);
    this.drawBar();
  }

  private drawBar() {
    this.bar.clear();
    const ratio  = this.health / C.ThreatStartHealth;
    const barW   = C.ThreatSize;
    const barH   = 4;
    const bx     = this.x - barW / 2;
    const by     = this.y - this.hs - 8;
    const barCol = ratio > 0.6 ? 0x00ff00 : ratio > 0.3 ? 0xffff00 : 0xff0000;
    this.bar.fillStyle(0x222222, 1);
    this.bar.fillRect(bx, by, barW, barH);
    this.bar.fillStyle(barCol, 1);
    this.bar.fillRect(bx, by, Math.round(barW * ratio), barH);
  }

  setVisible(v: boolean) { this.sprite.setVisible(v); this.bar.setVisible(v); }
  destroy()               { this.sprite.destroy(); this.bar.destroy(); }

  get bounds() {
    return new Phaser.Geom.Rectangle(
      this.x - this.hs, this.y - this.hs, C.ThreatSize, C.ThreatSize);
  }
}

class GameBase {
  x: number; y: number;
  hitPoints: number;
  isUnderThreat = false;
  private sprite: Phaser.GameObjects.Image;
  private gfx:    Phaser.GameObjects.Graphics;
  private label:  Phaser.GameObjects.Text;
  private scene:  Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene     = scene;
    this.x         = x; this.y = y;
    this.hitPoints = C.BaseStartHealth;

    this.sprite = scene.add.image(x, y, 'base_sprite')
      .setDisplaySize(C.BaseSize, C.BaseSize)
      .setDepth(6);
    this.gfx = scene.add.graphics().setDepth(6);
    this.label = scene.add.text(x, y, '', {
      fontFamily: FONT, fontSize: '14px', color: '#00ff00',
      shadow: SHADOW,
    }).setOrigin(0.5, 1).setDepth(7);
  }

  get isDestroyed() { return this.hitPoints <= 0; }

  takeDamage() { this.hitPoints = Math.max(0, this.hitPoints - 1); }

  rebuild(hp = 0) {
    this.hitPoints = hp > 0 ? hp : C.RebuildBaseHp;
  }

  draw() {
    this.gfx.clear();
    const rx = this.x - C.BaseSize / 2;
    const ry = this.y - C.BaseSize / 2;

    if (this.isDestroyed) {
      this.sprite.setVisible(false);
      this.gfx.fillStyle(0x323232, 0.78);
      this.gfx.fillRect(rx, ry, C.BaseSize, C.BaseSize);
      this.gfx.lineStyle(2, 0x787878, 1);
      this.gfx.strokeLineShape(new Phaser.Geom.Line(rx, ry, rx + C.BaseSize, ry + C.BaseSize));
      this.gfx.strokeLineShape(new Phaser.Geom.Line(rx + C.BaseSize, ry, rx, ry + C.BaseSize));
      this.label.setText('OFFLINE').setColor('#b40000').setPosition(this.x, this.y - 4);
      return;
    }

    this.sprite.setVisible(true);

    const damageRatio = 1 - this.hitPoints / C.BaseStartHealth;

    // Damage tint overlay
    if (damageRatio > 0) {
      const alpha = damageRatio * 0.63;
      this.gfx.fillStyle(0xdc0000, alpha);
      this.gfx.fillRect(rx, ry, C.BaseSize, C.BaseSize);
    }

    // Crack lines
    if (damageRatio > 0.15) {
      const ca = Math.min(1, damageRatio * 0.86);
      this.gfx.lineStyle(1, 0x3c1e0a, ca);
      this.gfx.strokeLineShape(new Phaser.Geom.Line(rx+52, ry+6,  rx+68, ry+26));
      this.gfx.strokeLineShape(new Phaser.Geom.Line(rx+68, ry+26, rx+62, ry+38));
    }
    if (damageRatio > 0.35) {
      const ca = Math.min(1, damageRatio * 0.86);
      this.gfx.lineStyle(1, 0x3c1e0a, ca);
      this.gfx.strokeLineShape(new Phaser.Geom.Line(rx+8,  ry+12, rx+22, ry+34));
      this.gfx.strokeLineShape(new Phaser.Geom.Line(rx+22, ry+34, rx+14, ry+50));
    }
    if (damageRatio > 0.55) {
      this.gfx.strokeLineShape(new Phaser.Geom.Line(rx+30, ry+30, rx+58, ry+62));
      this.gfx.strokeLineShape(new Phaser.Geom.Line(rx+10, ry+55, rx+38, ry+72));
    }
    if (damageRatio > 0.75) {
      this.gfx.strokeLineShape(new Phaser.Geom.Line(rx+18, ry+8,  rx+45, ry+52));
      this.gfx.strokeLineShape(new Phaser.Geom.Line(rx+55, ry+35, rx+72, ry+60));
      this.gfx.strokeLineShape(new Phaser.Geom.Line(rx+4,  ry+65, rx+35, ry+78));
    }

    // Threat pulse outline
    if (this.isUnderThreat) {
      const pulse = (Math.sin(Date.now() * 0.01) + 1) * 0.5;
      const alpha = 0.39 + pulse * 0.61;
      this.gfx.lineStyle(3, 0xff8c00, alpha);
      this.gfx.strokeRect(rx - 4, ry - 4, C.BaseSize + 8, C.BaseSize + 8);
    }

    // Health bar
    const barW  = C.BaseSize;
    const barH  = 8;
    const barX  = rx;
    const barY  = ry - 14;
    const ratio = this.hitPoints / C.BaseStartHealth;
    const hpCol = ratio > 0.6 ? 0x00ff00 : ratio > 0.3 ? 0xffff00 : 0xff0000;
    const hpHex = ratio > 0.6 ? '#00ff00' : ratio > 0.3 ? '#ffff00' : '#ff0000';

    this.gfx.fillStyle(0x333333, 1);
    this.gfx.fillRect(barX, barY, barW, barH);
    this.gfx.fillStyle(hpCol, 1);
    this.gfx.fillRect(barX, barY, Math.round(barW * ratio), barH);
    this.gfx.lineStyle(1, 0xffffff, 1);
    this.gfx.strokeRect(barX, barY, barW, barH);

    // HP number above bar
    this.label.setText(String(this.hitPoints)).setColor(hpHex).setPosition(this.x, barY - 2);
  }

  destroy() {
    this.sprite.destroy();
    this.gfx.destroy();
    this.label.destroy();
  }
}

class HealthPack {
  x: number; y: number;
  lifeMs: number;
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x; this.y = y;
    this.lifeMs = C.HealthPackLifetimeMs;
    this.gfx = scene.add.graphics().setDepth(6.5);
    this.draw();
  }

  update(dt: number) {
    this.lifeMs -= dt * 1000;
    this.draw();
  }

  private draw() {
    this.gfx.clear();
    if (this.lifeMs <= 0) return;
    const cx = this.x, cy = this.y, hs = 10;
    this.gfx.fillStyle(0x004600, 0.82);
    this.gfx.fillRect(cx - hs - 3, cy - hs - 3, hs * 2 + 6, hs * 2 + 6);
    this.gfx.fillStyle(0x00ff00, 1);
    this.gfx.fillRect(cx - 3, cy - hs, 6, hs * 2);
    this.gfx.fillRect(cx - hs, cy - 3, hs * 2, 6);
    this.gfx.lineStyle(1, 0xffffff, 1);
    this.gfx.strokeRect(cx - hs - 3, cy - hs - 3, hs * 2 + 6, hs * 2 + 6);

    if (this.lifeMs < 4000) {
      const fadeAlpha = (1 - this.lifeMs / 4000) * 0.82;
      this.gfx.fillStyle(0x000000, fadeAlpha);
      this.gfx.fillRect(cx - hs - 3, cy - hs - 3, hs * 2 + 6, hs * 2 + 6);
    }
  }

  get expired() { return this.lifeMs <= 0; }
  destroy()     { this.gfx.destroy(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Player
// ─────────────────────────────────────────────────────────────────────────────
class Player {
  x: number; y: number;
  visibilityRadius: number;
  weaponPower: number;
  money: number;
  speed: number;
  readonly character: CharacterType;
  private sprites: Record<string, Phaser.GameObjects.Image>;
  private currentDir = 'down';

  constructor(scene: Phaser.Scene, character: CharacterType) {
    this.character = character;
    this.x = C.ScreenWidth / 2;
    this.y = C.ScreenHeight / 2;

    if (character === CharacterType.Workspace) {
      this.money            = C.WorkspaceStartMoney;
      this.weaponPower      = C.WorkspaceWeaponPower;
      this.visibilityRadius = C.WorkspaceVisibilityRadius;
      this.speed            = C.WorkspacePlayerSpeed;
    } else {
      this.money            = C.OtherGuyStartMoney;
      this.weaponPower      = C.OtherGuyWeaponPower;
      this.visibilityRadius = C.OtherGuyVisibilityRadius;
      this.speed            = C.OtherGuyPlayerSpeed;
    }

    const prefix = character === CharacterType.Workspace ? 'workspace' : 'otherguy';
    const hs     = C.PlayerSize / 2;
    this.sprites = {};
    for (const dir of ['up', 'down', 'left', 'right']) {
      this.sprites[dir] = scene.add.image(this.x, this.y, `${prefix}_${dir}`)
        .setDisplaySize(C.PlayerSize, C.PlayerSize)
        .setDepth(7)
        .setVisible(dir === 'down');
    }
  }

  update(dt: number, keys: Record<string, Phaser.Input.Keyboard.Key>, mx: number, my: number) {
    let dx = 0, dy = 0;
    if (keys['w'].isDown) dy -= this.speed;
    if (keys['s'].isDown) dy += this.speed;
    if (keys['a'].isDown) dx -= this.speed;
    if (keys['d'].isDown) dx += this.speed;

    this.x = Phaser.Math.Clamp(this.x + dx * dt, C.PlayerSize / 2, C.ScreenWidth  - C.PlayerSize / 2);
    this.y = Phaser.Math.Clamp(this.y + dy * dt, C.PlayerSize / 2, C.ScreenHeight - C.PlayerSize / 2);

    this.updateDirection(mx, my);
    this.syncSprites();
  }

  updateDirection(mx: number, my: number) {
    const angle = Math.atan2(my - this.y, mx - this.x) * (180 / Math.PI);
    if (angle >= -45 && angle <= 45)        this.currentDir = 'right';
    else if (angle > 45 && angle <= 135)    this.currentDir = 'down';
    else if (angle > 135 || angle < -135)   this.currentDir = 'left';
    else                                    this.currentDir = 'up';
  }

  private syncSprites() {
    for (const [dir, spr] of Object.entries(this.sprites)) {
      spr.setPosition(this.x, this.y).setVisible(dir === this.currentDir);
    }
  }

  applyUpgrade(type: UpgradeType) {
    if (type === UpgradeType.Visibility) this.visibilityRadius += C.VisibilityUpgradeAmount;
    else if (type === UpgradeType.Weapon) this.weaponPower     += C.WeaponUpgradeAmount;
    else if (type === UpgradeType.Speed)  this.speed           += C.SpeedUpgradeAmount;
  }

  removeUpgrade(type: UpgradeType) {
    if (type === UpgradeType.Visibility) this.visibilityRadius = Math.max(60,   this.visibilityRadius - C.VisibilityUpgradeAmount);
    else if (type === UpgradeType.Weapon) this.weaponPower     = Math.max(1,    this.weaponPower - C.WeaponUpgradeAmount);
    else if (type === UpgradeType.Speed)  this.speed           = Math.max(30,   this.speed - C.SpeedUpgradeAmount);
  }

  setDepth(d: number) { for (const s of Object.values(this.sprites)) s.setDepth(d); }
  destroy()           { for (const s of Object.values(this.sprites)) s.destroy(); }

  get bounds() {
    const hs = C.PlayerSize / 2;
    return new Phaser.Geom.Rectangle(this.x - hs, this.y - hs, C.PlayerSize, C.PlayerSize);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GameScene
// ─────────────────────────────────────────────────────────────────────────────
export class GameScene extends Phaser.Scene {
  // State
  private state!:         GameState;
  private characterType!: CharacterType;

  // Game objects
  private player!:   Player;
  private bases:     GameBase[]   = [];
  private threats:   Threat[]     = [];
  private bullets:   Bullet[]     = [];
  private healthPacks: HealthPack[] = [];

  // Level state
  private currentLevel      = 1;
  private threatsToSpawn    = 0;
  private spawnAccumMs      = 0;
  private levelKills        = 0;
  private levelStartMs      = 0;
  private levelCompleteMs   = 0;

  // Economy
  private year             = 1;
  private workstations     = 0;
  private upgradeAddedCost = 0;
  private lastAnnualCost   = 0;

  // Upgrade screen
  private upgradesBought = new Array(5).fill(0);
  private hoveredCard    = -1;

  // Player stun
  private stunMs = 0;

  // Health pack timer
  private hpSpawnMs = C.HealthPackSpawnIntervalMs;

  // Fog of war
  private fogRT!:  Phaser.GameObjects.RenderTexture;
  private fogGfx!: Phaser.GameObjects.Graphics;

  // Vision circle overlay (for OtherGuy)
  private visionCircleGfx!: Phaser.GameObjects.Graphics;

  // Status bar
  private sbGfx!:  Phaser.GameObjects.Graphics;
  private sbTexts:    Phaser.GameObjects.Text[] = [];
  private sbTextsIdx  = 0;

  // Overlay graphics (splash screens)
  private overlayGfx!:   Phaser.GameObjects.Graphics;
  private overlayTexts:  Phaser.GameObjects.Text[] = [];

  // Upgrade screen
  private upgradeGfx!:   Phaser.GameObjects.Graphics;
  private upgradeTexts:  Phaser.GameObjects.Text[] = [];
  private upgradeLayer!: Phaser.GameObjects.Container;

  // Audio
  private shootSound?: Phaser.Sound.BaseSound;
  private hitSound?:   Phaser.Sound.BaseSound;
  private music?:      MusicPlayer;

  // Input
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // Stun ring gfx
  private stunGfx!: Phaser.GameObjects.Graphics;

  // Pause
  private prevState:    GameState = GameState.Playing;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private pauseBtn!:     Phaser.GameObjects.Text;

  // Game over snapshot
  private gameOverMsg  = '';
  private finalMoney   = 0;
  private finalYear    = 0;
  private finalLevel   = 0;

  constructor() { super('GameScene'); }

  init(data: { character: CharacterType }) {
    this.characterType = data.character;
  }

  create() {
    this.bases       = [];
    this.threats     = [];
    this.bullets     = [];
    this.healthPacks = [];
    this.upgradesBought = new Array(5).fill(0);
    this.stunMs      = 0;
    this.hpSpawnMs   = C.HealthPackSpawnIntervalMs;
    this.textPool    = [];
    this.textPoolIdx = 0;
    this.sbTexts     = [];
    this.sbTextsIdx  = 0;

    // Input
    this.keys = this.input.keyboard!.addKeys('w,a,s,d') as Record<string, Phaser.Input.Keyboard.Key>;

    // Player
    this.player = new Player(this, this.characterType);

    // Bases
    for (const pos of C.BasePositions)
      this.bases.push(new GameBase(this, pos.x, pos.y));

    // Fog
    this.fogGfx = this.make.graphics({ add: false });
    this.fogRT  = this.add.renderTexture(0, 0, C.ScreenWidth, C.ScreenHeight).setDepth(5);

    this.visionCircleGfx = this.add.graphics().setDepth(9);

    // UI layers
    this.sbGfx    = this.add.graphics().setDepth(11);
    this.overlayGfx = this.add.graphics().setDepth(10);
    this.stunGfx    = this.add.graphics().setDepth(8);
    this.upgradeGfx = this.add.graphics().setDepth(12);
    this.upgradeLayer = this.add.container(0, 0).setDepth(12);

    // Sounds
    if (this.cache.audio.exists('shoot')) this.shootSound = this.sound.add('shoot',   { volume: 0.5 });
    if (this.cache.audio.exists('hit'))   this.hitSound   = this.sound.add('hit',     { volume: 0.4 });

    // Music
    this.music = new MusicPlayer();

    // Mouse — shoot on click
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.state !== GameState.Playing) return;
      if (this.stunMs > 0) return;
      this.bullets.push(new Bullet(this, this.player.x, this.player.y, ptr.x, ptr.y, this.player.weaponPower));
      this.shootSound?.play();
    });

    // Upgrade screen clicks — left-click to buy, right-click to refund
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.state === GameState.UpgradeScreen && ptr.leftButtonDown())
        this.handleUpgradeClick(ptr, false);
    });
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.state === GameState.UpgradeScreen && ptr.rightButtonDown())
        this.handleUpgradeClick(ptr, true);
    });

    // Prevent context menu on right-click
    this.game.canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Game over — any key to return to menu
    this.input.keyboard!.on('keydown', () => {
      if (this.state === GameState.GameOver) this.returnToMenu();
    });

    // ESC toggles pause
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.state === GameState.Paused) this.resumeGame();
      else if (this.state !== GameState.GameOver) this.pauseGame();
    });

    // Pause button — top-right corner
    this.pauseBtn = this.add.text(1185, 12, 'II', {
      fontFamily: FONT, fontSize: '20px', color: '#888888',
      backgroundColor: '#111133', padding: { x: 8, y: 4 },
    }).setOrigin(1, 0).setDepth(15).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerover', () => this.pauseBtn.setColor('#ffffff'));
    this.pauseBtn.on('pointerout',  () => this.pauseBtn.setColor('#888888'));
    this.pauseBtn.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, evt: Phaser.Types.Input.EventData) => {
      evt.stopPropagation();
      if (this.state === GameState.Paused) this.resumeGame();
      else if (this.state !== GameState.GameOver) this.pauseGame();
    });

    // Pause overlay
    this.pauseOverlay = this.buildPauseOverlay();
    this.pauseOverlay.setVisible(false);

    this.startGame();
  }

  private startGame() {
    this.year             = 1;
    this.workstations     = C.WorkstationsStart;
    this.upgradeAddedCost = 0;
    this.lastAnnualCost   = 0;
    this.currentLevel     = 1;
    this.levelKills       = 0;
    this.hpSpawnMs        = C.HealthPackSpawnIntervalMs;
    this.beginLevel(1);
    this.state           = GameState.LevelStart;
    this.levelStartMs    = 2000;
  }

  private beginLevel(level: number) {
    for (const t of this.threats)     t.destroy();
    for (const b of this.bullets)     b.destroy();
    for (const h of this.healthPacks) h.destroy();
    this.threats      = [];
    this.bullets      = [];
    this.healthPacks  = [];
    this.spawnAccumMs = 0;
    this.threatsToSpawn = C.ThreatsLevelOne + (level - 1) * C.ThreatsPerLevelAdd;
    this.levelKills     = 0;
  }

  private get threatSpeed() {
    return Math.min(
      C.ThreatBaseSpeed + (this.currentLevel - 1) * C.ThreatSpeedPerLevel,
      C.ThreatMaxSpeed);
  }

  // ── update ────────────────────────────────────────────────────────────────
  update(_time: number, delta: number) {
    // When paused, freeze everything — Phaser still renders existing objects
    // including the pauseOverlay container and the last status bar frame.
    if (this.state === GameState.Paused) return;

    // Hide all pooled text objects from the previous frame before re-drawing
    for (const t of this.textPool)  t.setVisible(false);
    for (const t of this.sbTexts)   t.setVisible(false);
    this.textPoolIdx = 0;
    this.sbTextsIdx  = 0;

    const dt = delta / 1000;

    switch (this.state) {
      case GameState.LevelStart:    this.updateLevelStart(delta);  break;
      case GameState.Playing:       this.updatePlaying(dt, delta); break;
      case GameState.LevelComplete: this.updateLevelComplete(delta); break;
      case GameState.UpgradeScreen: this.updateUpgradeHover();    break;
      case GameState.GameOver:      break;
    }

    this.renderFrame(delta);
  }

  // ── LevelStart ────────────────────────────────────────────────────────────
  private updateLevelStart(delta: number) {
    this.levelStartMs -= delta;
    if (this.levelStartMs <= 0) this.state = GameState.Playing;
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  private updatePlaying(dt: number, delta: number) {
    // Confine mouse (visual cue only — browsers handle actual confinement differently)
    const ptr = this.input.activePointer;
    const mx  = Phaser.Math.Clamp(ptr.x, 0, C.ScreenWidth  - 1);
    const my  = Phaser.Math.Clamp(ptr.y, 0, C.ScreenHeight - 1);

    // Stun
    if (this.stunMs > 0) {
      this.stunMs -= delta;
      this.player.updateDirection(mx, my);
    } else {
      this.player.update(dt, this.keys, mx, my);
    }

    // Spawning
    if (this.threatsToSpawn > 0) {
      this.spawnAccumMs += delta;
      if (this.spawnAccumMs >= C.ThreatSpawnMs) {
        this.threats.push(new Threat(this, this.threatSpeed));
        this.threatsToSpawn--;
        this.spawnAccumMs = 0;
      }
    }

    // Update
    for (const t of this.threats) t.update(dt, this.bases);
    for (const b of this.bullets) b.update(dt);
    this.bullets = this.bullets.filter(b => { if (!b.alive) { b.destroy(); return false; } return true; });

    // Bullet–threat collisions
    const killedThreats = new Set<Threat>();
    const usedBullets   = new Set<Bullet>();
    for (const bullet of this.bullets) {
      if (usedBullets.has(bullet)) continue;
      for (const threat of this.threats) {
        if (killedThreats.has(threat)) continue;
        if (Phaser.Geom.Intersects.RectangleToRectangle(bullet.bounds, threat.bounds)) {
          threat.health -= this.player.weaponPower;
          usedBullets.add(bullet);
          this.hitSound?.play();
          if (threat.health <= 0) {
            killedThreats.add(threat);
            const destroyed = this.bases.filter(b => b.isDestroyed).length;
            const reward    = Math.max(10, Math.round(C.MoneyPerKill * (1 - 0.33 * destroyed)));
            this.player.money += reward;
            this.levelKills++;
          }
          break;
        }
      }
    }
    for (const b of usedBullets) b.alive = false;
    this.bullets = this.bullets.filter(b => { if (!b.alive) { b.destroy(); return false; } return true; });
    this.threats = this.threats.filter(t => { if (killedThreats.has(t)) { t.destroy(); return false; } return true; });

    // Threat–base collisions
    const removeThreats: Threat[] = [];
    for (const threat of this.threats) {
      for (const base of this.bases) {
        if (base.isDestroyed) continue;
        if (Phaser.Geom.Intersects.RectangleToRectangle(threat.bounds,
            new Phaser.Geom.Rectangle(base.x - C.BaseSize/2, base.y - C.BaseSize/2, C.BaseSize, C.BaseSize))) {
          base.takeDamage();
          removeThreats.push(threat);
          this.cameras.main.shake(C.ShakeDurationMs, C.ShakeIntensity);
          this.hitSound?.play();
          break;
        }
      }
    }
    for (const t of removeThreats) { t.destroy(); }
    this.threats = this.threats.filter(t => !removeThreats.includes(t));

    if (this.bases.every(b => b.isDestroyed)) {
      this.triggerGameOver('All bases destroyed! Network compromised!');
      return;
    }

    // Threat–player collision
    if (this.stunMs <= 0) {
      const hit = this.threats.find(t =>
        Phaser.Geom.Intersects.RectangleToRectangle(t.bounds, this.player.bounds));
      if (hit) {
        hit.destroy();
        this.threats = this.threats.filter(t => t !== hit);
        this.stunMs  = 1000;
        this.cameras.main.shake(C.ShakeDurationMs, C.ShakeIntensity);
      }
    }

    // Threat-warning flags
    const threatRadSq = C.ThreatRadius * C.ThreatRadius;
    for (const b of this.bases) b.isUnderThreat = false;
    for (const t of this.threats)
      for (const b of this.bases.filter(b => !b.isDestroyed))
        if (Math.hypot(t.x - b.x, t.y - b.y) ** 2 < threatRadSq)
          b.isUnderThreat = true;

    // Health pack spawning
    this.hpSpawnMs -= delta;
    if (this.hpSpawnMs <= 0) {
      this.hpSpawnMs = C.HealthPackSpawnIntervalMs;
      if (this.bases.some(b => !b.isDestroyed && b.hitPoints < C.BaseStartHealth)) {
        this.healthPacks.push(new HealthPack(this,
          Phaser.Math.Between(60, C.ScreenWidth  - 60),
          Phaser.Math.Between(60, C.ScreenHeight - 60)));
      }
    }
    for (const hp of this.healthPacks) hp.update(dt);
    this.healthPacks = this.healthPacks.filter(hp => {
      if (hp.expired) { hp.destroy(); return false; } return true;
    });
    // Collection
    const pickupR2 = C.HealthPackPickupRadius ** 2;
    for (let k = this.healthPacks.length - 1; k >= 0; k--) {
      const hp = this.healthPacks[k];
      if ((hp.x - this.player.x) ** 2 + (hp.y - this.player.y) ** 2 < pickupR2) {
        const lowest = this.bases
          .filter(b => !b.isDestroyed && b.hitPoints < C.BaseStartHealth)
          .sort((a, b) => a.hitPoints - b.hitPoints)[0];
        if (lowest) { lowest.hitPoints++; hp.destroy(); this.healthPacks.splice(k, 1); }
      }
    }

    // Level complete?
    if (this.threatsToSpawn === 0 && this.threats.length === 0) {
      this.levelCompleteMs = 1500;
      this.state = GameState.LevelComplete;
    }
  }

  // ── LevelComplete ─────────────────────────────────────────────────────────
  private updateLevelComplete(delta: number) {
    this.levelCompleteMs -= delta;
    if (this.levelCompleteMs <= 0) {
      this.upgradesBought.fill(0);
      this.state = GameState.UpgradeScreen;
    }
  }

  // ── UpgradeScreen hover ───────────────────────────────────────────────────
  private updateUpgradeHover() {
    const mx = this.input.activePointer.x;
    const my = this.input.activePointer.y;
    this.hoveredCard = -1;
    for (let i = 0; i < UPGRADES.length; i++) {
      const r = this.upgradeCardRect(i);
      if (mx >= r.x && mx <= r.x + r.width && my >= r.y && my <= r.y + r.height)
        this.hoveredCard = i;
    }
  }

  private upgradeCardRect(i: number) {
    return { x: 60 + i * 220, y: 175, width: 200, height: 260 };
  }

  private handleUpgradeClick(ptr: Phaser.Input.Pointer, isRight: boolean) {
    const mx = ptr.x, my = ptr.y;

    // Proceed button
    if (!isRight) {
      const pr = { x: 420, y: 455, w: 360, h: 42 };
      if (mx >= pr.x && mx <= pr.x + pr.w && my >= pr.y && my <= pr.y + pr.h) {
        this.advanceToNextLevel();
        return;
      }
    }

    for (let i = 0; i < UPGRADES.length; i++) {
      const r = this.upgradeCardRect(i);
      if (!(mx >= r.x && mx <= r.x + r.width && my >= r.y && my <= r.y + r.height)) continue;

      const up               = UPGRADES[i];
      const pendingBill      = this.computePendingBill();
      const projectedEndpoints = this.workstations + C.WorkstationsPerYear;

      if (isRight) {
        // Refund
        if (this.upgradesBought[i] <= 0) break;
        this.player.money += up.buyCost;
        this.upgradesBought[i]--;
        if (up.type === UpgradeType.RepairBase) {
          const top = this.bases.filter(b => !b.isDestroyed).sort((a, b) => b.hitPoints - a.hitPoints)[0];
          if (top) top.hitPoints = Math.max(0, top.hitPoints - 1);
        } else if (up.type === UpgradeType.RebuildBase) {
          const lowest = this.bases.filter(b => !b.isDestroyed).sort((a, b) => a.hitPoints - b.hitPoints)[0];
          if (lowest) lowest.hitPoints = 0;
        } else {
          this.upgradeAddedCost -= up.costAdd;
          this.player.removeUpgrade(up.type);
        }
      } else {
        // Buy
        if (up.type === UpgradeType.RepairBase) {
          const hasDamaged = this.bases.some(b => !b.isDestroyed && b.hitPoints < C.BaseStartHealth);
          if (!hasDamaged || this.player.money - up.buyCost < pendingBill) break;
          const damaged = this.bases.filter(b => !b.isDestroyed && b.hitPoints < C.BaseStartHealth)
            .sort((a, b) => a.hitPoints - b.hitPoints)[0];
          if (damaged) { damaged.hitPoints++; this.player.money -= up.buyCost; this.upgradesBought[i]++; }
        } else if (up.type === UpgradeType.RebuildBase) {
          const destroyedCount = this.bases.filter(b => b.isDestroyed).length;
          if (this.upgradesBought[i] >= destroyedCount || this.player.money - up.buyCost < pendingBill) break;
          const toRebuild = this.bases.find(b => b.isDestroyed);
          if (toRebuild) { toRebuild.rebuild(); this.player.money -= up.buyCost; this.upgradesBought[i]++; }
        } else {
          if (this.player.money - up.buyCost < pendingBill + up.costAdd * projectedEndpoints) break;
          this.player.money     -= up.buyCost;
          this.upgradeAddedCost += up.costAdd;
          this.player.applyUpgrade(up.type);
          this.upgradesBought[i]++;
        }
      }
      break;
    }
  }

  private computePendingBill() {
    const projected = this.workstations + C.WorkstationsPerYear;
    const baseRate  = this.characterType === CharacterType.OtherGuy ? 0 : C.SubscriptionCostPerEndpoint;
    return (baseRate + this.upgradeAddedCost) * projected;
  }

  private advanceToNextLevel() {
    this.upgradesBought.fill(0);
    this.year++;
    this.workstations += C.WorkstationsPerYear;
    const baseRate = this.characterType === CharacterType.OtherGuy ? 0 : C.SubscriptionCostPerEndpoint;
    const bill = (baseRate + this.upgradeAddedCost) * this.workstations;
    this.player.money  -= bill;
    this.lastAnnualCost = bill;

    if (this.player.money < 0) {
      this.triggerGameOver(`Bankruptcy! Year ${this.year} subscription ($${bill}) exceeded your budget.`);
      return;
    }

    this.currentLevel++;
    this.beginLevel(this.currentLevel);
    this.levelStartMs = 2000;
    this.state        = GameState.LevelStart;
  }

  private triggerGameOver(msg: string) {
    this.gameOverMsg  = msg;
    this.finalMoney   = this.player.money;
    this.finalYear    = this.year;
    this.finalLevel   = this.currentLevel;
    this.state        = GameState.GameOver;
    this.pauseBtn.setVisible(false);
    this.music?.dispose();
    this.music = undefined;
  }

  private returnToMenu() {
    this.music?.dispose();
    this.music = undefined;
    for (const t of this.threats)     t.destroy();
    for (const b of this.bullets)     b.destroy();
    for (const h of this.healthPacks) h.destroy();
    this.player.destroy();
    for (const b of this.bases) b.destroy();
    this.scene.start('MenuScene');
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  private renderFrame(delta: number) {
    this.updateFog();
    this.updateVisibility();
    for (const b of this.bases) b.draw();

    this.stunGfx.clear();
    if (this.stunMs > 0) {
      const alpha = 0.39 + Math.abs(Math.sin(Date.now() * 0.01)) * 0.47;
      this.stunGfx.lineStyle(2, 0xff0000, alpha);
      this.stunGfx.strokeCircle(this.player.x, this.player.y, C.PlayerSize * 0.8);
    }

    this.visionCircleGfx.clear();
    if (this.player.visibilityRadius < C.ScreenDiagonal) {
      this.visionCircleGfx.lineStyle(1, 0xffffff, 0.31);
      this.visionCircleGfx.strokeCircle(this.player.x, this.player.y, this.player.visibilityRadius);
    }

    this.overlayGfx.clear();
    switch (this.state) {
      case GameState.LevelStart:    this.drawLevelStart();    break;
      case GameState.LevelComplete: this.drawLevelComplete(); break;
      case GameState.UpgradeScreen: this.drawUpgradeScreen(); break;
      case GameState.GameOver:      this.drawGameOver();      break;
    }

    if (this.state !== GameState.GameOver) this.drawStatusBar();
  }

  private updateFog() {
    this.fogGfx.clear();
    this.fogGfx.fillStyle(0xffffff, 1);

    if (this.player.visibilityRadius < C.ScreenDiagonal) {
      this.fogGfx.fillCircle(this.player.x, this.player.y, this.player.visibilityRadius);
    }
    for (const b of this.bases) {
      if (!b.isDestroyed)
        this.fogGfx.fillCircle(b.x, b.y, C.BaseVisibilityRadius);
    }

    this.fogRT.clear();
    if (this.player.visibilityRadius >= C.ScreenDiagonal) {
      // Full visibility — no fog
    } else {
      this.fogRT.fill(0x000000, 0.78);
      this.fogRT.erase(this.fogGfx, 0, 0);
    }
  }

  private updateVisibility() {
    const r2 = this.player.visibilityRadius ** 2;
    for (const t of this.threats)
      t.setVisible((t.x - this.player.x) ** 2 + (t.y - this.player.y) ** 2 <= r2);
    for (const b of this.bullets)
      b.setVisible((b.x - this.player.x) ** 2 + (b.y - this.player.y) ** 2 <= r2);
  }

  // ── Splash screens (drawn with graphics + inline text each frame) ─────────
  private drawLevelStart() {
    this.overlayGfx.fillStyle(0x000000, 0.63);
    this.overlayGfx.fillRect(0, 0, C.ScreenWidth, C.ScreenHeight);

    this.centeredText(`WAVE ${this.currentLevel}`, C.ScreenHeight / 2 - 40, 56, '#ffff00', 10);

    const living = this.bases.filter(b => !b.isDestroyed).length;
    this.centeredText(
      `Defend ${living} active base${living !== 1 ? 's' : ''}!`,
      C.ScreenHeight / 2 + 30, 24, '#ffffff', 10);
    this.centeredText(
      `Threats incoming: ${this.threatsToSpawn}`,
      C.ScreenHeight / 2 + 65, 20, '#ff8800', 10);
  }

  private drawLevelComplete() {
    this.overlayGfx.fillStyle(0x000000, 0.59);
    this.overlayGfx.fillRect(0, 0, C.ScreenWidth, C.ScreenHeight);
    this.centeredText(`WAVE ${this.currentLevel} COMPLETE!`,
      C.ScreenHeight / 2 - 30, 48, '#00ff00', 10);
    this.centeredText(
      `${this.levelKills} threats neutralised  ·  $${this.player.money} remaining`,
      C.ScreenHeight / 2 + 30, 22, '#ffffff', 10);
  }

  private drawGameOver() {
    this.centeredText(this.gameOverMsg,                   C.ScreenHeight / 2 - 100, 26, '#ff0000', 10);
    this.centeredText(`Reached Wave: ${this.finalLevel}`, C.ScreenHeight / 2 - 50,  22, '#ffffff', 10);
    this.centeredText(`Final Money: $${this.finalMoney}`, C.ScreenHeight / 2 - 10,  22, '#ffffff', 10);
    this.centeredText(`Year: ${this.finalYear}`,           C.ScreenHeight / 2 + 30,  22, '#ffffff', 10);
    this.centeredText('Press any key to return to menu',  C.ScreenHeight / 2 + 90,  20, '#888888', 10);
  }

  // ── Upgrade screen ────────────────────────────────────────────────────────
  private drawUpgradeScreen() {
    this.overlayGfx.fillStyle(0x000000, 0.78);
    this.overlayGfx.fillRect(0, 0, C.ScreenWidth, C.ScreenHeight);

    this.centeredText(`WAVE ${this.currentLevel} COMPLETE  -  Buy Upgrades`, 45, 26, '#ffff00', 10);

    const pendingBill = this.computePendingBill();
    const canPayBill  = this.player.money >= pendingBill;
    this.centeredText(
      `Money: $${this.player.money}   |   Left-click to buy  |  Right-click to refund`,
      82, 16, '#888888', 10);
    this.centeredText(
      `Subscription due on proceed: $${pendingBill}`,
      104, 18, canPayBill ? '#dca03c' : '#ff0000', 10);
    if (!canPayBill)
      this.centeredText('WARNING: you cannot afford this bill!', 128, 15, '#ff0000', 10);

    for (let i = 0; i < UPGRADES.length; i++) {
      this.drawUpgradeCard(i, pendingBill);
    }

    // Proceed button
    const pr  = { x: 420, y: 455, w: 360, h: 42 };
    const mx  = this.input.activePointer.x;
    const my  = this.input.activePointer.y;
    const phover = mx >= pr.x && mx <= pr.x + pr.w && my >= pr.y && my <= pr.y + pr.h;
    this.overlayGfx.fillStyle(phover ? 0x005000 : 0x003200, phover ? 0.94 : 0.78);
    this.overlayGfx.fillRect(pr.x, pr.y, pr.w, pr.h);
    this.overlayGfx.lineStyle(1.5, phover ? 0x00ff00 : 0x007800, 1);
    this.overlayGfx.strokeRect(pr.x, pr.y, pr.w, pr.h);
    this.centeredText('Proceed to Next Wave >>', pr.y + 12, 18,
      phover ? '#00ff00' : '#007800', 10);
  }

  private drawUpgradeCard(i: number, pendingBill: number) {
    const up      = UPGRADES[i];
    const r       = this.upgradeCardRect(i);
    const hovered = i === this.hoveredCard;
    const bought  = this.upgradesBought[i];
    const mx      = this.input.activePointer.x;
    const my      = this.input.activePointer.y;

    const isRepair  = up.type === UpgradeType.RepairBase;
    const isRebuild = up.type === UpgradeType.RebuildBase;

    const hasDamaged    = isRepair  && this.bases.some(b => !b.isDestroyed && b.hitPoints < C.BaseStartHealth);
    const destroyedNow  = isRebuild ? this.bases.filter(b => b.isDestroyed).length : 0;
    const hasRebuildAvail = isRebuild && destroyedNow > bought;

    let canAfford: boolean;
    if (isRepair)       canAfford = hasDamaged && this.player.money - up.buyCost >= pendingBill;
    else if (isRebuild) canAfford = hasRebuildAvail && this.player.money - up.buyCost >= pendingBill;
    else                canAfford = this.player.money - up.buyCost >= pendingBill + up.costAdd;

    // Background
    let bgFill   = canAfford ? (hovered ? 0x282864 : 0x14143c) : 0x141414;
    let bgAlpha  = canAfford ? (hovered ? 0.94 : 0.86) : 0.7;
    let border   = canAfford ? (hovered ? 0xffff00 : 0x87ceeb) : 0x505050;

    if (isRepair && canAfford) { bgFill = hovered ? 0x003c28 : 0x001e19; border = hovered ? 0x00ff00 : 0x009600; }
    if (isRebuild && canAfford) { bgFill = hovered ? 0x461e00 : 0x321400; border = hovered ? 0xff8000 : 0xdc6e00; }

    this.overlayGfx.fillStyle(bgFill, bgAlpha);
    this.overlayGfx.fillRect(r.x, r.y, r.width, r.height);
    this.overlayGfx.lineStyle(hovered && canAfford ? 2.5 : 1.5, border, 1);
    this.overlayGfx.strokeRect(r.x, r.y, r.width, r.height);

    // Divider
    this.overlayGfx.lineStyle(1, 0x333333, 1);
    this.overlayGfx.strokeLineShape(new Phaser.Geom.Line(r.x + 10, r.y + 45, r.x + r.width - 10, r.y + 45));

    const col  = canAfford ? '#ffffff' : '#787878';
    const cx   = r.x + r.width / 2;

    const ww = r.width - 16;
    this.centeredAtText(up.title, cx, r.y + 18, 17, col, 10);

    // Badge
    if (bought > 0) {
      const bw = 36;
      this.overlayGfx.fillStyle(0x009600, 0.78);
      this.overlayGfx.fillRect(r.x + r.width - bw - 4, r.y + 4, bw, 21);
      this.centeredAtText(`x${bought}`, r.x + r.width - bw / 2 - 4, r.y + 6, 13, '#ffffff', 10);
      this.centeredAtText('R-click refund', cx, r.y + 4, 10, '#b4b4b4', 10);
    }

    this.centeredAtText(up.desc,   cx, r.y + 54,  13, col, 10, ww);
    this.centeredAtText(up.flavor, cx, r.y + 95,  12, canAfford ? '#969696' : '#5a5a5a', 10, ww);

    const buyStr = canAfford ? `$${up.buyCost} to buy` : `$${up.buyCost} (blocked)`;
    this.centeredAtText(buyStr, cx, r.y + r.height - 62, 14,
      canAfford ? '#00ff00' : '#8c3c3c', 10);

    if (isRepair) {
      const noAnn = hasDamaged ? 'No annual cost' : 'No damaged base';
      this.centeredAtText(noAnn, cx, r.y + r.height - 42, 13,
        hasDamaged ? '#64dc64' : '#828282', 10);
    } else if (isRebuild) {
      const status = hasRebuildAvail ? `${destroyedNow} base(s) destroyed` : 'No destroyed base';
      this.centeredAtText(status, cx, r.y + r.height - 42, 13,
        hasRebuildAvail ? '#ffa028' : '#828282', 10);
    } else {
      this.centeredAtText(`+$${up.costAdd}/endpoint/yr`, cx, r.y + r.height - 42, 13,
        canAfford ? '#dc6464' : '#643c3c', 10);
    }
  }

  // ── Status bar ────────────────────────────────────────────────────────────
  private drawStatusBar() {
    this.sbGfx.clear();
    this.sbGfx.fillStyle(0x040412, 0.97);
    this.sbGfx.fillRect(0, C.BarY, C.ScreenWidth, C.BarH);
    this.sbGfx.fillStyle(0x00a0ff, 0.86);
    this.sbGfx.fillRect(0, C.BarY, C.ScreenWidth, 2);

    const divs = [0, 130, 280, 470, 640, 795, 935, 1060, 1200];
    this.sbGfx.lineStyle(1, 0x233764, 0.78);
    for (let d = 1; d < divs.length - 1; d++)
      this.sbGfx.strokeLineShape(new Phaser.Geom.Line(divs[d], C.BarY + 8, divs[d], C.BarY + C.BarH - 8));

    const cx: number[] = [];
    for (let i = 0; i < divs.length - 1; i++) cx.push((divs[i] + divs[i + 1]) / 2);

    const ly = C.BarY + 5, vy = C.BarY + 19, sy = C.BarY + 40;

    // 0: Wave
    this.sbLabel('WAVE',  cx[0], ly); this.sbValue(`${this.currentLevel}`, cx[0], vy, '#ffffff');
    this.sbSub(`YEAR ${this.year}`, cx[0], sy, '#7878a0');

    // 1: Money
    const mc = this.player.money > 200 ? '#00ff00' : this.player.money > 0 ? '#ffff00' : '#ff0000';
    this.sbLabel('MONEY', cx[1], ly); this.sbValue(`$${this.player.money}`, cx[1], vy, mc);
    if (this.lastAnnualCost > 0)
      this.sbSub(`BILL -$${this.lastAnnualCost}`, cx[1], sy, '#dc5050');

    // 2: Character
    const charName = this.characterType === CharacterType.Workspace ? 'WORKSPACE ONE' : 'OTHER GUY';
    const charCol  = this.characterType === CharacterType.Workspace ? '#64b4ff' : '#50dc78';
    this.sbLabel('CHARACTER', cx[2], ly);
    this.sbTextAt(charName, cx[2], vy, 18, charCol);

    // 3: Power/Speed
    this.sbLabel('POWER / SPEED', cx[3], ly);
    this.sbValue(`P:${this.player.weaponPower}  S:${(this.player.speed / 60).toFixed(1)}`, cx[3], vy, '#c8c8ff');

    // 4: Bases
    const living  = this.bases.filter(b => !b.isDestroyed).length;
    const basCol  = living === this.bases.length ? '#00ff00' : living > 1 ? '#ffff00' : '#ff0000';
    this.sbLabel('BASES', cx[4], ly); this.sbValue(`${living}/${this.bases.length}`, cx[4], vy, basCol);

    // 5: Threats
    const rem     = this.threatsToSpawn + this.threats.length;
    const thrCol  = rem === 0 ? '#00ff00' : rem < 4 ? '#ffff00' : '#ff8800';
    this.sbLabel('THREATS', cx[5], ly); this.sbValue(`${rem}`, cx[5], vy, thrCol);

    // 6: Health packs
    this.sbLabel('HP PACKS', cx[6], ly);
    if (this.healthPacks.length > 0)
      this.sbValue(`${this.healthPacks.length}`, cx[6], vy, '#00ff00');
    else
      this.sbSub('none', cx[6], vy + 4, '#3c3c50');

    // 7: Workstations
    this.sbLabel('WORKSTATIONS', cx[7], ly);
    this.sbValue(`${this.workstations}`, cx[7], vy, '#a0c8ff');
    this.sbSub(`+${C.WorkstationsPerYear}/yr`, cx[7], sy, '#506080');
  }

  // ── Text helpers (one-shot per frame, cleaned up automatically) ───────────
  // We keep a pool of Text objects, reusing them each frame.
  private textPool:     Phaser.GameObjects.Text[] = [];
  private textPoolIdx   = 0;

  private getPoolText(depth: number): Phaser.GameObjects.Text {
    if (this.textPoolIdx < this.textPool.length) {
      const t = this.textPool[this.textPoolIdx++];
      t.setVisible(true).setDepth(depth);
      return t;
    }
    const t = this.add.text(0, 0, '', { fontFamily: FONT }).setDepth(depth);
    this.textPool.push(t);
    this.textPoolIdx++;
    return t;
  }

  private centeredText(str: string, y: number, size: number, color: string, depth: number) {
    const t = this.getPoolText(depth);
    t.setWordWrapWidth(C.ScreenWidth)
      .setText(str).setFontSize(size).setColor(color)
      .setFontFamily(FONT).setShadow(1, 1, '#000000', 0, true, true)
      .setOrigin(0.5, 0).setPosition(C.ScreenWidth / 2, y);
  }

  private centeredAtText(str: string, cx: number, y: number, size: number, color: string, depth: number, wrapW = 0) {
    const t = this.getPoolText(depth);
    t.setWordWrapWidth(wrapW > 0 ? wrapW : C.ScreenWidth)
      .setText(str).setFontSize(size).setColor(color)
      .setFontFamily(FONT).setShadow(1, 1, '#000000', 0, true, true)
      .setOrigin(0.5, 0).setPosition(cx, y);
  }

  private getSbText(): Phaser.GameObjects.Text {
    if (this.sbTextsIdx < this.sbTexts.length) {
      const t = this.sbTexts[this.sbTextsIdx++];
      t.setVisible(true).setDepth(11);
      return t;
    }
    const t = this.add.text(0, 0, '', { fontFamily: FONT }).setDepth(11);
    this.sbTexts.push(t);
    this.sbTextsIdx++;
    return t;
  }

  private sbDraw(str: string, cx: number, y: number, size: number, color: string) {
    const t = this.getSbText();
    // Set font size and wrap width BEFORE setText so Phaser renders with the
    // correct style on the very first use of each pooled text object.
    t.setFontSize(size).setWordWrapWidth(C.ScreenWidth)
      .setText(str).setColor(color)
      .setFontFamily(FONT).setShadow(1, 1, '#000000', 0, true, true)
      .setOrigin(0.5, 0).setPosition(cx, y);
  }

  private sbLabel(str: string, cx: number, y: number) {
    this.sbDraw(str, cx, y, 11, '#505090');
  }
  private sbValue(str: string, cx: number, y: number, color: string) {
    this.sbDraw(str, cx, y, 20, color);
  }
  private sbSub(str: string, cx: number, y: number, color: string) {
    this.sbDraw(str, cx, y, 13, color);
  }
  private sbTextAt(str: string, cx: number, y: number, size: number, color: string) {
    this.sbDraw(str, cx, y, size, color);
  }

  // ── Pause ─────────────────────────────────────────────────────────────────
  private buildPauseOverlay(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0).setDepth(16);

    // Fullscreen dim
    c.add(this.add.rectangle(C.ScreenWidth / 2, C.ScreenHeight / 2,
      C.ScreenWidth, C.ScreenHeight, 0x000000, 0.75));

    // Panel
    c.add(this.add.rectangle(C.ScreenWidth / 2, C.ScreenHeight / 2, 420, 310, 0x080828, 1));
    c.add(this.add.rectangle(C.ScreenWidth / 2, C.ScreenHeight / 2, 420, 310).setStrokeStyle(2, 0x87ceeb));

    c.add(this.add.text(C.ScreenWidth / 2, C.ScreenHeight / 2 - 100, 'PAUSED', {
      fontFamily: FONT, fontSize: '52px', color: '#ffff00', shadow: SHADOW,
    }).setOrigin(0.5, 0));

    c.add(this.add.text(C.ScreenWidth / 2, C.ScreenHeight / 2 - 28, 'ESC to toggle', {
      fontFamily: FONT, fontSize: '15px', color: '#666688', shadow: SHADOW,
    }).setOrigin(0.5, 0));

    // Resume button
    const resumeBg = this.add.rectangle(C.ScreenWidth / 2, C.ScreenHeight / 2 + 36, 220, 46, 0x004400, 1)
      .setInteractive({ useHandCursor: true });
    resumeBg.on('pointerover',  () => resumeBg.setFillStyle(0x006600));
    resumeBg.on('pointerout',   () => resumeBg.setFillStyle(0x004400));
    resumeBg.on('pointerdown',  (_p: unknown, _x: unknown, _y: unknown, evt: Phaser.Types.Input.EventData) => {
      evt.stopPropagation(); this.resumeGame();
    });
    c.add(resumeBg);
    c.add(this.add.text(C.ScreenWidth / 2, C.ScreenHeight / 2 + 36, 'Resume', {
      fontFamily: FONT, fontSize: '22px', color: '#00ff00', shadow: SHADOW,
    }).setOrigin(0.5));

    // Exit button
    const exitBg = this.add.rectangle(C.ScreenWidth / 2, C.ScreenHeight / 2 + 102, 220, 46, 0x440000, 1)
      .setInteractive({ useHandCursor: true });
    exitBg.on('pointerover',  () => exitBg.setFillStyle(0x660000));
    exitBg.on('pointerout',   () => exitBg.setFillStyle(0x440000));
    exitBg.on('pointerdown',  (_p: unknown, _x: unknown, _y: unknown, evt: Phaser.Types.Input.EventData) => {
      evt.stopPropagation(); this.returnToMenu();
    });
    c.add(exitBg);
    c.add(this.add.text(C.ScreenWidth / 2, C.ScreenHeight / 2 + 102, 'Exit to Menu', {
      fontFamily: FONT, fontSize: '22px', color: '#ff4444', shadow: SHADOW,
    }).setOrigin(0.5));

    return c;
  }

  private pauseGame() {
    this.prevState = this.state;
    this.state     = GameState.Paused;
    this.pauseOverlay.setVisible(true);
    this.pauseBtn.setText('▶');
    this.music?.pause();
  }

  private resumeGame() {
    this.state = this.prevState;
    this.pauseOverlay.setVisible(false);
    this.pauseBtn.setText('II');
    this.music?.resume();
  }

  // ── Scene lifecycle ───────────────────────────────────────────────────────
  shutdown() {
    this.music?.dispose();
    for (const t of this.threats)     t.destroy();
    for (const b of this.bullets)     b.destroy();
    for (const h of this.healthPacks) h.destroy();
  }
}
