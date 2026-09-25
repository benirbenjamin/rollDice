'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Dice3D } from './Dice3D';
import { soundManager } from '@/lib/sound';
import { Play, RotateCcw, Award, Bot, User, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PvEGameProps {
  user: any;
  onBalanceUpdate: (newBalance: number) => void;
  onOpenDeposit: () => void;
}

export const PvEGame: React.FC<PvEGameProps> = ({ user, onBalanceUpdate, onOpenDeposit }) => {
  const [stake, setStake] = useState<number>(1000);
  const [gameState, setGameState] = useState<any>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [lastDice, setLastDice] = useState<number>(6);
  const [error, setError] = useState<string | null>(null);
  const [aiLogs, setAiLogs] = useState<any[]>([]);

  const stakes = [500, 1000, 2500, 5000, 10000];

  // Start new PvE game
  const handleStartGame = async () => {
    soundManager.playClick();
    setError(null);
    setAiLogs([]);

    if (!user) {
      setError('Please login to play real-money games');
      return;
    }

    if (user.wallet_balance < stake) {
      setError(`Insufficient balance. Available: RWF ${user.wallet_balance.toLocaleString()}`);
      return;
    }

    try {
      const res = await fetch('/api/game/pve/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stake }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start game');
      }

      onBalanceUpdate(data.newBalance);
      setGameState(data.room);
    } catch (err: any) {
      setError(err.message || 'Game initialization failed');
    }
  };

  // Roll Dice
  const handleRoll = async () => {
    if (!gameState || gameState.currentTurn !== 0 || isRolling) return;

    soundManager.playDiceShake();
    setIsRolling(true);
    setError(null);

    setTimeout(async () => {
      try {
        const res = await fetch('/api/game/pve/roll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: gameState.id }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Roll failed');
        }

        setLastDice(data.diceRoll);
        soundManager.playDiceRoll();

        if (data.turnBusted) {
          soundManager.playBustOne();
        }

        setGameState((prev: any) => ({
          ...prev,
          currentAccumulated: data.currentAccumulated,
          currentTurn: data.currentTurn,
        }));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsRolling(false);
      }
    }, 400);
  };

  // Hold Score
  const handleHold = async () => {
    if (!gameState || gameState.currentTurn !== 0 || isRolling || gameState.currentAccumulated === 0) return;

    soundManager.playHoldScore();
    setError(null);

    try {
      const res = await fetch('/api/game/pve/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: gameState.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Hold action failed');
      }

      if (data.aiLogs && data.aiLogs.length > 0) {
        setAiLogs(data.aiLogs);
      }

      if (data.winner === 'PLAYER') {
        soundManager.playVictory();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        onBalanceUpdate(data.newBalance);
      }

      setGameState((prev: any) => ({
        ...prev,
        p1Score: data.p1Score,
        p2Score: data.p2Score,
        currentTurn: data.winner ? prev.currentTurn : data.currentTurn,
        currentAccumulated: 0,
        status: data.winner ? 'COMPLETED' : 'ACTIVE',
        winner: data.winner,
        winnerPayout: data.winnerPayout,
      }));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Game Setup Card (When not in active game) */}
      {!gameState || gameState.status === 'COMPLETED' ? (
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 glow-gold">
              <Bot className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-white">Single Player vs AI</h2>
            <p className="mt-1 text-xs text-slate-400">
              Challenge the RollDice AI Bot. First to reach <span className="font-bold text-amber-400">100 points</span> wins the pot!
            </p>
          </div>

          {gameState && gameState.status === 'COMPLETED' && (
            <div className={`mt-6 rounded-2xl border p-4 text-center ${
              gameState.winner === 'PLAYER'
                ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                : 'border-red-500/50 bg-red-950/40 text-red-300'
            }`}>
              <h3 className="text-lg font-black tracking-wide">
                {gameState.winner === 'PLAYER' ? '🎉 YOU WON THE MATCH!' : '🤖 AI BOT WINS!'}
              </h3>
              <p className="mt-1 text-xs">
                {gameState.winner === 'PLAYER'
                  ? `Payout of RWF ${Number(gameState.winnerPayout || 0).toLocaleString()} credited to your wallet!`
                  : 'Better luck next time! Strategy is key.'}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-red-950/60 p-3 text-xs text-red-300 border border-red-800/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
              {error.includes('balance') && (
                <button
                  onClick={onOpenDeposit}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500 transition"
                >
                  Deposit
                </button>
              )}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Select Stake Amount (RWF)</label>
              <div className="grid grid-cols-5 gap-2">
                {stakes.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setStake(val);
                    }}
                    className={`rounded-xl border py-3 text-xs font-extrabold transition ${
                      stake === val
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300 glow-gold scale-105'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    RWF {val.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Match Wager Pot:</span>
              <span className="font-extrabold text-emerald-400 text-sm">
                RWF {(stake * 2).toLocaleString()}
              </span>
            </div>

            <button
              onClick={handleStartGame}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 py-3.5 text-base font-extrabold text-slate-950 shadow-xl shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition scale-100 hover:scale-[1.01]"
            >
              <Play className="h-5 w-5 fill-slate-950" />
              Start Match (RWF {stake.toLocaleString()} Stake)
            </button>
          </div>
        </div>
      ) : (
        /* Active Game Arena */
        <div className="mx-auto max-w-4xl space-y-6">
          
          {/* Top Status Bar */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 px-6 py-3 shadow-lg">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300">PvE Match</span>
              <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">
                Stake: RWF {Number(gameState.stake).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Target Score:</span>
              <span className="font-extrabold text-white">{gameState.targetScore || 100}</span>
            </div>
          </div>

          {/* Player vs AI Scores Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Player Card */}
            <div className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
              gameState.currentTurn === 0
                ? 'border-amber-400/80 bg-slate-900/90 shadow-xl shadow-amber-500/10'
                : 'border-slate-800 bg-slate-950/60 opacity-80'
            }`}>
              {gameState.currentTurn === 0 && (
                <span className="absolute top-3 right-3 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-slate-950 animate-pulse">
                  YOUR TURN
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{user?.name || 'Player'}</h4>
                  <p className="text-[11px] text-slate-400">You</p>
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Total Score:</span>
                <span className="text-3xl font-black text-amber-400">{gameState.p1Score}</span>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
                  style={{ width: `${Math.min(100, (gameState.p1Score / (gameState.targetScore || 100)) * 100)}%` }}
                />
              </div>
            </div>

            {/* AI Bot Card */}
            <div className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
              gameState.currentTurn === 1
                ? 'border-cyan-400/80 bg-slate-900/90 shadow-xl shadow-cyan-500/10'
                : 'border-slate-800 bg-slate-950/60 opacity-80'
            }`}>
              {gameState.currentTurn === 1 && (
                <span className="absolute top-3 right-3 rounded-full bg-cyan-400 px-2.5 py-0.5 text-[10px] font-black text-slate-950 animate-pulse">
                  BOT THINKING...
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">RollDice AI Bot</h4>
                  <p className="text-[11px] text-slate-400">System Opponent</p>
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Total Score:</span>
                <span className="text-3xl font-black text-cyan-400">{gameState.p2Score}</span>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-300"
                  style={{ width: `${Math.min(100, (gameState.p2Score / (gameState.targetScore || 100)) * 100)}%` }}
                />
              </div>
            </div>

          </div>

          {/* Dice & Action Center */}
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
            
            <div className="text-center mb-2">
              <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Current Turn Score</span>
              <div className="text-4xl font-black text-emerald-400 mt-1">
                +{gameState.currentAccumulated}
              </div>
            </div>

            {/* 3D Interactive Dice */}
            <Dice3D value={lastDice} isRolling={isRolling} size={110} />

            {/* Action Buttons */}
            <div className="mt-6 flex w-full max-w-sm gap-3">
              <button
                onClick={handleRoll}
                disabled={gameState.currentTurn !== 0 || isRolling}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition disabled:opacity-40"
              >
                <Zap className="h-4 w-4" />
                {isRolling ? 'Rolling...' : 'ROLL DICE'}
              </button>

              <button
                onClick={handleHold}
                disabled={gameState.currentTurn !== 0 || isRolling || gameState.currentAccumulated === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 transition disabled:opacity-40"
              >
                <Award className="h-4 w-4" />
                HOLD SCORE
              </button>
            </div>

          </div>

          {/* AI Activity Ticker Feed */}
          {aiLogs.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <h5 className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5" />
                Recent AI Turn Actions:
              </h5>
              <div className="flex flex-wrap gap-2">
                {aiLogs.map((log, idx) => (
                  <span
                    key={idx}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border ${
                      log.busted
                        ? 'border-red-500/40 bg-red-950/30 text-red-400'
                        : log.held
                        ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-400'
                        : 'border-slate-800 bg-slate-900 text-slate-300'
                    }`}
                  >
                    {log.busted ? '💥 Rolled 1 (Bust)' : `🎲 Rolled ${log.roll} ${log.held ? '(Held)' : ''}`}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
