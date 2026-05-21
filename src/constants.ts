export const C = {
  ScreenWidth:  1200,
  ScreenHeight: 900,

  // ── Player ─────────────────────────────────────────────────────────────────
  PlayerSize: 40,
  WorkspacePlayerSpeed: 300,   // px/sec  (5 px/frame × 60)
  OtherGuyPlayerSpeed:  150,   // px/sec  (2.5 × 60)

  WorkspaceStartMoney:      800,
  WorkspaceWeaponPower:     1,
  WorkspaceVisibilityRadius: 1125,

  OtherGuyStartMoney:      1000,
  OtherGuyWeaponPower:     1,
  OtherGuyVisibilityRadius: 120,

  // ── Upgrades ───────────────────────────────────────────────────────────────
  VisibilityUpgradeAmount:  60,
  SpeedUpgradeAmount:       48,   // px/sec (0.8 × 60)
  WeaponUpgradeAmount:      1,

  UpgradeVisibilityCostAdd:    3,   // $ per workstation per year
  UpgradeWeaponCostAdd:        3,   // $ per workstation per year
  UpgradeSpeedCostAdd:         3,   // $ per workstation per year
  UpgradeVisibilityBuyCost:  150,
  UpgradeWeaponBuyCost:      200,
  UpgradeSpeedBuyCost:       100,
  UpgradeRepairBuyCost:       50,
  UpgradeRebuildBuyCost:     300,
  RebuildBaseHp:               5,

  // ── Bullets ────────────────────────────────────────────────────────────────
  BulletSpeed:         900,   // px/sec (15 × 60)
  BulletBaseRadius:      4,
  BulletRadiusPerPower:  2,
  BulletMaxRadius:      14,

  // ── Threats ────────────────────────────────────────────────────────────────
  ThreatSize:          30,
  ThreatStartHealth:    5,
  ThreatBaseSpeed:     72,    // px/sec (1.2 × 60)
  ThreatSpeedPerLevel: 18,    // px/sec per level (0.3 × 60)
  ThreatMaxSpeed:     300,    // px/sec (5 × 60)
  ThreatsLevelOne:      8,
  ThreatsPerLevelAdd:   5,
  ThreatSpawnMs:     1417,    // ms between spawns (85 frames @ 60fps)
  EdgeSpawnPadding:    20,
  ThreatRadius:       150,

  // ── Economy ────────────────────────────────────────────────────────────────
  MoneyPerKill:                50,
  SubscriptionCostPerEndpoint:  4,   // Workspace ONE only — $ per workstation per year
  WorkstationsStart:           20,
  WorkstationsPerYear:         10,

  // ── Bases ──────────────────────────────────────────────────────────────────
  BaseSize:              80,
  BaseStartHealth:       10,
  BaseVisibilityRadius: 105,
  BasePositions: [
    { x: 600, y: 220 },
    { x: 320, y: 700 },
    { x: 880, y: 700 },
  ],

  // ── Camera shake ───────────────────────────────────────────────────────────
  ShakeDurationMs: 350,
  ShakeIntensity:  0.005,

  // ── Health packs ───────────────────────────────────────────────────────────
  HealthPackLifetimeMs:     12000,
  HealthPackSpawnIntervalMs: 25000,
  HealthPackPickupRadius:    22,

  ScreenDiagonal: 1500,

  // ── Status bar ─────────────────────────────────────────────────────────────
  BarY: 844,
  BarH:  56,
} as const;
