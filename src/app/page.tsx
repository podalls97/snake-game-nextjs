"use client";
import { useState, useEffect, useCallback } from "react";

// Game constants
const TILE_SIZE = 20; // The size of each grid cell in pixels

// Type definitions
type SnakeSegment = { x: number; y: number };
type Food = { x: number; y: number };
type Direction = { x: number; y: number };
type GameState = "start" | "playing" | "gameOver";
type GridSize = { width: number; height: number };

export default function Home() {
  // State variables
  const [gridSize, setGridSize] = useState<GridSize>({ width: 20, height: 20 });
  const [snake, setSnake] = useState<SnakeSegment[]>([]);
  const [food, setFood] = useState<Food>({ x: 0, y: 0 });
  const [direction, setDirection] = useState<Direction>({ x: 1, y: 0 });
  const [gameState, setGameState] = useState<GameState>("start");
  const [score, setScore] = useState(0);

  // Function to initialize or restart the game
  const startGame = useCallback(() => {
    // Center the snake initially
    const initialSnakePosition = [{
      x: Math.floor(gridSize.width / 2),
      y: Math.floor(gridSize.height / 2),
    }];
    setSnake(initialSnakePosition);

    // Place the food
    generateFood(initialSnakePosition, gridSize);
    
    // Reset direction and score
    setDirection({ x: 1, y: 0 });
    setScore(0);
    setGameState("playing");
  }, [gridSize]);


  // Function to place food in a random location
  const generateFood = (currentSnake: SnakeSegment[], currentGrid: GridSize) => {
    while (true) {
      const newFoodPosition = {
        x: Math.floor(Math.random() * currentGrid.width),
        y: Math.floor(Math.random() * currentGrid.height),
      };

      // Ensure food doesn't spawn on the snake
      const isColliding = currentSnake.some(
        segment => segment.x === newFoodPosition.x && segment.y === newFoodPosition.y
      );

      if (!isColliding) {
        setFood(newFoodPosition);
        return;
      }
    }
  };
  
  // Game loop for moving the snake
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;

    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };

      head.x += direction.x;
      head.y += direction.y;

      // Wall collision check
      if (
        head.x < 0 ||
        head.x >= gridSize.width ||
        head.y < 0 ||
        head.y >= gridSize.height
      ) {
        setGameState("gameOver");
        return prevSnake;
      }

      // Self-collision check
      for (let i = 1; i < newSnake.length; i++) {
        if (head.x === newSnake[i].x && head.y === newSnake[i].y) {
          setGameState("gameOver");
          return prevSnake;
        }
      }

      newSnake.unshift(head);

      // Food collision check
      if (head.x === food.x && head.y === food.y) {
        setScore(prevScore => prevScore + 10);
        generateFood(newSnake, gridSize);
      } else {
        newSnake.pop();
      }
      
      return newSnake;
    });
  }, [direction, food, gameState, gridSize]);


  // Set up the game loop interval
  useEffect(() => {
    if (gameState === "playing") {
      const interval = setInterval(gameLoop, 100);
      return () => clearInterval(interval);
    }
  }, [gameState, gameLoop]);
  
  
  // Handle keyboard input
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (gameState === 'start' || gameState === 'gameOver') {
          startGame();
          return;
      }

      setDirection(prevDirection => {
          switch (e.key) {
              case "ArrowUp":
                  // Prevent the snake from reversing
                  if (prevDirection.y === 1) return prevDirection;
                  return { x: 0, y: -1 };
              case "ArrowDown":
                  if (prevDirection.y === -1) return prevDirection;
                  return { x: 0, y: 1 };
              case "ArrowLeft":
                  if (prevDirection.x === 1) return prevDirection;
                  return { x: -1, y: 0 };
              case "ArrowRight":
                  if (prevDirection.x === -1) return prevDirection;
                  return { x: 1, y: 0 };
              default:
                  return prevDirection;
          }
      });
  }, [gameState, startGame]);


  // Add and remove event listener for keyboard input
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
  

  // Effect to set up the grid on window resize
  useEffect(() => {
    const updateGridSize = () => {
      const width = Math.floor(window.innerWidth / TILE_SIZE);
      const height = Math.floor((window.innerHeight - 50) / TILE_SIZE); // Subtract header height
      setGridSize({ width, height });
    };

    updateGridSize(); // Initial setup
    window.addEventListener('resize', updateGridSize);
    
    // When the component unmounts, stop listening to resize events
    return () => window.removeEventListener('resize', updateGridSize);
  }, []);


  // Render the game component
  return (
    <div className="game-container">
      <div className="score-header">
          <h1>Snake Game</h1>
          <div className="score">Score: {score}</div>
      </div>
      <div
        className="game-board"
        style={{
          width: gridSize.width * TILE_SIZE,
          height: gridSize.height * TILE_SIZE,
          gridTemplateColumns: `repeat(${gridSize.width}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize.height}, 1fr)`,
        }}
      >
        {gameState === 'playing' && (
          <>
            {snake.map((segment, index) => (
              <div
                key={index}
                className="snake"
                style={{
                  gridColumnStart: segment.x + 1,
                  gridRowStart: segment.y + 1,
                }}
              />
            ))}
            <div
              className="food"
              style={{
                gridColumnStart: food.x + 1,
                gridRowStart: food.y + 1,
              }}
            >
              🍎
            </div>
          </>
        )}
        {gameState === 'start' && (
            <div className="game-overlay">
                <h2>Welcome to Snake!</h2>
                <button onClick={startGame}>Start Game</button>
                <p className="controls">Use Arrow Keys to Move</p>
            </div>
        )}
        {gameState === 'gameOver' && (
          <div className="game-overlay">
            <h2>Game Over</h2>
            <p>Your final score is {score}</p>
            <button onClick={startGame}>Restart Game</button>
          </div>
        )}
      </div>
    </div>
  );
}
