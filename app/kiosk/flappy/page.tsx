"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import Iridescence from "@/components/Iridescence";
import { signIn, useSession } from "next-auth/react";

interface Pipe {
    x: number;
    gapY: number;
    passed: boolean;
}

export default function FlappyGame() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameLoopRef = useRef<number | null>(null);

    const [animatedBg, setAnimatedBg] = useState(false);
    const [hasPlayedToday, setHasPlayedToday] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [pointsEarned, setPointsEarned] = useState(0);
    const [awardingPoints, setAwardingPoints] = useState(false);

    // Game state
    const [birdY, setBirdY] = useState(250);
    const [birdVelocity, setBirdVelocity] = useState(0);
    const [pipes, setPipes] = useState<Pipe[]>([]);
    const [birdImage, setBirdImage] = useState<HTMLImageElement | null>(null);

    // Game constants
    const GRAVITY = 0.5;
    const JUMP_STRENGTH = -8;
    const BIRD_SIZE = 70;
    const PIPE_WIDTH = 60;
    const PIPE_GAP = 180;
    const PIPE_SPEED = 3;
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;
    const MAX_OBSTACLES_FOR_POINTS = 15;
    const POINTS_PER_OBSTACLE = 100;
    const MAX_POINTS = 1500;

    // Force static background for game performance
    useEffect(() => {
        setAnimatedBg(false);
    }, []);

    // Check if user has played today
    useEffect(() => {
        if (!session?.user) return;

        const checkPlayStatus = async () => {
            try {
                const userId = (session.user as any).id;
                const res = await fetch(`/api/game/check-play?userId=${userId}&game=flappy`);
                const data = await res.json();

                if (data.ok) {
                    setHasPlayedToday(data.hasPlayedToday);
                }
            } catch (err) {
                console.error("Failed to check play status:", err);
            }
        };

        checkPlayStatus();
    }, [session]);

    // Load bird image
    useEffect(() => {
        const img = new Image();
        img.src = '/img/srihari_bird.png';
        img.onload = () => setBirdImage(img);
    }, []);

    // Initialize game
    useEffect(() => {
        setPipes([{ x: CANVAS_WIDTH, gapY: 250, passed: false }]);
    }, []);

    const initializeGame = () => {
        setBirdY(250);
        setBirdVelocity(0);
        setPipes([{ x: CANVAS_WIDTH, gapY: 250, passed: false }]);
        setScore(0);
        setGameStarted(false);
        setGameOver(false);
        setPointsEarned(0);
    };

    // Handle jump
    const handleJump = () => {
        if (!gameStarted) {
            setGameStarted(true);
        }
        if (!gameOver) {
            setBirdVelocity(JUMP_STRENGTH);
        }
    };

    // Handle keyboard controls
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                handleJump();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [gameStarted, gameOver]);

    // Mark game as played when leaving without finishing (only if hasn't played today)
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (gameStarted && !gameOver && session?.user && !hasPlayedToday) {
                const userId = (session.user as any).id;
                fetch('/api/game/mark-played', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, game: 'flappy' }),
                    keepalive: true,
                });
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [gameStarted, gameOver, session, hasPlayedToday]);

    // Award points
    const awardPoints = async (finalScore: number) => {
        // Don't award points if already played today
        if (!session?.user || awardingPoints || hasPlayedToday) return;

        setAwardingPoints(true);
        try {
            const userId = (session.user as any).id;
            const points = Math.min(finalScore * POINTS_PER_OBSTACLE, MAX_POINTS);
            const res = await fetch('/api/game/award-points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    points,
                    score: finalScore,
                    game: 'flappy',
                }),
            });

            const data = await res.json();
            if (!data.ok) {
                console.error("Failed to award points:", data.error);
            }
        } catch (err) {
            console.error("Error awarding points:", err);
        } finally {
            setAwardingPoints(false);
        }
    };

    // Game loop
    useEffect(() => {
        if (!gameStarted || gameOver || !canvasRef.current || !birdImage) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const gameLoop = () => {
            // Update bird position
            const newVelocity = birdVelocity + GRAVITY;
            const newBirdY = birdY + newVelocity;

            // Check boundaries
            if (newBirdY <= 0 || newBirdY + BIRD_SIZE >= CANVAS_HEIGHT) {
                setGameOver(true);
                const points = Math.min(score * POINTS_PER_OBSTACLE, MAX_POINTS);
                setPointsEarned(points);
                awardPoints(score);
                return;
            }

            // Update pipes
            const newPipes = pipes.map(pipe => ({
                ...pipe,
                x: pipe.x - PIPE_SPEED
            }));

            // Add new pipes
            const lastPipe = newPipes[newPipes.length - 1];
            if (lastPipe && lastPipe.x < CANVAS_WIDTH - 250) {
                newPipes.push({
                    x: CANVAS_WIDTH,
                    gapY: Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 100) + 50,
                    passed: false
                });
            }

            // Remove off-screen pipes
            const visiblePipes = newPipes.filter(pipe => pipe.x > -PIPE_WIDTH);

            // Check collisions and score
            let newScore = score;
            visiblePipes.forEach(pipe => {
                // Check if bird passed pipe
                if (!pipe.passed && pipe.x + PIPE_WIDTH < 100) {
                    pipe.passed = true;
                    newScore++;
                }

                // Check collision
                const birdX = 100;
                if (
                    birdX + BIRD_SIZE > pipe.x &&
                    birdX < pipe.x + PIPE_WIDTH &&
                    (newBirdY < pipe.gapY || newBirdY + BIRD_SIZE > pipe.gapY + PIPE_GAP)
                ) {
                    setGameOver(true);
                    const points = Math.min(newScore * POINTS_PER_OBSTACLE, MAX_POINTS);
                    setPointsEarned(points);
                    awardPoints(newScore);
                    return;
                }
            });

            // Clear canvas
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw pipes
            ctx.fillStyle = '#2ecc71';
            visiblePipes.forEach(pipe => {
                // Top pipe
                ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
                // Bottom pipe
                ctx.fillRect(pipe.x, pipe.gapY + PIPE_GAP, PIPE_WIDTH, CANVAS_HEIGHT);

                // Pipe border
                ctx.strokeStyle = '#27ae60';
                ctx.lineWidth = 3;
                ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
                ctx.strokeRect(pipe.x, pipe.gapY + PIPE_GAP, PIPE_WIDTH, CANVAS_HEIGHT);
            });

            // Draw bird (Srihari)
            ctx.save();
            ctx.translate(100 + BIRD_SIZE / 2, newBirdY + BIRD_SIZE / 2);
            ctx.rotate(Math.min(newVelocity * 0.05, 0.5));
            ctx.drawImage(birdImage, -BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE);
            ctx.restore();

            // Update state
            setBirdY(newBirdY);
            setBirdVelocity(newVelocity);
            setPipes(visiblePipes);
            setScore(newScore);

            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };

        gameLoopRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
        };
    }, [gameStarted, gameOver, birdY, birdVelocity, pipes, score, birdImage]);

    const handleBackToMenu = async () => {
        if (gameStarted && !gameOver && session?.user && !hasPlayedToday) {
            try {
                const userId = (session.user as any).id;
                await fetch('/api/game/mark-played', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, game: 'flappy' }),
                });
            } catch (err) {
                console.error("Error marking game as played:", err);
            }
        }
        router.push('/kiosk');
    };

    // Show loading state
    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-xl text-gray-700">Loading...</p>
                </div>
            </div>
        );
    }

    // Show sign-in prompt if not authenticated
    if (status === "unauthenticated") {
        return (
            <div className="flex flex-col w-full min-h-screen overflow-auto relative">
                <div className="fixed inset-0 -z-20 bg-(--background)">
                    {animatedBg && (
                        <Iridescence
                            color={[1.0, 0.7, 0.7]}
                            mouseReact={true}
                            amplitude={0.1}
                            speed={1.0}
                        />
                    )}
                </div>

                <div className="flex-1 flex items-center justify-center p-8">
                    <Card className="bg-white/80 backdrop-blur-md shadow-xl border-2 border-transparent max-w-md">
                        <CardContent className="p-8 flex flex-col items-center text-center">
                            <span className="text-6xl mb-4">🔒</span>
                            <h2 className="text-2xl font-bold font-deco mb-2">
                                Sign In Required
                            </h2>
                            <p className="text-gray-600 mb-6">
                                You must be signed in to play Flappy Srihari and earn rewards!
                            </p>
                            <div className="flex flex-col gap-3 w-full">
                                <Button
                                    variant="default"
                                    onClick={() =>
                                        signIn("google", {
                                            callbackUrl: "/kiosk/flappy",
                                            prompt: "select_account",
                                        })
                                    }
                                    className="w-full"
                                >
                                    Sign in with Google
                                </Button>
                                <Link href="/kiosk" className="w-full">
                                    <Button variant="outline" className="w-full">
                                        Back to Menu
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }


    const currentPoints = Math.min(score * POINTS_PER_OBSTACLE, MAX_POINTS);
    const maxedOut = score >= MAX_OBSTACLES_FOR_POINTS;

    return (
        <div className="flex flex-col w-full min-h-screen overflow-auto relative">
            <div className="fixed inset-0 -z-20 bg-(--background)">
                {animatedBg && (
                    <Iridescence
                        color={[1.0, 0.7, 0.7]}
                        mouseReact={true}
                        amplitude={0.1}
                        speed={1.0}
                    />
                )}
            </div>

            <div className="flex-none p-6 z-10 flex items-center justify-between flex-wrap gap-4">
                <Button
                    onClick={handleBackToMenu}
                    variant="outline"
                    className="shadow-md"
                >
                    ← Back to Menu
                </Button>

                <div className="flex flex-col gap-2">
                    {hasPlayedToday && (
                        <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg text-center text-sm font-semibold">
                            ⚠️ Practice Mode - No Points Earned
                        </div>
                    )}
                    <div className="bg-white/80 backdrop-blur-md p-4 rounded-lg shadow-md flex gap-6">
                        <div className="text-center">
                            <div className="text-sm text-gray-600">Obstacles</div>
                            <div className="text-3xl font-bold">{score}</div>
                        </div>
                        <div className="text-center border-l pl-6">
                            <div className="text-sm text-gray-600">Points</div>
                            <div className={`text-3xl font-bold ${maxedOut ? 'text-green-600' : hasPlayedToday ? 'text-gray-400' : 'text-purple-600'}`}>
                                {currentPoints}
                            </div>
                            {maxedOut && !hasPlayedToday && (
                                <div className="text-xs text-green-600 font-bold">MAX!</div>
                            )}
                            {hasPlayedToday && (
                                <div className="text-xs text-gray-500 font-bold">NO POINTS</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-32"></div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <h1 className="text-4xl font-bold text-center mb-2 font-deco">
                    Flappy Srihari
                </h1>
                <p className="text-center text-gray-600 mb-6">
                    {gameStarted ? 'Click or press SPACE to flap!' : 'Click or press SPACE to start!'}
                </p>

                <div className="relative">
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        onClick={handleJump}
                        className="border-4 border-gray-800 rounded-lg shadow-2xl cursor-pointer bg-sky-300"
                    />

                    {!gameStarted && !gameOver && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                            <div className="text-white text-center">
                                <p className="text-2xl font-bold mb-2">Click to Start!</p>
                                {hasPlayedToday ? (
                                    <p className="text-sm text-yellow-300">Practice Mode - No points earned today</p>
                                ) : (
                                    <p className="text-sm">100 points per obstacle (max 1500 points)</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-center text-gray-600 mt-4 text-sm">
                    {hasPlayedToday
                        ? "Playing for fun - Come back tomorrow to earn points!"
                        : "Earn 100 points per obstacle passed (maximum 1500 points)"}
                </p>
            </div>

            {/* Game Over Modal */}
            {gameOver && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" />
                    <Card className="relative bg-white w-full max-w-md mx-4 shadow-2xl animate-in zoom-in">
                        <CardContent className="p-8 text-center">
                            <div className="text-6xl mb-4">
                                {pointsEarned >= MAX_POINTS ? '🎉' : pointsEarned > 0 ? '🎮' : '😢'}
                            </div>
                            <h2 className="text-3xl font-bold mb-2 font-deco">
                                {!hasPlayedToday && pointsEarned >= MAX_POINTS ? 'Perfect Score!' : 'Game Over!'}
                            </h2>
                            {!hasPlayedToday && pointsEarned > 0 && (
                                <p className="text-2xl font-bold text-purple-600 mb-4">
                                    +{pointsEarned} Points!
                                </p>
                            )}
                            {hasPlayedToday && (
                                <p className="text-lg text-yellow-600 mb-4">
                                    Practice Mode - No Points Earned
                                </p>
                            )}
                            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Obstacles Passed:</span>
                                    <span className="font-bold">{score}</span>
                                </div>
                                {!hasPlayedToday && (
                                    <div className="flex justify-between border-t pt-2 mt-2">
                                        <span className="text-gray-600">Points Earned:</span>
                                        <span className="font-bold text-purple-600">{pointsEarned}</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mb-4">
                                {hasPlayedToday
                                    ? "You've already earned points today. Come back tomorrow!"
                                    : "Come back tomorrow to play again!"}
                            </p>
                            <Button
                                onClick={() => router.push('/kiosk')}
                                className="w-full"
                                variant="default"
                            >
                                Back to Menu
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
