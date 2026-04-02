// Curated list of 40 LOTR-inspired titles
export const LOTR_TITLES: readonly string[] = [
  'King of Gondor',
  'Steward of Minas Tirith',
  'Rider of Rohan',
  'Keeper of the Ring',
  'Warden of the North',
  'Master of Lake-town',
  'Lord of Rivendell',
  'Shield-maiden of Rohan',
  'Captain of the White Tower',
  'Elf-friend',
  'Ringbearer',
  'Grey Pilgrim',
  'Dwarf-lord of Erebor',
  'Guardian of the Shire',
  'Ranger of the North',
  'Lord of the Eagles',
  "Witch-king's Bane",
  'Star of Eärendil',
  'Keeper of Lothlórien',
  'Bearer of Andúril',
  'Light of the Evenstar',
  'Heir of Isildur',
  'Flame of the West',
  'Mithril-bearer',
  'Rider of Shadowfax',
  'Council Member of Elrond',
  'Defender of the Deep',
  'Marshal of the Riddermark',
  'Thane of the Shire',
  'Son of Arathorn',
  'Wanderer of the Wild',
  'Keeper of Fangorn',
  'Master of Bag End',
  'Bane of Durin\'s Bane',
  'Loremaster of Minas Tirith',
  'Warden of Helm\'s Deep',
  'Friend of the Eldar',
  'Balrog Slayer',
  'Arrow of Mirkwood',
  'Axe of the Dwarrowdelf',
] as const

/**
 * Returns a uniformly random title from the curated LOTR titles list.
 */
export function getRandomLotrTitle(): string {
  const randomValues = new Uint32Array(1)
  crypto.getRandomValues(randomValues)
  const idx = randomValues[0] % LOTR_TITLES.length
  return LOTR_TITLES[idx]
}

/**
 * Formats a display name with a LOTR title: "Name, Title"
 */
export function formatDisplayWithTitle(name: string, title: string): string {
  return `${name}, ${title}`
}
