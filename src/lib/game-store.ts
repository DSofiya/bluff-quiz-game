import { getPrisma } from "@/lib/prisma";

export type Role = "ADMIN" | "HOST" | "PLAYER" | "SPECTATOR";
export type GamePhase =
  | "LOBBY"
  | "ANSWER_PHASE"
  | "ANSWER_PHASE_COMPLETE"
  | "VOTING_PHASE"
  | "ROUND_RESULTS"
  | "FINAL_RESULTS"
  | "FINISHED";

export type Player = {
  id: string;
  name: string;
  role: Role;
  teamId?: string;
};

export type Team = {
  id: string;
  name: string;
  color: string;
  score: number;
  members: Player[];
};

export type Question = {
  id: string;
  text: string;
  correctAnswer: string;
  wrongAnswer: string;
};

export type QuestionInput = {
  id?: string;
  text: string;
  correctAnswer: string;
  wrongAnswer: string;
};

export type SavedGameSummary = {
  code: string;
  title: string;
  phase: GamePhase;
  teamCount: 3 | 5;
  playerCount: number;
  questionCount: number;
  answerTimeLimit: number;
  voteTimeLimit: number;
  createdAt: string;
  teamNames: string[];
  questions: QuestionInput[];
};

export type TeamAnswer = {
  questionId: string;
  teamId: string;
  captainUserId: string;
  answerText: string;
  submittedAt: string;
};

export type AnswerOption = {
  id: string;
  questionId: string;
  type: "CORRECT" | "TEAM_FAKE" | "ADMIN_WRONG";
  text: string;
  teamId?: string;
  order: number;
};

export type Vote = {
  questionId: string;
  teamId: string;
  captainUserId: string;
  selectedAnswerId: string;
  selectedAnswerType: "CORRECT" | "TEAM_FAKE" | "ADMIN_WRONG";
  submittedAt: string;
};

export type PhaseCaptain = {
  teamId: string;
  userId: string;
  phase: "ANSWER" | "VOTE";
};

export type ScoreEvent = {
  questionId: string;
  teamId: string;
  points: number;
  reason: string;
};

export type Game = {
  id: string;
  code: string;
  title: string;
  adminId: string;
  hostId?: string;
  phase: GamePhase;
  teamCount: 3 | 5;
  playerCount: number;
  questionCount: number;
  answerTimeLimit: number;
  voteTimeLimit: number;
  allowOwnAnswerVote: boolean;
  showCorrectAnswer: boolean;
  currentQuestionIndex: number;
  phaseStartedAt?: string;
  phaseEndsAt?: string;
  timerPausedAt?: string;
  totalPausedSeconds: number;
  createdAt: string;
  players: Player[];
  teams: Team[];
  questions: Question[];
  answers: TeamAnswer[];
  answerOptions: AnswerOption[];
  votes: Vote[];
  captains: PhaseCaptain[];
  scoreEvents: ScoreEvent[];
};

type Store = {
  games: Map<string, Game>;
};

const defaultQuestions: Question[] = [
  {
    id: "q1",
    text: "Який фільм першим отримав Оскар у категорії найкращий анімаційний повнометражний фільм?",
    correctAnswer: "Шрек",
    wrongAnswer: "Корпорація монстрів",
  },
  {
    id: "q2",
    text: "Яка планета Сонячної системи має найкоротший день?",
    correctAnswer: "Юпітер",
    wrongAnswer: "Меркурій",
  },
  {
    id: "q3",
    text: "У якому місті розташований музей Лувр?",
    correctAnswer: "Париж",
    wrongAnswer: "Рим",
  },
  {
    id: "q4",
    text: "Яка країна подарувала США Статую Свободи?",
    correctAnswer: "Франція",
    wrongAnswer: "Велика Британія",
  },
  {
    id: "q5",
    text: "Як називається найбільший океан Землі?",
    correctAnswer: "Тихий океан",
    wrongAnswer: "Атлантичний океан",
  },
  {
    id: "q6",
    text: "Хто написав роман '1984'?",
    correctAnswer: "Джордж Орвелл",
    wrongAnswer: "Олдос Гакслі",
  },
  {
    id: "q7",
    text: "Який хімічний символ має золото?",
    correctAnswer: "Au",
    wrongAnswer: "Ag",
  },
  {
    id: "q8",
    text: "Яка тварина зображена на логотипі Ferrari?",
    correctAnswer: "Кінь",
    wrongAnswer: "Бик",
  },
  {
    id: "q9",
    text: "Скільки клавіш має стандартне фортепіано?",
    correctAnswer: "88",
    wrongAnswer: "76",
  },
  {
    id: "q10",
    text: "У якому році людина вперше висадилася на Місяць?",
    correctAnswer: "1969",
    wrongAnswer: "1972",
  },
  {
    id: "q11",
    text: "Яка мова має найбільше носіїв як рідна?",
    correctAnswer: "Китайська мандаринська",
    wrongAnswer: "Англійська",
  },
  {
    id: "q12",
    text: "Який елемент має атомний номер 1?",
    correctAnswer: "Водень",
    wrongAnswer: "Гелій",
  },
];

