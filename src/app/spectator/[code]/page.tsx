"use client";

import { Eye, Flag, Timer, Trophy, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AnswerOption, Game } from "@/lib/game-store";

type Snapshot = Omit<Game, "captains"> & {
  currentQuestion?: { id: string; text: string; correctAnswer: string; wrongAnswer: string };
  answeredTeamIds: string[];
  votedTeamIds: string[];
  voteOptions: AnswerOption[];
  captains: Array<{ teamId: string; userId: string; phase: "ANSWER" | "VOTE"; playerName?: string; teamName?: string }>;
};

type ApiResponse = {
  game?: Snapshot;
  error?: string;
};

const phaseLabels: Record<string, string> = {
  LOBBY: "Очікуємо старт гри",
  ANSWER_PHASE: "Команди вводять відповіді",
  ANSWER_PHASE_COMPLETE: "Готуємо голосування",
  VOTING_PHASE: "Команди голосують",
  ROUND_RESULTS: "Результати питання",
  FINAL_RESULTS: "Фінальні результати",
  FINISHED: "Гру завершено",
};

export default function SpectatorPage() {
  const params = useParams<{ code: string }>();
  const code = String(params.code ?? "").toUpperCase();
  const [game, setGame] = useState<Snapshot | null>(null);
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

  if (!game) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4ef] p-5 text-slate-950">
        <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">Завантаження гри {code}...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-slate-950">
      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Eye size={16} /> Публічний екран · код {game.code}
            </p>
            <h1 className="text-2xl font-bold">{game.title}</h1>
          </div>
          <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold">{phaseLabels[game.phase]}</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-5 px-5 py-5">
        <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Flag size={18} /> Питання {Math.min(game.currentQuestionIndex + 1, game.questionCount)} з {game.questionCount}
            </h2>
            <TimerDisplay game={game} />
          </div>
          <p className="text-3xl font-semibold leading-snug">{game.currentQuestion?.text ?? "Очікуємо старт гри"}</p>

          {(game.phase === "VOTING_PHASE" || game.phase === "ROUND_RESULTS") && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {game.voteOptions.map((option) => (
                <div key={option.id} className="answer-option rounded-md border border-slate-200 bg-slate-50 p-4 text-lg font-semibold">
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

        <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Users size={18} /> Стан команд
          </h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {game.teams.map((team) => {
              const activeIds = game.phase === "VOTING_PHASE" ? game.votedTeamIds : game.answeredTeamIds;
              return (
                <div key={team.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold">{team.name}</p>
                  <p className={activeIds.includes(team.id) ? "text-sm text-emerald-700" : "text-sm text-slate-500"}>
                    {activeIds.includes(team.id) ? "готово" : "очікуємо"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {["ROUND_RESULTS", "FINAL_RESULTS", "FINISHED"].includes(game.phase) && (
          <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Trophy size={18} /> Таблиця результатів
            </h2>
            <div className="space-y-2">
              {sortedTeams.map((team, index) => (
                <div key={team.id} className="flex items-center justify-between rounded-md bg-slate-50 p-3">
                  <span className="font-semibold">
                    {index + 1}. {team.name}
                  </span>
                  <span className="text-lg font-bold">{team.score}</span>
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
