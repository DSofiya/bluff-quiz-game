import { NextRequest, NextResponse } from "next/server";
import {
  createGame,
  hostAction,
  joinGame,
  publicSnapshot,
  readGame,
  setPhaseCaptain,
  submitAnswer,
  submitVote,
  updateTeam,
  updateGameQuestions,
  type Role,
  type Game,
} from "@/lib/game-store";

function ok(game: Game, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ game: publicSnapshot(game), ...extra });
}

function fail(error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Помилка" }, { status: 400 });
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    if (!code) throw new Error("Потрібен код гри");
    return ok(await readGame(code));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "create") {
      const result = await createGame({
        title: body.title,
        adminName: body.adminName,
        teamCount: Number(body.teamCount) === 5 ? 5 : 3,
        playerCount: Number(body.playerCount) || 9,
        questionCount: Number(body.questionCount) || 10,
        answerTimeLimit: Number(body.answerTimeLimit) || 60,
        voteTimeLimit: Number(body.voteTimeLimit) || 45,
        questions: body.questions,
      });
      return ok(result.game, { player: result.player });
    }

    if (body.action === "join") {
      const result = await joinGame({
        code: body.code,
        name: body.name,
        role: body.role as Role,
        teamId: body.teamId,
      });
      return ok(result.game, { player: result.player });
    }

    if (body.action === "submit-answer") {
      return ok(await submitAnswer({ code: body.code, playerId: body.playerId, answerText: body.answerText }));
    }

    if (body.action === "submit-vote") {
      return ok(await submitVote({ code: body.code, playerId: body.playerId, selectedAnswerId: body.selectedAnswerId }));
    }

    if (body.action === "update-questions") {
      return ok(await updateGameQuestions(body.code, body.questions));
    }

    if (body.action === "set-captain") {
      return ok(await setPhaseCaptain({ code: body.code, teamId: body.teamId, userId: body.userId, phase: body.phase }));
    }

    if (body.action === "update-team") {
      return ok(await updateTeam({ code: body.code, teamId: body.teamId, name: body.name }));
    }

    return ok(await hostAction(body.code, body.action));
  } catch (error) {
    return fail(error);
  }
}
