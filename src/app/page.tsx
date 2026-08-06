"use client";

import { Crown, Eye, Flag, LogIn, Play, Plus, Save, Send, Trash2, Trophy, Users } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { AnswerOption, Game, Player, QuestionInput, Role, SavedGameSummary } from "@/lib/game-store";
import { ShareCard } from "@/components/share-card";

type Snapshot = Omit<Game, "captains"> & {
  currentQuestion?: { id: string; text: string; correctAnswer: string; wrongAnswer: string };
  answeredTeamIds: string[];
  votedTeamIds: string[];
  voteOptions: AnswerOption[];
  captains: Array<{ teamId: string; userId: string; phase: "ANSWER" | "VOTE"; playerName?: string; teamName?: string }>;
};

type ApiResponse = {
  game?: Snapshot;
  games?: SavedGameSummary[];
  player?: Player;
  error?: string;
};

const phaseLabels: Record<string, string> = {
  LOBBY: "Лобі",
  ANSWER_PHASE: "Введення відповідей",
  ANSWER_PHASE_COMPLETE: "Частина 1 завершена",
  VOTING_PHASE: "Голосування",
  ROUND_RESULTS: "Результати питання",
  FINAL_RESULTS: "Фінальні результати",
  FINISHED: "Гру завершено",
};

const starterQuestions: QuestionInput[] = [
  {
    text: "Який фільм першим отримав Оскар у категорії найкращий анімаційний повнометражний фільм?",
    correctAnswer: "Шрек",
    wrongAnswer: "Корпорація монстрів",
  },
  { text: "Яка планета Сонячної системи має найкоротший день?", correctAnswer: "Юпітер", wrongAnswer: "Меркурій" },
  { text: "У якому місті розташований музей Лувр?", correctAnswer: "Париж", wrongAnswer: "Рим" },
  { text: "Яка країна подарувала США Статую Свободи?", correctAnswer: "Франція", wrongAnswer: "Велика Британія" },
  { text: "Як називається найбільший океан Землі?", correctAnswer: "Тихий океан", wrongAnswer: "Атлантичний океан" },
  { text: "Хто написав роман '1984'?", correctAnswer: "Джордж Орвелл", wrongAnswer: "Олдос Гакслі" },
  { text: "Який хімічний символ має золото?", correctAnswer: "Au", wrongAnswer: "Ag" },
  { text: "Скільки клавіш має стандартне фортепіано?", correctAnswer: "88", wrongAnswer: "76" },
  { text: "У якому році людина вперше висадилася на Місяць?", correctAnswer: "1969", wrongAnswer: "1972" },
  { text: "Яка мова має найбільше носіїв як рідна?", correctAnswer: "Китайська мандаринська", wrongAnswer: "Англійська" },
];

