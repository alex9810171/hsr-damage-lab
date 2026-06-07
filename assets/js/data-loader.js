export async function loadGameData() {
  const [character, lightCones, relicSets, statValues, teams] = await Promise.all([
    loadJson("data/characters/the-herta.json"),
    loadJson("data/light-cones.json"),
    loadJson("data/relic-sets.json"),
    loadJson("data/stat-values.json"),
    loadJson("data/teams.json"),
  ]);

  return {
    character,
    lightCones,
    relicSets,
    statValues,
    teams,
  };
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}
