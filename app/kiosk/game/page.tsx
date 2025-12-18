"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import Iridescence from "@/components/Iridescence";
import { signIn, useSession } from "next-auth/react";

interface CardType {
    id: number;
    image: string;
    name: string;
    isFlipped: boolean;
    isMatched: boolean;
}

const drinkImages = [
    { name: "Classic Milk Tea", image: "classic_milk_tea.png" },
    { name: "Taro Milk Tea", image: "taro_milk_tea.png" },
    { name: "Matcha Milk Tea", image: "matcha_milk_tea.png" },
    { name: "Thai Milk Tea", image: "thai_milk_tea.png" },
    { name: "Honeydew Milk Tea", image: "honeydew_milk_tea.png" },
    { name: "Strawberry Milk Tea", image: "strawberry_milk_tea.png" },
    { name: "Passion Fruit Green Tea", image: "passion_fruit_green_tea.png" },
    { name: "Mango Green Tea", image: "mango_green_tea.png" },
];

export default function MatchingGame() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [cards, setCards] = useState<CardType[]>([]);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [matches, setMatches] = useState(0);
    const [gameWon, setGameWon] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [animatedBg, setAnimatedBg] = useState(false);
    const [hasPlayedToday, setHasPlayedToday] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [pointsEarned, setPointsEarned] = useState(0);
    const [awardingPoints, setAwardingPoints] = useState(false);
    const [pointsAwardedThisSession, setPointsAwardedThisSession] = useState(false);

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
                const res = await fetch(`/api/game/check-play?userId=${userId}&game=matching`);
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

    // Initialize game when authenticated (allow practice mode even if already played)
    useEffect(() => {
        if (status === "authenticated") {
            initializeGame();
        }
    }, [status]);

    // Timer
    useEffect(() => {
        if (!startTime || gameWon) return;

        const interval = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime, gameWon]);

    // Mark game as played when leaving without finishing (only if hasn't played today)
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (gameStarted && !gameWon && session?.user && !hasPlayedToday) {
                // Mark as played for today without awarding points
                const userId = (session.user as any).id;
                fetch('/api/game/mark-played', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, game: 'matching' }),
                    keepalive: true,
                });
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [gameStarted, gameWon, session, hasPlayedToday]);

    const initializeGame = () => {
        // Create pairs of cards
        const cardPairs: CardType[] = [];
        drinkImages.forEach((drink, index) => {
            cardPairs.push({
                id: index * 2,
                image: drink.image,
                name: drink.name,
                isFlipped: false,
                isMatched: false,
            });
            cardPairs.push({
                id: index * 2 + 1,
                image: drink.image,
                name: drink.name,
                isFlipped: false,
                isMatched: false,
            });
        });

        // Shuffle cards
        const shuffled = cardPairs.sort(() => Math.random() - 0.5);
        setCards(shuffled);
        setFlippedCards([]);
        setMoves(0);
        setMatches(0);
        setGameWon(false);
        setStartTime(null);
        setElapsedTime(0);
        setGameStarted(false);
        setPointsEarned(0);

        // If points were awarded this session, now mark as played for practice mode
        if (pointsAwardedThisSession) {
            setHasPlayedToday(true);
        }
    };

    const calculatePoints = (moves: number, time: number): number => {
        // Perfect game: 8 matches = 8 moves minimum
        // Good time: under 60 seconds
        const maxPoints = 1000;

        // Points based on moves (fewer is better)
        // 8 moves = 600 points, each extra move reduces score
        const minMoves = 8;
        const movesPenalty = Math.max(0, moves - minMoves) * 15;
        const movesScore = Math.max(0, 600 - movesPenalty);

        // Points based on time (faster is better)
        // Under 30s = 400 points, each 5s reduces score
        const timeScore = Math.max(0, 400 - Math.floor(time / 5) * 20);

        const totalPoints = Math.min(maxPoints, movesScore + timeScore);
        return Math.max(50, totalPoints); // Minimum 50 points
    };

    const awardPoints = async (points: number) => {
        // Don't award points if already played today or already awarded this session
        if (!session?.user || awardingPoints || hasPlayedToday || pointsAwardedThisSession) return;

        setAwardingPoints(true);
        try {
            const userId = (session.user as any).id;
            const res = await fetch('/api/game/award-points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    points,
                    moves,
                    time: elapsedTime,
                    game: 'matching',
                }),
            });

            const data = await res.json();
            if (data.ok) {
                // Mark as awarded in this session (will trigger practice mode on next play)
                setPointsAwardedThisSession(true);
            } else {
                console.error("Failed to award points:", data.error);
            }
        } catch (err) {
            console.error("Error awarding points:", err);
        } finally {
            setAwardingPoints(false);
        }
    };

    const handleCardClick = (clickedCard: CardType) => {
        // Start timer and mark game as started on first click
        if (!startTime) {
            setStartTime(Date.now());
            setGameStarted(true);
        }

        // Ignore if card is already flipped or matched
        if (clickedCard.isFlipped || clickedCard.isMatched) return;

        // Ignore if two cards are already flipped
        if (flippedCards.length === 2) return;

        // Flip the card
        const newCards = cards.map((card) =>
            card.id === clickedCard.id ? { ...card, isFlipped: true } : card
        );
        setCards(newCards);

        const newFlippedCards = [...flippedCards, clickedCard.id];
        setFlippedCards(newFlippedCards);

        // Check for match if two cards are flipped
        if (newFlippedCards.length === 2) {
            setMoves(moves + 1);

            const [firstId, secondId] = newFlippedCards;
            const firstCard = newCards.find((c) => c.id === firstId);
            const secondCard = newCards.find((c) => c.id === secondId);

            if (firstCard && secondCard && firstCard.image === secondCard.image) {
                // Match found!
                setTimeout(() => {
                    const matchedCards = newCards.map((card) =>
                        card.id === firstId || card.id === secondId
                            ? { ...card, isMatched: true }
                            : card
                    );
                    setCards(matchedCards);
                    setFlippedCards([]);

                    const newMatches = matches + 1;
                    setMatches(newMatches);

                    // Check if game is won
                    if (newMatches === drinkImages.length) {
                        const finalMoves = moves + 1;
                        const finalTime = Math.floor((Date.now() - startTime!) / 1000);
                        const points = calculatePoints(finalMoves, finalTime);
                        setPointsEarned(points);
                        setGameWon(true);

                        // Award points
                        awardPoints(points);
                    }
                }, 500);
            } else {
                // No match - flip cards back
                setTimeout(() => {
                    const unflippedCards = newCards.map((card) =>
                        card.id === firstId || card.id === secondId
                            ? { ...card, isFlipped: false }
                            : card
                    );
                    setCards(unflippedCards);
                    setFlippedCards([]);
                }, 1000);
            }
        }
    };

    const handleBackToMenu = async () => {
        // If game was started but not won, mark as played (only if hasn't played today)
        if (gameStarted && !gameWon && session?.user && !hasPlayedToday) {
            try {
                const userId = (session.user as any).id;
                await fetch('/api/game/mark-played', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, game: 'matching' }),
                });
            } catch (err) {
                console.error("Error marking game as played:", err);
            }
        }
        router.push('/kiosk');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                                You must be signed in to play the X0 Matching Game and earn rewards!
                            </p>
                            <div className="flex flex-col gap-3 w-full">
                                <Button
                                    variant="default"
                                    onClick={() =>
                                        signIn("google", {
                                            callbackUrl: "/kiosk/game",
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
                    {(hasPlayedToday || pointsAwardedThisSession) && (
                        <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg text-center text-sm font-semibold">
                            ⚠️ Practice Mode - No Points Earned
                        </div>
                    )}
                    <div className="bg-white/80 backdrop-blur-md p-4 rounded-lg shadow-md flex gap-6 items-center">
                        <div className="text-center">
                            <div className="text-sm text-gray-600">Moves</div>
                            <div className="text-2xl font-bold">{moves}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-gray-600">Matches</div>
                            <div className="text-2xl font-bold">{matches}/{drinkImages.length}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-gray-600">Time</div>
                            <div className="text-2xl font-bold">{formatTime(elapsedTime)}</div>
                        </div>
                    </div>
                </div>

                <div className="w-32"></div>
            </div>

            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-5xl">
                    <h1 className="text-4xl font-bold text-center mb-2 font-deco">
                        X0 Matching Game
                    </h1>
                    <p className="text-center text-gray-600 mb-8">
                        {hasPlayedToday || pointsAwardedThisSession
                            ? "Playing for fun - Come back tomorrow to earn points!"
                            : "Match all pairs to earn up to 1000 reward points!"}
                    </p>

                    <div className="grid grid-cols-4 gap-4 mb-8">
                        {cards.map((card) => (
                            <Card
                                key={card.id}
                                onClick={() => handleCardClick(card)}
                                className={`aspect-square cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                                    card.isMatched
                                        ? 'opacity-50 cursor-not-allowed'
                                        : card.isFlipped
                                        ? 'bg-white'
                                        : 'bg-gradient-to-br from-purple-500 to-pink-500'
                                }`}
                            >
                                <CardContent className="p-4 h-full flex items-center justify-center">
                                    {card.isFlipped || card.isMatched ? (
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <img
                                                src={`/img/${card.image}`}
                                                alt={card.name}
                                                className="w-full h-full object-contain"
                                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                    const target = e.currentTarget;
                                                    target.src = "/img/default_new_item.png";
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-6xl">🧋</div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            {/* Win Modal */}
            {gameWon && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" />
                    <Card className="relative bg-white w-full max-w-md mx-4 shadow-2xl animate-in zoom-in">
                        <CardContent className="p-8 text-center">
                            <div className="text-6xl mb-4">🎉</div>
                            <h2 className="text-3xl font-bold mb-2 font-deco">
                                Congratulations!
                            </h2>
                            {!hasPlayedToday && !pointsAwardedThisSession && pointsEarned > 0 && (
                                <p className="text-2xl font-bold text-purple-600 mb-4">
                                    +{pointsEarned} Points!
                                </p>
                            )}
                            {(hasPlayedToday || pointsAwardedThisSession) && (
                                <p className="text-lg text-yellow-600 mb-4">
                                    Practice Mode - No Points Earned
                                </p>
                            )}
                            <p className="text-gray-600 mb-6">
                                {hasPlayedToday || pointsAwardedThisSession
                                    ? "You completed the game! Great job!"
                                    : "You completed the game and earned reward points!"}
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Moves:</span>
                                    <span className="font-bold">{moves}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Time:</span>
                                    <span className="font-bold">{formatTime(elapsedTime)}</span>
                                </div>
                                {!hasPlayedToday && !pointsAwardedThisSession && (
                                    <div className="flex justify-between border-t pt-2 mt-2">
                                        <span className="text-gray-600">Points Earned:</span>
                                        <span className="font-bold text-purple-600">{pointsEarned}</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mb-4">
                                {hasPlayedToday || pointsAwardedThisSession
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
