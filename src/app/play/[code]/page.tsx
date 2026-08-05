"use client";

import { Flag, Info, LogIn, Send, Timer, Trophy } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { AnswerOption, Game, Player } from "@/lib/game-store";

type Snapshot = Omit<Game, "captains"> & {
  currentQuestion?: { id: string; text: string; correctAnswer: string; wrongAnswer: string };
  answeredTeamIds: string[];
  votedTeamIds: string[];
  voteOptions: AnswerOption[];
  captains: Array<{ teamId: string; userId: string; phase: "ANSWER" | "VOTE"; playerName?: string; teamName?: string }>;
};

type ApiResponse = {
  game?: Snapshot;
  player?: Player;
  error?: string;
};

const phaseLabels: Record<string, string> = {
  LOBBY: "Лобі",
  ANSWER_PHASE: "Введення відповідей",
  ANSWER_PHASE_COMPLETE: "Частина 1 завершена",
  VOTING_PHASE: "Голосування",
  ROUND_RESULTS: "Результати",
  FINAL_RESULTS: "Фінал",
  FINISHED: "Завершено",
};

export default function PlayerPage() {
  const params = useParams<{ code: string }>();
  const code = String(params.code ?? "").toUpperCase();
  const storageKey = `bluff-quiz-player-${code}`;
  const [game, setGame] = useState<Snapshot | null>(null);
  const [player, setPlayer] = useState<Player | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as Player) : null;
  });
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [error, setError] = useState("");

  const loadGame = useCallback(
    async (quiet = false) => {
      const response = await fetch(`/api/game?code=${encodeURIComponent(code)}`);
      const data = (await response.json()) as ApiResponse;
      if (data.error) {
        if (!quiet) setError(data.error);
        return;
      }
      if (data.game) {
        setGame(data.game);
        setTeamId((current) => current || data.game?.teams[0]?.id || "");
      }
    },
    [code],
  );

  useEffect(() => {
    void Promise.resolve().then(() => loadGame(true));
  }, [loadGame]);

  useEffect(() => {
    const timer = setInterval(() => loadGame(true), 1500);
    return () => clearInterval(timer);
  }, [loadGame]);

  const myTeam = useMemo(() => game?.teams.find((team) => team.id === player?.teamId), [game, player]);
  const answerCaptain = useMemo(
    () => game?.captains.find((captain) => captain.teamId === player?.teamId && captain.phase === "ANSWER"),
    [game, player],
  );
  const voteCaptain = useMemo(
    () => game?.captains.find((captain) => captain.teamId === player?.teamId && captain.phase === "VOTE"),
    [game, player],
  );
  const isAnswerCaptain = answerCaptain?.userId === player?.id;
  const isVoteCaptain = voteCaptain?.userId === player?.id;
  const myAnswer = game?.answers.find(
    (answer) => answer.questionId === game.currentQuestion?.id && answer.teamId === player?.teamId,
  );
  const myVote = game?.votes.find((vote) => vote.questionId === game.currentQuestion?.id && vote.teamId === player?.teamId);

  async function call(body: Record<string, unknown>) {
    setError("");
    const response = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as ApiResponse;
    if (data.error) {
      setError(data.error);
      return null;
    }
    if (data.game) setGame(data.game);
    if (data.player) {
      setPlayer(data.player);
      localStorage.setItem(storageKey, JSON.stringify(data.player));
    }
    return data;
  }

  function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    call({ action: "join", code, name, role: "PLAYER", teamId });
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!player) return;
    call({ action: "submit-answer", code, playerId: player.id, answerText }).then((data) => {
      if (data) setAnswerText("");
    });
  }

  function vote(optionId: string) {
    if (!player) return;
    call({ action: "submit-vote", code, playerId: player.id, selectedAnswerId: optionId });
  }

  function leave() {
    localStorage.removeItem(storageKey);
    setPlayer(null);
    setError("");
  }

  if (!game) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4ef] p-5 text-slate-950">
        <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">Завантаження гри {code}...</div>
      </main>
    );
  }

  if (!player) {
    return (
      <main className="min-h-screen bg-[#f7f4ef] p-5 text-slate-950">
        <section className="mx-auto max-w-md rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
            <LogIn size={22} /> Вхід гравця
          </h1>
          <p className="mb-5 text-sm text-slate-600">
            {game.title} · код {game.code}
          </p>
          <RulesCard />
          <form onSubmit={join} className="grid gap-3">
            <input className="input" placeholder="Ваше ім'я" value={name} onChange={(event) => setName(event.target.value)} required />
            <select className="input" value={teamId} onChange={(event) => setTeamId(event.target.value)} required>
              {game.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <button className="primary-button" type="submit">
              Увійти в команду
            </button>
          </form>
          {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-slate-950">
      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{phaseLabels[game.phase]}</p>
            <h1 className="text-2xl font-bold">{myTeam?.name ?? "Команда"}</h1>
          </div>
          <button className="ghost-button" type="button" onClick={leave}>
            Вийти
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-4xl gap-5 px-5 py-5">
        <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Flag size={18} /> Питання {game.currentQuestionIndex + 1} з {game.questionCount}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <TimerDisplay game={game} />
            </div>
          </div>
          <p className="mb-5 text-2xl font-semibold leading-snug">{game.currentQuestion?.text ?? "Очікуємо старт гри"}</p>

          {game.phase === "ANSWER_PHASE" && (
            <AnswerArea
              isCaptain={isAnswerCaptain}
              answer={myAnswer?.answerText}
              answerText={answerText}
              setAnswerText={setAnswerText}
              onSubmit={submitAnswer}
            />
          )}

          {(game.phase === "VOTING_PHASE" || game.phase === "ROUND_RESULTS") && (
            <VoteArea
              game={game}
              player={player}
              myVoteId={myVote?.selectedAnswerId}
              canVote={isVoteCaptain && game.phase === "VOTING_PHASE" && !myVote}
              captainName={voteCaptain?.playerName}
              onVote={vote}
            />
          )}

          {game.phase === "LOBBY" && <RulesCard />}

          {!["LOBBY", "ANSWER_PHASE", "VOTING_PHASE", "ROUND_RESULTS"].includes(game.phase) && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-slate-700">Очікуємо дію ведучого.</div>
          )}
        </section>

        {["ROUND_RESULTS", "FINAL_RESULTS", "FINISHED"].includes(game.phase) && (
          <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Trophy size={18} /> Результати
            </h2>
            <div className="space-y-2">
              {[...game.teams]
                .sort((a, b) => b.score - a.score)
                .map((team, index) => (
                  <div key={team.id} className="flex items-center justify-between rounded-md bg-slate-50 p-3">
                    <span className="font-semibold">
                      {index + 1}. {team.name}
                    </span>
                    <span className="font-bold">{team.score}</span>
                  </div>
                ))}
            </div>
          </section>
        )}

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </main>
  );
}

function RulesCard() {
  return (
    <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
      <p className="mb-2 flex items-center gap-2 font-bold text-slate-900">
        <Info size={16} /> Правила гри
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>У Частині 1 тільки капітан команди вводить фейкову відповідь.</li>
        <li>У Частині 2 тільки капітан голосує за варіант відповіді.</li>
        <li>Правильна відповідь дає вашій команді +100 балів.</li>
        <li>Голос за фейк іншої команди дає тій команді +50 балів.</li>
        <li>Штрафна відповідь адміністратора забирає у вашої команди 50 балів.</li>
      </ul>
    </div>
  );
}

function TimerDisplay({ game }: { game: Snapshot }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!game.phaseEndsAt) return null;
  const end = new Date(game.phaseEndsAt).getTime();
  const pausedAt = game.timerPausedAt ? new Date(game.timerPausedAt).getTime() : null;
  const remaining = now === null && !pausedAt ? null : Math.max(0, Math.ceil((end - (pausedAt ?? now ?? end)) / 1000));
  if (remaining === null) {
    return (
      <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-bold">
        <Timer size={16} /> ...
      </span>
    );
  }
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <span className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold ${remaining <= 10 ? "animate-live-pulse bg-red-50 text-red-700" : "bg-slate-100"}`}>
      <Timer size={16} /> {minutes}:{seconds}
      {game.timerPausedAt && <span className="font-semibold">(пауза)</span>}
    </span>
  );
}

function AnswerArea({
  isCaptain,
  answer,
  answerText,
  setAnswerText,
  onSubmit,
}: {
  isCaptain: boolean;
  answer?: string;
  answerText: string;
  setAnswerText: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (answer) return <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">Відповідь підтверджена: {answer}</div>;
  if (!isCaptain) return null;
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <textarea
        className="input min-h-28"
        placeholder="Введіть фейкову відповідь команди"
        value={answerText}
        onChange={(event) => setAnswerText(event.target.value)}
        required
      />
      <button className="primary-button" type="submit">
        <Send size={18} /> Підтвердити відповідь
      </button>
    </form>
  );
}

function VoteArea({
  game,
  player,
  myVoteId,
  canVote,
  captainName,
  onVote,
}: {
  game: Snapshot;
  player: Player;
  myVoteId?: string;
  canVote: boolean;
  captainName?: string;
  onVote: (optionId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {!canVote && !myVoteId && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">Голосує капітан: {captainName ?? "ще не призначено"}</div>
      )}
      <div className="grid gap-3">
        {game.voteOptions.map((option) => {
          const isOwn = option.teamId === player.teamId;
          const selected = myVoteId === option.id;
          const isCorrect = game.phase === "ROUND_RESULTS" && option.type === "CORRECT";
          const isPenalty = game.phase === "ROUND_RESULTS" && option.type === "ADMIN_WRONG";
          return (
            <button
              key={option.id}
              className={`answer-option rounded-md border p-4 text-left font-semibold ${
                selected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"
              } ${isOwn ? "opacity-60" : ""}`}
              disabled={!canVote || isOwn}
              onClick={() => onVote(option.id)}
              type="button"
            >
              {option.text}
              {isOwn && <span className="mt-2 block text-sm text-slate-500">Відповідь вашої команди</span>}
              {isCorrect && <span className="mt-2 block text-sm text-emerald-700">Правильна відповідь</span>}
              {isPenalty && <span className="mt-2 block text-sm text-red-700">Штрафна відповідь</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
