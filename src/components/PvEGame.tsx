'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Dice3D } from './Dice3D';
import { soundManager } from '@/lib/sound';
import { Play, Award, Bot, User, Zap, AlertTriangle, ShieldCheck, Sparkles, Flame, Trophy, RotateCcw } from 'lucide-react';

import { MultiplierWheelModal } from './MultiplierWheelModal';

interface PvEGameProps {
  user: any;
  onBalanceUpdate: (newBalance: number) => void;
  onOpenDeposit: () => void;
}

export const PvEGame: React.FC<PvEGameProps> = ({ user, onBalanceUpdate, onOpenDeposit }) => {
  const [stake, setStake] = useState<number>(20);
  const [customStakeInput, setCustomStakeInput] = useState<string>('20');
  const [isCustomStake, setIsCustomStake] = useState<boolean>(false);
  const [targetScore, setTargetScore] = useState<number>(100);
  const [gameState, setGameState] = useState<any>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [lastDice, setLastDice] = useState<number>(6);
  const [error, setError] = useState<string | null>(null);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  
  // Floating praise & victory modal state
  const [praiseBanner, setPraiseBanner] = useState<{ text: string; color: string } | null>(null);
  const [floatingScore, setFloatingScore] = useState<number | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showWheelModal, setShowWheelModal] = useState(false);

  const stakes = [20, 50, 100, 200, 500, 1000];
  const targetOptions = [50, 100, 200];

  // Ref to prevent double AI turn triggers
  const aiExecutingRef = useRef(false);

  // Execute AI Bot Turn cleanly
  const executeAiTurn = async (roomId: string, isDemoUser: boolean) => {
    if (aiExecutingRef.current || (gameState && gameState.status === 'COMPLETED')) return;
    aiExecutingRef.current = true;
    setIsAiThinking(true);

    setTimeout(async () => {
      try {
        if (isDemoUser) {
          // Local Demo AI Simulation
          let aiScore = gameState?.p2Score || 0;
          let aiAccumulated = 0;
          const currentTarget = gameState?.targetScore || targetScore || 100;
          const logs: any[] = [];
          let aiBusted = false;

          const needed = currentTarget - aiScore;
          const threshold = Math.min(15, needed);

          while (aiAccumulated < threshold && !aiBusted) {
            const roll = Math.floor(Math.random() * 6) + 1;
            if (roll === 1) {
              aiBusted = true;
              aiAccumulated = 0;
              logs.push({ roll: 1, accumulated: 0, busted: true, held: false });
            } else {
              aiAccumulated += roll;
              const willHold = aiAccumulated >= threshold || aiScore + aiAccumulated >= currentTarget;
              logs.push({ roll, accumulated: aiAccumulated, busted: false, held: willHold });
            }
          }

          if (logs.length > 0) setAiLogs(logs);

          if (!aiBusted && aiAccumulated > 0) {
            aiScore += aiAccumulated;
          }

          if (aiScore >= currentTarget) {
            soundManager.playBustOne();
            setGameState((prev: any) => ({
              ...prev,
              p2Score: aiScore,
              status: 'COMPLETED',
              winner: 'AI_BOT',
              currentTurn: 0,
              currentAccumulated: 0,
            }));
            setShowGameOverModal(true);
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
            body: JSON.stringify({ roomId }),
          });

          const data = await res.json();

          if (data.aiLogs) setAiLogs(data.aiLogs);

          if (data.winner === 'AI_BOT') {
            soundManager.playBustOne();
            setGameState((prev: any) => ({
              ...prev,
              p2Score: data.p2Score,
              status: 'COMPLETED',
              winner: 'AI_BOT',
              currentTurn: 0,
              currentAccumulated: 0,
            }));
            setShowGameOverModal(true);
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
      } catch (err) {
        console.error('AI turn execution error:', err);
        setGameState((prev: any) => ({
          ...prev,
          currentTurn: 0,
          currentAccumulated: 0,
        }));
      } finally {
        setIsAiThinking(false);
        aiExecutingRef.current = false;
      }
    }, 1100);
  };

  // Backup watcher for AI turn triggers
  useEffect(() => {
    if (gameState && gameState.status === 'ACTIVE' && gameState.currentTurn === 1 && !isAiThinking && !aiExecutingRef.current) {
      executeAiTurn(gameState.id, !!user?.isDemo);
    }
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
    setShowGameOverModal(false);

    if (!stake || isNaN(stake) || stake < 20) {
      setError('Minimum stake amount is RWF 20');
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
        targetScore,
        p1Score: 0,
        p2Score: 0,
        currentAccumulated: 0,
        currentTurn: 0,
        status: 'ACTIVE',
        isDemo: true,
      });
      return;
    }

    // Real Money Start
    try {
      const res = await fetch('/api/game/pve/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stake, targetScore }),
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
    if (!gameState || gameState.currentTurn !== 0 || isRolling || isAiThinking || gameState.status === 'COMPLETED') return;

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
            executeAiTurn(gameState.id, true);
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
            setGameState((prev: any) => ({
              ...prev,
              currentAccumulated: 0,
              currentTurn: 1,
            }));
            executeAiTurn(gameState.id, false);
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
              currentAccumulated: data.currentAccumulated,
              currentTurn: data.currentTurn,
            }));
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsRolling(false);
      }
    }, 700);
  };

  // Hold Score
  const handleHold = async () => {
    if (!gameState || gameState.currentTurn !== 0 || isRolling || isAiThinking || gameState.currentAccumulated === 0 || gameState.status === 'COMPLETED') return;

    soundManager.playHoldScore();
    setError(null);

    const matchTarget = gameState.targetScore || targetScore || 100;

    try {
      if (user?.isDemo) {
        // Demo Mode Hold Simulation
        const newP1Score = gameState.p1Score + gameState.currentAccumulated;
        if (newP1Score >= matchTarget) {
          soundManager.playVictory();
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
          const winPayout = gameState.stake * 2;
          onBalanceUpdate(user.wallet_balance + winPayout);
          
          setGameState((prev: any) => ({
            ...prev,
            p1Score: newP1Score,
            currentAccumulated: 0,
            status: 'COMPLETED',
            winner: 'PLAYER',
            winnerPayout: winPayout,
          }));
          setShowGameOverModal(true);
        } else {
          setGameState((prev: any) => ({
            ...prev,
            p1Score: newP1Score,
            currentAccumulated: 0,
            currentTurn: 1, // Pass to AI
          }));
          executeAiTurn(gameState.id, true);
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

        if (data.winner === 'PLAYER' || data.p1Score >= matchTarget) {
          soundManager.playVictory();
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
          onBalanceUpdate(data.newBalance);
          setGameState((prev: any) => ({
            ...prev,
            p1Score: data.p1Score,
            p2Score: data.p2Score,
            currentAccumulated: 0,
            status: 'COMPLETED',
            winner: 'PLAYER',
            winnerPayout: data.winnerPayout || gameState.stake * 1.8,
          }));
          setShowGameOverModal(true);
        } else if (data.winner === 'AI_BOT') {
          soundManager.playBustOne();
          setGameState((prev: any) => ({
            ...prev,
            p1Score: data.p1Score,
            p2Score: data.p2Score,
            currentAccumulated: 0,
            status: 'COMPLETED',
            winner: 'AI_BOT',
          }));
          setShowGameOverModal(true);
        } else {
          setGameState((prev: any) => ({
            ...prev,
            p1Score: data.p1Score,
            p2Score: data.p2Score,
            currentTurn: 1, // Pass to AI
            currentAccumulated: 0,
          }));
          executeAiTurn(gameState.id, false);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full space-y-3 sm:space-y-6">
      
      {/* Floating Praise Banner Popup */}
      {praiseBanner && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className={`rounded-2xl bg-gradient-to-r ${praiseBanner.color} px-4 py-2 sm:px-6 sm:py-3 shadow-2xl font-black text-xs sm:text-base border border-white/20 tracking-wide uppercase shadow-amber-500/40`}>
            {praiseBanner.text}
          </div>
        </div>
      )}

      {/* Game Over Victory Overlay Modal */}
      {showGameOverModal && gameState && gameState.status === 'COMPLETED' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 text-center shadow-2xl glow-gold">
            
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 shadow-xl glow-gold animate-bounce">
              <Trophy className="h-10 w-10" />
            </div>

            <h2 className="mt-4 text-2xl sm:text-3xl font-black text-white">
              {gameState.winner === 'PLAYER' ? '🎉 GAME OVER! YOU WON! 🏆' : '💥 GAME OVER! AI BOT WINS'}
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-slate-300">
              {gameState.winner === 'PLAYER'
                ? `You reached target of ${gameState.targetScore || targetScore} points!`
                : 'The AI Bot reached target first. Better luck next match!'}
            </p>

            {gameState.winner === 'PLAYER' && (
              <div className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/60 p-4 shadow-inner">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">Standard Match Winnings</span>
                <div className="text-3xl sm:text-4xl font-black text-emerald-300 mt-1">
                  +RWF {Number(gameState.winnerPayout || gameState.stake * 1.8).toLocaleString()} 💸
                </div>
              </div>
            )}

            <div className="mt-6 space-y-2.5">
              {gameState.winner === 'PLAYER' && (
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setShowGameOverModal(false);
                    setShowWheelModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 py-3.5 text-xs sm:text-sm font-black text-slate-950 shadow-xl shadow-amber-500/30 hover:from-amber-400 hover:to-amber-500 transition scale-100 hover:scale-[1.01]"
                >
                  <Sparkles className="h-4 w-4 fill-slate-950" />
                  SPIN MULTIPLIER WHEEL (Up to 1000x! 🎰)
                </button>
              )}

              <button
                onClick={() => {
                  soundManager.playClick();
                  setShowGameOverModal(false);
                  setGameState(null);
                }}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 text-xs sm:text-sm font-bold text-slate-300 hover:text-white hover:border-slate-600 transition"
              >
                {gameState.winner === 'PLAYER' ? 'Claim Standard Payout & Exit 💵' : 'Play Next Match'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multiplier Spin Wheel Modal */}
      {showWheelModal && gameState && (
        <MultiplierWheelModal
          isOpen={showWheelModal}
          onClose={() => {
            setShowWheelModal(false);
            setGameState(null);
          }}
          roomId={gameState.id}
          basePayout={gameState.winnerPayout || gameState.stake * 1.8}
          isDemo={!!user?.isDemo}
          onBalanceUpdate={onBalanceUpdate}
        />
      )}

      {/* Game Setup Card (When not in active game) */}
      {!gameState || gameState.status === 'COMPLETED' ? (
        <div className="mx-auto max-w-xl rounded-3xl border border-amber-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
          
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30 glow-gold">
              <Bot className="h-8 w-8 sm:h-9 sm:w-9" />
            </div>
            <h2 className="mt-3 text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-2">
              Single Player vs AI <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Challenge the RollDice AI Bot! Set your custom target score and stake amount!
            </p>
          </div>

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

          <div className="mt-5 space-y-4">
            
            {/* Target Score Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Select Target Score to Win</span>
                <span className="text-[10px] text-amber-400 font-bold">Custom Game Target</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {targetOptions.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setTargetScore(val);
                    }}
                    className={`rounded-xl border py-2.5 text-xs font-extrabold transition ${
                      targetScore === val
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 scale-105 shadow-md shadow-emerald-500/20'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {val} Points {val === 50 ? '⚡ (Fast)' : val === 100 ? '🎯 (Std)' : '🔥 (Long)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Stake Amount Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Select Stake Amount (RWF)</span>
                <span className="text-[10px] text-amber-400 font-bold">Min RWF 20</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {stakes.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setStake(val);
                      setCustomStakeInput(String(val));
                      setIsCustomStake(false);
                    }}
                    className={`rounded-xl border py-2.5 text-[11px] sm:text-xs font-extrabold transition ${
                      stake === val && !isCustomStake
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300 glow-gold scale-105 shadow-md shadow-amber-500/20'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    RWF {val.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Custom Stake Input Box */}
              <div className="mt-3">
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-black text-amber-400">RWF</span>
                  <input
                    type="number"
                    min="20"
                    max="100000"
                    placeholder="Enter custom stake amount (min 20)..."
                    value={customStakeInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomStakeInput(val);
                      setIsCustomStake(true);
                      const num = Number(val);
                      if (!isNaN(num)) {
                        setStake(num);
                      }
                    }}
                    onFocus={() => setIsCustomStake(true)}
                    className={`w-full rounded-xl border pl-14 pr-28 py-2.5 text-xs font-bold transition focus:outline-none ${
                      isCustomStake
                        ? 'border-amber-400 bg-slate-900 text-amber-300 ring-1 ring-amber-400/50 shadow-md shadow-amber-500/10'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                    }`}
                  />
                  <span className="absolute right-3 text-[10px] font-extrabold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                    Custom Stake
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-400 flex items-center justify-between shadow-inner">
              <span className="flex items-center gap-1.5 font-bold">
                <Flame className="h-4 w-4 text-amber-400" /> Winner Match Pot:
              </span>
              <span className="font-black text-emerald-400 text-sm sm:text-base">
                RWF {(stake * 2).toLocaleString()}
              </span>
            </div>

            <button
              onClick={handleStartGame}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 py-3 sm:py-3.5 text-sm sm:text-base font-black text-slate-950 shadow-xl shadow-amber-500/30 hover:from-amber-400 hover:to-amber-500 transition scale-100 hover:scale-[1.01]"
            >
              <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-slate-950" />
              Start Match ({targetScore} Target &bull; RWF {stake.toLocaleString()})
            </button>
          </div>
        </div>
      ) : (
        /* Active Game Arena */
        <div className="mx-auto max-w-4xl space-y-3 sm:space-y-6">
          
          {/* Top Status Bar */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 sm:px-6 sm:py-3.5 shadow-lg">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
              <span className="text-[11px] sm:text-xs font-semibold text-slate-300">PvE Arena</span>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] sm:text-xs font-extrabold text-amber-400 border border-amber-500/30">
                RWF {Number(gameState.stake).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
              <span className="text-slate-400">Target Score:</span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-black text-emerald-300 border border-emerald-500/30">
                {gameState.targetScore || targetScore || 100}
              </span>
            </div>
          </div>

          {/* Player vs AI Scores Cards (1 Column on Mobile, 2 Columns on SM+) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            
            {/* Player Card */}
            <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-3 sm:p-5 transition-all duration-300 ${
              gameState.currentTurn === 0
                ? 'border-amber-400 bg-slate-900 shadow-xl shadow-amber-500/20 ring-1 sm:ring-2 ring-amber-400/40'
                : 'border-slate-800 bg-slate-950/60 opacity-80'
            }`}>
              {gameState.currentTurn === 0 && (
                <span className="absolute top-2 right-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-slate-950 shadow-md animate-pulse">
                  ⚡ YOU
                </span>
              )}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md">
                  <User className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <div className="truncate">
                  <h4 className="text-xs sm:text-sm font-black text-white truncate">{user?.name || 'Player'}</h4>
                  <p className="text-[9px] sm:text-[11px] text-slate-400">You</p>
                </div>
              </div>

              <div className="mt-2 sm:mt-4 flex items-baseline justify-between">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400">Score:</span>
                <span className="text-xl sm:text-3xl font-black text-amber-400">{gameState.p1Score}</span>
              </div>

              {/* Dynamic Target Progress bar */}
              <div className="mt-2 sm:mt-3.5 space-y-0.5">
                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                  <span>Target Progress</span>
                  <span>{Math.round((gameState.p1Score / (gameState.targetScore || targetScore || 100)) * 100)}%</span>
                </div>
                <div className="h-1.5 sm:h-2.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                    style={{ width: `${Math.min(100, (gameState.p1Score / (gameState.targetScore || targetScore || 100)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI Bot Card */}
            <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-3 sm:p-5 transition-all duration-300 ${
              gameState.currentTurn === 1
                ? 'border-cyan-400 bg-slate-900 shadow-xl shadow-cyan-500/20 ring-1 sm:ring-2 ring-cyan-400/40'
                : 'border-slate-800 bg-slate-950/60 opacity-80'
            }`}>
              {gameState.currentTurn === 1 && (
                <span className="absolute top-2 right-2 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-slate-950 shadow-md animate-pulse">
                  🤖 BOT
                </span>
              )}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-md">
                  <Bot className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <div className="truncate">
                  <h4 className="text-xs sm:text-sm font-black text-white truncate">AI Bot</h4>
                  <p className="text-[9px] sm:text-[11px] text-slate-400">System</p>
                </div>
              </div>

              <div className="mt-2 sm:mt-4 flex items-baseline justify-between">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400">Score:</span>
                <span className="text-xl sm:text-3xl font-black text-cyan-400">{gameState.p2Score}</span>
              </div>

              {/* Dynamic Target Progress bar */}
              <div className="mt-2 sm:mt-3.5 space-y-0.5">
                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                  <span>Target Progress</span>
                  <span>{Math.round((gameState.p2Score / (gameState.targetScore || targetScore || 100)) * 100)}%</span>
                </div>
                <div className="h-1.5 sm:h-2.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-300 transition-all duration-500"
                    style={{ width: `${Math.min(100, (gameState.p2Score / (gameState.targetScore || targetScore || 100)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Dice & Action Center */}
          <div className="relative flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/90 p-4 sm:p-8 shadow-2xl backdrop-blur-xl">
            
            {/* Animated Floating score indicator */}
            {floatingScore && (
              <div className="absolute top-2 font-black text-xl text-emerald-400 animate-bounce transition-all">
                +{floatingScore} ⚡
              </div>
            )}

            <div className="text-center mb-1 sm:mb-3">
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-extrabold">Current Turn Score</span>
              <div className="text-3xl sm:text-5xl font-black text-emerald-400 mt-0.5 drop-shadow-md">
                +{gameState.currentAccumulated}
              </div>
            </div>

            {/* True 3D Rotating Cube Dice */}
            <Dice3D value={lastDice} isRolling={isRolling} size={85} />

            {/* Action Buttons */}
            <div className="mt-4 sm:mt-6 flex w-full max-w-sm gap-2 sm:gap-3">
              <button
                onClick={handleRoll}
                disabled={gameState.currentTurn !== 0 || isRolling || isAiThinking || gameState.status === 'COMPLETED'}
                className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 sm:py-4 text-xs sm:text-sm font-black text-slate-950 shadow-xl shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition disabled:opacity-40 scale-100 hover:scale-[1.02]"
              >
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 fill-slate-950" />
                {isRolling ? 'Rolling...' : 'ROLL DICE'}
              </button>

              <button
                onClick={handleHold}
                disabled={gameState.currentTurn !== 0 || isRolling || isAiThinking || gameState.currentAccumulated === 0 || gameState.status === 'COMPLETED'}
                className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 sm:py-4 text-xs sm:text-sm font-black text-white shadow-xl shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-500 transition disabled:opacity-40 scale-100 hover:scale-[1.02]"
              >
                <Award className="h-4 w-4 sm:h-5 sm:w-5" />
                HOLD SCORE
              </button>
            </div>

          </div>

          {/* AI Activity Ticker Feed */}
          {aiLogs.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <h5 className="text-[11px] font-bold text-cyan-400 mb-1.5 flex items-center gap-1">
                <Bot className="h-3.5 w-3.5 text-cyan-400" />
                AI Turn Actions:
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {aiLogs.map((log, idx) => (
                  <span
                    key={idx}
                    className={`rounded-lg px-2 py-0.5 text-[10px] sm:text-xs font-bold border shadow-sm ${
                      log.busted
                        ? 'border-red-500/40 bg-red-950/40 text-red-300'
                        : log.held
                        ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                        : 'border-slate-800 bg-slate-900 text-slate-300'
                    }`}
                  >
                    {log.busted ? '💥 Rolled 1' : `🎲 Rolled ${log.roll} ${log.held ? '🔒' : ''}`}
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
