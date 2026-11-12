/**
 * Стратегия ИИ. Зависит от фракции.
 *
 *  scythians — быстрые набеги: целимся в слабые деревни, атакуем одиночек
 *  bosporus  — торговля: защищаем города, идём к рынку, покупаем карты
 *  chersonesos — оборона: держим города, нанимаем защитников
 *  rome      — прямые атаки: сильнейший генерал атакует ближайший город
 *  goths     — агрессия: атакуем слабейшую фракцию
 */
 export class AIStrategy {
    decide({ world, factionId }) {
      const generals = world.generals.filter((g) => g.factionId === factionId && g.alive);
      if (!generals.length) return { kind: 'idle' };
  
      const faction = world.factions.find((f) => f.id === factionId);
      const strategy = FACTION_STRATEGIES[factionId] || FACTION_STRATEGIES.scythians;
  
      // 1. Найм (если есть ресурсы и пул)
      const recruit = this._tryRecruit(world, factionId, generals[0]);
      if (recruit && Math.random() < strategy.recruitChance) return recruit;
  
      // 2. Выбрать генерала и цель
      const scored = [];
      for (const gen of generals) {
        const moves = world.movement.reachableForMove(gen);
        const attacks = world.movement.reachableForAttack(gen);
  
        // 2.1 Атака полководцев
        for (const { tile, general: enemy, distance } of attacks.values()) {
          if (!enemy || enemy.factionId === factionId) continue;
          let score = strategy.attackGeneralWeight * (100 - distance * 2);
          score += (3 - enemy.lives) * 20;
          if (enemy.lives === 1) score += 40 * strategy.killWeight;
          if (gen.lives <= 1) score -= 80;
          scored.push({ gen, tile, kind: 'attack', score });
        }
  
        // 2.2 Атака городов
        for (const { tile, city, distance } of attacks.values()) {
          if (!city || city.factionId === factionId) continue;
          let score = strategy.attackCityWeight * (city.isCity ? 95 : 65);
          score -= distance * 3;
          if (city.settlement) score += 10;
          scored.push({ gen, tile, kind: 'attack-city', score });
        }
  
        // 2.3 Движение
        for (const { tile, distance } of moves.values()) {
          const city = tile.cityId ? world.getCity(tile.cityId) : null;
          let score = 0;
          if (city && city.factionId !== factionId) {
            score += (city.isCity ? 90 : 60) * strategy.moveToCityWeight;
            score -= distance * 3;
          } else if (!tile.factionId) {
            score += (25 - distance * 2) * strategy.exploreWeight;
          } else if (tile.factionId === factionId) {
            score -= 60;
          } else {
            score += (30 - distance * 2) * strategy.exploreWeight;
          }
          scored.push({ gen, tile, kind: 'move', score });
        }
      }
  
      if (scored.length === 0) return { kind: 'idle' };
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      if (best.score <= 0) return { kind: 'idle' };
      return { kind: best.kind, general: best.gen, tile: best.tile };
    }
  
    _tryRecruit(world, factionId, general) {
      if (general.deck.cards.length >= 8) return null;
      const pool = world.recruitPools.get(factionId);
      if (!pool || !pool.available.length) return null;
      const resourcePool = world.resourcePools.get(factionId);
      if (!resourcePool || resourcePool.gold < 10) return null;
      const priorities = this._recruitPriority(factionId);
      for (const key of priorities) {
        if (!pool.available.find((c) => c.key === key)) continue;
        return { kind: 'recruit', general, cardKey: key };
      }
      return { kind: 'recruit', general, cardKey: pool.available[0].key };
    }
  
    _recruitPriority(factionId) {
      return {
        scythians: ['scyth_rider', 'scyth_warrior', 'scyth_archer', 'scyth_shaman'],
        bosporus: ['bosp_hoplite', 'bosp_cavalry', 'bosp_archer', 'bosp_merchant'],
        chersonesos: ['cher_hoplite', 'cher_mercenary', 'cher_archer', 'cher_priest'],
        rome: ['rome_legion', 'rome_centurion', 'rome_archer', 'rome_siege'],
        goths: ['goth_berserk', 'goth_warrior', 'goth_archer', 'goth_shaman'],
      }[factionId] || [];
    }
  }
  
  /** Параметры стратегии по фракциям. */
  const FACTION_STRATEGIES = {
    scythians: {
      name: 'Набеги',
      recruitChance: 0.3,
      attackGeneralWeight: 1.2,
      attackCityWeight: 0.8,
      moveToCityWeight: 1.0,
      exploreWeight: 1.2,
      killWeight: 1.5,
    },
    bosporus: {
      name: 'Торговля и флот',
      recruitChance: 0.5,
      attackGeneralWeight: 0.8,
      attackCityWeight: 1.0,
      moveToCityWeight: 1.3,
      exploreWeight: 0.8,
      killWeight: 0.8,
    },
    chersonesos: {
      name: 'Оборона',
      recruitChance: 0.6,
      attackGeneralWeight: 0.7,
      attackCityWeight: 0.9,
      moveToCityWeight: 1.1,
      exploreWeight: 0.7,
      killWeight: 1.0,
    },
    rome: {
      name: 'Прямые атаки',
      recruitChance: 0.4,
      attackGeneralWeight: 1.0,
      attackCityWeight: 1.4,
      moveToCityWeight: 1.2,
      exploreWeight: 0.6,
      killWeight: 1.2,
    },
    goths: {
      name: 'Агрессия',
      recruitChance: 0.4,
      attackGeneralWeight: 1.4,
      attackCityWeight: 1.0,
      moveToCityWeight: 0.9,
      exploreWeight: 1.1,
      killWeight: 1.3,
    },
  };