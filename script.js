// Three.js setup
let scene, camera, renderer;

// Board setup
const ROWS = 20;
const COLS = 25;
const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

// Game elements
let ground;
let walls = [];
let currentTetrimino;
let currentTetriminoType;

// Game variables
let gameStart = false;
let gameEnded = false;
let score = 0;
let points = 0;
let dropCounter = 0;
let lastTime = 0;

const dropInterval = 1000; // 1 second

// DOM elements
const scoreElement = document.getElementById("score");
const instructionsElement = document.getElementById("instructions");
const resultsElement = document.getElementById("results");
const gameMusic = document.getElementById("game-music");
const finalScoreElement = document.getElementById("finalScore");

// Tetrimino definitions
const TETRIMINOS = {
    I: [[0, 0, 0], [1, 1, 1], [0, 0, 0]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
};

const TETRIMINO_COLORS = {
    I: 0x00ffff, T: 0xe3891b, S: 0x00ff00,
    Z: 0xff0000, J: 0x0000ff, L: 0x7011be
};

const TETRIMINO_SCORES = {
    I: 40, T: 60, S: 80, Z: 80, J: 60, L: 60
};

// Initialize the game
init();

function init() {
    setupScene();
    setupLights();
    createGround();
    createWalls();
    updateScoreDisplay();
    instructionsElement.style.display = "block";
    animate();
}

function setupScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(COLS / 2 - 0.5, ROWS / 2, 20);
    camera.lookAt(COLS / 2 - 0.5, ROWS / 2, 0);
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    scene.background = new THREE.Color(0x33334E);
}

function setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);
}

function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(COLS, 5);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x000022 });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.set(COLS / 2 - 0.5, -1.5, 0);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
}

function createWalls() {
    const wallGeometry = new THREE.PlaneGeometry(ROWS, 5);
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x761469 });
    
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-1, ROWS / 2 - 2, -0.7);
    leftWall.rotation.z = Math.PI / 2;
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);
    walls.push(leftWall);

    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(COLS, ROWS / 2 - 2, -0.7);
    rightWall.rotation.z = Math.PI / 2;
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);
    walls.push(rightWall);
}

function startGame() {
    gameStart = true;
    gameEnded = false;
    lastTime = 0;
    gameMusic.currentTime = 0;
    gameMusic.volume = 0.1;
    gameMusic.play();
    instructionsElement.style.display = "none";
    resultsElement.style.display = "none";
    scoreElement.innerText = "0";
    score = 0;
    updateScoreDisplay();
    spawnNewTetrimino();
    requestAnimationFrame(update);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function createTetriminoMesh(shape, type) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ color: TETRIMINO_COLORS[type] }); 
    const tetrimino = new THREE.Group();
    
    shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const cube = new THREE.Mesh(geometry, material);
                cube.position.set(x, -y, 0);
                tetrimino.add(cube);
            }
        });
    });
    
    return tetrimino;
}

function spawnNewTetrimino() {
    const tetriminoTypes = Object.keys(TETRIMINOS);
    const randomType = tetriminoTypes[Math.floor(Math.random() * tetriminoTypes.length)];
    const newTetrimino = createTetriminoMesh(TETRIMINOS[randomType], randomType);
    
    newTetrimino.position.set(Math.floor(COLS / 2) - 1, ROWS - 1, 0);
    scene.add(newTetrimino);

    if (currentTetrimino) {
        scene.remove(currentTetrimino);
    }
    
    currentTetrimino = newTetrimino;
    currentTetriminoType = randomType;
}

function moveTetrimino(tetrimino, x, y) {
    const newPosition = tetrimino.position.clone();
    newPosition.x += x;
    newPosition.y += y;

    if (!checkCollision(tetrimino, newPosition)) {
        tetrimino.position.copy(newPosition);
    } else if (y < 0) {
        lockTetrimino(tetrimino);
    }
}

function rotateTetrimino(tetrimino) {
    const matrix = getTetriminoMatrix(tetrimino);
    const rotatedMatrix = rotateMatrix(matrix);

    applyMatrixToTetrimino(tetrimino, rotatedMatrix);
}


