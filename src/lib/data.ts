export type Language = "uz" | "ru" | "en";
export type Page =
  | "home"
  | "tournaments"
  | "teams"
  | "matches"
  | "bracket"
  | "live"
  | "sponsors"
  | "about";
export type Localized = Record<Language, string>;
export const text = (uz: string, ru: string, en: string): Localized => ({
  uz,
  ru,
  en,
});
export const pages: { id: Page; label: Localized }[] = [
  { id: "home", label: text("Bosh sahifa", "Главная", "Home") },
  { id: "tournaments", label: text("Turnirlar", "Турниры", "Tournaments") },
  { id: "teams", label: text("Jamoalar", "Команды", "Teams") },
  { id: "matches", label: text("Uchrashuvlar", "Матчи", "Matches") },
  { id: "bracket", label: text("Turnir jadvali", "Сетка", "Bracket") },
  { id: "live", label: text("Jonli efir", "Трансляция", "Live") },
  { id: "sponsors", label: text("Hamkorlar", "Партнёры", "Partners") },
  { id: "about", label: text("Liga haqida", "О лиге", "About") },
];
export interface Team {
  id: string;
  slot: number;
  name: Localized;
  roster: { role: Localized; name: string | null }[];
}
export const teams: Team[] = Array.from({ length: 16 }, (_, i) => ({
  id: `team-${i + 1}`,
  slot: i + 1,
  name: text(
    `Jamoa ${String(i + 1).padStart(2, "0")}`,
    `Команда ${String(i + 1).padStart(2, "0")}`,
    `Team ${String(i + 1).padStart(2, "0")}`,
  ),
  roster: Array.from({ length: 5 }, (_, j) => ({
    name: null,
    role:
      j === 0
        ? text("Sardor", "Капитан", "Captain")
        : text("O‘yinchi", "Игрок", "Player"),
  })),
}));
export interface Match {
  id: string;
  round: number;
  position: number;
  teamIds: [string | null, string | null];
  sources?: [string, string];
  format: "BO1" | "BO3" | "BO5";
  status: "pending" | "scheduled" | "live" | "finished";
  startsAt: string | null;
  scores: [number, number] | null;
  maps: { name: string; scores: [number, number] }[];
  winnerId: string | null;
}
export const matches: Match[] = [];
for (let round = 0; round < 4; round++)
  for (let position = 0; position < 8 / 2 ** round; position++)
    matches.push({
      id: `r${round}-${position}`,
      round,
      position,
      teamIds:
        round === 0
          ? [teams[position * 2].id, teams[position * 2 + 1].id]
          : [null, null],
      ...(round > 0
        ? {
            sources: [
              `r${round - 1}-${position * 2}`,
              `r${round - 1}-${position * 2 + 1}`,
            ] as [string, string],
          }
        : {}),
      format: round === 3 ? "BO5" : "BO3",
      status: "pending",
      startsAt: null,
      scores: null,
      maps: [],
      winnerId: null,
    });
