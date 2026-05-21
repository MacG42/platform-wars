export enum CharacterType { Workspace, OtherGuy }

export enum GameState {
  LevelStart,
  Playing,
  LevelComplete,
  UpgradeScreen,
  GameOver,
  Paused,
}

export enum UpgradeType { Visibility, Weapon, Speed, RepairBase, RebuildBase }

export interface UpgradeDef {
  type:    UpgradeType;
  title:   string;
  desc:    string;
  flavor:  string;
  costAdd: number;
  buyCost: number;
}