function rotateMatrix(matrix) {
    const N = matrix.length;
    const rotated = Array.from({ length: N }, () => Array(N).fill(0));

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            rotated[j][N - 1 - i] = matrix[i][j]; 
        }
    }

    return rotated;
}

function applyMatrixToTetrimino(tetrimino, matrix) {
    const N = matrix.length;
    let index = 0;

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            if (matrix[i][j]) {
                tetrimino.children[index].position.set(j, -i, 0);
                index++;
            }
        }
    }
}

function getTetriminoMatrix(tetrimino) {
    const size = Math.ceil(Math.sqrt(tetrimino.children.length));
    const matrix = Array.from({ length: size }, () => Array(size).fill(0));

    tetrimino.children.forEach((cube) => {
        const x = Math.round(cube.position.x);
        const y = Math.abs(Math.round(cube.position.y));
        matrix[y][x] = 1;
    });

    return matrix;
}

function checkCollision(tetrimino, position) {
    const roundedY = Math.round(position.y);
    const roundedX = Math.round(position.x);

    if (roundedX < 0 || roundedX + tetrimino.children.length > COLS) {
        return true;
    }

    for (let y = 0; y < tetrimino.children.length; y++) {
        for (let x = 0; x < tetrimino.children.length; x++) {
            if (tetrimino.children[y * tetrimino.children.length + x]) {
                const worldY = ROWS - 1 - (roundedY - y);
                const worldX = roundedX + x;

                if (worldY < 0 || worldY >= ROWS || worldX < 0 || worldX > COLS || board[worldY][worldX]) {
                    if (y === 0) {
                        lockTetrimino(tetrimino);
                    }
                    return true;
                }
            }
        }
    }

    return false;
}

function lockTetrimino(tetrimino) {
    const position = tetrimino.position;
    const roundedY = Math.round(position.y);
    const roundedX = Math.round(position.x);

    tetrimino.children.forEach((cube, i) => {
        const x = roundedX + (i % tetrimino.children.length);
        const y = ROWS - 1 - (roundedY - Math.floor(i / tetrimino.children.length));
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
            board[y][x] = 1;
        }
    });

    scene.remove(tetrimino);
    addLockedPiece(tetrimino);
    
    if (isGameOver()) {
        showResults();
    } else {
        points = TETRIMINO_SCORES[currentTetriminoType];
        updateScoreDisplay();
        spawnNewTetrimino();
    }
}

function showResults() {
    gameEnded = true;
    finalScoreElement.innerText = score;
    resultsElement.style.display = "block";
    gameMusic.pause();
}

function updateScoreDisplay() {
    score += points;
    scoreElement.textContent = `Score: ${score}`;
}

function addLockedPiece(tetrimino) {
    const lockedPiece = tetrimino.clone();
    lockedPiece.position.copy(tetrimino.position);
    lockedPiece.rotation.copy(tetrimino.rotation);
    scene.add(lockedPiece);
}

function restartGame() {
    location.reload();
}

function isGameOver() {
    return board[1].some(cell => cell !== 0);
}

function toggleInstructions() {
    if (instructionsElement.style.display === "none") {
        instructionsElement.style.display = "block";
    } else {
        instructionsElement.style.display = "none";
    }
}

function toggleMusic() {
    if (gameMusic.paused) {
        gameMusic.play();
    } else {
        gameMusic.pause();
    }
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        moveTetrimino(currentTetrimino, -1, 0);
    } else if (event.key === 'ArrowRight') {
        moveTetrimino(currentTetrimino, 1, 0);
    } else if (event.key === 'ArrowDown') {
        moveTetrimino(currentTetrimino, 0, -1);
    } else if (event.key === 'ArrowUp') {
        rotateTetrimino(currentTetrimino);
    } else if (event.key === ' ' || event.key === 'Space' || event.key === 's') {
        if (!gameStart) {
            startGame();
        }
    }
});

function update(time = 0) {
    if (!gameStart || gameEnded) return;

    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter >= dropInterval) {
        moveTetrimino(currentTetrimino, 0, -1);
        dropCounter = 0;
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(update);
}