const teamPalette = [
  ["t1", "Червоні", "#dc2626"],
  ["t2", "Сині", "#2563eb"],
  ["t3", "Зелені", "#16a34a"],
  ["t4", "Жовті", "#ca8a04"],
  ["t5", "Білі", "#64748b"],
] as const;

function store(): Store {
  const globalStore = globalThis as typeof globalThis & { bluffQuizStore?: Store };
  if (!globalStore.bluffQuizStore) {
    globalStore.bluffQuizStore = { games: new Map() };
  }
  return globalStore.bluffQuizStore;
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function code() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function shuffle<T>(items: T[]) {
  return [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function getGameOrThrow(gameCode: string) {
  const game = store().games.get(gameCode.toUpperCase());
  if (!game) throw new Error("Гру не знайдено");
  return game;
}

function shouldUseDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function jsonGame(game: Game) {
  return JSON.parse(JSON.stringify(game)) as Game;
}

async function loadGameOrThrow(gameCode: string) {
  if (!shouldUseDatabase()) return getGameOrThrow(gameCode);
  const prisma = getPrisma();
  const record = await prisma.gameState.findUnique({ where: { code: gameCode.toUpperCase() } });
  if (!record) throw new Error("Гру не знайдено");
  return record.data as unknown as Game;
}

async function saveGame(game: Game) {
  if (!shouldUseDatabase()) {
    store().games.set(game.code, game);
    return game;
  }
  const prisma = getPrisma();
  const data = jsonGame(game);
  await prisma.gameState.upsert({
    where: { code: game.code },
    create: { code: game.code, data },
    update: { data },
  });
  return game;
}

function currentQuestion(game: Game) {
  return game.questions[game.currentQuestionIndex];
}

function answeredTeamIds(game: Game, questionId = currentQuestion(game)?.id) {
  return new Set(game.answers.filter((answer) => answer.questionId === questionId).map((answer) => answer.teamId));
}

function votedTeamIds(game: Game, questionId = currentQuestion(game)?.id) {
  return new Set(game.votes.filter((vote) => vote.questionId === questionId).map((vote) => vote.teamId));
}

function phaseCaptain(game: Game, teamId: string, phase: "ANSWER" | "VOTE") {
  return game.captains.find((captain) => captain.teamId === teamId && captain.phase === phase);
}

function setPhaseTimer(game: Game, seconds: number) {
  const now = Date.now();
  game.phaseStartedAt = new Date(now).toISOString();
  game.phaseEndsAt = new Date(now + Math.max(1, seconds) * 1000).toISOString();
  game.timerPausedAt = undefined;
  game.totalPausedSeconds = 0;
}

function clearPhaseTimer(game: Game) {
  game.phaseStartedAt = undefined;
  game.phaseEndsAt = undefined;
  game.timerPausedAt = undefined;
  game.totalPausedSeconds = 0;
}

function pauseTimer(game: Game) {
  if (!game.phaseEndsAt || game.timerPausedAt) return;
  game.timerPausedAt = new Date().toISOString();
}

function resumeTimer(game: Game) {
  if (!game.phaseEndsAt || !game.timerPausedAt) return;
  const pausedMs = Date.now() - new Date(game.timerPausedAt).getTime();
  game.phaseEndsAt = new Date(new Date(game.phaseEndsAt).getTime() + pausedMs).toISOString();
  game.totalPausedSeconds += Math.round(pausedMs / 1000);
  game.timerPausedAt = undefined;
}

function extendTimer(game: Game, seconds: number) {
  if (!game.phaseEndsAt) {
    setPhaseTimer(game, seconds);
    return;
  }
  game.phaseEndsAt = new Date(new Date(game.phaseEndsAt).getTime() + seconds * 1000).toISOString();
}

function isTimerExpired(game: Game) {
  return Boolean(game.phaseEndsAt && !game.timerPausedAt && Date.now() >= new Date(game.phaseEndsAt).getTime());
}

function sanitizeQuestions(questions: QuestionInput[] | undefined, fallbackCount: number) {
  const customQuestions = questions
    ?.map((question, index) => ({
      id: question.id || id("q"),
      text: (question.text ?? "").trim(),
      correctAnswer: (question.correctAnswer ?? "").trim(),
      wrongAnswer: (question.wrongAnswer ?? "").trim(),
      order: index,
    }))
    .filter((question) => question.text && question.correctAnswer && question.wrongAnswer);

  if (customQuestions?.length) {
    return customQuestions.map(({ id: questionId, text, correctAnswer, wrongAnswer }) => ({ id: questionId, text, correctAnswer, wrongAnswer }));
  }

  return defaultQuestions.slice(0, Math.max(1, Math.min(fallbackCount, defaultQuestions.length)));
}

function createVoteOptions(game: Game, question: Question) {
  const existing = game.answerOptions
    .filter((option) => option.questionId === question.id)
    .sort((a, b) => a.order - b.order);
  if (existing.length) return existing;

    const fakeOptions = game.answers
      .filter((answer) => answer.questionId === question.id && answer.answerText.trim())
      .map<AnswerOption>((answer) => ({
        id: `${question.id}:${answer.teamId}`,
        questionId: question.id,
        type: "TEAM_FAKE",
        text: answer.answerText,
        teamId: answer.teamId,
        order: 0,
      }));

  const options = shuffle([
      { id: `${question.id}:correct`, questionId: question.id, type: "CORRECT" as const, text: question.correctAnswer, order: 0 },
      { id: `${question.id}:admin-wrong`, questionId: question.id, type: "ADMIN_WRONG" as const, text: question.wrongAnswer, order: 0 },
      ...fakeOptions,
    ]).map((option, order) => ({ ...option, order }));
  game.answerOptions.push(...options);
  return options;
}

function scoreQuestion(game: Game, question: Question) {
  const existing = game.scoreEvents.some((event) => event.questionId === question.id);
  if (existing) return;

  for (const vote of game.votes.filter((item) => item.questionId === question.id)) {
    if (vote.selectedAnswerType === "CORRECT") {
      game.scoreEvents.push({
        questionId: question.id,
        teamId: vote.teamId,
        points: 100,
        reason: "Правильна відповідь",
      });
    }

    if (vote.selectedAnswerType === "TEAM_FAKE") {
      const targetTeamId = vote.selectedAnswerId.split(":")[1];
      if (targetTeamId && targetTeamId !== vote.teamId) {
        game.scoreEvents.push({
          questionId: question.id,
          teamId: targetTeamId,
          points: 50,
          reason: "Інша команда обрала фейкову відповідь",
        });
      }
    }

    if (vote.selectedAnswerType === "ADMIN_WRONG") {
      game.scoreEvents.push({
        questionId: question.id,
        teamId: vote.teamId,
        points: -50,
        reason: "Штрафна неправильна відповідь адміністратора",
      });
    }
  }

  for (const team of game.teams) {
    team.score = game.scoreEvents
      .filter((event) => event.teamId === team.id)
      .reduce((total, event) => total + event.points, 0);
  }
}

export async function createGame(input: {
  title: string;
  adminName: string;
  teamCount: 3 | 5;
  playerCount: number;
  questionCount: number;
  answerTimeLimit: number;
  voteTimeLimit: number;
  questions?: QuestionInput[];
  teamNames?: string[];
}) {
  const admin: Player = { id: id("u"), name: input.adminName || "Адміністратор", role: "ADMIN" };
  const selectedQuestions = sanitizeQuestions(input.questions, input.questionCount);
  const teamNames = input.teamNames ?? [];
  const game: Game = {
    id: id("g"),
    code: code(),
    title: input.title || "Bluff Quiz",
    adminId: admin.id,
    phase: "LOBBY",
    teamCount: input.teamCount,
    playerCount: Math.max(1, input.playerCount),
    questionCount: selectedQuestions.length,
    answerTimeLimit: input.answerTimeLimit,
    voteTimeLimit: input.voteTimeLimit,
    allowOwnAnswerVote: false,
    showCorrectAnswer: true,
    currentQuestionIndex: 0,
    phaseStartedAt: undefined,
    phaseEndsAt: undefined,
    timerPausedAt: undefined,
    totalPausedSeconds: 0,
    createdAt: new Date().toISOString(),
    players: [admin],
    teams: teamPalette.slice(0, input.teamCount).map(([teamId, name, color], index) => ({
      id: teamId,
      name: teamNames[index]?.trim() || name,
      color,
      score: 0,
      members: [],
    })),
    questions: selectedQuestions,
    answers: [],
    answerOptions: [],
    votes: [],
    captains: [],
    scoreEvents: [],
  };
  await saveGame(game);
  return { game, player: admin };
}

function savedGameSummary(game: Game): SavedGameSummary {
  return {
    code: game.code,
    title: game.title,
    phase: game.phase,
    teamCount: game.teamCount,
    playerCount: game.playerCount,
    questionCount: game.questionCount,
    answerTimeLimit: game.answerTimeLimit,
    voteTimeLimit: game.voteTimeLimit,
    createdAt: game.createdAt,
    teamNames: game.teams.map((team) => team.name),
    questions: game.questions.map((question) => ({
      id: question.id,
      text: question.text,
      correctAnswer: question.correctAnswer,
      wrongAnswer: question.wrongAnswer,
    })),
  };
}

export async function listSavedGames() {
  if (!shouldUseDatabase()) {
    return Array.from(store().games.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(savedGameSummary);
  }
  const prisma = getPrisma();
  const records = await prisma.gameState.findMany({ orderBy: { updatedAt: "desc" } });
  return records.map((record) => savedGameSummary(record.data as unknown as Game));
}

export async function deleteSavedGame(gameCode: string) {
  const normalizedCode = gameCode.toUpperCase();
  if (!shouldUseDatabase()) {
    store().games.delete(normalizedCode);
    return null;
  }
  const prisma = getPrisma();
  await prisma.gameState.delete({ where: { code: normalizedCode } });
  return null;
}

export async function joinGame(input: { code: string; name: string; role: Role; teamId?: string }) {
  const game = await loadGameOrThrow(input.code);
  if (input.role === "PLAYER" && game.phase !== "LOBBY") {
    throw new Error("Гравці можуть приєднуватися тільки до старту гри");
  }
  if (input.role === "PLAYER" && game.players.filter((player) => player.role === "PLAYER").length >= game.playerCount) {
    throw new Error("Досягнуто максимальну кількість гравців");
  }
  const player: Player = { id: id("u"), name: input.name || "Гравець", role: input.role, teamId: input.teamId };
  game.players.push(player);
  if (input.role === "HOST") {
    game.hostId = player.id;
  }
  if (input.role === "PLAYER") {
    const team = game.teams.find((item) => item.id === input.teamId) ?? game.teams.sort((a, b) => a.members.length - b.members.length)[0];
    player.teamId = team.id;
    team.members.push(player);
  }
  await saveGame(game);
  return { game, player };
}

export async function readGame(gameCode: string) {
  const game = await loadGameOrThrow(gameCode);
  advanceExpiredTimer(game);
  await saveGame(game);
  return game;
}

export async function updateGameQuestions(gameCode: string, questions: QuestionInput[]) {
  const game = await loadGameOrThrow(gameCode);
  if (game.phase !== "LOBBY") {
    throw new Error("Питання можна редагувати тільки в лобі, до старту гри");
  }
  const selectedQuestions = sanitizeQuestions(questions, questions.length);
  game.questions = selectedQuestions;
  game.questionCount = selectedQuestions.length;
  game.currentQuestionIndex = 0;
  game.answers = [];
  game.answerOptions = [];
  game.votes = [];
  game.scoreEvents = [];
  await saveGame(game);
  return game;
}

export async function setPhaseCaptain(input: { code: string; teamId: string; userId: string; phase: "ANSWER" | "VOTE" }) {
  const game = await loadGameOrThrow(input.code);
  if (!["LOBBY", "ANSWER_PHASE_COMPLETE"].includes(game.phase)) {
    throw new Error("Капітанів можна змінювати до активної фази");
  }
  const team = game.teams.find((item) => item.id === input.teamId);
  if (!team) throw new Error("Команду не знайдено");
  const player = team.members.find((member) => member.id === input.userId);
  if (!player) throw new Error("Капітан має бути гравцем цієї команди");
  game.captains = game.captains.filter((captain) => !(captain.teamId === input.teamId && captain.phase === input.phase));
  game.captains.push({ teamId: input.teamId, userId: input.userId, phase: input.phase });
  await saveGame(game);
  return game;
}

export async function updateTeam(input: { code: string; teamId: string; name: string }) {
  const game = await loadGameOrThrow(input.code);
  if (game.phase !== "LOBBY") {
    throw new Error("Назви команд можна змінювати тільки до старту гри");
  }
  const team = game.teams.find((item) => item.id === input.teamId);
  if (!team) throw new Error("Команду не знайдено");
  const name = input.name.trim();
  if (!name) throw new Error("Назва команди не може бути порожньою");
  team.name = name;
  await saveGame(game);
  return game;
}

export async function endGame(gameCode: string) {
  const game = await loadGameOrThrow(gameCode);
  game.phase = "FINISHED";
  clearPhaseTimer(game);
  await saveGame(game);
  return game;
}

export async function leavePlayer(input: { code: string; playerId: string }) {
  const game = await loadGameOrThrow(input.code);
  const player = game.players.find((item) => item.id === input.playerId);
  if (!player) throw new Error("Гравця не знайдено");
  if (player.role !== "PLAYER") throw new Error("Ця дія доступна тільки гравцю");

  game.players = game.players.filter((item) => item.id !== player.id);
  for (const team of game.teams) {
    team.members = team.members.filter((member) => member.id !== player.id);
  }
  game.captains = game.captains.filter((captain) => captain.userId !== player.id);

  await saveGame(game);
  return game;
}

export async function hostAction(gameCode: string, action: string) {
  const game = await loadGameOrThrow(gameCode);
  const question = currentQuestion(game);

  if (action === "start-game") {
    ensureCaptains(game, "ANSWER");
    game.currentQuestionIndex = 0;
    game.phase = "ANSWER_PHASE";
    setPhaseTimer(game, game.answerTimeLimit);
  }

  if (action === "next-answer-question" || action === "host-next") {
    if (game.currentQuestionIndex < game.questions.length - 1) {
      game.currentQuestionIndex += 1;
      game.phase = "ANSWER_PHASE";
      setPhaseTimer(game, game.answerTimeLimit);
    } else {
      game.phase = "ANSWER_PHASE_COMPLETE";
      clearPhaseTimer(game);
    }
  }

  if (action === "start-voting-phase") {
    ensureCaptains(game, "VOTE");
    game.currentQuestionIndex = 0;
    createVoteOptions(game, currentQuestion(game));
    game.phase = "VOTING_PHASE";
    setPhaseTimer(game, game.voteTimeLimit);
  }

  if (action === "show-round-results") {
    if (game.phase === "VOTING_PHASE" && votedTeamIds(game).size < game.teams.length && !isTimerExpired(game)) {
      throw new Error("Результати можна показати після голосування всіх команд або завершення таймера");
    }
    scoreQuestion(game, question);
    game.phase = "ROUND_RESULTS";
    clearPhaseTimer(game);
  }

  if (action === "next-vote-question") {
    if (game.currentQuestionIndex < game.questions.length - 1) {
      game.currentQuestionIndex += 1;
      createVoteOptions(game, currentQuestion(game));
      game.phase = "VOTING_PHASE";
      setPhaseTimer(game, game.voteTimeLimit);
    } else {
      game.phase = "FINAL_RESULTS";
      clearPhaseTimer(game);
    }
  }

  if (action === "pause-timer") {
    pauseTimer(game);
  }

  if (action === "resume-timer") {
    resumeTimer(game);
  }

  if (action === "extend-answer-time") {
    extendTimer(game, 30);
  }

  if (action === "extend-vote-time") {
    extendTimer(game, 30);
  }

  if (action === "finish") {
    game.phase = "FINISHED";
    clearPhaseTimer(game);
  }

  await saveGame(game);
  return game;
}

export async function submitAnswer(input: { code: string; playerId: string; answerText: string }) {
  const game = await loadGameOrThrow(input.code);
  if (game.phase !== "ANSWER_PHASE") throw new Error("Зараз не фаза відповідей");
  const question = currentQuestion(game);
  const player = game.players.find((item) => item.id === input.playerId);
  if (!player?.teamId) throw new Error("Гравець не в команді");
  const captain = phaseCaptain(game, player.teamId, "ANSWER");
  if (captain?.userId !== player.id) throw new Error("Тільки капітан Частини 1 може відповідати");
  if (answeredTeamIds(game).has(player.teamId)) throw new Error("Відповідь уже підтверджена");

  game.answers.push({
    questionId: question.id,
    teamId: player.teamId,
    captainUserId: player.id,
    answerText: input.answerText.trim(),
    submittedAt: new Date().toISOString(),
  });

  if (answeredTeamIds(game).size >= game.teams.length) {
    clearPhaseTimer(game);
  }

  await saveGame(game);
  return game;
}

export async function submitVote(input: { code: string; playerId: string; selectedAnswerId: string }) {
  const game = await loadGameOrThrow(input.code);
  if (game.phase !== "VOTING_PHASE") throw new Error("Зараз не фаза голосування");
  const question = currentQuestion(game);
  const player = game.players.find((item) => item.id === input.playerId);
  if (!player?.teamId) throw new Error("Гравець не в команді");
  const captain = phaseCaptain(game, player.teamId, "VOTE");
  if (captain?.userId !== player.id) throw new Error("Тільки капітан Частини 2 може голосувати");
  if (votedTeamIds(game).has(player.teamId)) throw new Error("Голос уже підтверджено");

  const option = createVoteOptions(game, question).find((item) => item.id === input.selectedAnswerId);
  if (!option) throw new Error("Варіант не знайдено");
  if (!game.allowOwnAnswerVote && option.teamId === player.teamId) {
    throw new Error("За свою фейкову відповідь голосувати не можна");
  }

  game.votes.push({
    questionId: question.id,
    teamId: player.teamId,
    captainUserId: player.id,
    selectedAnswerId: option.id,
    selectedAnswerType: option.type,
    submittedAt: new Date().toISOString(),
  });

  if (votedTeamIds(game).size >= game.teams.length) {
    clearPhaseTimer(game);
  }

  await saveGame(game);
  return game;
}

function ensureCaptains(game: Game, phase: "ANSWER" | "VOTE") {
  const missingTeams = game.teams.filter((team) => !phaseCaptain(game, team.id, phase));
  if (missingTeams.length) {
    throw new Error("Потрібно призначити капітанів для всіх команд");
  }
}

function advanceExpiredTimer(game: Game) {
  if (!game.phaseEndsAt || game.timerPausedAt || Date.now() < new Date(game.phaseEndsAt).getTime()) return;

  if (game.phase === "ANSWER_PHASE") {
    if (game.currentQuestionIndex < game.questions.length - 1) {
      game.currentQuestionIndex += 1;
      setPhaseTimer(game, game.answerTimeLimit);
    } else {
      game.phase = "ANSWER_PHASE_COMPLETE";
      clearPhaseTimer(game);
    }
  }

  if (game.phase === "VOTING_PHASE") return;
}

export function publicSnapshot(game: Game) {
  const question = currentQuestion(game);
  return {
    ...game,
    currentQuestion: question,
    answeredTeamIds: Array.from(answeredTeamIds(game, question?.id)),
    votedTeamIds: Array.from(votedTeamIds(game, question?.id)),
    voteOptions: question
      ? game.answerOptions.filter((option) => option.questionId === question.id).sort((a, b) => a.order - b.order)
      : [],
    captains: game.captains.map((captain) => ({
      ...captain,
      playerName: game.players.find((player) => player.id === captain.userId)?.name,
      teamName: game.teams.find((team) => team.id === captain.teamId)?.name,
    })),
  };
}