export function participants(
  match: Match,
): [Team | undefined, Team | undefined] {
  return match.teamIds.map((id, i) => {
    const source = match.sources
      ? matches.find((m) => m.id === match.sources![i])
      : undefined;
    return teams.find((t) => t.id === (id ?? source?.winnerId));
  }) as [Team | undefined, Team | undefined];
}
export const config = {
  tournamentName: "NCL · Campus Series",
  startsAt: null as string | null,
  youtubeVideoId: null as string | null,
  contactEmail: null as string | null,
  rulesUrl: null as string | null,
  accent: "#c2ff45",
};
export const copy = {
  demo: text(
    "DEMO REJIMI · Barcha jamoa va juftliklar namuna. Rasmiy ma’lumotlar hali e’lon qilinmagan.",
    "ДЕМО · Команды и пары — примеры. Официальные данные ещё не опубликованы.",
    "DEMO MODE · All teams and pairings are placeholders. Official information is not yet announced.",
  ),
  eyebrow: text(
    "O‘ZBEKISTON UNIVERSITETLAR LIGASI",
    "УНИВЕРСИТЕТСКАЯ ЛИГА УЗБЕКИСТАНА",
    "UZBEKISTAN UNIVERSITY LEAGUE",
  ),
  hero1: text("KAMPUSDAN", "ИЗ КАМПУСА", "FROM CAMPUS."),
  hero2: text("KATTA SAHNAGA.", "НА БОЛЬШУЮ СЦЕНУ.", "TO THE BIG STAGE."),
  intro: text(
    "Yangi avlod. Yangi raqobat. O‘zbekiston talabalari uchun Counter-Strike 2 sahnasi.",
    "Новое поколение. Новое соперничество. Counter-Strike 2 для студентов Узбекистана.",
    "A new generation. A new rivalry. The Counter-Strike 2 stage for students of Uzbekistan.",
  ),
  explore: text("Turnirni ko‘rish", "Смотреть турнир", "Explore tournament"),
  watch: text("Efir markazi", "Центр трансляций", "Broadcast hub"),
  upcoming: text("Keyingi uchrashuvlar", "Следующие матчи", "Upcoming matches"),
  allMatches: text("Barcha uchrashuvlar", "Все матчи", "All matches"),
  pending: text("Sana kutilmoqda", "Дата ожидается", "Date to be announced"),
  tbd: text("Aniqlanadi", "Будет определено", "To be determined"),
  season: text(
    "YANGI MAVSUMGA TAYYORMISIZ?",
    "ГОТОВЫ К НОВОМУ СЕЗОНУ?",
    "READY FOR A NEW SEASON?",
  ),
  teams: text("Jamoalar", "Команды", "Teams"),
  format: text("Pley-off", "Плей-офф", "Playoffs"),
  discipline: text("O‘yin", "Дисциплина", "Discipline"),
  details: text("Batafsil", "Подробнее", "View details"),
  close: text("Yopish", "Закрыть", "Close"),
  noResults: text(
    "Natijalar hali mavjud emas. Yakunlangan uchrashuvlar shu yerda ko‘rinadi.",
    "Результатов пока нет. Завершённые матчи появятся здесь.",
    "No results yet. Completed matches will appear here.",
  ),
  results: text("So‘nggi natijalar", "Последние результаты", "Latest results"),
  news: text("Liga yangiliklari", "Новости лиги", "League updates"),
  newsTitle: text(
    "Yangi sahna. Yangi imkoniyatlar.",
    "Новая сцена. Новые возможности.",
    "A new stage. New possibilities.",
  ),
  newsBody: text(
    "NCL O‘zbekiston universitetlari uchun raqobat maydonini yaratmoqda. Turnir va ishtirok shartlari tasdiqlangach, shu yerda e’lon qilinadi.",
    "NCL создаёт соревновательную площадку для университетов Узбекистана. Детали турнира и условия участия появятся после подтверждения.",
    "NCL is creating a competitive stage for universities across Uzbekistan. Tournament details and eligibility will be published once confirmed.",
  ),
  placeholder: text("Namuna joyi", "Демонстрационный слот", "Demo slot"),
  offline: text(
    "Hozir efir yo‘q",
    "Сейчас нет трансляции",
    "Currently offline",
  ),
  offlineBody: text(
    "Rasmiy YouTube efiri sozlangach, translyatsiya shu yerda paydo bo‘ladi.",
    "Официальная трансляция YouTube появится здесь после настройки.",
    "The official YouTube broadcast will appear here once configured.",
  ),
  partners: text(
    "Birgalikda yangi sahna yaratamiz.",
    "Вместе создаём новую сцену.",
    "Building the next stage. Together.",
  ),
  partnerBody: text(
    "Hamkorlar hali e’lon qilinmagan. Quyidagi darajalar faqat rejalashtirilgan joylardir.",
    "Партнёры ещё не объявлены. Уровни ниже — только планируемые места.",
    "Partners have not been announced. The tiers below are proposed placeholders only.",
  ),
  about: text(
    "Talabalar. Raqobat. Hamjamiyat.",
    "Студенты. Соревнование. Сообщество.",
    "Students. Competition. Community.",
  ),
  contact: text(
    "Aloqa ma’lumotlari tez orada e’lon qilinadi.",
    "Контактные данные будут опубликованы позже.",
    "Official contact details will be announced.",
  ),
  all: text("Barchasi", "Все", "All"),
  scheduled: text("Rejalashtirilgan", "Запланировано", "Scheduled"),
  live: text("Jonli", "В эфире", "Live"),
  finished: text("Yakunlangan", "Завершено", "Finished"),
  empty: text(
    "Bu filtrga mos uchrashuvlar yo‘q.",
    "Нет матчей по этому фильтру.",
    "No matches match this filter.",
  ),
  rules: text("Qoidalar va bosqichlar", "Правила и этапы", "Rules & stages"),
  rulesBody: text(
    "Namuna format: 16 ta jamoa, bir martalik chiqarib yuborish. BO3 bosqichlari va BO5 final. Bu tasdiqlangan reglament emas. Ishtirok talablari, xaritalar, anti-cheat va nizolar tartibi rasmiy qoidalar bilan e’lon qilinadi.",
    "Демо-формат: 16 команд, олимпийская система. Матчи BO3 и финал BO5. Это не утверждённый регламент. Требования, карты, античит и порядок споров будут опубликованы в официальных правилах.",
    "Demo format: 16 teams, single elimination. BO3 rounds and a BO5 final. This is not an approved rulebook. Eligibility, map pool, anti-cheat and dispute procedures will be published with official rules.",
  ),
  bracketHint: text(
    "Tafsilotlar uchun juftlikni tanlang. Kichik ekranda yon tomonga suring.",
    "Выберите матч для подробностей. На небольшом экране прокрутите по горизонтали.",
    "Select a pairing for details. Scroll horizontally on smaller screens.",
  ),
  roster: text(
    "Tarkib hali tasdiqlanmagan",
    "Состав ещё не подтверждён",
    "Roster not yet confirmed",
  ),
  rounds: [
    text("1/8 final", "1/8 финала", "Round of 16"),
    text("Chorak final", "Четвертьфинал", "Quarterfinals"),
    text("Yarim final", "Полуфинал", "Semifinals"),
    text("Final", "Финал", "Grand final"),
  ],
};
