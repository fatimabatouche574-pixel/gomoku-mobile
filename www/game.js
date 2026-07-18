(() => {
  'use strict';

  const SIZE = 15;
  const EMPTY = 0;
  const HUMAN = 1;
  const AI = 2;
  const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

  const canvas = document.getElementById('board');
  const context = canvas.getContext('2d');
  const difficultySelect = document.getElementById('difficulty');
  const restartButton = document.getElementById('restartButton');
  const undoButton = document.getElementById('undoButton');
  const statusText = document.getElementById('status');
  const turnText = document.getElementById('turnText');
  const difficultyNote = document.getElementById('difficultyNote');

  const difficultyDescriptions = {
    normal: '普通：基础攻防 + 少量变化',
    strong: '强势：候选排序 + 两层预判',
    crushing: '碾压：局面评估 + 三层威胁搜索'
  };

  let board = createBoard();
  let history = [];
  let lastMove = null;
  let isThinking = false;
  let gameOver = false;
  let canvasSize = 600;
  let gameToken = 0;

  function createBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
  }

  function isInside(x, y) {
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
  }

  function setStatus(message, turn) {
    statusText.textContent = message;
    turnText.textContent = turn;
  }

  function setThinking(value) {
    isThinking = value;
    difficultySelect.disabled = value;
    undoButton.disabled = value || history.length === 0;
  }

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvasSize = Math.max(280, Math.floor(rect.width));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvasSize * dpr);
    canvas.height = Math.round(canvasSize * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBoard();
  }

  function boardGeometry() {
    const margin = Math.max(17, canvasSize * 0.048);
    return { margin, cell: (canvasSize - margin * 2) / (SIZE - 1) };
  }

  function drawBoard() {
    const { margin, cell } = boardGeometry();
    context.clearRect(0, 0, canvasSize, canvasSize);
    context.fillStyle = '#d7b57a';
    context.fillRect(0, 0, canvasSize, canvasSize);

    context.strokeStyle = 'rgba(67,45,27,.72)';
    context.lineWidth = Math.max(1, canvasSize / 720);
    for (let index = 0; index < SIZE; index += 1) {
      const position = margin + index * cell;
      context.beginPath();
      context.moveTo(margin, position);
      context.lineTo(canvasSize - margin, position);
      context.stroke();
      context.beginPath();
      context.moveTo(position, margin);
      context.lineTo(position, canvasSize - margin);
      context.stroke();
    }

    context.fillStyle = '#5d4028';
    [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]].forEach(([x, y]) => {
      context.beginPath();
      context.arc(margin + x * cell, margin + y * cell, Math.max(2.4, cell * 0.08), 0, Math.PI * 2);
      context.fill();
    });

    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        if (board[y][x] !== EMPTY) drawStone(x, y, board[y][x]);
      }
    }
  }

  function drawStone(x, y, player) {
    const { margin, cell } = boardGeometry();
    const centerX = margin + x * cell;
    const centerY = margin + y * cell;
    const radius = cell * 0.42;

    context.save();
    context.shadowColor = 'rgba(0,0,0,.28)';
    context.shadowBlur = Math.max(2, cell * 0.13);
    context.shadowOffsetY = Math.max(1, cell * 0.06);
    const gradient = context.createRadialGradient(
      centerX - radius * 0.32,
      centerY - radius * 0.34,
      radius * 0.12,
      centerX,
      centerY,
      radius
    );

    if (player === HUMAN) {
      gradient.addColorStop(0, '#5b5b5b');
      gradient.addColorStop(0.45, '#202020');
      gradient.addColorStop(1, '#050505');
    } else {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.58, '#f4f1e8');
      gradient.addColorStop(1, '#c9c0b0');
    }

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();

    if (lastMove && lastMove.x === x && lastMove.y === y) {
      context.strokeStyle = '#a13d2d';
      context.lineWidth = Math.max(2, cell * 0.08);
      context.beginPath();
      context.arc(centerX, centerY, radius * 0.34, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function restartGame() {
    gameToken += 1;
    board = createBoard();
    history = [];
    lastMove = null;
    isThinking = false;
    gameOver = false;
    difficultyNote.textContent = difficultyDescriptions[difficultySelect.value];
    setStatus('点棋盘交叉点落子。', '你下');
    setThinking(false);
    drawBoard();
  }

  function undoMove() {
    if (isThinking || history.length === 0) return;
    gameToken += 1;

    if (history.at(-1)?.player === AI) {
      const move = history.pop();
      board[move.y][move.x] = EMPTY;
    }
    if (history.at(-1)?.player === HUMAN) {
      const move = history.pop();
      board[move.y][move.x] = EMPTY;
    }

    gameOver = false;
    lastMove = history.at(-1) || null;
    setStatus('已经悔棋，轮到你。', '你下');
    setThinking(false);
    drawBoard();
  }

  function placeStone(x, y, player) {
    board[y][x] = player;
    const move = { x, y, player };
    history.push(move);
    lastMove = move;
    drawBoard();
    return hasWon(x, y, player);
  }

  function hasWon(x, y, player) {
    return DIRECTIONS.some(([dx, dy]) => {
      let count = 1;
      for (const sign of [-1, 1]) {
        let nextX = x + dx * sign;
        let nextY = y + dy * sign;
        while (isInside(nextX, nextY) && board[nextY][nextX] === player) {
          count += 1;
          nextX += dx * sign;
          nextY += dy * sign;
        }
      }
      return count >= 5;
    });
  }

  function handleBoardInput(event) {
    if (gameOver || isThinking) return;

    const rect = canvas.getBoundingClientRect();
    const pointX = (event.clientX - rect.left) * (canvasSize / rect.width);
    const pointY = (event.clientY - rect.top) * (canvasSize / rect.height);
    const { margin, cell } = boardGeometry();
    const x = Math.round((pointX - margin) / cell);
    const y = Math.round((pointY - margin) / cell);

    if (!isInside(x, y) || board[y][x] !== EMPTY) return;
    const gridX = margin + x * cell;
    const gridY = margin + y * cell;
    if (Math.hypot(pointX - gridX, pointY - gridY) > cell * 0.5) return;

    if (placeStone(x, y, HUMAN)) {
      gameOver = true;
      setStatus('你赢了。这一步下得很漂亮。', '你赢');
      setThinking(false);
      return;
    }

    if (history.length === SIZE * SIZE) {
      gameOver = true;
      setStatus('棋盘下满，平局。', '平局');
      return;
    }

    setStatus('电脑正在判断局面…', '思考');
    setThinking(true);
    const token = ++gameToken;
    const delay = difficultySelect.value === 'crushing' ? 260 : 160;

    window.setTimeout(() => {
      if (token !== gameToken || gameOver) return;
      const move = chooseAiMove(difficultySelect.value);
      if (!move) return;
      const aiWon = placeStone(move.x, move.y, AI);
      setThinking(false);

      if (aiWon) {
        gameOver = true;
        setStatus('电脑连成五子。再来一盘。', '电脑赢');
      } else if (history.length === SIZE * SIZE) {
        gameOver = true;
        setStatus('棋盘下满，平局。', '平局');
      } else {
        setStatus('轮到你了。', '你下');
      }
    }, delay);
  }

  function chooseAiMove(level) {
    const directWin = findImmediateWin(AI);
    if (directWin) return directWin;

    const forcedBlock = findImmediateWin(HUMAN);
    if (forcedBlock) return forcedBlock;

    const candidateLimit = level === 'normal' ? 12 : level === 'strong' ? 10 : 9;
    const candidates = generateCandidates(AI, candidateLimit);
    if (!candidates.length) return firstEmptyCell();

    if (level === 'normal') {
      const shortlist = candidates.slice(0, Math.min(4, candidates.length));
      return Math.random() < 0.72 ? shortlist[0] : shortlist[Math.floor(Math.random() * shortlist.length)];
    }

    const depth = level === 'strong' ? 2 : 3;
    const width = level === 'strong' ? 7 : 6;
    let bestMove = candidates[0];
    let bestScore = -Infinity;

    for (const move of candidates.slice(0, level === 'strong' ? 8 : 9)) {
      board[move.y][move.x] = AI;
      const score = hasWon(move.x, move.y, AI)
        ? 1e12
        : search(depth - 1, HUMAN, -Infinity, Infinity, width);
      board[move.y][move.x] = EMPTY;
      const adjustedScore = score + move.score * (level === 'crushing' ? 0.025 : 0.012);
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestMove = move;
      }
    }

    return { x: bestMove.x, y: bestMove.y };
  }

  function search(depth, player, alpha, beta, width) {
    if (depth <= 0) return evaluateBoard();

    const winningMove = findImmediateWin(player);
    if (winningMove) return player === AI ? 9e11 + depth : -9e11 - depth;

    const opponent = player === AI ? HUMAN : AI;
    const forcedBlock = findImmediateWin(opponent);
    const moves = (forcedBlock ? [{ ...forcedBlock, score: 9e10 }] : generateCandidates(player, width)).slice(0, width);
    if (!moves.length) return evaluateBoard();

    if (player === AI) {
      let best = -Infinity;
      for (const move of moves) {
        board[move.y][move.x] = AI;
        const value = hasWon(move.x, move.y, AI)
          ? 9e11 + depth
          : search(depth - 1, HUMAN, alpha, beta, Math.max(3, width - 1));
        board[move.y][move.x] = EMPTY;
        best = Math.max(best, value);
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    }

    let best = Infinity;
    for (const move of moves) {
      board[move.y][move.x] = HUMAN;
      const value = hasWon(move.x, move.y, HUMAN)
        ? -9e11 - depth
        : search(depth - 1, AI, alpha, beta, Math.max(3, width - 1));
      board[move.y][move.x] = EMPTY;
      best = Math.min(best, value);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  function evaluateBoard() {
    const aiCandidates = generateCandidates(AI, 5);
    const humanCandidates = generateCandidates(HUMAN, 5);
    const aiBest = aiCandidates[0]?.attack || 0;
    const aiSecond = aiCandidates[1]?.attack || 0;
    const humanBest = humanCandidates[0]?.attack || 0;
    const humanSecond = humanCandidates[1]?.attack || 0;
    return aiBest * 1.08 + aiSecond * 0.22 - humanBest * 1.16 - humanSecond * 0.26;
  }

  function findImmediateWin(player) {
    for (const { x, y } of candidateCells()) {
      board[y][x] = player;
      const wins = hasWon(x, y, player);
      board[y][x] = EMPTY;
      if (wins) return { x, y };
    }
    return null;
  }

  function generateCandidates(player, limit) {
    const opponent = player === AI ? HUMAN : AI;
    const candidates = candidateCells().map(({ x, y }) => {
      const attack = pointScore(x, y, player);
      const defense = pointScore(x, y, opponent);
      const centerBias = 22 - Math.abs(x - 7) - Math.abs(y - 7);
      return { x, y, attack, defense, score: attack + defense * 1.12 + centerBias };
    });
    candidates.sort((first, second) => second.score - first.score);
    return candidates.slice(0, Math.max(1, limit));
  }

  function candidateCells() {
    if (history.length === 0) return [{ x: 7, y: 7 }];
    const cells = new Map();
    for (const move of history) {
      for (let offsetY = -2; offsetY <= 2; offsetY += 1) {
        for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const x = move.x + offsetX;
          const y = move.y + offsetY;
          if (isInside(x, y) && board[y][x] === EMPTY) cells.set(`${x},${y}`, { x, y });
        }
      }
    }
    return [...cells.values()];
  }

  function pointScore(x, y, player) {
    if (board[y][x] !== EMPTY) return -Infinity;
    return DIRECTIONS.reduce((score, [dx, dy]) => score + directionalScore(x, y, dx, dy, player), 0);
  }

  function directionalScore(x, y, dx, dy, player) {
    const opponent = player === AI ? HUMAN : AI;
    let line = '';

    for (let index = -5; index <= 5; index += 1) {
      const nextX = x + dx * index;
      const nextY = y + dy * index;
      if (!isInside(nextX, nextY)) line += '2';
      else if (index === 0 || board[nextY][nextX] === player) line += '1';
      else if (board[nextY][nextX] === EMPTY) line += '0';
      else if (board[nextY][nextX] === opponent) line += '2';
    }

    const patterns = [
      [/11111/, 100000000],
      [/011110/, 12000000],
      [/(211110|011112|11110|01111)/, 1800000],
      [/(01110|010110|011010)/, 260000],
      [/(0011100|00101100|00110100)/, 52000],
      [/(211100|001112|210110|011012|211010|010112)/, 14000],
      [/(001100|0010100|010100)/, 3200],
      [/(00011000|00010100)/, 650],
      [/(00100|01010)/, 110]
    ];

    let score = 0;
    for (const [pattern, value] of patterns) {
      if (pattern.test(line)) score += value;
    }
    return score;
  }

  function firstEmptyCell() {
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        if (board[y][x] === EMPTY) return { x, y };
      }
    }
    return null;
  }

  difficultySelect.addEventListener('change', () => {
    difficultyNote.textContent = difficultyDescriptions[difficultySelect.value];
  });
  restartButton.addEventListener('click', restartGame);
  undoButton.addEventListener('click', undoMove);
  canvas.addEventListener('pointerup', handleBoardInput);
  window.addEventListener('resize', resizeCanvas);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  resizeCanvas();
  restartGame();
})();
