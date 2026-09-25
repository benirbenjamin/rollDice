'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Dice3D } from './Dice3D';
import { soundManager } from '@/lib/sound';
import { Play, Award, Bot, User, Zap, AlertTriangle, ShieldCheck, Sparkles, Flame, Trophy } from 'lucide-react';

interface PvEGameProps {
  user: any;
  onBalanceUpdate: (newBalance: number) => void;
  onOpenDeposit: () => void;
}

export const PvEGame: React.FC<PvEGameProps> = ({ user, onBalanceUpdate, onOpenDeposit }) => {
  const [stake, setStake] = useState<number>(1000);
  const [gameState, setGameState] = useState<any>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [lastDice, setLastDice] = useState<number>(6);
  const [error, setError] = useState<string | null>(null);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  
  // Floating praise animation state
  const [praiseBanner, setPraiseBanner] = useState<{ text: string; color: string } | null>(null);
  const [floatingScore, setFloatingScore] = useState<number | null>(null);

  const stakes = [500, 1000, 2500, 5000, 10000];

  // Auto-play AI Turn whenever turn switches to AI (currentTurn === 1)
  useEffect(() => {
    if (!gameState || gameState.status !== 'ACTIVE' || gameState.currentTurn !== 1 || isAiThinking) return;

    setIsAiThinking(true);
    const timer = setTimeout(async () => {
      try {
        if (user?.isDemo) {
          // Demo Mode AI Simulation
          let aiScore = gameState.p2Score || 0;
          let aiAccumulated = 0;
          const targetScore = gameState.targetScore || 100;
          const logs: any[] = [];
          let aiBusted = false;

          const needed = targetScore - aiScore;
          const threshold = Math.min(15, needed);

          while (aiAccumulated < threshold && !aiBusted) {
            const roll = Math.floor(Math.random() * 6) + 1;
            if (roll === 1) {
              aiBusted = true;
              aiAccumulated = 0;
              logs.push({ roll: 1, accumulated: 0, busted: true, held: false });
            } else {
              aiAccumulated += roll;
              const willHold = aiAccumulated >= threshold || aiScore + aiAccumulated >= targetScore;
              logs.push({ roll, accumulated: aiAccumulated, busted: false, held: willHold });
            }
          }

          if (logs.length > 0) setAiLogs(logs);

          if (!aiBusted && aiAccumulated > 0) {
            aiScore += aiAccumulated;
          }

          if (aiScore >= targetScore) {
            soundManager.playBustOne();
            setGameState((prev: any) => ({
              ...prev,
              p2Score: aiScore,
              status: 'COMPLETED',
              winner: 'AI_BOT',
              currentTurn: 0,
            }));
          } else {
            soundManager.playHoldScore();
            setGameState((prev: any) => ({
              ...prev,
              p2Score: aiScore,
              currentTurn: 0,
              currentAccumulated: 0,
            }));
          }
        } else {
          // Real Money Backend AI API
          const res = await fetch('/api/game/pve/ai-turn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId: gameState.id }),
          });

          const data = await res.json();

          if (res.ok) {
            if (data.aiLogs) setAiLogs(data.aiLogs);

            if (data.winner === 'AI_BOT') {
              soundManager.playBustOne();
              setGameState((prev: any) => ({
                ...prev,
                p2Score: data.p2Score,
                status: 'COMPLETED',
                winner: 'AI_BOT',
                currentTurn: 0,
              }));
            } else {
              soundManager.playHoldScore();
              setGameState((prev: any) => ({
                ...prev,
                p2Score: data.p2Score,
                currentTurn: 0,
                currentAccumulated: 0,
              }));
            }
          }
        }
      } catch (err) {
        console.error('AI turn error:', err);
      } finally {
        setIsAiThinking(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [gameState?.currentTurn, gameState?.id, gameState?.status, isAiThinking, user?.isDemo]);

  // Trigger floating praise banner
  const triggerPraise = (text: string, color: string) => {
    setPraiseBanner({ text, color });
    setTimeout(() => setPraiseBanner(null), 1800);
  };

  // Start new PvE game
  const handleStartGame = async () => {
    soundManager.playClick();
    setError(null);
    setAiLogs([]);

    if (!user) {
      setError('Please login or play in Demo mode');
      return;
    }

    if (user.wallet_balance < stake) {
      setError(`Insufficient balance. Available: RWF ${user.wallet_balance.toLocaleString()}`);
      return;
    }

    if (user.isDemo) {
      // Demo Mode Start
      onBalanceUpdate(user.wallet_balance - stake);
      setGameState({
        id: 'demo_room_' + Date.now(),
        stake,
        p1Score: 0,
        p2Score: 0,
        currentAccumulated: 0,
        currentTurn: 0,
        status: 'ACTIVE',
        targetScore: 100,
        isDemo: true,
      });
      return;
    }

    // Real Money Start
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
    if (!gameState || gameState.currentTurn !== 0 || isRolling || isAiThinking) return;

    soundManager.playDiceShake();
    setIsRolling(true);
    setError(null);

    setTimeout(async () => {
      try {
        if (user?.isDemo) {
          // Demo Roll Simulation
          const rollVal = Math.floor(Math.random() * 6) + 1;
          setLastDice(rollVal);

          if (rollVal === 1) {
            soundManager.playBustOne();
            triggerPraise('💥 BUSTED! Rolled 1 😭', 'from-red-600 to-red-800 text-white');
            setGameState((prev: any) => ({
              ...prev,
              currentAccumulated: 0,
              currentTurn: 1, // AI Turn
            }));
          } else {
            soundManager.playDiceRoll();
            setFloatingScore(rollVal);
            setTimeout(() => setFloatingScore(null), 1000);

            if (rollVal === 6) {
              soundManager.playFantastic();
              triggerPraise('🌟 FANTASTIC! +6 POINTS! 🔥', 'from-amber-400 to-amber-600 text-slate-950');
            } else if (rollVal === 5) {
              soundManager.playWoow();
              triggerPraise('⚡ WOOW! +5 POINTS! 🚀', 'from-emerald-400 to-teal-500 text-slate-950');
            }

            setGameState((prev: any) => ({
              ...prev,
              currentAccumulated: prev.currentAccumulated + rollVal,
            }));
          }
        } else {
          // Real Money Backend Roll API
          const res = await fetch('/api/game/pve/roll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId: gameState.id }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || 'Roll failed');
          }

          const rollVal = data.diceRoll;
          setLastDice(rollVal);

          if (data.turnBusted) {
            soundManager.playBustOne();
            triggerPraise('💥 BUSTED! Rolled 1 😭', 'from-red-600 to-red-800 text-white');
          } else {
            soundManager.playDiceRoll();
            setFloatingScore(rollVal);
            setTimeout(() => setFloatingScore(null), 1000);

            if (rollVal === 6) {
              soundManager.playFantastic();
              triggerPraise('🌟 FANTASTIC! +6 POINTS! 🔥', 'from-amber-400 to-amber-600 text-slate-950');
            } else if (rollVal === 5) {
              soundManager.playWoow();
              triggerPraise('⚡ WOOW! +5 POINTS! 🚀', 'from-emerald-400 to-teal-500 text-slate-950');
            }
          }

          setGameState((prev: any) => ({
            ...prev,
            currentAccumulated: data.currentAccumulated,
            currentTurn: data.currentTurn,
          }));
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsRolling(false);
      }
    }, 1200);
  };

  // Hold Score
  const handleHold = async () => {
    if (!gameState || gameState.currentTurn !== 0 || isRolling || isAiThinking || gameState.currentAccumulated === 0) return;

    soundManager.playHoldScore();
    setError(null);

    try {
      if (user?.isDemo) {
        // Demo Mode Hold Simulation
        const newP1Score = gameState.p1Score + gameState.currentAccumulated;
        if (newP1Score >= 100) {
          soundManager.playVictory();
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
          const winPayout = gameState.stake * 2;
          onBalanceUpdate(user.wallet_balance + winPayout);
          triggerPraise('🏆 VICTORY! MATCH WON! 🎉', 'from-amber-300 via-amber-400 to-amber-500 text-slate-950');
          setGameState((prev: any) => ({
            ...prev,
            p1Score: newP1Score,
            currentAccumulated: 0,
            status: 'COMPLETED',
            winner: 'PLAYER',
            winnerPayout: winPayout,
          }));
        } else {
          setGameState((prev: any) => ({
            ...prev,
            p1Score: newP1Score,
            currentAccumulated: 0,
            currentTurn: 1, // Pass to AI
          }));
        }
      } else {
        // Real Money Backend Hold API
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
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
          onBalanceUpdate(data.newBalance);
          triggerPraise('🏆 VICTORY! MATCH WON! 🎉', 'from-amber-300 via-amber-400 to-amber-500 text-slate-950');
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
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Floating Praise Banner Popup */}
      {praiseBanner && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className={`rounded-2xl bg-gradient-to-r ${praiseBanner.color} px-6 py-3 shadow-2xl font-black text-sm sm:text-base border border-white/20 tracking-wide uppercase shadow-amber-500/40`}>
            {praiseBanner.text}
          </div>
        </div>
      )}

      {/* Game Setup Card (When not in active game) */}
      {!gameState || gameState.status === 'COMPLETED' ? (
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30 glow-gold">
              <Bot className="h-9 w-9" />
            </div>
            <h2 className="mt-4 text-2xl font-black text-white flex items-center justify-center gap-2">
              Single Player vs AI <Sparkles className="h-5 w-5 text-amber-400" />
            </h2>
            <p className="mt-1.5 text-xs text-slate-400">
              Challenge the RollDice AI Bot! First to reach <span className="font-extrabold text-amber-400">100 points</span> wins the pot!
            </p>
          </div>

          {gameState && gameState.status === 'COMPLETED' && (
            <div className={`mt-6 rounded-2xl border p-5 text-center shadow-xl ${
              gameState.winner === 'PLAYER'
                ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300 shadow-emerald-500/20'
                : 'border-red-500/60 bg-red-950/50 text-red-300 shadow-red-500/20'
            }`}>
              <h3 className="text-xl font-black tracking-wide flex items-center justify-center gap-2">
                {gameState.winner === 'PLAYER' ? (
                  <>
                    <Trophy className="h-6 w-6 text-amber-400" /> YOU WON THE MATCH! 🏆
                  </>
                ) : (
                  <>
                    🤖 AI BOT WINS! 💥
                  </>
                )}
              </h3>
              <p className="mt-1.5 text-xs font-semibold">
                {gameState.winner === 'PLAYER'
                  ? `Payout of RWF ${Number(gameState.winnerPayout || 0).toLocaleString()} credited to your wallet!`
                  : 'Better luck next time! Strategy and timing are key.'}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-red-950/60 p-3 text-xs text-red-300 border border-red-800/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
              {error.includes('balance') && !user?.isDemo && (
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
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Select Stake Amount (RWF)</span>
                <span className="text-[10px] text-amber-400 font-bold">Fast Wagering</span>
              </label>
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
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300 glow-gold scale-105 shadow-md shadow-amber-500/20'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    RWF {val.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs text-slate-400 flex items-center justify-between shadow-inner">
              <span className="flex items-center gap-1.5 font-bold">
                <Flame className="h-4 w-4 text-amber-400" /> Match Wager Pot:
              </span>
              <span className="font-black text-emerald-400 text-base">
                RWF {(stake * 2).toLocaleString()}
              </span>
            </div>

            <button
              onClick={handleStartGame}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 py-3.5 text-base font-black text-slate-950 shadow-xl shadow-amber-500/30 hover:from-amber-400 hover:to-amber-500 transition scale-100 hover:scale-[1.01]"
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
          <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 px-6 py-3.5 shadow-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300">PvE Arena</span>
              <span className="rounded-md bg-amber-500/20 px-2.5 py-0.5 text-xs font-extrabold text-amber-400 border border-amber-500/30">
                Stake: RWF {Number(gameState.stake).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Target Score:</span>
              <span className="rounded-md bg-slate-800 px-2.5 py-0.5 text-xs font-black text-white">
                {gameState.targetScore || 100}
              </span>
            </div>
          </div>

          {/* Player vs AI Scores Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Player Card */}
            <div className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
              gameState.currentTurn === 0
                ? 'border-amber-400 bg-slate-900 shadow-2xl shadow-amber-500/20 ring-2 ring-amber-400/40'
                : 'border-slate-800 bg-slate-950/60 opacity-80'
            }`}>
              {gameState.currentTurn === 0 && (
                <span className="absolute top-3 right-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-0.5 text-[10px] font-black text-slate-950 shadow-md animate-pulse">
                  ⚡ YOUR TURN
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">{user?.name || 'Player'}</h4>
                  <p className="text-[11px] text-slate-400">You (Player 1)</p>
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Score:</span>
                <span className="text-3xl font-black text-amber-400">{gameState.p1Score}</span>
              </div>

              {/* Dynamic Target Progress bar */}
              <div className="mt-3.5 space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>Target Progress</span>
                  <span>{Math.round((gameState.p1Score / (gameState.targetScore || 100)) * 100)}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                    style={{ width: `${Math.min(100, (gameState.p1Score / (gameState.targetScore || 100)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI Bot Card */}
            <div className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
              gameState.currentTurn === 1
                ? 'border-cyan-400 bg-slate-900 shadow-2xl shadow-cyan-500/20 ring-2 ring-cyan-400/40'
                : 'border-slate-800 bg-slate-950/60 opacity-80'
            }`}>
              {gameState.currentTurn === 1 && (
                <span className="absolute top-3 right-3 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 px-3 py-0.5 text-[10px] font-black text-slate-950 shadow-md animate-pulse">
                  🤖 BOT THINKING...
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-md">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">RollDice AI Bot</h4>
                  <p className="text-[11px] text-slate-400">System Opponent</p>
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Score:</span>
                <span className="text-3xl font-black text-cyan-400">{gameState.p2Score}</span>
              </div>

              {/* Dynamic Target Progress bar */}
              <div className="mt-3.5 space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>Target Progress</span>
                  <span>{Math.round((gameState.p2Score / (gameState.targetScore || 100)) * 100)}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-300 transition-all duration-500"
                    style={{ width: `${Math.min(100, (gameState.p2Score / (gameState.targetScore || 100)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Dice & Action Center */}
          <div className="relative flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
            
            {/* Animated Floating score indicator */}
            {floatingScore && (
              <div className="absolute top-4 font-black text-2xl text-emerald-400 animate-bounce transition-all">
                +{floatingScore} ⚡
              </div>
            )}

            <div className="text-center mb-3">
              <span className="text-xs text-slate-400 uppercase tracking-widest font-extrabold">Current Turn Score</span>
              <div className="text-5xl font-black text-emerald-400 mt-1 drop-shadow-md">
                +{gameState.currentAccumulated}
              </div>
            </div>

            {/* Glossy 3D Illuminated Dice */}
            <Dice3D value={lastDice} isRolling={isRolling} size={120} />

            {/* Action Buttons */}
            <div className="mt-6 flex w-full max-w-sm gap-3">
              <button
                onClick={handleRoll}
                disabled={gameState.currentTurn !== 0 || isRolling || isAiThinking}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-4 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition disabled:opacity-40 scale-100 hover:scale-[1.02]"
              >
                <Zap className="h-5 w-5 fill-slate-950" />
                {isRolling ? 'Rolling...' : 'ROLL DICE'}
              </button>

              <button
                onClick={handleHold}
                disabled={gameState.currentTurn !== 0 || isRolling || isAiThinking || gameState.currentAccumulated === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-sm font-black text-white shadow-xl shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-500 transition disabled:opacity-40 scale-100 hover:scale-[1.02]"
              >
                <Award className="h-5 w-5" />
                HOLD SCORE
              </button>
            </div>

          </div>

          {/* AI Activity Ticker Feed */}
          {aiLogs.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <h5 className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-cyan-400" />
                Recent AI Turn Actions:
              </h5>
              <div className="flex flex-wrap gap-2">
                {aiLogs.map((log, idx) => (
                  <span
                    key={idx}
                    className={`rounded-xl px-3 py-1 text-xs font-bold border shadow-sm ${
                      log.busted
                        ? 'border-red-500/40 bg-red-950/40 text-red-300'
                        : log.held
                        ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                        : 'border-slate-800 bg-slate-900 text-slate-300'
                    }`}
                  >
                    {log.busted ? '💥 Rolled 1 (Busted)' : `🎲 Rolled ${log.roll} ${log.held ? '🔒 (Held)' : ''}`}
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
