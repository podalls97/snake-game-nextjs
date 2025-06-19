"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// Game constants
const TILE_SIZE = 20
const INITIAL_SPEED = 150
const SPEED_INCREASE = 20
const POINTS_PER_FOOD = 10
const LEVEL_UP_THRESHOLD = 50

// Type definitions
type SnakeSegment = { x: number; y: number }
type Food = { x: number; y: number }
type Obstacle = { x: number; y: number }
type Direction = { x: number; y: number }
type GameState = "start" | "playing" | "paused" | "levelComplete" | "gameOver"
type GridSize = { width: number; height: number }

export default function EnhancedSnakeGame() {
  // State variables
  const [gridSize, setGridSize] = useState<GridSize>({ width: 25, height: 20 })
  const [snake, setSnake] = useState<SnakeSegment[]>([])
  const [food, setFood] = useState<Food>({ x: 0, y: 0 })
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [direction, setDirection] = useState<Direction>({ x: 1, y: 0 })
  const [nextDirection, setNextDirection] = useState<Direction>({ x: 1, y: 0 })
  const [gameState, setGameState] = useState<GameState>("start")
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [highScore, setHighScore] = useState(0)
  const [gameSpeed, setGameSpeed] = useState(INITIAL_SPEED)
  const [foodEaten, setFoodEaten] = useState(0)
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)

  // Load high score from localStorage
  useEffect(() => {
    const savedHighScore = localStorage.getItem("snakeHighScore")
    if (savedHighScore) {
      setHighScore(Number.parseInt(savedHighScore))
    }
  }, [])

  // Generate obstacles based on level
  const generateObstacles = useCallback((currentLevel: number, gridSize: GridSize): Obstacle[] => {
    const obstacles: Obstacle[] = []
    const obstacleCount = Math.min(currentLevel * 2, 15)

    for (let i = 0; i < obstacleCount; i++) {
      let obstacle: Obstacle
      let attempts = 0

      do {
        obstacle = {
          x: Math.floor(Math.random() * gridSize.width),
          y: Math.floor(Math.random() * gridSize.height),
        }
        attempts++
      } while (
        attempts < 50 &&
        // Don't place obstacles in the center area where snake starts
        ((obstacle.x >= gridSize.width / 2 - 2 &&
          obstacle.x <= gridSize.width / 2 + 2 &&
          obstacle.y >= gridSize.height / 2 - 2 &&
          obstacle.y <= gridSize.height / 2 + 2) ||
          obstacles.some((obs) => obs.x === obstacle.x && obs.y === obstacle.y))
      )

      if (attempts < 50) {
        obstacles.push(obstacle)
      }
    }

    return obstacles
  }, [])

  // Function to place food in a random location
  const generateFood = useCallback(
    (currentSnake: SnakeSegment[], currentObstacles: Obstacle[], currentGrid: GridSize) => {
      let attempts = 0
      while (attempts < 100) {
        const newFoodPosition = {
          x: Math.floor(Math.random() * currentGrid.width),
          y: Math.floor(Math.random() * currentGrid.height),
        }

        // Ensure food doesn't spawn on the snake or obstacles
        const isOnSnake = currentSnake.some(
          (segment) => segment.x === newFoodPosition.x && segment.y === newFoodPosition.y,
        )
        const isOnObstacle = currentObstacles.some(
          (obstacle) => obstacle.x === newFoodPosition.x && obstacle.y === newFoodPosition.y,
        )

        if (!isOnSnake && !isOnObstacle) {
          setFood(newFoodPosition)
          return
        }
        attempts++
      }
    },
    [],
  )

  // Function to initialize or restart the game
  const startGame = useCallback(() => {
    const initialSnakePosition = [
      {
        x: Math.floor(gridSize.width / 2),
        y: Math.floor(gridSize.height / 2),
      },
    ]

    const levelObstacles = generateObstacles(level, gridSize)

    setSnake(initialSnakePosition)
    setObstacles(levelObstacles)
    generateFood(initialSnakePosition, levelObstacles, gridSize)

    setDirection({ x: 1, y: 0 })
    setNextDirection({ x: 1, y: 0 })
    setGameSpeed(INITIAL_SPEED - (level - 1) * SPEED_INCREASE)
    setGameState("playing")
  }, [gridSize, level, generateObstacles, generateFood])

  // Function to start a new game from level 1
  const newGame = useCallback(() => {
    setScore(0)
    setLevel(1)
    setFoodEaten(0)
    startGame()
  }, [startGame])

  // Function to advance to next level
  const nextLevel = useCallback(() => {
    setLevel((prev) => prev + 1)
    setFoodEaten(0)
    startGame()
  }, [startGame])

  // Game loop for moving the snake
  const gameLoop = useCallback(() => {
    if (gameState !== "playing") return

    setDirection(nextDirection)

    setSnake((prevSnake) => {
      const newSnake = [...prevSnake]
      const head = { ...newSnake[0] }

      head.x += nextDirection.x
      head.y += nextDirection.y

      // Wall collision check
      if (head.x < 0 || head.x >= gridSize.width || head.y < 0 || head.y >= gridSize.height) {
        setGameState("gameOver")
        return prevSnake
      }

      // Self-collision check
      for (let i = 1; i < newSnake.length; i++) {
        if (head.x === newSnake[i].x && head.y === newSnake[i].y) {
          setGameState("gameOver")
          return prevSnake
        }
      }

      // Obstacle collision check
      for (const obstacle of obstacles) {
        if (head.x === obstacle.x && head.y === obstacle.y) {
          setGameState("gameOver")
          return prevSnake
        }
      }

      newSnake.unshift(head)

      // Food collision check
      if (head.x === food.x && head.y === food.y) {
        const newScore = score + POINTS_PER_FOOD * level
        const newFoodEaten = foodEaten + 1

        setScore(newScore)
        setFoodEaten(newFoodEaten)

        // Check for level completion
        if (newFoodEaten >= LEVEL_UP_THRESHOLD / level) {
          setGameState("levelComplete")
          return newSnake
        }

        generateFood(newSnake, obstacles, gridSize)
      } else {
        newSnake.pop()
      }

      return newSnake
    })
  }, [nextDirection, food, gameState, gridSize, obstacles, score, level, foodEaten, generateFood])

  // Set up the game loop interval
  useEffect(() => {
    if (gameState === "playing") {
      gameLoopRef.current = setInterval(gameLoop, gameSpeed)
      return () => {
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current)
        }
      }
    }
  }, [gameState, gameLoop, gameSpeed])

  // Handle game over
  useEffect(() => {
    if (gameState === "gameOver") {
      if (score > highScore) {
        setHighScore(score)
        localStorage.setItem("snakeHighScore", score.toString())
      }
    }
  }, [gameState, score, highScore])

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()

      if (gameState === "start") {
        newGame()
        return
      }

      if (gameState === "gameOver") {
        newGame()
        return
      }

      if (gameState === "levelComplete") {
        nextLevel()
        return
      }

      if (gameState === "paused") {
        setGameState("playing")
        return
      }

      if (gameState === "playing") {
        if (e.key === " " || e.key === "Escape") {
          setGameState("paused")
          return
        }

        setNextDirection((prevDirection) => {
          switch (e.key) {
            case "ArrowUp":
            case "w":
            case "W":
              if (direction.y === 1) return prevDirection
              return { x: 0, y: -1 }
            case "ArrowDown":
            case "s":
            case "S":
              if (direction.y === -1) return prevDirection
              return { x: 0, y: 1 }
            case "ArrowLeft":
            case "a":
            case "A":
              if (direction.x === 1) return prevDirection
              return { x: -1, y: 0 }
            case "ArrowRight":
            case "d":
            case "D":
              if (direction.x === -1) return prevDirection
              return { x: 1, y: 0 }
            default:
              return prevDirection
          }
        })
      }
    },
    [gameState, direction, newGame, nextLevel],
  )

  // Add and remove event listener for keyboard input
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])

  // Effect to set up the grid on window resize
  useEffect(() => {
    const updateGridSize = () => {
      const maxWidth = Math.floor((window.innerWidth - 40) / TILE_SIZE)
      const maxHeight = Math.floor((window.innerHeight - 200) / TILE_SIZE)
      const width = Math.min(Math.max(maxWidth, 15), 35)
      const height = Math.min(Math.max(maxHeight, 12), 25)
      setGridSize({ width, height })
    }

    updateGridSize()
    window.addEventListener("resize", updateGridSize)

    return () => window.removeEventListener("resize", updateGridSize)
  }, [])

  // Touch controls for mobile
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    const minSwipeDistance = 30

    if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0 && direction.x !== -1) {
          setNextDirection({ x: 1, y: 0 })
        } else if (deltaX < 0 && direction.x !== 1) {
          setNextDirection({ x: -1, y: 0 })
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && direction.y !== -1) {
          setNextDirection({ x: 0, y: 1 })
        } else if (deltaY < 0 && direction.y !== 1) {
          setNextDirection({ x: 0, y: -1 })
        }
      }
    }

    setTouchStart(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-4xl bg-black/20 backdrop-blur-sm border-green-500/30">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-green-400 mb-2">Enhanced Snake</h1>
              <div className="flex flex-wrap gap-4 text-sm text-green-300">
                <span>Score: {score}</span>
                <span>Level: {level}</span>
                <span>High Score: {highScore}</span>
                <span>Speed: {Math.max(1, 6 - Math.floor((INITIAL_SPEED - gameSpeed) / SPEED_INCREASE))}/5</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={newGame}
                variant="outline"
                className="bg-green-600 hover:bg-green-500 text-white border-green-400"
              >
                New Game
              </Button>
              {gameState === "playing" && (
                <Button
                  onClick={() => setGameState("paused")}
                  variant="outline"
                  className="bg-yellow-600 hover:bg-yellow-500 text-white border-yellow-400"
                >
                  Pause
                </Button>
              )}
            </div>
          </div>

          {/* Game Board */}
          <div className="flex justify-center">
            <div
              className="game-board relative border-2 border-green-500 bg-gradient-to-br from-green-950 to-black"
              style={{
                width: gridSize.width * TILE_SIZE,
                height: gridSize.height * TILE_SIZE,
                display: "grid",
                gridTemplateColumns: `repeat(${gridSize.width}, 1fr)`,
                gridTemplateRows: `repeat(${gridSize.height}, 1fr)`,
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {gameState === "playing" && (
                <>
                  {/* Snake */}
                  {snake.map((segment, index) => {
                    const isHead = index === 0
                    const isNeck = index === 1
                    const isTail = index === snake.length - 1

                    // Determine snake direction for head orientation
                    let headRotation = 0
                    if (isHead && snake.length > 1) {
                      const neck = snake[1]
                      if (segment.x > neck.x)
                        headRotation = 0 // Right
                      else if (segment.x < neck.x)
                        headRotation = 180 // Left
                      else if (segment.y > neck.y)
                        headRotation = 90 // Down
                      else if (segment.y < neck.y) headRotation = 270 // Up
                    }

                    return (
                      <div
                        key={index}
                        className={`relative ${
                          isHead ? "snake-head" : isTail ? "snake-tail" : isNeck ? "snake-neck" : "snake-body"
                        }`}
                        style={{
                          gridColumnStart: segment.x + 1,
                          gridRowStart: segment.y + 1,
                          transform: isHead ? `rotate(${headRotation}deg)` : "none",
                          transformOrigin: "center",
                        }}
                      >
                        {isHead && (
                          <>
                            {/* Snake Eyes */}
                            <div className="snake-eye snake-eye-left" />
                            <div className="snake-eye snake-eye-right" />
                            {/* Nostrils */}
                            <div className="snake-nostril snake-nostril-left" />
                            <div className="snake-nostril snake-nostril-right" />
                          </>
                        )}
                        {!isHead && (
                          <>
                            {/* Scale pattern for body */}
                            <div className="snake-scale snake-scale-1" />
                            <div className="snake-scale snake-scale-2" />
                            <div className="snake-scale snake-scale-3" />
                          </>
                        )}
                      </div>
                    )
                  })}

                  {/* Food */}
                  <div
                    className="realistic-food animate-pulse"
                    style={{
                      gridColumnStart: food.x + 1,
                      gridRowStart: food.y + 1,
                    }}
                  />

                  {/* Obstacles */}
                  {obstacles.map((obstacle, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-gray-600 to-gray-800 border border-gray-500 rounded-sm"
                      style={{
                        gridColumnStart: obstacle.x + 1,
                        gridRowStart: obstacle.y + 1,
                        boxShadow: "inset 0 0 5px rgba(0, 0, 0, 0.5)",
                      }}
                    />
                  ))}
                </>
              )}

              {/* Game Overlays */}
              {gameState !== "playing" && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="text-center text-white p-6 bg-black/50 rounded-lg border border-green-500">
                    {gameState === "start" && (
                      <>
                        <h2 className="text-2xl font-bold mb-4 text-green-400">Welcome to Enhanced Snake!</h2>
                        <p className="mb-4 text-green-300">Navigate through levels with increasing difficulty</p>
                        <Button onClick={newGame} className="mb-4 bg-green-600 hover:bg-green-500">
                          Start Game
                        </Button>
                        <div className="text-sm text-green-200">
                          <p>🎮 Use Arrow Keys or WASD to move</p>
                          <p>📱 Swipe on mobile devices</p>
                          <p>⏸️ Press Space or Escape to pause</p>
                        </div>
                      </>
                    )}

                    {gameState === "paused" && (
                      <>
                        <h2 className="text-2xl font-bold mb-4 text-yellow-400">Game Paused</h2>
                        <Button onClick={() => setGameState("playing")} className="bg-green-600 hover:bg-green-500">
                          Resume
                        </Button>
                      </>
                    )}

                    {gameState === "levelComplete" && (
                      <>
                        <h2 className="text-2xl font-bold mb-4 text-green-400">Level {level} Complete!</h2>
                        <p className="mb-4 text-green-300">Score: {score}</p>
                        <Button onClick={nextLevel} className="bg-green-600 hover:bg-green-500">
                          Next Level
                        </Button>
                      </>
                    )}

                    {gameState === "gameOver" && (
                      <>
                        <h2 className="text-2xl font-bold mb-4 text-red-400">Game Over</h2>
                        <p className="mb-2 text-white">Final Score: {score}</p>
                        <p className="mb-2 text-white">Level Reached: {level}</p>
                        {score === highScore && <p className="mb-4 text-yellow-400 font-bold">🎉 New High Score!</p>}
                        <Button onClick={newGame} className="bg-green-600 hover:bg-green-500">
                          Play Again
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {gameState === "playing" && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-green-300 mb-1">
                <span>Level Progress</span>
                <span>
                  {foodEaten}/{Math.ceil(LEVEL_UP_THRESHOLD / level)} food
                </span>
              </div>
              <div className="w-full bg-green-900 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-lime-400 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(foodEaten / Math.ceil(LEVEL_UP_THRESHOLD / level)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