export default function Home() {
  const [game, setGame] = useState<Snapshot | null>(null);
  const [player, setPlayer] = useState<Player | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("bluff-quiz-session");
    return saved ? (JSON.parse(saved) as { player: Player }).player : null;
  });
  const [error, setError] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [joinCode, setJoinCode] = useState(() => {
    if (typeof window === "undefined") return "";
    const saved = localStorage.getItem("bluff-quiz-session");
    return saved ? (JSON.parse(saved) as { code: string }).code : "";
  });
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("PLAYER");
  const [setupQuestions, setSetupQuestions] = useState<QuestionInput[]>(starterQuestions);
  const [setupTitle, setSetupTitle] = useState("Вечірній квіз");
  const [adminName, setAdminName] = useState("Адміністратор");
  const [setupTeamCount, setSetupTeamCount] = useState<3 | 5>(3);
  const [setupPlayerCount, setSetupPlayerCount] = useState(9);
  const [setupAnswerTimeLimit, setSetupAnswerTimeLimit] = useState(60);
  const [setupVoteTimeLimit, setSetupVoteTimeLimit] = useState(45);
  const [setupTeamNames, setSetupTeamNames] = useState<string[]>(["Червоні", "Сині", "Зелені"]);
  const [savedGames, setSavedGames] = useState<SavedGameSummary[]>([]);

  const loadGame = useCallback(async (code: string, quiet = false) => {
    const response = await fetch(`/api/game?code=${encodeURIComponent(code)}`);
    const data = (await response.json()) as ApiResponse;
    if (data.error) {
      if (!quiet) setError(data.error);
      return;
    }
    if (data.game) setGame(data.game);
  }, []);

  const loadSavedGames = useCallback(async () => {
    const response = await fetch("/api/game");
    const data = (await response.json()) as ApiResponse;
    if (data.games) setSavedGames(data.games);
  }, []);

  async function call(body: Record<string, unknown>, quiet = false) {
    if (!quiet) setError("");
    const response = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as ApiResponse;
    if (data.error) {
      if (!quiet) setError(data.error);
      return null;
    }
    if (data.game) setGame(data.game);
    if (data.player) {
      setPlayer(data.player);
      localStorage.setItem("bluff-quiz-session", JSON.stringify({ code: data.game?.code ?? body.code, player: data.player }));
    }
    return data;
  }

  useEffect(() => {
    if (!joinCode || !player) return;
    void Promise.resolve().then(() => loadGame(joinCode, true));
  }, [joinCode, loadGame, player]);

  useEffect(() => {
    void Promise.resolve().then(loadSavedGames);
  }, [loadSavedGames]);

  useEffect(() => {
    if (!game?.code) return;
    const timer = setInterval(() => loadGame(game.code, true), 1500);
    return () => clearInterval(timer);
  }, [game?.code, loadGame]);

  const myTeam = useMemo(() => game?.teams.find((team) => team.id === player?.teamId), [game, player]);
  const answerCaptain = useMemo(
    () => game?.captains.find((captain) => captain.teamId === player?.teamId && captain.phase === "ANSWER"),
    [game, player],
  );
  const voteCaptain = useMemo(
    () => game?.captains.find((captain) => captain.teamId === player?.teamId && captain.phase === "VOTE"),
    [game, player],
  );
  const isHost = player?.role === "HOST";
  const isAnswerCaptain = answerCaptain?.userId === player?.id;
  const isVoteCaptain = voteCaptain?.userId === player?.id;
  const myAnswer = game?.answers.find(
    (answer) => answer.questionId === game.currentQuestion?.id && answer.teamId === player?.teamId,
  );
  const myVote = game?.votes.find((vote) => vote.questionId === game.currentQuestion?.id && vote.teamId === player?.teamId);

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    call({
      action: "create",
      title: setupTitle,
      adminName,
      teamCount: setupTeamCount,
      playerCount: setupPlayerCount,
      questionCount: setupQuestions.length,
      answerTimeLimit: setupAnswerTimeLimit,
      voteTimeLimit: setupVoteTimeLimit,
      questions: setupQuestions,
      teamNames: setupTeamNames.slice(0, setupTeamCount),
    });
  }

  function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    call({ action: "join", code: joinCode, name, role, teamId: role === "PLAYER" ? new FormData(event.currentTarget).get("teamId") : undefined });
  }

  function host(action: string) {
    if (!game) return;
    call({ action, code: game.code });
  }

  function updateQuestions(questions: QuestionInput[]) {
    if (!game) return;
    call({ action: "update-questions", code: game.code, questions });
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!game || !player) return;
    call({ action: "submit-answer", code: game.code, playerId: player.id, answerText }).then((data) => {
      if (data) setAnswerText("");
    });
  }

  function vote(optionId: string) {
    if (!game || !player) return;
    call({ action: "submit-vote", code: game.code, playerId: player.id, selectedAnswerId: optionId });
  }

  async function deleteSavedGame(code: string) {
    const response = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-game", code }),
    });
    const data = (await response.json()) as ApiResponse;
    if (data.error) {
      setError(data.error);
      return;
    }
    if (data.games) setSavedGames(data.games);
    if (game?.code === code) resetLocalOnly();
  }

  function restoreSavedGame(savedGame: SavedGameSummary) {
    setSetupTitle(savedGame.title);
    setSetupTeamCount(savedGame.teamCount);
    setSetupPlayerCount(savedGame.playerCount);
    setSetupAnswerTimeLimit(savedGame.answerTimeLimit);
    setSetupVoteTimeLimit(savedGame.voteTimeLimit);
    setSetupQuestions(savedGame.questions.length ? savedGame.questions : starterQuestions);
    setSetupTeamNames(normalizeTeamNames(savedGame.teamNames, savedGame.teamCount));
  }

  function updateSetupTeamCount(value: 3 | 5) {
    setSetupTeamCount(value);
    setSetupTeamNames((current) => normalizeTeamNames(current, value));
  }

  function updateSetupTeamName(index: number, value: string) {
    setSetupTeamNames((current) => current.map((name, itemIndex) => (itemIndex === index ? value : name)));
  }

  function resetLocalOnly() {
    localStorage.removeItem("bluff-quiz-session");
    setGame(null);
    setPlayer(null);
    setError("");
    setAnswerText("");
  }

  async function resetLocal() {
    if (game && player?.role === "PLAYER") {
      const data = await call({ action: "leave-player", code: game.code, playerId: player.id }, true);
      if (!data) return;
    }
    if (game && ["ADMIN", "HOST"].includes(player?.role ?? "")) {
      const data = await call({ action: "end-game", code: game.code }, true);
      if (!data) return;
    }
    resetLocalOnly();
    void loadSavedGames();
  }

  if (game && player?.role === "ADMIN") {
    return <AdminDashboard game={game} error={error} onReset={resetLocal} />;
  }

  if (!game || !player) {
    return (
      <main className="min-h-screen bg-[#f7f4ef] text-slate-950">
        <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium">
              <Flag size={16} /> Командна гра з фейковими відповідями
            </div>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-5xl font-bold leading-tight text-slate-950">Bluff Quiz</h1>
              <p className="max-w-xl text-lg leading-8 text-slate-700">
                Ведучий запускає питання, капітан Частини 1 вводить фейкові відповіді, а капітан Частини 2 голосує за команду.
              </p>
            </div>
          </section>

          <section className="grid gap-4">
            <form onSubmit={create} className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                <Crown size={20} /> Створити гру
              </h2>
              <div className="grid gap-3">
                <input className="input" placeholder="Назва гри" value={setupTitle} onChange={(event) => setSetupTitle(event.target.value)} />
                <input className="input" placeholder="Ім'я адміністратора" value={adminName} onChange={(event) => setAdminName(event.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <label className="label">
                    Команди
                    <select className="input" value={setupTeamCount} onChange={(event) => updateSetupTeamCount(Number(event.target.value) === 5 ? 5 : 3)}>
                      <option value="3">3</option>
                      <option value="5">5</option>
                    </select>
                  </label>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-600">Питань</p>
                    <p className="text-2xl font-bold">{setupQuestions.length}</p>
                  </div>
                  <label className="label">
                    Гравців
                    <input className="input" type="number" min="1" value={setupPlayerCount} onChange={(event) => setSetupPlayerCount(Number(event.target.value) || 1)} />
                  </label>
                </div>
                <div className="grid gap-2">
                  {setupTeamNames.slice(0, setupTeamCount).map((teamName, index) => (
                    <label key={index} className="label">
                      Назва команди {index + 1}
                      <input className="input" value={teamName} onChange={(event) => updateSetupTeamName(index, event.target.value)} />
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="label">
                    Відповідь, сек
                    <input className="input" type="number" min="10" value={setupAnswerTimeLimit} onChange={(event) => setSetupAnswerTimeLimit(Number(event.target.value) || 10)} />
                  </label>
                  <label className="label">
                    Голосування, сек
                    <input className="input" type="number" min="10" value={setupVoteTimeLimit} onChange={(event) => setSetupVoteTimeLimit(Number(event.target.value) || 10)} />
                  </label>
                </div>
                <button className="primary-button" type="submit">
                  <Play size={18} /> Створити
                </button>
              </div>
            </form>

            <SavedGamesPanel games={savedGames} onRestore={restoreSavedGame} onDelete={deleteSavedGame} />

            <QuestionEditor
              title="Питання для нової гри"
              questions={setupQuestions}
              onChange={setSetupQuestions}
              minRows={1}
            />

            <form onSubmit={join} className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                <LogIn size={20} /> Увійти в гру
              </h2>
              <div className="grid gap-3">
                <input className="input uppercase" placeholder="Код гри" value={joinCode} onChange={(event) => setJoinCode(event.target.value)} />
                <input className="input" placeholder="Ваше ім'я" value={name} onChange={(event) => setName(event.target.value)} />
                <select className="input" value={role} onChange={(event) => setRole(event.target.value as Role)}>
                  <option value="PLAYER">Гравець</option>
                  <option value="SPECTATOR">Spectator</option>
                </select>
                <TeamPicker game={game} />
                <button className="secondary-button" type="submit">
                  Увійти
                </button>
              </div>
            </form>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-slate-950">
      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Код гри: {game.code}</p>
            <h1 className="text-2xl font-bold">{game.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold">{phaseLabels[game.phase]}</span>
            <button className="ghost-button" onClick={resetLocal} type="button">
              Вийти
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[280px_1fr_340px]">
        <aside className="space-y-4">
          <Panel title="Команди" icon={<Users size={18} />}>
            <div className="space-y-3">
              {game.teams.map((team) => (
                <div key={team.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: team.color }} />
                      {team.name}
                    </span>
                    <span className="font-bold">{team.score}</span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    {team.members.length ? team.members.map((member) => <p key={member.id}>{member.name}</p>) : <p>Немає гравців</p>}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </aside>

        <section className="space-y-5">
          {isHost && game.phase === "LOBBY" && <HostQuestionManager game={game} onSave={updateQuestions} />}
          <Panel title={`Питання ${game.currentQuestionIndex + 1} з ${game.questionCount}`} icon={<Flag size={18} />}>
            <div className="space-y-4">
              <p className="text-2xl font-semibold leading-snug">{game.currentQuestion?.text ?? "Очікуємо старт гри"}</p>
              <ProgressRows game={game} />
              {game.phase === "ANSWER_PHASE" && player.role === "PLAYER" && (
                <CaptainAnswerForm
                  isCaptain={isAnswerCaptain}
                  captainName={answerCaptain?.playerName}
                  myAnswer={myAnswer?.answerText}
                  answerText={answerText}
                  setAnswerText={setAnswerText}
                  onSubmit={submitAnswer}
                />
              )}
              {(game.phase === "VOTING_PHASE" || game.phase === "ROUND_RESULTS") && (
                <VoteOptions
                  game={game}
                  player={player}
                  myVoteId={myVote?.selectedAnswerId}
                  canVote={player.role === "PLAYER" && isVoteCaptain && game.phase === "VOTING_PHASE" && !myVote}
                  voteCaptainName={voteCaptain?.playerName}
                  onVote={vote}
                />
              )}
              {player.role === "SPECTATOR" && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-slate-700">
                  Ви дивитесь публічний екран гри. Ввід відповідей і голосування доступні тільки капітанам команд.
                </div>
              )}
            </div>
          </Panel>
          <Results game={game} />
        </section>

        <aside className="space-y-4">
          {isHost && <HostControls game={game} onAction={host} />}
          <Panel title="Капітани фаз" icon={<Crown size={18} />}>
            <div className="space-y-3 text-sm">
              {game.teams.map((team) => {
                const answer = game.captains.find((captain) => captain.teamId === team.id && captain.phase === "ANSWER");
                const voteCap = game.captains.find((captain) => captain.teamId === team.id && captain.phase === "VOTE");
                return (
                  <div key={team.id} className="rounded-md bg-slate-50 p-3">
                    <p className="font-semibold">{team.name}</p>
                    <p>Частина 1: {answer?.playerName ?? "ще не призначено"}</p>
                    <p>Частина 2: {voteCap?.playerName ?? "ще не призначено"}</p>
                  </div>
                );
              })}
            </div>
          </Panel>
          {myTeam && (
            <Panel title="Мій екран" icon={<Eye size={18} />}>
              <p className="text-sm text-slate-600">Команда</p>
              <p className="mb-3 text-lg font-bold">{myTeam.name}</p>
              <p className="text-sm text-slate-600">
                {isAnswerCaptain && "Ви капітан Частини 1"}
                {isVoteCaptain && "Ви капітан Частини 2"}
                {!isAnswerCaptain && !isVoteCaptain && "Ви бачите перебіг гри"}
              </p>
            </Panel>
          )}
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </aside>
      </div>
    </main>
  );
}

function TeamPicker({ game }: { game: Snapshot | null }) {
  if (!game) return null;
  return (
    <select name="teamId" className="input">
      {game.teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function normalizeTeamNames(teamNames: string[], teamCount: 3 | 5) {
  const fallback = ["Червоні", "Сині", "Зелені", "Жовті", "Білі"];
  return fallback.slice(0, teamCount).map((name, index) => teamNames[index]?.trim() || name);
}

function SavedGamesPanel({
  games,
  onRestore,
  onDelete,
}: {
  games: SavedGameSummary[];
  onRestore: (game: SavedGameSummary) => void;
  onDelete: (code: string) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <Save size={20} /> Збережені ігри
      </h2>
      {games.length ? (
        <div className="grid gap-3">
          {games.map((game) => (
            <div key={game.code} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="min-w-0">
                <p className="font-bold">{game.title}</p>
                <p className="text-sm text-slate-600">
                  Код {game.code} · {game.teamCount} команд · {game.questionCount} питань · {phaseLabels[game.phase]}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button className="secondary-button" type="button" onClick={() => onRestore(game)}>
                  <Save size={16} /> Відновити налаштування
                </button>
                <button className="ghost-button" type="button" onClick={() => onDelete(game.code)}>
                  <Trash2 size={16} /> Видалити
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">Збережених ігор ще немає.</p>
      )}
    </section>
  );
}

function AdminDashboard({
  game,
  error,
  onReset,
}: {
  game: Snapshot;
  error: string;
  onReset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#f7f4ef] text-slate-950">
      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Адміністратор · код гри {game.code}</p>
            <h1 className="text-2xl font-bold">{game.title}</h1>
          </div>
          <button className="ghost-button" onClick={onReset} type="button">
            Вийти
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-5 py-5">
        <Panel title="Дані гри" icon={<Crown size={18} />}>
          <GameDetailsTable game={game} />
        </Panel>

        <Panel title="Посилання та QR коди" icon={<LogIn size={18} />}>
          <div className="grid gap-3 lg:grid-cols-3">
            <ShareCard title="Ведучий" path={`/host/${game.code}`} />
            <ShareCard title="Гравці" path={`/play/${game.code}`} />
            <ShareCard title="Глядачі" path={`/spectator/${game.code}`} />
          </div>
        </Panel>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </main>
  );
}

function GameDetailsTable({ game }: { game: Snapshot }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <tbody>
          <TableRow label="Назва гри" value={game.title} />
          <TableRow label="Код гри" value={game.code} />
          <TableRow label="Статус" value={phaseLabels[game.phase]} />
          <TableRow label="Команд" value={String(game.teamCount)} />
          <TableRow label="Назви команд" value={game.teams.map((team) => team.name).join(", ")} />
          <TableRow label="Гравців" value={`${game.players.filter((player) => player.role === "PLAYER").length} / ${game.playerCount}`} />
          <TableRow label="Питань" value={String(game.questionCount)} />
          <TableRow label="Час відповіді" value={`${game.answerTimeLimit} сек`} />
          <TableRow label="Час голосування" value={`${game.voteTimeLimit} сек`} />
        </tbody>
      </table>
    </div>
  );
}

function TableRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-slate-200 last:border-b-0">
      <th className="w-56 bg-slate-50 px-3 py-3 text-left font-semibold text-slate-600">{label}</th>
      <td className="px-3 py-3 font-semibold">{value}</td>
    </tr>
  );
}

function blankQuestion(): QuestionInput {
  return { text: "", correctAnswer: "", wrongAnswer: "" };
}

function QuestionEditor({
  title,
  questions,
  onChange,
  onSave,
  minRows = 1,
}: {
  title: string;
  questions: QuestionInput[];
  onChange: (questions: QuestionInput[]) => void;
  onSave?: () => void;
  minRows?: number;
}) {
  function updateRow(index: number, field: keyof QuestionInput, value: string) {
    onChange(questions.map((question, rowIndex) => (rowIndex === index ? { ...question, [field]: value } : question)));
  }

  function addRow() {
    onChange([...questions, blankQuestion()]);
  }

  function removeRow(index: number) {
    if (questions.length <= minRows) return;
    onChange(questions.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Flag size={20} /> {title}
        </h2>
        <div className="flex gap-2">
          <button className="secondary-button" type="button" onClick={addRow}>
            <Plus size={18} /> Додати
          </button>
          {onSave && (
            <button className="primary-button" type="button" onClick={onSave}>
              <Save size={18} /> Зберегти
            </button>
          )}
        </div>
      </div>
      <div className="grid max-h-[520px] gap-3 overflow-auto pr-1">
        {questions.map((question, index) => (
          <div key={`${question.id ?? "new"}-${index}`} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-600">Питання {index + 1}</p>
              <button
                className="ghost-button min-h-9 px-2"
                type="button"
                onClick={() => removeRow(index)}
                disabled={questions.length <= minRows}
                title="Видалити питання"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <textarea
              className="input min-h-20"
              placeholder="Текст питання"
              value={question.text}
              onChange={(event) => updateRow(index, "text", event.target.value)}
              required
            />
            <input
              className="input"
              placeholder="Правильна відповідь"
              value={question.correctAnswer}
              onChange={(event) => updateRow(index, "correctAnswer", event.target.value)}
              required
            />
            <input
              className="input"
              placeholder="Штрафна неправильна відповідь"
              value={question.wrongAnswer}
              onChange={(event) => updateRow(index, "wrongAnswer", event.target.value)}
              required
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function HostQuestionManager({ game, onSave }: { game: Snapshot; onSave: (questions: QuestionInput[]) => void }) {
  const [questions, setQuestions] = useState<QuestionInput[]>(() =>
    game.questions.map((question) => ({
      id: question.id,
      text: question.text,
      correctAnswer: question.correctAnswer,
      wrongAnswer: question.wrongAnswer,
    })),
  );

  return (
    <QuestionEditor
      title="Питання та правильні відповіді"
      questions={questions}
      onChange={setQuestions}
      onSave={() => onSave(questions)}
      minRows={1}
    />
  );
}

function HostControls({ game, onAction }: { game: Snapshot; onAction: (action: string) => void }) {
  const actions: Array<[string, string]> = [
    ["start-game", "Почати гру"],
    ["host-next", "Далі"],
    ["start-voting-phase", "Почати Частину 2"],
    ["show-round-results", "Показати результати"],
    ["next-vote-question", "Далі"],
    ["finish", "Завершити"],
  ];

  return (
    <Panel title="Ведучий" icon={<Crown size={18} />}>
      <div className="mb-3 grid gap-2 rounded-md bg-slate-50 p-3 text-sm">
        <p className="font-semibold">Посилання для гравців</p>
        <a className="break-all text-blue-700 underline" href={`/play/${game.code}`} target="_blank" rel="noreferrer">
          /play/{game.code}
        </a>
      </div>
      <div className="grid gap-2">
        {actions.map(([action, label]) => (
          <button key={action} className="secondary-button justify-start" onClick={() => onAction(action)} type="button">
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-500">Поточна фаза: {phaseLabels[game.phase]}</p>
    </Panel>
  );
}

function CaptainAnswerForm(props: {
  isCaptain: boolean;
  captainName?: string;
  myAnswer?: string;
  answerText: string;
  setAnswerText: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (props.myAnswer) {
    return <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">Ваша команда підтвердила: {props.myAnswer}</div>;
  }
  if (!props.isCaptain) {
    return <div className="rounded-md border border-slate-200 bg-slate-50 p-4">Очікуємо відповідь капітана: {props.captainName ?? "ще не призначено"}</div>;
  }
  return (
    <form onSubmit={props.onSubmit} className="grid gap-3">
      <textarea
        className="input min-h-28"
        placeholder="Фейкова відповідь команди"
        value={props.answerText}
        onChange={(event) => props.setAnswerText(event.target.value)}
        required
      />
      <button className="primary-button" type="submit">
        <Send size={18} /> Підтвердити
      </button>
    </form>
  );
}

function VoteOptions({
  game,
  player,
  myVoteId,
  canVote,
  voteCaptainName,
  onVote,
}: {
  game: Snapshot;
  player: Player;
  myVoteId?: string;
  canVote: boolean;
  voteCaptainName?: string;
  onVote: (optionId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {player.role === "PLAYER" && !canVote && !myVoteId && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">Голосує капітан Частини 2: {voteCaptainName ?? "ще не призначено"}</div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {game.voteOptions.map((option) => {
          const isOwn = option.teamId === player.teamId;
          const isCorrect = option.type === "CORRECT";
          const selected = myVoteId === option.id;
          return (
            <button
              key={option.id}
              className={`answer-option rounded-md border p-4 text-left font-medium transition ${
                selected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-400"
              } ${isOwn ? "opacity-60" : ""}`}
              disabled={!canVote || isOwn}
              onClick={() => onVote(option.id)}
              type="button"
            >
              {option.text}
              {game.phase === "ROUND_RESULTS" && isCorrect && <span className="mt-2 block text-sm text-emerald-700">Правильна відповідь</span>}
              {game.phase === "ROUND_RESULTS" && option.type === "ADMIN_WRONG" && <span className="mt-2 block text-sm text-red-700">Штрафна відповідь</span>}
              {isOwn && <span className="mt-2 block text-sm text-slate-500">Відповідь вашої команди</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProgressRows({ game }: { game: Snapshot }) {
  if (game.phase === "LOBBY") return <p className="text-slate-600">Ведучий ще не запустив гру.</p>;
  const activeIds = game.phase === "VOTING_PHASE" ? game.votedTeamIds : game.answeredTeamIds;
  const label = game.phase === "VOTING_PHASE" ? "проголосувала" : "відповіла";
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {game.teams.map((team) => (
        <div key={team.id} className="rounded-md border border-slate-200 p-3">
          <p className="font-semibold">{team.name}</p>
          <p className={activeIds.includes(team.id) ? "text-sm text-emerald-700" : "text-sm text-slate-500"}>
            {activeIds.includes(team.id) ? label : "очікуємо"}
          </p>
        </div>
      ))}
    </div>
  );
}

function Results({ game }: { game: Snapshot }) {
  if (!["ROUND_RESULTS", "FINAL_RESULTS", "FINISHED"].includes(game.phase)) return null;
  const sorted = [...game.teams].sort((a, b) => b.score - a.score);
  return (
    <Panel title={game.phase === "ROUND_RESULTS" ? "Таблиця результатів" : "Фінал"} icon={<Trophy size={18} />}>
      <div className="space-y-2">
        {sorted.map((team, index) => (
          <div key={team.id} className="flex items-center justify-between rounded-md bg-slate-50 p-3">
            <span className="font-semibold">
              {index + 1}. {team.name}
            </span>
            <span className="text-lg font-bold">{team.score}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
