'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Dice3D } from './Dice3D';
import { soundManager } from '@/lib/sound';
import { Users, Plus, Play, ShieldCheck, Zap, Award, AlertTriangle, Copy, Check } from 'lucide-react';

interface PvPGameProps {
  user: any;
  onBalanceUpdate: (newBalance: number) => void;
  onOpenDeposit: () => void;
}

export const PvPGame: React.FC<PvPGameProps> = ({ user, onBalanceUpdate, onOpenDeposit }) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [stake, setStake] = useState<number>(20);
  const [customStakeInput, setCustomStakeInput] = useState<string>('20');
  const [isCustomStake, setIsCustomStake] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState(false);
  const [lastDice, setLastDice] = useState<number>(6);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const stakes = [20, 50, 100, 200, 500, 1000];

  // Fetch active public rooms
  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/game/rooms');
      const data = await res.json();
      if (res.ok) {
        setRooms(data.rooms || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  // Poll active room state when in room
  useEffect(() => {
    if (!activeRoom || activeRoom.status === 'COMPLETED') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/game/rooms/${activeRoom.id}`);
        const data = await res.json();
        if (res.ok && data.room) {
          if (data.room.status === 'COMPLETED' && activeRoom.status !== 'COMPLETED') {
            if (data.room.winner_id === user?.id) {
              soundManager.playVictory();
              confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
            }
          }
          setActiveRoom(data.room);
        }
      } catch {}
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [activeRoom, user]);

  // Create room
  const handleCreateRoom = async () => {
    soundManager.playClick();
    setError(null);

    if (!stake || isNaN(stake) || stake < 20) {
      setError('Minimum room stake amount is RWF 20');
      return;
    }

    if (user.wallet_balance < stake) {
      setError(`Insufficient balance. Available: RWF ${user.wallet_balance.toLocaleString()}`);
      return;
    }

    try {
      const res = await fetch('/api/game/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stake }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      onBalanceUpdate(data.newBalance);

      // Fetch newly created room details
      const roomRes = await fetch(`/api/game/rooms/${data.roomId}`);
      const roomData = await roomRes.json();
      setActiveRoom(roomData.room);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Join room
  const handleJoinRoom = async (roomId: string) => {
    soundManager.playClick();
    setError(null);

    if (!user) {
      setError('Please login to join a wager room');
      return;
    }

    try {
      const res = await fetch(`/api/game/rooms/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'JOIN' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      if (data.newBalance !== undefined) {
        onBalanceUpdate(data.newBalance);
      }

      const roomRes = await fetch(`/api/game/rooms/${roomId}`);
      const roomData = await roomRes.json();
      setActiveRoom(roomData.room);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Action: Roll
  const handleRoll = async () => {
    if (!activeRoom || isRolling) return;

    soundManager.playDiceShake();
    setIsRolling(true);
    setError(null);

    setTimeout(async () => {
      try {
        const res = await fetch(`/api/game/rooms/${activeRoom.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ROLL' }),
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

        setActiveRoom((prev: any) => ({
          ...prev,
          current_accumulated: data.currentAccumulated,
          current_turn: data.currentTurn,
        }));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsRolling(false);
      }
    }, 400);
  };

  // Action: Hold
  const handleHold = async () => {
    if (!activeRoom || isRolling || activeRoom.current_accumulated === 0) return;

    soundManager.playHoldScore();
    setError(null);

    try {
      const res = await fetch(`/api/game/rooms/${activeRoom.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'HOLD' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Hold failed');
      }

      if (data.isWin) {
        soundManager.playVictory();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        if (data.newBalance !== undefined) {
          onBalanceUpdate(data.newBalance);
        }
      }

      setActiveRoom((prev: any) => ({
        ...prev,
        p1_score: data.p1Score,
        p2_score: data.p2Score,
        current_turn: data.currentTurn !== undefined ? data.currentTurn : prev.current_turn,
        current_accumulated: 0,
        status: data.isWin ? 'COMPLETED' : prev.status,
        winner_id: data.winnerId || prev.winner_id,
      }));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isPlayer1 = activeRoom?.player1_id === user?.id;
  const isPlayer2 = activeRoom?.player2_id === user?.id;
  const myTurnIndex = isPlayer1 ? 0 : 1;
  const isMyTurn = activeRoom?.status === 'ACTIVE' && activeRoom?.current_turn === myTurnIndex;

  return (
    <div className="w-full space-y-3 sm:space-y-6">
      
      {/* Lobby / Room Creation View */}
      {!activeRoom ? (
        <div className="space-y-4 sm:space-y-6">
          
          {/* Create Room Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 glow-cyan">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">PvP Multiplayer Rooms</h2>
                <p className="text-xs text-slate-400">Play live head-to-head against real online opponents</p>
              </div>
            </div>

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

            <div className="mt-5 space-y-4 border-t border-slate-800 pt-4">
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span>Select Room Stake (RWF)</span>
                  <span className="text-[10px] text-cyan-400 font-bold">Min RWF 20</span>
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
                      className={`rounded-xl border py-2 text-[11px] sm:text-xs font-extrabold transition ${
                        stake === val && !isCustomStake
                          ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 glow-cyan scale-105 shadow-md shadow-cyan-500/20'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      RWF {val.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Custom Stake Box */}
                <div className="mt-3">
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-black text-cyan-400">RWF</span>
                    <input
                      type="number"
                      min="20"
                      max="100000"
                      placeholder="Enter custom room stake (min 20)..."
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
                          ? 'border-cyan-400 bg-slate-900 text-cyan-300 ring-1 ring-cyan-400/50 shadow-md shadow-cyan-500/10'
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                      }`}
                    />
                    <span className="absolute right-3 text-[10px] font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">
                      Custom Stake
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-3.5 text-xs sm:text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-cyan-500 transition"
              >
                <Plus className="h-4 w-4" />
                Create Wager Room (RWF {stake.toLocaleString()})
              </button>
            </div>
          </div>

          {/* Active Public Rooms List */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-xs sm:text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              Live Online Wager Rooms
            </h3>

            {rooms.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                No active rooms right now. Create one above to invite players!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-3 sm:p-4 transition hover:border-slate-700"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-white">{r.player1_name || 'Player'}</span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                          RWF {Number(r.stake).toLocaleString()} Stake
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Status: <span className={r.status === 'WAITING' ? 'text-amber-400' : 'text-emerald-400'}>{r.status}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleJoinRoom(r.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      {r.player1_id === user?.id ? 'Enter' : 'Join'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Active PvP Room Arena (Compact Mobile Fit) */
        <div className="mx-auto max-w-4xl space-y-3 sm:space-y-6">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 sm:px-6 sm:py-3 shadow-lg">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400" />
              <span className="text-[11px] sm:text-xs font-semibold text-slate-300">Room:</span>
              <span className="font-mono text-xs font-bold text-cyan-300">{activeRoom.id.substring(0, 8)}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeRoom.id);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="ml-1 text-slate-400 hover:text-white"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <button
              onClick={() => setActiveRoom(null)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-white"
            >
              Exit Arena
            </button>
          </div>

          {/* Waiting for Opponent Banner */}
          {activeRoom.status === 'WAITING' && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-center shadow-lg">
              <h3 className="text-xs sm:text-sm font-extrabold text-amber-300">Waiting for Opponent to Join...</h3>
              <p className="mt-0.5 text-[11px] text-slate-300">
                Share Room ID <span className="font-mono font-bold text-white">{activeRoom.id}</span> with a friend!
              </p>
            </div>
          )}

          {/* Player 1 vs Player 2 Cards (1 Column on Mobile, 2 Columns on SM+) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            
            {/* Player 1 */}
            <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-3 sm:p-5 transition-all ${
              activeRoom.current_turn === 0 && activeRoom.status === 'ACTIVE'
                ? 'border-amber-400/80 bg-slate-900/90 shadow-xl shadow-amber-500/10'
                : 'border-slate-800 bg-slate-950/60 opacity-80'
            }`}>
              {activeRoom.current_turn === 0 && activeRoom.status === 'ACTIVE' && (
                <span className="absolute top-2 right-2 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-slate-950 animate-pulse">
                  TURN P1
                </span>
              )}
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs">
                  P1
                </div>
                <div className="truncate">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">{activeRoom.player1_name || 'Player 1'}</h4>
                  <p className="text-[9px] text-slate-400">{isPlayer1 ? '(You)' : 'Opponent'}</p>
                </div>
              </div>

              <div className="mt-2 sm:mt-4 flex items-baseline justify-between">
                <span className="text-[10px] sm:text-xs text-slate-400">Score:</span>
                <span className="text-xl sm:text-3xl font-black text-amber-400">{activeRoom.p1_score}</span>
              </div>
            </div>

            {/* Player 2 */}
            <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-3 sm:p-5 transition-all ${
              activeRoom.current_turn === 1 && activeRoom.status === 'ACTIVE'
                ? 'border-cyan-400/80 bg-slate-900/90 shadow-xl shadow-cyan-500/10'
                : 'border-slate-800 bg-slate-950/60 opacity-80'
            }`}>
              {activeRoom.current_turn === 1 && activeRoom.status === 'ACTIVE' && (
                <span className="absolute top-2 right-2 rounded-full bg-cyan-400 px-2 py-0.5 text-[9px] font-black text-slate-950 animate-pulse">
                  TURN P2
                </span>
              )}
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 font-bold text-xs">
                  P2
                </div>
                <div className="truncate">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">{activeRoom.player2_name || 'Waiting...'}</h4>
                  <p className="text-[9px] text-slate-400">{isPlayer2 ? '(You)' : 'Opponent'}</p>
                </div>
              </div>

              <div className="mt-2 sm:mt-4 flex items-baseline justify-between">
                <span className="text-[10px] sm:text-xs text-slate-400">Score:</span>
                <span className="text-xl sm:text-3xl font-black text-cyan-400">{activeRoom.p2_score}</span>
              </div>
            </div>

          </div>

          {/* Dice & Action Center */}
          <div className="flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/80 p-4 sm:p-8 shadow-2xl backdrop-blur-xl">
            
            <div className="text-center mb-1">
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-bold">Current Turn Score</span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 mt-0.5">
                +{activeRoom.current_accumulated || 0}
              </div>
            </div>

            <Dice3D value={lastDice} isRolling={isRolling} size={85} />

            {/* Action Buttons */}
            <div className="mt-4 sm:mt-6 flex w-full max-w-sm gap-2 sm:gap-3">
              <button
                onClick={handleRoll}
                disabled={!isMyTurn || isRolling}
                className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 sm:py-3.5 text-xs sm:text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition disabled:opacity-40"
              >
                <Zap className="h-4 w-4" />
                {isRolling ? 'Rolling...' : 'ROLL DICE'}
              </button>

              <button
                onClick={handleHold}
                disabled={!isMyTurn || isRolling || !activeRoom.current_accumulated}
                className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 sm:py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 transition disabled:opacity-40"
              >
                <Award className="h-4 w-4" />
                HOLD SCORE
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
