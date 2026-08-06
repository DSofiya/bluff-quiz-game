"use client";

import { Crown, Flag, LogIn, Pause, Play, Plus, Save, StepForward, Timer, Trophy, Users } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { AnswerOption, Game, Player } from "@/lib/game-store";
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

export default function HostPage() {
  const params = useParams<{ code: string }>();
  const code = String(params.code ?? "").toUpperCase();
  const storageKey = `bluff-quiz-host-${code}`;
  const [game, setGame] = useState<Snapshot | null>(null);
  const [host, setHost] = useState<Player | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as Player) : null;
  });
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const loadGame = useCallback(
    async (quiet = false) => {
      const response = await fetch(`/api/game?code=${encodeURIComponent(code)}`);
      const data = (await response.json()) as ApiResponse;
      if (data.error) {
        if (!quiet) setError(data.error);
        return;
      }
      if (data.game) setGame(data.game);
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

  const sortedTeams = useMemo(() => [...(game?.teams ?? [])].sort((a, b) => b.score - a.score), [game?.teams]);

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
      setHost(data.player);
      localStorage.setItem(storageKey, JSON.stringify(data.player));
    }
    return data;
  }

  function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    call({ action: "join", code, name, role: "HOST" });
  }

  function hostAction(action: string) {
    call({ action, code });
  }

  function setCaptain(teamId: string, userId: string, phase: "ANSWER" | "VOTE") {
    call({ action: "set-captain", code, teamId, userId, phase });
  }

  function updateTeam(teamId: string, name: string) {
    call({ action: "update-team", code, teamId, name });
  }

  async function leave() {
    if (game) {
      const data = await call({ action: "end-game", code });
      if (!data) return;
    }
    localStorage.removeItem(storageKey);
    setHost(null);
  }

  if (!game) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4ef] p-5 text-slate-950">
        <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">Завантаження гри {code}...</div>
      </main>
    );
  }

  if (!host) {
    return (
      <main className="min-h-screen bg-[#f7f4ef] p-5 text-slate-950">
        <section className="mx-auto max-w-md rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
            <LogIn size={22} /> Вхід ведучого
          </h1>
          <p className="mb-5 text-sm text-slate-600">
            {game.title} · код {game.code}
          </p>
          <form onSubmit={join} className="grid gap-3">
            <input className="input" placeholder="Ім'я ведучого" value={name} onChange={(event) => setName(event.target.value)} required />
            <button className="primary-button" type="submit">
              Увійти як ведучий
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
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{phaseLabels[game.phase]}</p>
            <h1 className="text-2xl font-bold">{game.title}</h1>
          </div>
          <button className="ghost-button" type="button" onClick={leave}>
            Вийти
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-5 px-5 py-5">
        <div className="grid gap-3 md:grid-cols-2">
          <ShareCard title="Посилання для гравців" path={`/play/${game.code}`} />
          <ShareCard title="Публічний екран" path={`/spectator/${game.code}`} />
        </div>

        <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Flag size={18} /> Питання {game.currentQuestionIndex + 1} з {game.questionCount}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <TimerDisplay game={game} />
              <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold">Код {game.code}</span>
            </div>
          </div>
          <p className="mb-5 text-2xl font-semibold leading-snug">{game.currentQuestion?.text ?? "Очікуємо старт гри"}</p>
          <Progress game={game} />
          {(game.phase === "VOTING_PHASE" || game.phase === "ROUND_RESULTS") && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {game.voteOptions.map((option) => (
                <div key={option.id} className="answer-option rounded-md border border-slate-200 bg-white p-4 font-semibold">
                  {option.text}
                  {game.phase === "ROUND_RESULTS" && option.type === "CORRECT" && (
                    <span className="mt-2 block text-sm text-emerald-700">Правильна відповідь</span>
                  )}
                  {game.phase === "ROUND_RESULTS" && option.type === "ADMIN_WRONG" && (
                    <span className="mt-2 block text-sm text-red-700">Штрафна відповідь</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {["LOBBY", "ANSWER_PHASE_COMPLETE"].includes(game.phase) && (
          <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Crown size={18} /> Капітани команд
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              {game.teams.map((team) => (
                <div key={team.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  {game.phase === "LOBBY" ? <TeamNameForm teamId={team.id} name={team.name} onSave={updateTeam} /> : <p className="mb-3 font-semibold">{team.name}</p>}
                  {game.phase === "LOBBY" && <CaptainSelect game={game} teamId={team.id} phase="ANSWER" label="Капітан Частини 1" onChange={setCaptain} />}
                  {game.phase === "ANSWER_PHASE_COMPLETE" && (
                    <CaptainSelect game={game} teamId={team.id} phase="VOTE" label="Капітан Частини 2" onChange={setCaptain} />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <HostStageActions game={game} onAction={hostAction} />

        <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Trophy size={18} /> Таблиця
          </h2>
          <div className="space-y-2">
            {sortedTeams.map((team, index) => (
              <div key={team.id} className="flex items-center justify-between rounded-md bg-slate-50 p-3">
                <span className="font-semibold">
                  {index + 1}. {team.name}
                </span>
                <span className="font-bold">{team.score}</span>
              </div>
            ))}
          </div>
        </section>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </main>
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

function HostStageActions({ game, onAction }: { game: Snapshot; onAction: (action: string) => void }) {
  if (game.phase === "LOBBY") {
    return (
      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <button className="primary-button w-full" type="button" onClick={() => onAction("start-game")}>
          <Play size={18} /> Почати гру
        </button>
      </section>
    );
  }

  if (game.phase === "ANSWER_PHASE") {
    return (
      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            className="secondary-button"
            type="button"
            onClick={() => onAction(game.timerPausedAt ? "resume-timer" : "pause-timer")}
          >
            {game.timerPausedAt ? <Play size={18} /> : <Pause size={18} />}
            {game.timerPausedAt ? "Продовжити таймер" : "Зупинити таймер"}
          </button>
          <button className="secondary-button" type="button" onClick={() => onAction("extend-answer-time")}>
            <Plus size={18} /> Додати 30 сек
          </button>
          <button className="primary-button" type="button" onClick={() => onAction("host-next")}>
            <StepForward size={18} /> Далі
          </button>
        </div>
      </section>
    );
  }

  if (game.phase === "ANSWER_PHASE_COMPLETE") {
    return (
      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <button className="primary-button w-full" type="button" onClick={() => onAction("start-voting-phase")}>
          <Play size={18} /> Почати Частину 2
        </button>
      </section>
    );
  }

  if (game.phase === "VOTING_PHASE") {
    return (
      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            className="secondary-button"
            type="button"
            onClick={() => onAction(game.timerPausedAt ? "resume-timer" : "pause-timer")}
          >
            {game.timerPausedAt ? <Play size={18} /> : <Pause size={18} />}
            {game.timerPausedAt ? "Продовжити таймер" : "Зупинити таймер"}
          </button>
          <button className="secondary-button" type="button" onClick={() => onAction("extend-vote-time")}>
            <Plus size={18} /> Додати 30 сек
          </button>
          <button className="primary-button" type="button" onClick={() => onAction("show-round-results")}>
            <Trophy size={18} /> Результати гри
          </button>
        </div>
      </section>
    );
  }

  if (game.phase === "ROUND_RESULTS") {
    return (
      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <button className="primary-button w-full" type="button" onClick={() => onAction("next-vote-question")}>
          <StepForward size={18} /> Далі
        </button>
      </section>
    );
  }

  if (game.phase === "FINAL_RESULTS") {
    return (
      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <button className="primary-button w-full" type="button" onClick={() => onAction("finish")}>
          <Trophy size={18} /> Завершити гру
        </button>
      </section>
    );
  }

  return null;
}

function TeamNameForm({
  teamId,
  name,
  onSave,
}: {
  teamId: string;
  name: string;
  onSave: (teamId: string, name: string) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave(teamId, String(form.get("name") ?? ""));
  }

  return (
    <form onSubmit={submit} className="mb-3 grid gap-2">
      <label className="label">
        Назва команди
        <div className="grid grid-cols-[1fr_44px] gap-2">
          <input className="input" name="name" defaultValue={name} required />
          <button className="secondary-button min-h-11 px-0" type="submit" title="Зберегти назву команди">
            <Save size={16} />
          </button>
        </div>
      </label>
    </form>
  );
}

function CaptainSelect({
  game,
  teamId,
  phase,
  label,
  onChange,
}: {
  game: Snapshot;
  teamId: string;
  phase: "ANSWER" | "VOTE";
  label: string;
  onChange: (teamId: string, userId: string, phase: "ANSWER" | "VOTE") => void;
}) {
  const team = game.teams.find((item) => item.id === teamId);
  const captain = game.captains.find((item) => item.teamId === teamId && item.phase === phase);
  return (
    <label className="label mb-2">
      {label}
      <select className="input" value={captain?.userId ?? ""} onChange={(event) => onChange(teamId, event.target.value, phase)} disabled={!team?.members.length}>
        <option value="">Оберіть капітана</option>
        {team?.members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Progress({ game }: { game: Snapshot }) {
  const activeIds = game.phase === "VOTING_PHASE" ? game.votedTeamIds : game.answeredTeamIds;
  const label = game.phase === "VOTING_PHASE" ? "проголосувала" : "відповіла";
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {game.teams.map((team) => (
        <div key={team.id} className="rounded-md border border-slate-200 p-3">
          <p className="flex items-center gap-2 font-semibold">
            <Users size={16} /> {team.name}
          </p>
          <p className={activeIds.includes(team.id) ? "text-sm text-emerald-700" : "text-sm text-slate-500"}>
            {activeIds.includes(team.id) ? label : "очікуємо"}
          </p>
        </div>
      ))}
    </div>
  );
}
